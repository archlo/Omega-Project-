import http from 'http';
import fs from 'fs';

function connectAndDecompile() {
  return new Promise((resolve, reject) => {
    const req = http.get('http://127.0.0.1:13337/sse', { timeout: 30000 }, (res) => {
      let buf = '';
      let sessionUrl = null;
      
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
              const payload = JSON.stringify({
                jsonrpc: '2.0', id: 1,
                method: 'tools/call',
                params: { name: 'decompile', arguments: { addr: '0x893f60' } }
              });
              const body = Buffer.from(payload, 'utf8');
              const postReq = http.request({
                hostname: '127.0.0.1', port: 13337,
                path: sessionUrl, method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Content-Length': body.length }
              }, (postRes) => { let d=''; postRes.on('data',c=>d+=c); postRes.on('end',()=>console.error('POST sent')); });
              postReq.write(body);
              postReq.end();
            } else {
              try {
                const parsed = JSON.parse(data);
                if (parsed.result && parsed.result.content) {
                  for (const item of parsed.result.content) {
                    if (item.type === 'text') {
                      const textData = JSON.parse(item.text);
                      if (textData.code) {
                        fs.writeFileSync('C:/Users/jorge/OneDrive/Desktop/ts/ida_output/cuitooltip_drawtooltip_equip_full.txt', JSON.stringify(textData, null, 2), 'utf8');
                        console.log(textData.code);
                        res.destroy();
                        resolve();
                        return;
                      }
                    }
                  }
                }
              } catch(e) {}
            }
          }
        }
      });
      res.on('error', reject);
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.on('error', reject);
  });
}

connectAndDecompile().then(() => process.exit(0)).catch(e => { console.error('Fatal: ' + e.message); process.exit(1); });
