const http = require('http');
const fs = require('fs');
const path = require('path');

const MCP_HOST = '127.0.0.1';
const MCP_PORT = 13337;
const OUTPUT_DIR = __dirname;

const METHODS = [
  { name: 'CSkillInfo_ctor', addr: '0x9c48a0' },
  { name: 'CheckConsumeForActiveSkill', addr: '0x70b010' },
  { name: 'GetItemOptionSkill', addr: '0x6f32a0' },
  { name: 'GetItemSkill', addr: '0x6f3200' },
  { name: 'GetMCGuardian', addr: '0x6f3340' },
  { name: 'GetMCSkill', addr: '0x6f3160' },
  { name: 'GetMobSkill', addr: '0x6f30c0' },
  { name: 'GetMobTossSkillID', addr: '0x6f4410' },
  { name: 'GetPureSkillLevel', addr: '0x6f1c80' },
  { name: 'GetShootSkillRange', addr: '0x709650' },
  { name: 'GetSkill', addr: '0x6f1bb0' },
  { name: 'GetSkillLevel', addr: '0x6f2000' },
  { name: 'GetSkillLevel2', addr: '0x6f1d10' },
  { name: 'GetSkillRoot', addr: '0x6f1b10' },
  { name: 'GetSkillRootVisible', addr: '0x6f4050' },
  { name: 'IsMobChaseAttack', addr: '0x903190' },
  { name: 'IsSkillVisible', addr: '0x6f20d0' },
  { name: 'IterateSkillInfo', addr: '0x710390' },
  { name: 'LoadCharLevelData', addr: '0x7093a0' },
  { name: 'LoadFinalAttack', addr: '0x6f7680' },
  { name: 'LoadItemOptionSkill', addr: '0x7083d0' },
  { name: 'LoadItemOptionSkillLevelData', addr: '0x706710' },
  { name: 'LoadItemSkill', addr: '0x707e70' },
  { name: 'LoadItemSkillLevelData', addr: '0x706150' },
  { name: 'LoadLevelDataCommon', addr: '0x6f47a0' },
  { name: 'LoadMCGuardian', addr: '0x6ff0d0' },
  { name: 'LoadMCSkill', addr: '0x6feb20' },
  { name: 'LoadMobSkill', addr: '0x70bbd0' },
  { name: 'LoadMobSkillLevelData', addr: '0x706d30' },
  { name: 'LoadReqSkill', addr: '0x6f7aa0' },
  { name: 'LoadSkill', addr: '0x70c190' },
  { name: 'LoadSkillRoot', addr: '0x70fc00' },
  { name: 'CSkillInfo_dtor', addr: '0x9c49a0' },
];

function postMessage(sessionUrl, payload) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: MCP_HOST,
      port: MCP_PORT,
      path: sessionUrl,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => resolve(body));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function connectSSE() {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://${MCP_HOST}:${MCP_PORT}/sse`, { timeout: 15000 }, (res) => {
      resolve(res);
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('SSE timeout')); });
    req.on('error', reject);
  });
}

function decompileOne(addr, rpcId) {
  return new Promise(async (resolve, reject) => {
    const timeout = setTimeout(() => {
      sseRes.destroy();
      reject(new Error('Decompile timeout for ' + addr));
    }, 600000);

    let sessionUrl = null;
    let responseReceived = false;
    let sseRes;

    try {
      sseRes = await connectSSE();
    } catch (e) {
      clearTimeout(timeout);
      reject(e);
      return;
    }

    sseRes.setEncoding('utf8');

    let sseBuffer = '';

    sseRes.on('data', (chunk) => {
      if (responseReceived) return;
      sseBuffer += chunk;

      // Check for endpoint first
      if (!sessionUrl) {
        const m = sseBuffer.match(/data:\s*(\/sse\?session=[^\n]+)/);
        if (m) {
          sessionUrl = m[1].trim();
          // Send decompile request
          const payload = JSON.stringify({
            jsonrpc: '2.0',
            id: rpcId,
            method: 'tools/call',
            params: {
              name: 'decompile',
              arguments: { addr: addr }
            }
          });
          postMessage(sessionUrl, payload).catch(e => {
            clearTimeout(timeout);
            reject(e);
          });
          return;
        }
      }

      // Parse SSE events for response
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
            } catch (e) {
              // Not complete JSON
            }
          }
        }
      }
    });

    sseRes.on('error', (e) => {
      if (!responseReceived) {
        clearTimeout(timeout);
        reject(e);
      }
    });

    sseRes.on('end', () => {
      if (!responseReceived) {
        clearTimeout(timeout);
        reject(new Error('SSE stream ended without response'));
      }
    });
  });
}

function extractCode(parsed) {
  let code = '';
  if (parsed.result && parsed.result.content && Array.isArray(parsed.result.content)) {
    for (const item of parsed.result.content) {
      if (item.type === 'text') {
        code = item.text;
        break;
      }
    }
  }
  if (!code) return '';

  // Try parsing as JSON (might have addr/code wrapper)
  try {
    const inner = JSON.parse(code);
    if (inner.code) code = inner.code;
  } catch (e) {}

  // Unescape if needed
  if (code.includes('\\n')) {
    code = code.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }

  return code;
}

async function main() {
  console.error(`Decompiling ${METHODS.length} CSkillInfo methods...`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < METHODS.length; i++) {
    const m = METHODS[i];
    const outFile = path.join(OUTPUT_DIR, `cskillinfo_${m.name}_clean.txt`);

    if (fs.existsSync(outFile)) {
      const existing = fs.readFileSync(outFile, 'utf8');
      if (existing.length > 100 && !existing.startsWith('ERROR')) {
        console.error(`[${i+1}/${METHODS.length}] SKIP ${m.name} (${existing.length} chars)`);
        successCount++;
        continue;
      }
    }

    const rpcId = 1000 + i;
    console.error(`[${i+1}/${METHODS.length}] Decompiling ${m.name} @ ${m.addr}...`);
    try {
      const result = await decompileOne(m.addr, rpcId);
      const code = extractCode(result);

      if (code && code.length > 10) {
        fs.writeFileSync(outFile, code, 'utf8');
        console.error(`  -> ${m.name} (${code.length} chars)`);
        successCount++;
      } else {
        console.error(`  -> EMPTY result for ${m.name}`);
        fs.writeFileSync(outFile, `EMPTY: ${JSON.stringify(result)}`, 'utf8');
        failCount++;
      }
    } catch (e) {
      console.error(`  ERROR: ${e.message}`);
      fs.writeFileSync(outFile, `ERROR: ${e.message}`, 'utf8');
      failCount++;
    }
  }

  console.error(`\nDone! ${successCount} success, ${failCount} failed`);
}

main().catch(e => { console.error('Fatal: ' + e.message); process.exit(1); });
