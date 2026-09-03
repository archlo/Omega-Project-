const http = require('http');
const fs = require('fs');
const path = require('path');

const MCP_HOST = '127.0.0.1';
const MCP_PORT = 13337;
const OUTPUT_DIR = path.join(__dirname);

const RETRY = [
  { name: 'Init', addr: '0x64d3b0' },
  { name: 'Update', addr: '0x654300' },
  { name: 'GenerateMovePath', addr: '0x651100' },
  { name: 'LoadLayer', addr: '0x644900' },
];

function connectSSE() {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://${MCP_HOST}:${MCP_PORT}/sse`, { timeout: 10000 }, (res) => resolve(res));
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.on('error', reject);
  });
}

function postMsg(sessionUrl, payload) {
  return new Promise((resolve, reject) => {
    const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const req = http.request({ hostname: MCP_HOST, port: MCP_PORT, path: sessionUrl, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, (res) => { let b=''; res.on('data',c=>b+=c); res.on('end',()=>resolve(b)); });
    req.on('error', reject); req.write(body); req.end();
  });
}

function decompileOne(addr, rpcId) {
  return new Promise(async (resolve, reject) => {
    const timeout = setTimeout(() => { sseRes.destroy(); reject(new Error('timeout ' + addr)); }, 300000);
    let sessionUrl = null, done = false, sseRes;
    try { sseRes = await connectSSE(); } catch(e) { clearTimeout(timeout); reject(e); return; }
    sseRes.setEncoding('utf8');
    let buf = '';
    sseRes.on('data', (chunk) => {
      if (done) return;
      buf += chunk;
      if (!sessionUrl) {
        const m = buf.match(/data:\s*(\/sse\?session=[^\n]+)/);
        if (m) {
          sessionUrl = m[1].trim();
          const payload = JSON.stringify({ jsonrpc:'2.0', id:rpcId, method:'tools/call', params:{ name:'decompile', arguments:{ addr } } });
          postMsg(sessionUrl, payload).catch(e => { clearTimeout(timeout); reject(e); });
          return;
        }
      }
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (!data) continue;
          try {
            const p = JSON.parse(data);
            if (p.id === rpcId && p.result) {
              done = true; clearTimeout(timeout); sseRes.destroy();
              let code = '';
              if (p.result.content) for (const c of p.result.content) { if (c.type === 'text') { code = c.text; break; } }
              try { const inner = JSON.parse(code); if (inner.code) code = inner.code; } catch {}
              resolve(code);
            }
          } catch {}
        }
      }
    });
    sseRes.on('error', (e) => { clearTimeout(timeout); reject(e); });
    sseRes.on('end', () => { if (!done) { clearTimeout(timeout); reject(new Error('SSE ended')); } });
  });
}

async function main() {
  for (let i = 0; i < RETRY.length; i++) {
    const m = RETRY[i];
    const outFile = path.join(OUTPUT_DIR, `cmob_${m.name}_clean.txt`);
    if (fs.existsSync(outFile)) { console.log(`SKIP ${m.name}`); continue; }
    console.log(`[${i+1}/${RETRY.length}] ${m.name} @ ${m.addr}...`);
    try {
      const code = await decompileOne(m.addr, i + 9100);
      fs.writeFileSync(outFile, code, 'utf8');
      console.log(`  OK (${code.length} chars)`);
    } catch (e) {
      console.error(`  FAILED: ${e.message}`);
    }
  }
  console.log('Done.');
}

main().catch(console.error);
