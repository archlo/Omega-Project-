const http = require('http');

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
            hostname: '127.0.0.1',
            port: 13337,
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
        
        req.write(postData);
        req.end();
    });
}

function connectSSE() {
    return new Promise((resolve) => {
        const req = http.get('http://127.0.0.1:13337/sse', (res) => {
            let buffer = '';
            
            res.on('data', (chunk) => {
                buffer += chunk.toString();
                
                // Look for endpoint
                const match = buffer.match(/data:\s*(\/sse\?session=[^\n]+)/);
                if (match) {
                    resolve({ stream: res, sessionUrl: match[1] });
                }
            });
        });
    });
}

async function main() {
    console.log('Connecting to IDA MCP...');
    const { stream, sessionUrl } = await connectSSE();
    console.log('Session:', sessionUrl);
    
    // First try with expanded output
    console.log('\nTrying decompile with expanded option...');
    const response1 = await mcpCall(sessionUrl, 'decompile', {
        addr: '0x864bd0',
        expanded: true
    });
    
    console.log('Response length:', response1.length);
    
    // Parse response
    const dataMatch = response1.match(/"code":\s*"((?:[^"\\]|\\.)*)"/);
    if (dataMatch) {
        let code = dataMatch[1];
        // Unescape
        code = code.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        console.log('Code length:', code.length);
        
        if (code.includes('... [48875 chars total]')) {
            console.log('Response is truncated by MCP server');
            
            // Try getting basic blocks to understand structure
            console.log('\nGetting basic blocks...');
            const bbResponse = await mcpCall(sessionUrl, 'basic_blocks', {
                addr: '0x864bd0'
            });
            console.log('Basic blocks response length:', bbResponse.length);
            console.log('Basic blocks preview:', bbResponse.substring(0, 500));
        } else {
            // Write full code
            const fs = require('fs');
            const output = '// CUIStat::Draw @ 0x864bd0\n// Decompiled from v95 IDB\n\n' + code;
            fs.writeFileSync('ida_output/cuistat_Draw_clean.txt', output, 'utf8');
            console.log('Written full code to cuistat_Draw_clean.txt');
        }
    }
    
    stream.destroy();
    process.exit(0);
}

main().catch(console.error);
