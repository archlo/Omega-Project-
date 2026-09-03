const fs = require('fs');

const raw = fs.readFileSync('ida_output/cuitooltip_settooltip_itemoption_raw.json', 'utf8');

// The file has:
// Line 0: SSE session URL
// Line 1: JSON-RPC response (truncated)
// Line 2: empty

const lines = raw.split('\n');
const jsonLine = lines[1].trim();

// Find the code field manually
const codeStart = jsonLine.indexOf('"code":"');
if (codeStart === -1) {
  console.error('No code field found');
  process.exit(1);
}

const codeContent = jsonLine.substring(codeStart + 8);

// The code ends with ","refs" but since the JSON is truncated, we might not have that
let code = codeContent;

// Remove any trailing JSON artifacts
const refsIdx = code.indexOf('","refs"');
if (refsIdx !== -1) {
  code = code.substring(0, refsIdx);
}

// Unescape the JSON string
code = code.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');

// Find the last complete line (ends with */)
const codeLines = code.split('\n');
let lastComplete = codeLines.length - 1;
while (lastComplete >= 0 && !codeLines[lastComplete].trim().endsWith('*/')) {
  lastComplete--;
}

if (lastComplete >= 0) {
  code = codeLines.slice(0, lastComplete + 1).join('\n');
}

fs.writeFileSync('ida_output/cuitooltip_settooltip_itemoption_clean.txt', code, 'utf8');
console.log('Extracted code:', code.length, 'chars');
console.log('First 500 chars:', code.substring(0, 500));
