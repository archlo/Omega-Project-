const http = require('http');
const fs = require('fs');
const path = require('path');

const MCP_HOST = '127.0.0.1';
const MCP_PORT = 13337;
const OUT_DIR = __dirname;

const TARGETS = [
  { addr: '0x8a5670', name: 'SetToolTip_Equip' },
  { addr: '0x898f70', name: 'SetToolTip_Bundle' },
  { addr: '0x898700', name: 'SetToolTip_Pet' },
  { addr: '0x8a2500', name: 'SetToolTip_Skill' },
  { addr: null, name: 'SetToolTip_Ring' },
  { addr: null, name: 'SetToolTip_SetItem' },
  { addr: null, name: 'SetToolTip_SetItem_Basic' },
  { addr: null, name: 'SetToolTip_Equip_Basic' },
  { addr: null, name: 'SetToolTip_Equip2' },
  { addr: null, name: 'SetToolTip_EquipExt' },
  { addr: null, name: 'SetToolTip_SlotInc' },
  { addr: null, name: 'SetToolTip_ItemOption' },
  { addr: null, name: 'SetToolTip_MacroSysSkill' },
  { addr: null, name: 'SetToolTip_PartyAdver' },
  { addr: null, name: 'SetToolTip_PartyQuestRankString' },
  { addr: null, name: 'SetToolTip_WorldMap' },
  { addr: null, name: 'SetToolTip_String2' },
  { addr: null, name: 'SetToolTip_String_MultiLine' },
  { addr: null, name: 'DrawToolTip_Equip' },
  { addr: null, name: 'DrawOptionInfo' },
  { addr: null, name: 'AddToolTip_SetItem' },
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

async function listFuncs(sessionUrl, prefix) {
    const payload = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'list_funcs', arguments: { prefix } } });
    const response = await postMessage(sessionUrl, payload);
    try {
        const parsed = JSON.parse(response);
        if (parsed.result && parsed.result.content) {
            for (const item of parsed.result.content) {
                if (item.type === 'text') return JSON.parse(item.text);
            }
        }
    } catch (e) { console.error('listFuncs parse error:', e.message); }
    return null;
}

async function decompile(sessionUrl, addr) {
    const payload = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'decompile', arguments: { addr } } });
    const response = await postMessage(sessionUrl, payload);
    try {
        const parsed = JSON.parse(response);
        if (parsed.result && parsed.result.content) {
            for (const item of parsed.result.content) {
                if (item.type === 'text') return JSON.parse(item.text);
            }
        }
    } catch (e) { console.error('decompile parse error:', e.message); }
    return null;
}

async function main() {
    console.error('Connecting...');
    const { stream, sessionUrl } = await connectSSE();
    console.error('Session: ' + sessionUrl);
    
    console.error('\nListing CUIToolTip:: functions...');
    const funcList = await listFuncs(sessionUrl, 'CUIToolTip::');
    if (funcList) {
        const funcs = funcList.funcs || funcList.data || funcList;
        if (Array.isArray(funcs)) {
            for (const f of funcs) {
                console.error('  ' + f.addr + ' ' + f.name);
                for (const t of TARGETS) {
                    if (t.addr === null && f.name && f.name.includes(t.name)) {
                        t.addr = f.addr;
                        console.error('  -> Matched ' + t.name + ' at ' + f.addr);
                    }
                }
            }
        }
    }
    
    for (const target of TARGETS) {
        if (!target.addr) { console.error('\nSkipping ' + target.name + ' - no address'); continue; }
        const outFile = path.join(OUT_DIR, 'cuitooltip_' + target.name.toLowerCase() + '.txt');
        if (fs.existsSync(outFile)) { console.error('\nSkipping ' + target.name + ' - exists'); continue; }
        console.error('\nDecompiling ' + target.name + ' at ' + target.addr + '...');
        try {
            const result = await decompile(sessionUrl, target.addr);
            if (result) { fs.writeFileSync(outFile, JSON.stringify(result, null, 2), 'utf8'); console.error('  OK: ' + (result.code ? result.code.length : 0) + ' chars'); }
            else { console.error('  FAILED'); }
        } catch (e) { console.error('  ERROR: ' + e.message); }
        await new Promise(r => setTimeout(r, 300));
    }
    
    stream.destroy();
    console.log('DONE');
    process.exit(0);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
