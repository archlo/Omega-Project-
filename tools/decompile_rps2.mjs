import http from 'http';

const MCP_BASE = 'http://127.0.0.1:13337';

function sseConnect() {
  return new Promise((resolve, reject) => {
    const req = http.get(`${MCP_BASE}/sse`, { timeout: 30000 }, (res) => {
      let buffer = '';
      let sessionUrl = null;
      
      res.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop();
        
        for (const line of lines) {
          if (line.startsWith('data: /sse?session=')) {
            const sessionId = line.split('session=')[1];
            sessionUrl = `${MCP_BASE}/sse?session=${sessionId}`;
            resolve({ sessionUrl, res });
          }
        }
      });
      
      res.on('error', reject);
    });
    
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function decompile(sessionUrl, address, id) {
  return new Promise((resolve, reject) => {
    const url = new URL(sessionUrl);
    const body = JSON.stringify({
      jsonrpc: '2.0',
      id: id,
      method: 'tools/call',
      params: {
        name: 'decompile',
        arguments: { addr: address }
      }
    });
    
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      },
      timeout: 120000
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.write(body);
    req.end();
  });
}

async function main() {
  console.log('Connecting to MCP SSE...');
  const { sessionUrl, res } = await sseConnect();
  console.log(`Session: ${sessionUrl}`);
  
  const responses = {};
  let buffer = '';
  
  res.on('data', (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop();
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          if (data.result && data.id) {
            const content = data.result.content || [];
            for (const c of content) {
              if (c.type === 'text') {
                responses[data.id] = c.text;
                console.error(`Got response ${data.id} (${c.text.length} chars)`);
              }
            }
          }
        } catch (e) {}
      }
    }
  });
  
  await new Promise(r => setTimeout(r, 500));
  
  // Only decompile ProcessPacket (full), SetMainButton, Draw (full), Constructor (full), OnCreate (full)
  const addresses = [
    ['0x6d72d0', 1],   // ProcessPacket
    ['0x6d70e0', 2],   // SetMainButton
    ['0x6d5e00', 3],   // Draw
    ['0x6d6ba0', 4],   // Constructor
    ['0x6d7480', 5],   // OnCreate
    ['0x6d5350', 6],   // ShowResult
    ['0x6d5fb0', 7],   // SetNpc
  ];
  
  for (const [addr, id] of addresses) {
    try {
      await decompile(sessionUrl, addr, id);
      console.error(`Sent request ${id} (${addr})`);
    } catch (e) {
      console.error(`Failed ${id}: ${e.message}`);
    }
  }
  
  console.error('Waiting for responses...');
  const startTime = Date.now();
  while (Object.keys(responses).length < addresses.length && Date.now() - startTime < 120000) {
    await new Promise(r => setTimeout(r, 1000));
  }
  
  for (const [id, text] of Object.entries(responses)) {
    console.log(`\n=== Response ${id} ===`);
    console.log(text);
    console.log(`=== END ${id} ===`);
  }
  
  console.error(`Done. Got ${Object.keys(responses).length}/${addresses.length}`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
