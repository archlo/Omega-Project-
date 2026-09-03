const http = require('http');
const fs = require('fs');

function connectSSE() {
    return new Promise((resolve) => {
        const req = http.get('http://127.0.0.1:13337/sse', (res) => {
            let buffer = '';
            let resolved = false;
            
            res.on('data', (chunk) => {
                buffer += chunk.toString();
                console.log('SSE chunk:', chunk.length, 'bytes');
                
                if (!resolved) {
                    const match = buffer.match(/data:\s*(\/sse\?session=[^\n]+)/);
                    if (match) {
                        resolved = true;
                        resolve({ stream: res, sessionUrl: match[1], buffer: buffer });
                    }
                }
            });
        });
    });
}

async function main() {
    console.log('Step 1: Connect to SSE...');
    const { stream, sessionUrl, buffer } = await connectSSE();
    console.log('Session:', sessionUrl);
    
    // POST decompile request
    console.log('\nStep 2: POST decompile request...');
    const postData = JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
            name: 'decompile',
            arguments: { addr: '0x864bd0' }
        }
    });
    
    const postReq = http.request({
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
        res.on('end', () => {
            console.log('POST response status:', res.statusCode);
            console.log('POST response body:', body);
        });
    });
    
    postReq.write(postData);
    postReq.end();
    
    // Now read SSE stream for the actual response
    console.log('\nStep 3: Reading SSE stream for response...');
    let responseBuffer = '';
    let found = false;
    let startTime = Date.now();
    const timeout = 90000;
    
    stream.on('data', (chunk) => {
        const text = chunk.toString();
        responseBuffer += text;
        console.log('Got chunk:', text.length, 'chars');
        
        // Look for our response
        if (!found && responseBuffer.includes('"id": 1') && responseBuffer.includes('"result"')) {
            // Try to parse the data line
            const dataMatch = responseBuffer.match(/data:\s*(\{[\s\S]*\})/);
            if (dataMatch) {
                try {
                    const data = JSON.parse(dataMatch[1]);
                    if (data.result && data.result.structuredContent) {
                        found = true;
                        const code = data.result.structuredContent.code;
                        console.log('\nSUCCESS! Got code:', code.length, 'chars');
                        
                        const output = '// CUIStat::Draw @ 0x864bd0\n// Decompiled from v95 IDB\n\n' + code;
                        fs.writeFileSync('ida_output/cuistat_Draw_clean.txt', output, 'utf8');
                        console.log('Written to cuistat_Draw_clean.txt');
                        
                        stream.destroy();
                        process.exit(0);
                    }
                } catch (e) {
                    console.log('Parse error, buffer might be incomplete:', e.message);
                }
            }
        }
    });
    
    // Check timeout
    const checkTimeout = setInterval(() => {
        if (Date.now() - startTime > timeout) {
            console.log('\nTimeout! Buffer size:', responseBuffer.length);
            console.log('Buffer preview:', responseBuffer.substring(0, 500));
            clearInterval(checkTimeout);
            stream.destroy();
            process.exit(1);
        }
    }, 1000);
}

main().catch(console.error);
