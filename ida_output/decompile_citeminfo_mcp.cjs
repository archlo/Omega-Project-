const http = require('http');
const fs = require('fs');
const path = require('path');

const MCP_HOST = '127.0.0.1';
const MCP_PORT = 13337;
const OUTPUT_DIR = __dirname;

const METHODS = [
  { name: 'GetSetItemEffect', addr: '0x594ed0' },
  { name: 'GetSetItemInfo', addr: '0x721590' },
  { name: 'GetCoupleChairItem', addr: '0x94aef0' },
  { name: 'GetPortableChairRecoveryRate', addr: '0x5ac750' },
  { name: 'IsTherePortableChairStatUp', addr: '0x5ac8e0' },
  { name: 'CalcEquipItemQuality', addr: '0x5c2a30' },
  { name: 'GetBulletPAD', addr: '0x5ac630' },
  { name: 'GetMaxLevel', addr: '0x5c09b0' },
  { name: 'GetLevelInfo', addr: '0x5c39d0' },
  { name: 'GetLevelAbilityInfo', addr: '0x5c3a60' },
  { name: 'IsGrowthItem', addr: '0x5c39b0' },
  { name: 'GetMaxLEV', addr: '0x5acb70' },
  { name: 'GetRequiredLEV', addr: '0x5aca50' },
  { name: 'IsCashItem', addr: '0x5aaf60' },
  { name: 'IsEquipItem', addr: '0x4c6320' },
  { name: 'GetSpecialProp', addr: '0x5a6ee0' },
  { name: 'GetSpecialName', addr: '0x5a8460' },
  { name: 'GetSpecialDesc', addr: '0x5a85b0' },
  { name: 'GetSpecialIcon', addr: '0x5a87b0' },
  { name: 'DrawGradeFrame', addr: '0x594d10' },
];

function postMessage(sessionUrl, payload) {
  return new Promise((resolve, reject) => {
    const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const req = http.request({
      hostname: MCP_HOST, port: MCP_PORT,
      path: sessionUrl, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function connectSSE() {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://${MCP_HOST}:${MCP_PORT}/sse`, { timeout: 10000 }, (res) => resolve(res));
    req.on('timeout', () => { req.destroy(); reject(new Error('SSE timeout')); });
    req.on('error', reject);
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
          postMessage(sessionUrl, payload).catch(e => { clearTimeout(timeout); reject(e); });
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
  for (let i = 0; i < METHODS.length; i++) {
    const m = METHODS[i];
    const outFile = path.join(OUTPUT_DIR, `citeminfo_${m.name}_mcp.json`);
    if (fs.existsSync(outFile)) { console.log(`SKIP ${m.name}`); continue; }
    console.log(`[${i+1}/${METHODS.length}] ${m.name} @ ${m.addr}...`);
    try {
      const result = await decompileOne(m.addr, i + 1);
      const pseudocode = result.result?.content?.map(c => c.text || '').join('\n') || JSON.stringify(result);
      fs.writeFileSync(outFile, JSON.stringify([{ query: m.addr, matches: [{ address: m.addr, name: `CItemInfo::${m.name}`, pseudocode }] }], null, 2));
      console.log(`  OK (${pseudocode.length} chars)`);
    } catch (e) {
      console.error(`  FAILED: ${e.message}`);
    }
  }
  console.log('All done.');
}

main().catch(console.error);
