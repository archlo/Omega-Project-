const http = require('http');
const fs = require('fs');

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
    
    // Try standard decompile
    console.log('\nDecompiling CUIStat::Draw...');
    const response = await mcpCall(sessionUrl, 'decompile', {
        addr: '0x864bd0'
    });
    
    console.log('Response length:', response.length);
    
    // Parse - the response contains the full JSON
    try {
        const data = JSON.parse(response);
        
        if (data.result && data.result.structuredContent) {
            const code = data.result.structuredContent.code;
            console.log('Code length:', code.length);
            
            // Check for truncation marker
            const truncMatch = code.match(/\.\.\. \[(\d+) chars total\]/);
            if (truncMatch) {
                const totalChars = parseInt(truncMatch[1]);
                console.log('Response truncated by MCP server');
                console.log('Got:', code.length - truncMatch[0].length, 'chars');
                console.log('Total:', totalChars, 'chars');
                console.log('Missing:', totalChars - (code.length - truncMatch[0].length), 'chars');
                
                // The MCP server truncates large responses
                // Let's check refs to understand what the function calls
                if (data.result.structuredContent.refs) {
                    console.log('\nFunction references:');
                    data.result.structuredContent.refs.forEach(ref => {
                        console.log(`  ${ref.addr}: ${ref.name}`);
                    });
                }
            } else {
                // Full code - write to file
                const output = '// CUIStat::Draw @ 0x864bd0\n// Decompiled from v95 IDB\n\n' + code;
                fs.writeFileSync('ida_output/cuistat_Draw_clean.txt', output, 'utf8');
                console.log('Written full code to cuistat_Draw_clean.txt');
            }
        } else {
            console.log('Unexpected response structure');
            console.log(JSON.stringify(data, null, 2));
        }
    } catch (e) {
        console.log('Parse error:', e.message);
        console.log('Raw response:', response.substring(0, 500));
    }
    
    stream.destroy();
    process.exit(0);
}

main().catch(console.error);
