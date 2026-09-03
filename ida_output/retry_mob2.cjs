const http = require('http');
const fs = require('fs');
const MCP_HOST = '127.0.0.1';
const MCP_PORT = 13337;

function connectSSE() {
  return new Promise((resolve, reject) => {
    const req = http.get('http://' + MCP_HOST + ':' + MCP_PORT + '/sse', { timeout: 15000 }, (res) => resolve(res));
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.on('error', reject);
  });
}

function postMsg(sessionUrl, payload) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: MCP_HOST, port: MCP_PORT, path: sessionUrl, method: 'POST', headers: {'Content-Type':'application/json','Content-Length':Buffer.byteLength(payload)} }, (res) => { let b=''; res.on('data',c=>b+=c); res.on('end',()=>resolve(b)); });
    req.on('error', reject); req.write(payload); req.end();
  });
}

async function main() {
  console.error('Connecting to SSE...');
  const sseRes = await connectSSE();
  let sessionUrl = null, done = false;
  sseRes.setEncoding('utf8');
  
  sseRes.on('data', async (chunk) => {
    if (done) return;
    if (!sessionUrl) {
      const m = chunk.match(/data:\s*(\/sse\?session=[^\n]+)/);
      if (m) {
        sessionUrl = m[1].trim();
        console.error('Session: ' + sessionUrl);
        const payload = JSON.stringify({jsonrpc:'2.0',id:777,method:'tools/call',params:{name:'decompile',arguments:{addr:'0x706d30'}}});
        console.error('Sending decompile for 0x706d30...');
        await postMsg(sessionUrl, payload);
        console.error('Request sent, waiting...');
      }
      return;
    }
    const lines = chunk.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6).trim();
        if (!data) continue;
        try {
          const p = JSON.parse(data);
          if (p.id === 777 && p.result) {
            done = true;
            let code = '';
            if (p.result.content) {
              for (const c of p.result.content) {
                if (c.type === 'text') { code = c.text; break; }
              }
            }
            try { const inner = JSON.parse(code); if (inner.code) code = inner.code; } catch(e) {}
            if (code.includes('\\n')) code = code.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
            fs.writeFileSync(__dirname + '/cskillinfo_LoadMobSkillLevelData_clean.txt', code, 'utf8');
            console.log('SUCCESS: Wrote ' + code.length + ' chars');
            process.exit(0);
          }
        } catch(e) {}
      }
    }
  });
  
  setTimeout(() => { if (!done) { console.error('Timeout after 120s'); process.exit(1); } }, 120000);
}

main().catch(e => { console.error(e.message); process.exit(1); });
