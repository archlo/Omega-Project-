import http from 'http';
import fs from 'fs';

const MCP_HOST = '127.0.0.1';
const MCP_PORT = 13337;
const TARGET_ADDR = 0x898f70;
const FUNC_SIZE = 0x212c;
const FUNC_END = TARGET_ADDR + FUNC_SIZE;

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
        const req = http.get(`http://${MCP_HOST}:${MCP_PORT}/sse`, { timeout: 300000 }, (res) => {
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
                        try { onMessage(JSON.parse(dataMatch[1])); } catch (e) {}
                    }
                }
            });
            res.on('error', reject);
        });
        req.on('timeout', () => { req.destroy(); reject(new Error('SSE timeout')); });
        req.on('error', reject);
    });
}

async function callTool(pending, sessionUrl, id, tool, args, timeout = 30000) {
    const p = new Promise((res, rej) => {
        pending.set(id, { resolve: res, reject: rej });
        setTimeout(() => { pending.delete(id); rej(new Error('timeout')); }, timeout);
    });
    await postToSession(sessionUrl, { jsonrpc: '2.0', id, method: 'tools/call', params: { name: tool, arguments: args } });
    return p;
}

async function main() {
    console.error('Connecting...');
    const pending = new Map();
    const { stream, sessionUrl } = await connectSSEAndListen((msg) => {
        if (msg.id !== undefined && pending.has(msg.id)) pending.get(msg.id).resolve(msg);
    });

    // Get basic blocks to understand function structure
    console.error('\nGetting basic blocks...');
    const bbResp = await callTool(pending, sessionUrl, 1, 'basic_blocks', { addrs: [TARGET_ADDR.toString(16)] });
    fs.writeFileSync('bundle_bb.json', JSON.stringify(bbResp, null, 2), 'utf8');
    
    if (bbResp.result && bbResp.result.content) {
        for (const item of bbResp.result.content) {
            if (item.type === 'text') console.error('BB result:', item.text.substring(0, 2000));
        }
    }

    await sleep(500);

    // Try decompiling the function in ~1000-byte chunks
    const CHUNK = 0x400; // 1024 bytes each
    let fullCode = '';
    let chunkId = 10;
    
    for (let offset = 0; offset < FUNC_SIZE; offset += CHUNK) {
        const start = TARGET_ADDR + offset;
        const end = Math.min(start + CHUNK, FUNC_END);
        console.error(`\nDecompiling chunk 0x${start.toString(16)}-0x${end.toString(16)}...`);
        
        try {
            const resp = await callTool(pending, sessionUrl, chunkId++, 'decompile', { addr: '0x' + start.toString(16) }, 30000);
            if (resp.result && resp.result.content) {
                for (const item of resp.result.content) {
                    if (item.type === 'text') {
                        const data = JSON.parse(item.text);
                        if (data.code) {
                            fullCode += `\n// === CHUNK at 0x${start.toString(16)} ===\n` + data.code + '\n';
                        }
                    }
                }
            }
        } catch (e) {
            console.error(`Chunk error: ${e.message}`);
        }
        await sleep(200);
    }

    if (fullCode) {
        fs.writeFileSync('cuitooltip_settooltip_bundle_full.txt', fullCode, 'utf8');
        console.error(`\nFull code saved: ${fullCode.length} chars`);
    }

    stream.destroy();
    process.exit(0);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
