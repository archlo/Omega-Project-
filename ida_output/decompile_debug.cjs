const http = require('http');
const fs = require('fs');
const path = require('path');

const MCP_HOST = '127.0.0.1';
const MCP_PORT = 13337;
const OUT_DIR = __dirname;

const TARGETS = [
  { addr: '0x891c80', name: 'SetToolTip_ItemOption' },
  { addr: '0x89e1f0', name: 'SetToolTip_MacroSysSkill' },
  { addr: '0x89d5f0', name: 'SetToolTip_SlotInc' },
  { addr: '0x89dcf0', name: 'SetToolTip_EquipExt' },
];

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

async function decompile(sessionUrl, addr) {
    const payload = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'decompile', arguments: { addr } } });
    const response = await postMessage(sessionUrl, payload);
    console.error('Raw response length:', response.length);
    console.error('Raw response (first 2000):', response.substring(0, 2000));
    try {
        const parsed = JSON.parse(response);
        if (parsed.result && parsed.result.content) {
            for (const item of parsed.result.content) {
                if (item.type === 'text') {
                    console.error('Item text length:', item.text.length);
                    console.error('Item text (first 500):', item.text.substring(0, 500));
                    return JSON.parse(item.text);
                }
            }
        }
        console.error('Parsed result:', JSON.stringify(parsed, null, 2).substring(0, 1000));
    } catch (e) { console.error('decompile parse error:', e.message); }
    return null;
}

async function main() {
    console.error('Connecting...');
    const { stream, sessionUrl } = await connectSSE();
    console.error('Session: ' + sessionUrl);
    
    // Just try the first one to see what happens
    const target = TARGETS[0];
    console.error('\nDecompiling ' + target.name + ' at ' + target.addr + '...');
    try {
        const result = await decompile(sessionUrl, target.addr);
    } catch (e) { console.error('  ERROR: ' + e.message); }
    
    stream.destroy();
    console.log('DONE');
    process.exit(0);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
