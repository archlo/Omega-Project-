const http = require('http');
const fs = require('fs');

const MCP_HOST = '127.0.0.1';
const MCP_PORT = 13337;
const ADDR = '0x84ed90';
const OUT_FILE = __dirname + '/cuiskill_Draw_pure.txt';

// First get SSE endpoint
function getSSEEndpoint() {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://${MCP_HOST}:${MCP_PORT}/sse`, { timeout: 8000 }, (res) => {
      let buf = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        buf += chunk;
        const m = buf.match(/data:\s*(\/sse\?session=[^\r\n]+)/);
        if (m) {
          const endpoint = m[1].trim();
          res.destroy();
          resolve(endpoint);
        }
      });
      res.on('end', () => reject(new Error('SSE ended without endpoint')));
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('SSE connect timeout')); });
    req.on('error', reject);
  });
}

// Connect to SSE and listen for response
function listenForResponse(sessionEndpoint, rpcId) {
  return new Promise((resolve, reject) => {
    const sseUrl = `http://${MCP_HOST}:${MCP_PORT}${sessionEndpoint}`;
    const req = http.get(sseUrl, { timeout: 300000 }, (res) => {
      let buf = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        buf += chunk;
        // Parse SSE events
        const events = buf.split('\n\n');
        // Keep last incomplete event in buffer
        buf = events.pop();
        
        for (const evt of events) {
          const dataLines = [];
          for (const line of evt.split('\n')) {
            if (line.startsWith('data: ')) {
              dataLines.push(line.slice(6));
            }
          }
          if (dataLines.length > 0) {
            const dataStr = dataLines.join('');
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.id === rpcId) {
                resolve(parsed);
                return;
              }
            } catch (e) {
              // Not JSON, check if it's a progress notification etc
            }
          }
        }
      });
      res.on('end', () => reject(new Error('SSE ended without response for id ' + rpcId)));
    });
    req.on('error', reject);
  });
}

async function main() {
  console.error('Step 1: Getting SSE endpoint...');
  const endpoint = await getSSEEndpoint();
  console.error('Endpoint: ' + endpoint);

  const rpcId = 1;
  
  // Step 2: POST request (fire-and-forget, response comes via SSE)
  console.error('Step 2: POSTing decompile request...');
  const payload = JSON.stringify({
    jsonrpc: '2.0',
    id: rpcId,
    method: 'tools/call',
    params: {
      name: 'decompile',
      arguments: { addr: ADDR }
    }
  });

  const urlObj = new URL(`http://${MCP_HOST}:${MCP_PORT}${endpoint}`);
  const postPromise = new Promise((resolve, reject) => {
    const postReq = http.request({
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (postRes) => {
      let body = '';
      postRes.on('data', (c) => body += c);
      postRes.on('end', () => {
        console.error('POST status: ' + postRes.statusCode + ' body: ' + body.slice(0, 200));
        resolve(body);
      });
    });
    postReq.on('error', reject);
    postReq.write(payload);
    postReq.end();
  });

  // Step 3: Listen for response on SSE while POST is in flight
  console.error('Step 3: Listening for SSE response...');
  const responsePromise = listenForResponse(endpoint, rpcId);

  // POST first, then wait for SSE response
  await postPromise;
  const result = await responsePromise;

  console.error('Got response! Parsing...');

  // Extract code from response
  let code = '';
  if (result.result && result.result.content && Array.isArray(result.result.content)) {
    for (const item of result.result.content) {
      if (item.type === 'text') {
        code = item.text;
        break;
      }
    }
  } else if (result.result && result.result.code) {
    code = result.result.code;
  } else if (typeof result.result === 'string') {
    code = result.result;
  }

  if (!code) {
    console.error('Could not extract code. Full result:');
    console.error(JSON.stringify(result).slice(0, 2000));
    process.exit(1);
  }

  fs.writeFileSync(OUT_FILE, code, 'utf8');
  console.log('SUCCESS: Wrote ' + code.length + ' chars to ' + OUT_FILE);
  process.exit(0);
}

main().catch(e => {
  console.error('Fatal: ' + e.message);
  process.exit(1);
});
