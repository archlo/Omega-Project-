const http = require('http');
const fs = require('fs');

const pending = new Map();
let sseBuffer = '';
let sseRes = null;
let sessionUrl = null;

function extractCode(result) {
  if (result?.structuredContent?.code) return result.structuredContent.code;
  if (result?.content) {
    const text = result.content.map(c => c.text || '').join('');
    try { return JSON.parse(text).code || text; } catch { return text; }
  }
  return null;
}

function processSSEBuffer() {
  while (true) {
    const idx = sseBuffer.indexOf('\n\n');
    if (idx === -1) break;
    const evt = sseBuffer.substring(0, idx);
    sseBuffer = sseBuffer.substring(idx + 2);
    for (const line of evt.split('\n')) {
      if (!line.startsWith('data:')) continue;
      const raw = line.substring(5).trim();
      if (!raw) continue;
      try {
        const data = JSON.parse(raw);
        const p = pending.get(data.id);
        if (p) {
          clearTimeout(p.timer);
          pending.delete(data.id);
          if (data.error) p.reject(new Error(data.error.message || JSON.stringify(data.error)));
          else {
            const code = extractCode(data.result);
            code ? p.resolve(code) : p.reject(new Error(`No code for id=${data.id}`));
          }
        }
      } catch {}
    }
  }
}

function postRequest(reqId, method, params) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(reqId); reject(new Error('Timeout')); }, 120000);
    pending.set(reqId, { resolve, reject, timer });
    const postData = JSON.stringify({ jsonrpc: '2.0', id: reqId, method, params });
    const req = http.request({
      hostname: '127.0.0.1', port: 13337, path: sessionUrl,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        if (res.statusCode !== 200 && res.statusCode !== 202) {
          pending.delete(reqId); clearTimeout(timer);
          reject(new Error(`POST ${res.statusCode}: ${body}`));
        }
      });
    });
    req.on('error', (e) => { pending.delete(reqId); clearTimeout(timer); reject(e); });
    req.write(postData);
    req.end();
  });
}

async function main() {
  // Connect SSE
  await new Promise((resolve, reject) => {
    const req = http.get('http://127.0.0.1:13337/sse', (res) => {
      sseRes = res;
      res.on('data', (chunk) => {
        sseBuffer += chunk.toString();
        if (!sessionUrl) {
          for (const line of sseBuffer.split('\n')) {
            if (line.startsWith('data:')) {
              const url = line.substring(5).trim();
              if (url && url.startsWith('/')) { sessionUrl = url; console.log('Session:', sessionUrl); resolve(); return; }
            }
          }
        } else {
          processSSEBuffer();
        }
      });
      res.on('error', reject);
    });
    req.on('error', reject);
    setTimeout(() => reject(new Error('Timeout')), 15000);
  });

  console.log('Connected. Looking up CCSWnd vtable addresses...\n');

  // Step 1: Get the vtable for CCSWnd_Locker to find real function addresses
  // Use get_decompiled_code_by_name or list methods approach
  // Let's try listing functions by name pattern
  
  const classNames = [
    'CCSWnd_Locker',
    'CCSWnd_Inventory', 
    'CCSWnd_List',
    'CCSWnd_Tab'
  ];
  
  let reqId = 1;
  
  for (const cls of classNames) {
    console.log(`\n--- ${cls} ---`);
    
    // Try to get the class vtable/struct info
    try {
      const result = await postRequest(reqId++, 'tools/call', {
        name: 'get_structure',
        arguments: { name: cls }
      });
      console.log(`${cls} structure:\n${result.substring(0, 3000)}`);
    } catch (e) {
      console.log(`get_structure failed: ${e.message}`);
    }
    
    // Try to find functions by name
    try {
      const result = await postRequest(reqId++, 'tools/call', {
        name: 'list_functions',
        arguments: { pattern: `${cls}::` }
      });
      console.log(`${cls} functions:\n${result.substring(0, 3000)}`);
    } catch (e) {
      console.log(`list_functions failed: ${e.message}`);
    }
  }

  // Also try getting the vtable directly
  console.log('\n--- Looking for CCSWnd vtables ---');
  try {
    const result = await postRequest(reqId++, 'tools/call', {
      name: 'get_structure',
      arguments: { name: 'CCSWnd' }
    });
    console.log(`CCSWnd base:\n${result.substring(0, 3000)}`);
  } catch (e) {
    console.log(`Failed: ${e.message}`);
  }

  if (sseRes) sseRes.destroy();
  process.exit(0);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
