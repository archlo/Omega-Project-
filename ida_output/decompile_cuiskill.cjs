const http = require('http');
const fs = require('fs');

const MCP_HOST = '127.0.0.1';
const MCP_PORT = 13337;
const ADDR = '0x84ed90';
const OUT_FILE = __dirname + '/cuiskill_Draw_pure.txt';

// Step 1: Connect to /sse
const sseReq = http.get(`http://${MCP_HOST}:${MCP_PORT}/sse`, { timeout: 15000 }, (res) => {
  let buf = '';
  let sessionUrl = null;
  let sseData = '';

  res.setEncoding('utf8');

  res.on('data', (chunk) => {
    buf += chunk;

    if (!sessionUrl) {
      const m = buf.match(/endpoint:\s*(\/messages\/[^\r\n]+)/);
      if (m) {
        sessionUrl = `http://${MCP_HOST}:${MCP_PORT}${m[1].trim()}`;
        console.error('Session URL: ' + sessionUrl);

        // Step 2: POST JSON-RPC
        const payload = JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: {
            name: 'decompile',
            arguments: { addr: ADDR }
          }
        });

        const u = new URL(sessionUrl);
        const postReq = http.request({
          hostname: u.hostname,
          port: u.port,
          path: u.pathname,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
          }
        }, (postRes) => {
          console.error('POST status: ' + postRes.statusCode);
          postRes.resume();
        });
        postReq.write(payload);
        postReq.end();
      }
    }

    // Accumulate SSE data for response
    sseData += chunk;
    
    // Look for our response (id:1)
    if (sseData.includes('"id":1') && (sseData.includes('"result"') || sseData.includes('"error"'))) {
      // Try to parse SSE lines
      const lines = sseData.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.id === 1 && parsed.result) {
              const result = parsed.result;
              // Extract code from result
              let code = '';
              if (result.content && Array.isArray(result.content)) {
                for (const item of result.content) {
                  if (item.type === 'text') {
                    code = item.text;
                    break;
                  }
                }
              } else if (typeof result === 'string') {
                code = result;
              } else if (result.code) {
                code = result.code;
              }
              
              if (code) {
                fs.writeFileSync(OUT_FILE, code, 'utf8');
                console.log('SUCCESS: Wrote ' + code.length + ' chars to ' + OUT_FILE);
              } else {
                console.error('No code found in result: ' + JSON.stringify(result).slice(0, 500));
              }
              process.exit(0);
            }
          } catch (e) {
            // Not JSON or incomplete, keep going
          }
        }
      }
    }
  });

  res.on('end', () => {
    console.error('SSE stream ended without response');
    process.exit(1);
  });
});

sseReq.on('timeout', () => {
  console.error('SSE connection timed out');
  sseReq.destroy();
  process.exit(1);
});

sseReq.on('error', (e) => {
  console.error('SSE error: ' + e.message);
  process.exit(1);
});

// Overall timeout
setTimeout(() => {
  console.error('Overall timeout (600s) reached');
  process.exit(1);
}, 600000);

console.error('Connecting to IDA MCP at ' + MCP_HOST + ':' + MCP_PORT + '...');
