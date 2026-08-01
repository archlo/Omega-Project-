import http from 'http';
import fs from 'fs';

const MCP_HOST = '127.0.0.1';
const MCP_PORT = 13337;
const TARGET = '0x898f70';
const FUNC_SIZE = 0x212c;
const FUNC_END = TARGET + FUNC_SIZE;

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

function getFullOutput(resp) {
    // Check if there's a download URL in _meta
    if (resp.result && resp.result._meta && resp.result._meta.ida_mcp) {
        const meta = resp.result._meta.ida_mcp;
        if (meta.output_truncated && meta.download_url) {
            return { truncated: true, downloadUrl: meta.download_url, totalChars: meta.total_chars };
        }
    }
    // Try to get text content
    if (resp.result && resp.result.content) {
        for (const item of resp.result.content) {
            if (item.type === 'text') {
                try { return { data: JSON.parse(item.text) }; } catch(e) { return { text: item.text }; }
            }
        }
    }
    return null;
}

async function downloadUrl(url) {
    return new Promise((resolve, reject) => {
        http.get(url, { timeout: 30000 }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

async function main() {
    const pending = new Map();
    const { stream, sessionUrl } = await connectSSE((msg) => {
        if (msg.id !== undefined && pending.has(msg.id)) pending.get(msg.id).resolve(msg);
    });

    // 1. Get callees with proper addrs parameter
    console.error('Getting callees...');
    try {
        const cal = await callTool(pending, sessionUrl, 'callees', { addrs: [TARGET] });
        fs.writeFileSync('callees_bundle.json', JSON.stringify(cal, null, 2), 'utf8');
        const output = getFullOutput(cal);
        if (output && output.truncated) {
            console.error('Callees truncated, downloading...');
            const full = await downloadUrl(output.downloadUrl);
            fs.writeFileSync('callees_bundle_full.json', full, 'utf8');
            console.error('Downloaded callees: ' + full.length + ' chars');
        } else if (output && output.data) {
            console.error('Callees:', JSON.stringify(output.data).substring(0, 5000));
        }
    } catch(e) { console.error('Callees error:', e.message); }

    await sleep(500);

    // 2. Try callgraph
    console.error('\nGetting callgraph...');
    try {
        const cg = await callTool(pending, sessionUrl, 'callgraph', { addrs: [TARGET] });
        fs.writeFileSync('callgraph_bundle.json', JSON.stringify(cg, null, 2), 'utf8');
        const output = getFullOutput(cg);
        if (output && output.truncated) {
            console.error('Callgraph truncated, downloading...');
            const full = await downloadUrl(output.downloadUrl);
            fs.writeFileSync('callgraph_bundle_full.json', full, 'utf8');
            console.error('Downloaded callgraph: ' + full.length + ' chars');
        } else if (output && output.data) {
            console.error('Callgraph:', JSON.stringify(output.data).substring(0, 5000));
        }
    } catch(e) { console.error('Callgraph error:', e.message); }

    await sleep(500);

    // 3. Get the full decompiled code via download URL
    console.error('\nGetting full decompile via download...');
    try {
        const dc = await callTool(pending, sessionUrl, 'decompile', { addr: TARGET });
        const output = getFullOutput(dc);
        if (output && output.truncated) {
            console.error('Decompile truncated, downloading from:', output.downloadUrl);
            const full = await downloadUrl(output.downloadUrl);
            fs.writeFileSync('cuitooltip_settooltip_bundle_decompiled.json', full, 'utf8');
            console.error('Downloaded decompile: ' + full.length + ' chars');
            
            // Parse and extract code
            try {
                const parsed = JSON.parse(full);
                if (parsed.code) {
                    fs.writeFileSync('cuitooltip_settooltip_bundle_code_full.txt', parsed.code, 'utf8');
                    console.error('Code extracted: ' + parsed.code.length + ' chars');
                }
            } catch(e) {
                // Maybe it's not JSON, save as-is
                fs.writeFileSync('cuitooltip_settooltip_bundle_code_full.txt', full, 'utf8');
                console.error('Saved raw: ' + full.length + ' chars');
            }
        }
    } catch(e) { console.error('Decompile download error:', e.message); }

    stream.destroy();
    process.exit(0);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
