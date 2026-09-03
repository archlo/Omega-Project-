const http = require('http');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname);

const RETRY = [
  { name: 'Init', addr: '0x64d3b0' },
  { name: 'GenerateMovePath', addr: '0x651100' },
  { name: 'LoadLayer', addr: '0x644900' },
];

function connectSSE() {
  return new Promise((resolve, reject) => {
    const req = http.get('http://127.0.0.1:13337/sse', { timeout: 10000 }, (res) => resolve(res));
    req.on('timeout', () => { req.destroy(); reject(new Error('SSE timeout')); });
    req.on('error', reject);
  });
}

function postMsg(sessionUrl, payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const req = http.request({
      hostname: '127.0.0.1', port: 13337, path: sessionUrl, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, (res) => { let data = ''; res.on('data', c => data += c); res.on('end', () => resolve(data)); });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function decompileOne(addr, rpcId) {
  return new Promise(async (resolve, reject) => {
    const timeout = setTimeout(() => { sseRes.destroy(); reject(new Error('Decompile timeout ' + addr)); }, 300000);
    let sessionUrl = null;
    let responseReceived = false;
    let sseRes;
    try { sseRes = await connectSSE(); } catch(e) { clearTimeout(timeout); reject(e); return; }
    sseRes.setEncoding('utf8');
    let sseBuffer = '';
    sseRes.on('data', (chunk) => {
      if (responseReceived) return;
      sseBuffer += chunk;
      if (!sessionUrl) {
        const m = sseBuffer.match(/data:\s*(\/sse\?session=[^\n]+)/);
        if (m) {
          sessionUrl = m[1].trim();
          const payload = JSON.stringify({
            jsonrpc: '2.0', id: rpcId,
            method: 'tools/call',
            params: { name: 'decompile', arguments: { addr: addr } }
          });
          postMsg(sessionUrl, payload).catch(e => { clearTimeout(timeout); reject(e); });
          return;
        }
      }
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data) {
            try {
              const parsed = JSON.parse(data);
              if (parsed.id === rpcId && parsed.result) {
                responseReceived = true;
                clearTimeout(timeout);
                sseRes.destroy();
                resolve(parsed);
                return;
              }
            } catch {}
          }
        }
      }
    });
    sseRes.on('error', (e) => { clearTimeout(timeout); reject(e); });
    sseRes.on('end', () => { if (!responseReceived) { clearTimeout(timeout); reject(new Error('SSE ended without response')); } });
  });
}

async function main() {
  for (let i = 0; i < RETRY.length; i++) {
    const m = RETRY[i];
    const outFile = path.join(OUTPUT_DIR, `cmob_${m.name}_clean.txt`);
    if (fs.existsSync(outFile)) { console.log(`SKIP ${m.name}`); continue; }
    console.log(`[${i+1}/${RETRY.length}] ${m.name} @ ${m.addr}...`);
    try {
      const result = await decompileOne(m.addr, i + 9200);
      let code = '';
      if (result.result?.content) {
        for (const c of result.result.content) {
          if (c.type === 'text') { code = c.text; break; }
        }
      }
      try { const inner = JSON.parse(code); if (inner.code) code = inner.code; } catch(e) {}
      if (code.includes('\\n')) code = code.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
      fs.writeFileSync(outFile, code, 'utf8');
      console.log(`  OK (${code.length} chars)`);
    } catch (e) {
      console.error(`  FAILED: ${e.message}`);
    }
  }
  console.log('Done.');
}

main().catch(console.error);
