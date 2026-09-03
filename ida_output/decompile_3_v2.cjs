const http = require('http');
const fs = require('fs');
const path = require('path');

const MCP_HOST = '127.0.0.1';
const MCP_PORT = 13337;
const OUT_DIR = __dirname;

const TARGETS = [
  { addr: '0x8a2500', name: 'SetToolTip_Skill' },
  { addr: '0x898700', name: 'SetToolTip_Pet' },
  { addr: '0x8a3460', name: 'SetToolTip_Ring' },
];

function connectSSE() {
    return new Promise((resolve, reject) => {
        const req = http.get(`http://${MCP_HOST}:${MCP_PORT}/sse`, { timeout: 30000 }, (res) => {
            let buffer = '';
            const resultPromises = [];
            let pendingResolve = null;
            
            res.on('data', (chunk) => {
                buffer += chunk.toString();
                // Process complete SSE messages
                while (true) {
                    const idx = buffer.indexOf('\n\n');
                    if (idx < 0) break;
                    const message = buffer.substring(0, idx);
                    buffer = buffer.substring(idx + 2);
                    
                    const dataMatch = message.match(/data:\s*(.+)/);
                    if (dataMatch) {
                        try {
                            const parsed = JSON.parse(dataMatch[1]);
                            // Check if this is the session endpoint
                            if (typeof dataMatch[1] === 'string' && dataMatch[1].startsWith('/sse?')) {
                                // This is the endpoint
                                resolve({
                                    stream: res,
                                    sessionUrl: dataMatch[1].trim(),
                                    sendRequest: (addr) => sendAndReceive(res, addr)
                                });
                            } else if (parsed.result || parsed.error) {
                                // This is a tool result
                                if (pendingResolve) {
                                    const p = pendingResolve;
                                    pendingResolve = null;
                                    p(parsed);
                                }
                            }
                        } catch (e) { /* not JSON */ }
                    }
                }
            });
            
            // Store a way to get next result
            function waitForNextResult() {
                return new Promise((res) => { pendingResolve = res; });
            }
            
            // Expose waitForNextResult through the resolve
            const origResolve = resolve;
            resolve = function(opts) {
                opts.waitForResult = waitForNextResult;
                origResolve(opts);
            };
            
            res.on('error', reject);
        });
        req.on('timeout', () => { req.destroy(); reject(new Error('SSE timeout')); });
        req.on('error', reject);
    });
}

function sendRequest(sessionUrl, addr) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            jsonrpc: '2.0', id: 1,
            method: 'tools/call',
            params: { name: 'decompile', arguments: { addr } }
        });
        
        const req = http.request({
            hostname: MCP_HOST, port: MCP_PORT,
            path: sessionUrl, method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        }, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => resolve(body));
        });
        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

async function main() {
    console.error('Connecting...');
    const { stream, sessionUrl, waitForResult } = await connectSSE();
    console.error('Session: ' + sessionUrl);
    
    for (const target of TARGETS) {
        console.error('\nDecompiling ' + target.name + ' at ' + target.addr + '...');
        try {
            // Set up listener BEFORE sending request
            const resultPromise = waitForResult();
            
            // Send request
            await sendRequest(sessionUrl, target.addr);
            console.error('  Request sent, waiting for result...');
            
            // Wait for result with timeout
            const result = await Promise.race([
                resultPromise,
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 20000))
            ]);
            
            if (result && result.result && result.result.content) {
                const textItem = result.result.content.find(c => c.type === 'text');
                if (textItem) {
                    const parsed = JSON.parse(textItem.text);
                    const outFile = path.join(OUT_DIR, 'cuitooltip_' + target.name.toLowerCase() + '_decompiled.json');
                    fs.writeFileSync(outFile, JSON.stringify(parsed, null, 2), 'utf8');
                    console.error('  OK: ' + (parsed.code ? parsed.code.length : 0) + ' chars');
                    
                    const cleanFile = path.join(OUT_DIR, 'cuitooltip_' + target.name.toLowerCase() + '_decompiled.txt');
                    fs.writeFileSync(cleanFile, parsed.code || '', 'utf8');
                    console.error('  Saved: ' + target.name);
                }
            } else if (result && result.error) {
                console.error('  ERROR: ' + JSON.stringify(result.error));
            }
        } catch (e) { console.error('  ERROR: ' + e.message); }
        
        await new Promise(r => setTimeout(r, 500));
    }
    
    stream.destroy();
    console.log('DONE');
    process.exit(0);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });