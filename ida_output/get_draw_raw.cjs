const http = require('http');
const fs = require('fs');

// Connect to SSE and capture raw bytes
const req = http.get('http://127.0.0.1:13337/sse', (res) => {
    console.log('Connected to SSE');
    console.log('Status:', res.statusCode);
    console.log('Headers:', JSON.stringify(res.headers));
    
    let chunks = [];
    let sessionUrl = '';
    let gotEndpoint = false;
    
    res.on('data', (chunk) => {
        chunks.push(chunk);
        const text = chunk.toString();
        console.log('Chunk:', chunk.length, 'bytes');
        
        if (!gotEndpoint && text.includes('data:')) {
            const match = text.match(/data:\s*(\/sse\?session=[^\n]+)/);
            if (match) {
                gotEndpoint = true;
                sessionUrl = match[1];
                console.log('Session:', sessionUrl);
                
                // POST request
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
                }, (postRes) => {
                    let body = '';
                    postRes.on('data', (d) => body += d);
                    postRes.on('end', () => {
                        console.log('POST response:', postRes.statusCode);
                    });
                });
                
                postReq.write(postData);
                postReq.end();
            }
        } else if (gotEndpoint) {
            // Save all chunks after endpoint
            const allData = Buffer.concat(chunks).toString();
            
            // Check for response
            if (allData.includes('"id": 1') && allData.includes('"result"')) {
                console.log('\nGot response!');
                console.log('Total bytes:', allData.length);
                
                // Save raw response
                fs.writeFileSync('ida_output/sse_raw_response.txt', allData, 'utf8');
                console.log('Saved raw response to sse_raw_response.txt');
                
                // Try to extract code
                const codeMatch = allData.match(/"code":\s*"((?:[^"\\]|\\.)*)"/);
                if (codeMatch) {
                    let code = codeMatch[1];
                    code = code.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
                    console.log('Code length:', code.length);
                    
                    const output = '// CUIStat::Draw @ 0x864bd0\n// Decompiled from v95 IDB\n\n' + code;
                    fs.writeFileSync('ida_output/cuistat_Draw_clean.txt', output, 'utf8');
                    console.log('Written to cuistat_Draw_clean.txt');
                }
                
                res.destroy();
                process.exit(0);
            }
        }
    });
    
    res.on('end', () => {
        console.log('SSE connection ended');
    });
    
    // Timeout
    setTimeout(() => {
        console.log('Timeout - saving what we have');
        const allData = Buffer.concat(chunks).toString();
        fs.writeFileSync('ida_output/sse_timeout.txt', allData, 'utf8');
        console.log('Saved timeout data');
        process.exit(1);
    }, 90000);
}).on('error', (e) => {
    console.error('Error:', e.message);
});
