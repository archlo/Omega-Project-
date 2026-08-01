import http from 'http';
import fs from 'fs';

function connectAndDecompile() {
  return new Promise((resolve, reject) => {
    const req = http.get('http://127.0.0.1:13337/sse', { timeout: 30000 }, (res) => {
      let buf = '';
      let sessionUrl = null;
      let decompResult = null;
      let reqId = 0;
      
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        buf += chunk;
        
        // Process complete lines
        const lines = buf.split('\n');
        buf = lines.pop(); // Keep incomplete line in buffer
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.substring(6).trim();
            
            // Check if this is a session URL
            if (data.startsWith('/sse?session=')) {
              sessionUrl = data;
              console.error('Got session: ' + sessionUrl);
              
              // Now send requests
              // First open database
              const idbPath = String.raw`C:\Users\jorge\OneDrive\Desktop\v95 IDB leak\Maplestory95.exe.i64`;
              const openPayload = JSON.stringify({
                jsonrpc: '2.0', id: ++reqId,
                method: 'tools/call',
                params: { name: 'idalib_open', arguments: { input_path: idbPath, session_id: 'v95', run_auto_analysis: false } }
              });
              console.error('Sending idalib_open...');
              const body = Buffer.from(openPayload, 'utf8');
              const postReq = http.request({
                hostname: '127.0.0.1', port: 13337,
                path: sessionUrl, method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Content-Length': body.length }
              }, (postRes) => {
                let postData = '';
                postRes.on('data', (c) => postData += c);
                postRes.on('end', () => {
                  console.error('POST open response: ' + postData.substring(0, 200));
                  
                  // Wait a bit then decompile
                  setTimeout(() => {
                    const decompPayload = JSON.stringify({
                      jsonrpc: '2.0', id: ++reqId,
                      method: 'tools/call',
                      params: { name: 'decompile', arguments: { addr: '0x8a0bd0' } }
                    });
                    console.error('Sending decompile...');
                    const body2 = Buffer.from(decompPayload, 'utf8');
                    const postReq2 = http.request({
                      hostname: '127.0.0.1', port: 13337,
                      path: sessionUrl, method: 'POST',
                      headers: { 'Content-Type': 'application/json', 'Content-Length': body2.length }
                    }, (postRes2) => {
                      let postData2 = '';
                      postRes2.on('data', (c) => postData2 += c);
                      postRes2.on('end', () => {
                        console.error('POST decompile response: ' + postData2.substring(0, 200));
                      });
                    });
                    postReq2.write(body2);
                    postReq2.end();
                  }, 1000);
                });
              });
              postReq.write(body);
              postReq.end();
            } else {
              // This might be a response to our requests
              try {
                const parsed = JSON.parse(data);
                console.error('SSE message id=' + parsed.id + ' method=' + (parsed.method || 'response'));
                
                if (parsed.result && parsed.result.content) {
                  for (const item of parsed.result.content) {
                    if (item.type === 'text') {
                      const textData = JSON.parse(item.text);
                      if (textData.code) {
                        decompResult = textData;
                        fs.writeFileSync('C:/Users/jorge/OneDrive/Desktop/ts/ida_output/cuitooltip_settooltip_equip_basic.txt', JSON.stringify(textData, null, 2), 'utf8');
                        console.log(textData.code);
                        res.destroy();
                        resolve();
                        return;
                      }
                    }
                  }
                }
              } catch(e) {
                // Not JSON, log it
                if (data.length > 0 && data.length < 500) {
                  console.error('Non-JSON SSE data: ' + data);
                }
              }
            }
          }
        }
      });
      
      res.on('end', () => {
        console.error('SSE stream ended');
        if (!decompResult) reject(new Error('SSE ended without result'));
      });
      res.on('error', reject);
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.on('error', reject);
  });
}

connectAndDecompile()
  .then(() => process.exit(0))
  .catch(e => { console.error('Fatal: ' + e.message); process.exit(1); });
