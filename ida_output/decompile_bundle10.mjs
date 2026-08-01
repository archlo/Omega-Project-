import http from 'http';
import fs from 'fs';

const MCP_HOST = '127.0.0.1';
const MCP_PORT = 13337;
const TARGET = '0x898f70';

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

function connectSSE(onMessage) {
    return new Promise((resolve, reject) => {
        const req = http.get(`http://${MCP_HOST}:${MCP_PORT}/sse`, { timeout: 300000 }, (res) => {
            let buf = '', sessionUrl = null;
            res.setEncoding('utf8');
            res.on('data', (chunk) => {
                buf += chunk;
                if (!sessionUrl) {
                    const m = buf.match(/data:\s*(\/sse\?session=[^\n]+)/);
                    if (m) { sessionUrl = m[1].trim(); console.error('Session: ' + sessionUrl); resolve({ stream: res, sessionUrl }); }
                }
                const evts = buf.split('\n\n'); buf = evts.pop() || '';
                for (const evt of evts) {
                    const dm = evt.match(/data:\s*(.*)/s);
                    if (dm) { try { onMessage(JSON.parse(dm[1])); } catch(e) {} }
                }
            });
            res.on('error', reject);
        });
        req.on('timeout', () => { req.destroy(); reject(new Error('SSE timeout')); });
        req.on('error', reject);
    });
}

let rpcId = 0;
async function callTool(pending, sessionUrl, tool, args, timeout = 60000) {
    const id = ++rpcId;
    const p = new Promise((res, rej) => {
        pending.set(id, { resolve: res, reject: rej });
        setTimeout(() => { pending.delete(id); rej(new Error(`timeout for ${tool}`)); }, timeout);
    });
    await postToSession(sessionUrl, { jsonrpc: '2.0', id, method: 'tools/call', params: { name: tool, arguments: args } });
    return p;
}

function getText(resp) {
    if (!resp.result || !resp.result.content) return null;
    for (const item of resp.result.content) {
        if (item.type === 'text') return item.text;
    }
    return null;
}

async function main() {
    const pending = new Map();
    const { stream, sessionUrl } = await connectSSE((msg) => {
        if (msg.id !== undefined && pending.has(msg.id)) pending.get(msg.id).resolve(msg);
    });

    // 1. Callees with addrs array
    console.error('Getting callees...');
    try {
        const cal = await callTool(pending, sessionUrl, 'callees', { addrs: [TARGET] });
        fs.writeFileSync('callees_bundle.json', JSON.stringify(cal, null, 2), 'utf8');
        const t = getText(cal);
        if (t) {
            const parsed = JSON.parse(t);
            console.error('Callees count:', Array.isArray(parsed) ? parsed.length : 'not array');
            // Print all callee names
            if (Array.isArray(parsed)) {
                for (const c of parsed) {
                    console.error(`  0x${c.addr} ${c.name || ''}`);
                }
            } else {
                console.error('Callees:', t.substring(0, 5000));
            }
        }
    } catch(e) { console.error('Callees error:', e.message); }

    await sleep(500);

    // 2. Xrefs to
    console.error('\nGetting xrefs_to...');
    try {
        const xr = await callTool(pending, sessionUrl, 'xrefs_to', { addrs: [TARGET] });
        fs.writeFileSync('xrefs_bundle.json', JSON.stringify(xr, null, 2), 'utf8');
        const t = getText(xr);
        if (t) console.error('Xrefs:', t.substring(0, 3000));
    } catch(e) { console.error('Xrefs error:', e.message); }

    await sleep(500);

    // 3. List available tools
    console.error('\nListing tools...');
    try {
        const tl = await callTool(pending, sessionUrl, 'tools/list', {});
        const t = getText(tl);
        if (t) {
            const parsed = JSON.parse(t);
            if (parsed.tools) {
                console.error('Available tools:', parsed.tools.map(x => x.name).join(', '));
            }
        }
    } catch(e) { console.error('Tools list error:', e.message); }

    await sleep(500);

    // 4. Try getting the function body with search_text for StringPool calls
    console.error('\nSearching for StringPool references in the function...');
    try {
        const st = await callTool(pending, sessionUrl, 'search_text', { text: 'StringPool', start_addr: TARGET, end_addr: '0x89b0a0' });
        const t = getText(st);
        if (t) console.error('StringPool refs:', t.substring(0, 3000));
    } catch(e) { console.error('Search error:', e.message); }

    stream.destroy();
    process.exit(0);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
