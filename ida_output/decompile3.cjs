const http = require('http');
const fs = require('fs');

const MCP_HOST = '127.0.0.1';
const MCP_PORT = 13337;
const ADDR = '0x84ed90';
const OUT_FILE = __dirname + '/cuiskill_Draw_pure.txt';
const TIMEOUT_MS = 600000;

let sessionEndpoint = null;
let rpcId = 1;
let postBody = '';

// Connect to SSE and keep alive
const sseReq = http.get(`http://${MCP_HOST}:${MCP_PORT}/sse`, { timeout: 30000 }, (res) => {
  let buf = '';
  res.setEncoding('utf8');

  res.on('data', (chunk) => {
    buf += chunk;
    
    // Parse SSE events (separated by \n\n)
    let idx;
    while ((idx = buf.indexOf('\n\n')) !== -1) {
      const eventBlock = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      
      const lines = eventBlock.split('\n');
      let eventType = '';
      let dataLines = [];
      
      for (const line of lines) {
        if (line.startsWith('event: ')) {
          eventType = line.slice(7).trim();
        } else if (line.startsWith('data: ')) {
          dataLines.push(line.slice(6));
        }
      }
      
      const data = dataLines.join('\n');
      
      // First we need the endpoint
      if (eventType === 'endpoint' && !sessionEndpoint) {
        sessionEndpoint = data.trim();
        console.error('Got session endpoint: ' + sessionEndpoint);
        
        // Now POST the decompile request
        const payload = JSON.stringify({
          jsonrpc: '2.0',
          id: rpcId,
          method: 'tools/call',
          params: {
            name: 'decompile',
            arguments: { addr: ADDR }
          }
        });
        
        const urlObj = new URL(`http://${MCP_HOST}:${MCP_PORT}${sessionEndpoint}`);
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
            console.error('POST status: ' + postRes.statusCode);
            if (body) console.error('POST response: ' + body.slice(0, 200));
          });
        });
        postReq.write(payload);
        postReq.end();
        console.error('POST sent, waiting for SSE response...');
        
      } else if (data) {
        // Check if this is a JSON-RPC response
        try {
          const parsed = JSON.parse(data);
          if (parsed.id === rpcId) {
            console.error('Got JSON-RPC response for id ' + rpcId);
            postBody = JSON.stringify(parsed);
          }
        } catch (e) {
          // Might be a progress notification, log it
          if (data.length < 200) {
            console.error('SSE data: ' + data.slice(0, 200));
          }
        }
      }
    }
    
    // Check if we have our response
    if (postBody) {
      processResult(postBody);
    }
  });
  
  res.on('end', () => {
    if (!postBody) {
      console.error('SSE stream ended without getting response');
      process.exit(1);
    }
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

function processResult(jsonStr) {
  try {
    const result = JSON.parse(jsonStr);
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
      console.error(JSON.stringify(result).slice(0, 3000));
      process.exit(1);
    }
    
    fs.writeFileSync(OUT_FILE, code, 'utf8');
    console.log('SUCCESS: Wrote ' + code.length + ' chars to ' + OUT_FILE);
    process.exit(0);
  } catch (e) {
    console.error('Error parsing result: ' + e.message);
    process.exit(1);
  }
}

// Overall timeout
setTimeout(() => {
  console.error('Overall timeout (600s) reached');
  process.exit(1);
}, TIMEOUT_MS);

console.error('Connecting to IDA MCP...');
