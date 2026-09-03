const fs = require('fs');
const path = require('path');

const files = [
  { raw: 'cuitooltip_settooltip_itemoption_raw.json', out: 'cuitooltip_settooltip_itemoption_clean.txt' },
  { raw: 'cuitooltip_settooltip_macrosysskill_raw.json', out: 'cuitooltip_settooltip_macrosysskill_clean.txt' },
  { raw: 'cuitooltip_settooltip_slotinc_raw.json', out: 'cuitooltip_settooltip_slotinc_clean.txt' },
  { raw: 'cuitooltip_settooltip_equipext_raw.json', out: 'cuitooltip_settooltip_equipext_clean.txt' },
];

for (const f of files) {
  const rawPath = path.join(__dirname, f.raw);
  const outPath = path.join(__dirname, f.out);
  
  if (!fs.existsSync(rawPath)) {
    console.error('Missing:', f.raw);
    continue;
  }
  
  const raw = fs.readFileSync(rawPath, 'utf8');
  
  // Find the JSON-RPC response line (starts with {)
  const lines = raw.split('\n');
  let jsonLine = '';
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('{"jsonrpc"') || trimmed.startsWith('{ "jsonrpc"')) {
      jsonLine = trimmed;
      break;
    }
  }
  
  if (!jsonLine) {
    console.error(`No JSON-RPC response found in ${f.raw}`);
    continue;
  }
  
  try {
    const parsed = JSON.parse(jsonLine);
    const content = parsed.result?.content;
    if (content && Array.isArray(content)) {
      for (const item of content) {
        if (item.type === 'text') {
          const inner = JSON.parse(item.text);
          if (inner.code) {
            fs.writeFileSync(outPath, inner.code, 'utf8');
            console.log(`${f.out}: ${inner.code.length} chars`);
          }
          break;
        }
      }
    }
  } catch (e) {
    console.error(`Error parsing ${f.raw}:`, e.message);
    // Try to extract code manually using regex
    const codeMatch = jsonLine.match(/"code":"([\s\S]*?)(?","refs"|$)/);
    if (codeMatch) {
      const code = codeMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
      fs.writeFileSync(outPath, code, 'utf8');
      console.log(`${f.out}: ${code.length} chars (regex extracted)`);
    }
  }
}
