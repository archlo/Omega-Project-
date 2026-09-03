import http from 'http';
import fs from 'fs';

function connectSSE() {
  return new Promise((resolve, reject) => {
    const req = http.get('http://127.0.0.1:13337/sse', { timeout: 10000 }, (res) => {
      let buf = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        buf += chunk;
        const m = buf.match(/data:\s*(\/sse\?session=[^\n]+)/);
        if (m) { resolve({ stream: res, sessionUrl: m[1].trim() }); }
      });
      res.on('error', reject);
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.on('error', reject);
  });
}

function postMessage(sessionUrl, payload) {
  return new Promise((resolve, reject) => {
    const body = Buffer.from(payload, 'utf8');
    const req = http.request({
      hostname: '127.0.0.1', port: 13337,
      path: sessionUrl, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': body.length }
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

async function main() {
  const { stream, sessionUrl } = await connectSSE();
  console.error('Session: ' + sessionUrl);
  
  // Open database
  const idbPath = String.raw`C:\Users\jorge\OneDrive\Desktop\v95 IDB leak\Maplestory95.exe.i64`;
  const openPayload = JSON.stringify({
    jsonrpc: '2.0', id: 1,
    method: 'tools/call',
    params: { name: 'idalib_open', arguments: { input_path: idbPath, session_id: 'v95', run_auto_analysis: false } }
  });
  console.error('Opening database...');
  const openResp = await postMessage(sessionUrl, openPayload);
  console.error('Open: ' + openResp.substring(0, 500));
  
  // Small delay
  await new Promise(r => setTimeout(r, 500));
  
  // Decompile
  const decompPayload = JSON.stringify({
    jsonrpc: '2.0', id: 2,
    method: 'tools/call',
    params: { name: 'decompile', arguments: { addr: '0x8a0bd0' } }
  });
  console.error('Decompiling 0x8a0bd0...');
  const decompResp = await postMessage(sessionUrl, decompPayload);
  console.error('Response length: ' + decompResp.length);
  
  // Try to parse - it may come as SSE events
  // Save raw response for debugging
  fs.writeFileSync('C:/Users/jorge/OneDrive/Desktop/ts/ida_output/equip_basic_raw_response.txt', decompResp, 'utf8');
  
  try {
    // Response might be wrapped in SSE format
    const lines = decompResp.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const jsonStr = line.substring(6);
        const parsed = JSON.parse(jsonStr);
        if (parsed.result && parsed.result.content) {
          for (const item of parsed.result.content) {
            if (item.type === 'text') {
              const data = JSON.parse(item.text);
              if (data.code) {
                fs.writeFileSync('C:/Users/jorge/OneDrive/Desktop/ts/ida_output/cuitooltip_settooltip_equip_basic.txt', JSON.stringify(data, null, 2), 'utf8');
                console.log(data.code);
                stream.destroy();
                process.exit(0);
              }
            }
          }
        }
      }
    }
    
    // If not SSE, try direct parse
    const parsed = JSON.parse(decompResp);
    if (parsed.result && parsed.result.content) {
      for (const item of parsed.result.content) {
        if (item.type === 'text') {
          const data = JSON.parse(item.text);
          if (data.code) {
            fs.writeFileSync('C:/Users/jorge/OneDrive/Desktop/ts/ida_output/cuitooltip_settooltip_equip_basic.txt', JSON.stringify(data, null, 2), 'utf8');
            console.log(data.code);
          }
        }
      }
    }
  } catch(e) {
    console.error('Parse error: ' + e.message);
    console.error('First 1000 chars: ' + decompResp.substring(0, 1000));
  }
  
  stream.destroy();
  process.exit(0);
}

main().catch(e => { console.error('Fatal: ' + e.message); process.exit(1); });
