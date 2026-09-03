const http = require('http');
const fs = require('fs');

const MCP_HOST = '127.0.0.1';
const MCP_PORT = 13337;
const ADDR = '0x84ed90';
const OUT_FILE = __dirname + '/cuiskill_Draw_pure.txt';

function mcpCall(sessionUrl, method, args) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            jsonrpc: '2.0',
            id: Date.now(),
            method: 'tools/call',
            params: {
                name: method,
                arguments: args
            }
        });
        
        const req = http.request({
            hostname: MCP_HOST,
            port: MCP_PORT,
            path: sessionUrl,
            method: 'POST',
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

function connectSSE() {
    return new Promise((resolve, reject) => {
        const req = http.get(`http://${MCP_HOST}:${MCP_PORT}/sse`, { timeout: 15000 }, (res) => {
            let buffer = '';
            res.on('data', (chunk) => {
                buffer += chunk.toString();
                const match = buffer.match(/data:\s*(\/sse\?session=[^\n]+)/);
                if (match) {
                    resolve({ stream: res, sessionUrl: match[1].trim() });
                }
            });
            res.on('error', reject);
        });
        req.on('timeout', () => { req.destroy(); reject(new Error('SSE timeout')); });
        req.on('error', reject);
    });
}

async function main() {
    console.error('Connecting to IDA MCP...');
    const { stream, sessionUrl } = await connectSSE();
    console.error('Session: ' + sessionUrl);
    
    // Decompile CUISkill::Draw
    console.error('Decompiling CUISkill::Draw at ' + ADDR + '...');
    const response = await mcpCall(sessionUrl, 'decompile', {
        addr: ADDR,
        expanded: true
    });
    
    console.error('Response length: ' + response.length);
    
    // Try to parse the response
    let parsed;
    try {
        parsed = JSON.parse(response);
    } catch (e) {
        console.error('Failed to parse JSON: ' + e.message);
        console.error('Response preview: ' + response.slice(0, 500));
        stream.destroy();
        process.exit(1);
    }
    
    // Extract code from result
    let code = '';
    if (parsed.result && parsed.result.content && Array.isArray(parsed.result.content)) {
        for (const item of parsed.result.content) {
            if (item.type === 'text') {
                code = item.text;
                break;
            }
        }
    } else if (parsed.result && parsed.result.code) {
        code = parsed.result.code;
    } else if (typeof parsed.result === 'string') {
        code = parsed.result;
    }
    
    if (!code) {
        console.error('No code found. Full response:');
        console.error(JSON.stringify(parsed, null, 2).slice(0, 3000));
        stream.destroy();
        process.exit(1);
    }
    
    // Check for truncation
    if (code.includes('[') && code.includes('chars total]')) {
        console.error('WARNING: Response may be truncated by MCP server');
    }
    
    console.error('Code length: ' + code.length + ' chars');
    
    // Write to file
    const output = '// CUISkill::Draw @ 0x84ed90\n// Decompiled from v95 IDB\n\n' + code;
    fs.writeFileSync(OUT_FILE, output, 'utf8');
    console.log('SUCCESS: Wrote ' + output.length + ' chars to ' + OUT_FILE);
    
    stream.destroy();
    process.exit(0);
}

main().catch(e => {
    console.error('Fatal: ' + e.message);
    process.exit(1);
});
