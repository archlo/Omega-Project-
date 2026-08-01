const http = require('http');
const fs = require('fs');

// Connect to SSE
const req = http.get('http://127.0.0.1:13337/sse', (res) => {
    console.log('Connected to SSE');
    
    let buffer = '';
    let sessionUrl = '';
    let gotEndpoint = false;
    
    res.on('data', (chunk) => {
        buffer += chunk.toString();
        
        if (!gotEndpoint) {
            // Look for endpoint
            const lines = buffer.split('\n');
            for (const line of lines) {
                if (line.startsWith('data:')) {
                    sessionUrl = line.substring(5).trim();
                    gotEndpoint = true;
                    console.log('Session:', sessionUrl);
                    
                    // Now POST the decompile request
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
                        console.log('POST status:', postRes.statusCode);
                        postRes.resume();
                    });
                    
                    postReq.write(postData);
                    postReq.end();
                    break;
                }
            }
        } else {
            // Look for response
            if (buffer.includes('"id": 1') && buffer.includes('"result"')) {
                // Found response
                const dataMatch = buffer.match(/data:\s*(\{.*\})/s);
                if (dataMatch) {
                    try {
                        const data = JSON.parse(dataMatch[1]);
                        if (data.result && data.result.structuredContent) {
                            const code = data.result.structuredContent.code;
                            console.log('Got code:', code.length, 'chars');
                            
                            const output = '// CUIStat::Draw @ 0x864bd0\n// Decompiled from v95 IDB\n\n' + code;
                            fs.writeFileSync('ida_output/cuistat_Draw_clean.txt', output, 'utf8');
                            console.log('Written to cuistat_Draw_clean.txt');
                            process.exit(0);
                        }
                    } catch (e) {
                        console.log('Parse error:', e.message);
                    }
                }
            }
        }
    });
    
    res.on('end', () => {
        console.log('SSE connection ended');
    });
    
    // Timeout
    setTimeout(() => {
        console.log('Timeout');
        process.exit(1);
    }, 90000);
}).on('error', (e) => {
    console.error('Error:', e.message);
});
