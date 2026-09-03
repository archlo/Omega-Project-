import http from 'http';
import fs from 'fs';

function connectAndDecompile() {
  return new Promise((resolve, reject) => {
    const req = http.get('http://127.0.0.1:13337/sse', { timeout: 30000 }, (res) => {
      let buf = '';
      let sessionUrl = null;
      let results = {};
      let reqId = 0;
      let pendingRequests = 2; // PrintValue + AddInfoEx
      
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        buf += chunk;
        const lines = buf.split('\n');
        buf = lines.pop();
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.substring(6).trim();
            
            if (data.startsWith('/sse?session=')) {
              sessionUrl = data;
              console.error('Got session: ' + sessionUrl);
              
              const addrs = [
                { name: 'PrintValue', addr: '0x891230' },
                { name: 'AddInfoEx', addr: '0x88bac0' }
              ];
              
              for (const item of addrs) {
                const payload = JSON.stringify({
                  jsonrpc: '2.0', id: ++reqId,
                  method: 'tools/call',
                  params: { name: 'decompile', arguments: { addr: item.addr } }
                });
                console.error('Decompiling ' + item.name + ' at ' + item.addr + '...');
                const body = Buffer.from(payload, 'utf8');
                const postReq = http.request({
                  hostname: '127.0.0.1', port: 13337,
                  path: sessionUrl, method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'Content-Length': body.length }
                }, (postRes) => {
                  let postData = '';
                  postRes.on('data', (c) => postData += c);
                  postRes.on('end', () => {
                    console.error(item.name + ' POST sent');
                  });
                });
                postReq.write(body);
                postReq.end();
              }
            } else {
              try {
                const parsed = JSON.parse(data);
                if (parsed.result && parsed.result.content) {
                  for (const item of parsed.result.content) {
                    if (item.type === 'text') {
                      const textData = JSON.parse(item.text);
                      if (textData.code) {
                        const name = textData.code.includes('PrintValue') ? 'PrintValue' : 'AddInfoEx';
                        results[name] = textData;
                        fs.writeFileSync('C:/Users/jorge/OneDrive/Desktop/ts/ida_output/cuitooltip_' + name.toLowerCase() + '_full.txt', JSON.stringify(textData, null, 2), 'utf8');
                        console.error('Got ' + name + ' (' + textData.code.length + ' chars)');
                        pendingRequests--;
                        if (pendingRequests <= 0) {
                          // Print both
                          for (const [n, d] of Object.entries(results)) {
                            console.log('\n===== ' + n + ' =====');
                            console.log(d.code);
                          }
                          res.destroy();
                          resolve();
                          return;
                        }
                      }
                    }
                  }
                }
              } catch(e) {
                // Not JSON
              }
            }
          }
        }
      });
      res.on('end', () => { if (pendingRequests > 0) reject(new Error('SSE ended early')); });
      res.on('error', reject);
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.on('error', reject);
  });
}

connectAndDecompile()
  .then(() => process.exit(0))
  .catch(e => { console.error('Fatal: ' + e.message); process.exit(1); });
