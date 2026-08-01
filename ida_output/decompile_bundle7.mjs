import http from 'http';
import fs from 'fs';

const MCP_HOST = '127.0.0.1';
const MCP_PORT = 13337;
const TARGET_ADDR = '0x898f70';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function postToSession(sessionUrl, payload) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify(payload);
        const req = http.request({
            hostname: MCP_HOST, port: MCP_PORT,
            path: sessionUrl, method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(data));
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

function connectSSEAndListen(onMessage) {
    return new Promise((resolve, reject) => {
        const req = http.get(`http://${MCP_HOST}:${MCP_PORT}/sse`, { timeout: 120000 }, (res) => {
            let buf = '';
            let sessionUrl = null;
            res.setEncoding('utf8');
            res.on('data', (chunk) => {
                buf += chunk;
                if (!sessionUrl) {
                    const match = buf.match(/data:\s*(\/sse\?session=[^\n]+)/);
                    if (match) {
                        sessionUrl = match[1].trim();
                        console.error('Session: ' + sessionUrl);
                        resolve({ stream: res, sessionUrl });
                    }
                }
                const events = buf.split('\n\n');
                buf = events.pop() || '';
                for (const evt of events) {
                    const dataMatch = evt.match(/data:\s*(.*)/s);
                    if (dataMatch) {
                        try {
                            const data = JSON.parse(dataMatch[1]);
                            onMessage(data);
                        } catch (e) { /* not JSON-RPC */ }
                    }
                }
            });
            res.on('error', reject);
        });
        req.on('timeout', () => { req.destroy(); reject(new Error('SSE timeout')); });
        req.on('error', reject);
    });
}

async function callTool(pendingRequests, sessionUrl, id, toolName, args, timeoutMs = 120000) {
    const promise = new Promise((resolve, reject) => {
        pendingRequests.set(id, { resolve, reject });
        setTimeout(() => { pendingRequests.delete(id); reject(new Error('timeout')); }, timeoutMs);
    });
    await postToSession(sessionUrl, {
        jsonrpc: '2.0', id, method: 'tools/call',
        params: { name: toolName, arguments: args }
    });
    return promise;
}

async function main() {
    console.error('Connecting to IDA MCP SSE...');
    
    const pendingRequests = new Map();
    let idCounter = 1;
    
    const { stream, sessionUrl } = await connectSSEAndListen((msg) => {
        if (msg.id !== undefined && pendingRequests.has(msg.id)) {
            pendingRequests.get(msg.id).resolve(msg);
        }
    });
    
    // First, list available tools
    console.error('\nListing tools...');
    try {
        const toolsResp = await callTool(pendingRequests, sessionUrl, idCounter++, 'tools/list', {});
        if (toolsResp.result && toolsResp.result.tools) {
            console.error('Available tools:', toolsResp.result.tools.map(t => t.name).join(', '));
        }
    } catch (e) {
        console.error('List tools error:', e.message);
    }
    
    await sleep(500);
    
    // Try basic_blocks to get the function structure
    console.error('\nGetting basic blocks for SetToolTip_Bundle...');
    try {
        const bbResp = await callTool(pendingRequests, sessionUrl, idCounter++, 'basic_blocks', { addr: TARGET_ADDR });
        fs.writeFileSync('cuitooltip_settooltip_bundle_bb.json', JSON.stringify(bbResp, null, 2), 'utf8');
        console.error('Basic blocks saved');
        
        if (bbResp.result && bbResp.result.content) {
            for (const item of bbResp.result.content) {
                if (item.type === 'text') {
                    console.error('Basic blocks:', item.text.substring(0, 500));
                }
            }
        }
    } catch (e) {
        console.error('Basic blocks error:', e.message);
    }
    
    await sleep(500);
    
    // Try decompile with different approach - maybe use decompile_range or similar
    console.error('\nTrying decompile_range...');
    try {
        const drResp = await callTool(pendingRequests, sessionUrl, idCounter++, 'decompile_range', { 
            start_addr: TARGET_ADDR, 
            end_addr: '0x89b0a0'  // SetToolTip_Bundle size is 0x212c, so end = 0x898f70 + 0x212c = 0x89b09c
        });
        fs.writeFileSync('cuitooltip_settooltip_bundle_range.json', JSON.stringify(drResp, null, 2), 'utf8');
        console.error('Decompile range saved');
        
        if (drResp.result && drResp.result.content) {
            for (const item of drResp.result.content) {
                if (item.type === 'text') {
                    const data = JSON.parse(item.text);
                    if (data.code) {
                        fs.writeFileSync('cuitooltip_settooltip_bundle_full.txt', data.code, 'utf8');
                        console.error('Full code saved: ' + data.code.length + ' chars');
                    }
                }
            }
        }
    } catch (e) {
        console.error('Decompile range error:', e.message);
    }
    
    stream.destroy();
    process.exit(0);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
