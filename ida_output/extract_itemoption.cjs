const fs = require('fs');

const raw = fs.readFileSync('ida_output/cuitooltip_settooltip_itemoption_raw.json', 'utf8');

// Find the SSE line and the JSON-RPC line
const lines = raw.split('\n');
let jsonLine = '';
for (const line of lines) {
  const trimmed = line.trim();
  if (trimmed.startsWith('{"jsonrpc"')) {
    jsonLine = trimmed;
    break;
  }
}

if (!jsonLine) {
  console.error('No JSON-RPC line found');
  process.exit(1);
}

// Try to parse the JSON-RPC response
try {
  const parsed = JSON.parse(jsonLine);
  const content = parsed.result?.content;
  if (content && Array.isArray(content)) {
    for (const item of content) {
      if (item.type === 'text') {
        const inner = JSON.parse(item.text);
        if (inner.code) {
          fs.writeFileSync('ida_output/cuitooltip_settooltip_itemoption_clean.txt', inner.code, 'utf8');
          console.log('Extracted code:', inner.code.length, 'chars');
        }
        break;
      }
    }
  }
} catch (e) {
  console.log('JSON parse failed, trying manual extraction...');
  
  // Find the code field manually
  const codeStart = jsonLine.indexOf('"code":"');
  if (codeStart === -1) {
    console.error('No code field found');
    process.exit(1);
  }
  
  const codeContent = jsonLine.substring(codeStart + 8);
  
  // The code ends with ","refs" but since the JSON is truncated, we might not have that
  // Let's find the last complete line of code
  let code = codeContent;
  
  // Remove any trailing JSON artifacts
  const refsIdx = code.indexOf('","refs"');
  if (refsIdx !== -1) {
    code = code.substring(0, refsIdx);
  }
  
  // Unescape the JSON string
  code = code.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  
  // Find the last complete line (ends with */)
  const lines = code.split('\n');
  let lastComplete = lines.length - 1;
  while (lastComplete >= 0 && !lines[lastComplete].trim().endsWith('*/')) {
    lastComplete--;
  }
  
  if (lastComplete >= 0) {
    code = lines.slice(0, lastComplete + 1).join('\n');
  }
  
  fs.writeFileSync('ida_output/cuitooltip_settooltip_itemoption_clean.txt', code, 'utf8');
  console.log('Extracted code (manual):', code.length, 'chars');
}
