const http = require('http');
const fs = require('fs');
const path = require('path');

const MCP_HOST = '127.0.0.1';
const MCP_PORT = 13337;
const OUT_DIR = __dirname;

function postMessage(sessionUrl, payload) {
    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: MCP_HOST, port: MCP_PORT,
            path: sessionUrl, method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
        }, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => resolve(body));
        });
        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

function connectSSE() {
    return new Promise((resolve, reject) => {
        const req = http.get('http://127.0.0.1:13337/sse', { timeout: 30000 }, (res) => {
            let sseBuffer = '';
            res.setEncoding('utf8');
            res.on('data', (chunk) => {
                sseBuffer += chunk;
                const match = sseBuffer.match(/data:\s*(\/sse\?session=[^\n]+)/);
                if (match) { resolve({ stream: res, sessionUrl: match[1].trim() }); }
            });
            res.on('error', reject);
        });
        req.on('timeout', () => { req.destroy(); reject(new Error('SSE timeout')); });
        req.on('error', reject);
    });
}

async function callTool(sessionUrl, name, args) {
    const payload = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } });
    const response = await postMessage(sessionUrl, payload);
    console.error('Response for', name, ':', response.substring(0, 500));
    try {
        const parsed = JSON.parse(response);
        return parsed;
    } catch (e) { console.error('parse error:', e.message); return null; }
}

async function main() {
    console.error('Connecting...');
    const { stream, sessionUrl } = await connectSSE();
    console.error('Session: ' + sessionUrl);
    
    // First, try to list available tools
    console.error('\nListing tools...');
    const listResult = await callTool(sessionUrl, 'list_funcs', { prefix: 'CUIToolTip::SetToolTip' });
    
    // Try to open the database
    console.error('\nTrying idalib_open...');
    const openResult = await callTool(sessionUrl, 'idalib_open', { input_path: 'C:\\Users\\jorge\\OneDrive\\Desktop\\ts\\v95 IDB leak\\v95.i64', session_id: 'v95', run_auto_analysis: false });
    
    // Now try decompile
    console.error('\nTrying decompile...');
    const decompileResult = await callTool(sessionUrl, 'decompile', { addr: '0x891c80' });
    
    stream.destroy();
    console.log('DONE');
    process.exit(0);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
