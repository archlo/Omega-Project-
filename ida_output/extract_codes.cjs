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
  
  // Try to find the JSON result in the raw content
  // The format might be: /sse?session=...\n{"jsonrpc":"2.0","result":...}
  // Or it might be just the JSON
  
  let jsonStr = raw;
  
  // If it starts with /sse, skip the first line
  const lines = raw.split('\n');
  for (const line of lines) {
    if (line.trim().startsWith('{')) {
      jsonStr = line.trim();
      break;
    }
  }
  
  try {
    const parsed = JSON.parse(jsonStr);
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
  }
}
