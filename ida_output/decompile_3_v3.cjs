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

function httpPost(path, data) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify(data);
        const req = http.request({
            hostname: MCP_HOST, port: MCP_PORT,
            path, method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        }, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body }));
        });
        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

function collectSSE(sessionUrl, timeoutMs) {
    return new Promise((resolve, reject) => {
        let results = [];
        let buffer = '';
        let resolved = false;
        
        const timer = setTimeout(() => {
            if (!resolved) {
                resolved = true;
                resolve(results);
            }
        }, timeoutMs);
        
        const req = http.get(`http://${MCP_HOST}:${MCP_PORT}${sessionUrl}`, { timeout: timeoutMs }, (res) => {
            res.on('data', (chunk) => {
                if (resolved) return;
                buffer += chunk.toString();
                
                // Process complete SSE messages
                while (true) {
                    const idx = buffer.indexOf('\n\n');
                    if (idx < 0) break;
                    const message = buffer.substring(0, idx);
                    buffer = buffer.substring(idx + 2);
                    
                    const dataMatch = message.match(/data:\s*(.+)/);
                    if (dataMatch) {
                        const text = dataMatch[1].trim();
                        try {
                            const parsed = JSON.parse(text);
                            if (parsed.result || parsed.error) {
                                results.push(parsed);
                            }
                        } catch (e) {
                            // Not JSON - might be the session URL
                            if (text.startsWith('/sse?')) {
                                // This is the endpoint, note it
                                console.error('  SSE endpoint: ' + text);
                            }
                        }
                    }
                }
            });
            
            res.on('end', () => {
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timer);
                    resolve(results);
                }
            });
            
            res.on('error', (err) => {
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timer);
                    reject(err);
                }
            });
        });
        
        req.on('error', (err) => {
            if (!resolved) {
                resolved = true;
                clearTimeout(timer);
                reject(err);
            }
        });
    });
}

async function main() {
    console.error('Phase 1: Get session endpoint...');
    
    // Step 1: Connect to SSE to get session URL
    const sessionResult = await new Promise((resolve, reject) => {
        let resolved = false;
        const req = http.get(`http://${MCP_HOST}:${MCP_PORT}/sse`, { timeout: 15000 }, (res) => {
            let buffer = '';
            res.on('data', (chunk) => {
                if (resolved) return;
                buffer += chunk.toString();
                const match = buffer.match(/data:\s*(\/sse\?session=[^\n]+)/);
                if (match) {
                    resolved = true;
                    resolve({ stream: res, sessionUrl: match[1].trim() });
                }
            });
            res.on('error', (err) => { if (!resolved) reject(err); });
        });
        req.on('timeout', () => { if (!resolved) { req.destroy(); reject(new Error('SSE timeout')); } });
        req.on('error', (err) => { if (!resolved) reject(err); });
    });
    
    console.error('Session: ' + sessionResult.sessionUrl);
    const sessionUrl = sessionResult.sessionUrl;
    
    // Step 2: For each target, send request then collect SSE result
    for (const target of TARGETS) {
        console.error('\nDecompiling ' + target.name + ' at ' + target.addr + '...');
        
        try {
            // Start a fresh SSE listener for this request
            const ssePromise = new Promise((resolve, reject) => {
                let buffer = '';
                let resolved = false;
                const timer = setTimeout(() => {
                    if (!resolved) { resolved = true; resolve(null); }
                }, 15000);
                
                const req = http.get(`http://${MCP_HOST}:${MCP_PORT}${sessionUrl}`, { timeout: 20000 }, (res) => {
                    res.on('data', (chunk) => {
                        if (resolved) return;
                        buffer += chunk.toString();
                        
                        while (true) {
                            const idx = buffer.indexOf('\n\n');
                            if (idx < 0) break;
                            const message = buffer.substring(0, idx);
                            buffer = buffer.substring(idx + 2);
                            
                            const dataMatch = message.match(/data:\s*(.+)/);
                            if (dataMatch) {
                                try {
                                    const parsed = JSON.parse(dataMatch[1]);
                                    if (parsed.result || parsed.error) {
                                        resolved = true;
                                        clearTimeout(timer);
                                        res.destroy();
                                        resolve(parsed);
                                        return;
                                    }
                                } catch (e) { /* not JSON */ }
                            }
                        }
                    });
                    res.on('end', () => { if (!resolved) { resolved = true; clearTimeout(timer); resolve(null); } });
                    res.on('error', () => { if (!resolved) { resolved = true; clearTimeout(timer); resolve(null); } });
                });
                req.on('error', () => { if (!resolved) { resolved = true; clearTimeout(timer); resolve(null); } });
            });
            
            // Send the request
            const postResult = await httpPost(sessionUrl, {
                jsonrpc: '2.0', id: 1,
                method: 'tools/call',
                params: { name: 'decompile', arguments: { addr: target.addr } }
            });
            console.error('  POST status: ' + postResult.status);
            
            // Wait for SSE result
            const result = await ssePromise;
            
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
            } else {
                console.error('  FAILED: no result received');
            }
        } catch (e) { console.error('  ERROR: ' + e.message); }
        
        await new Promise(r => setTimeout(r, 500));
    }
    
    console.log('DONE');
    process.exit(0);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });