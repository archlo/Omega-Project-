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
  
  try {
    // Try to parse as JSON directly (structuredContent format)
    const parsed = JSON.parse(raw);
    
    // Check if it has structuredContent.code
    if (parsed.structuredContent && parsed.structuredContent.code) {
      fs.writeFileSync(outPath, parsed.structuredContent.code, 'utf8');
      console.log(`${f.out}: ${parsed.structuredContent.code.length} chars (structuredContent)`);
      continue;
    }
    
    // Check if it has result.content (JSON-RPC format)
    const content = parsed.result?.content;
    if (content && Array.isArray(content)) {
      for (const item of content) {
        if (item.type === 'text') {
          const inner = JSON.parse(item.text);
          if (inner.code) {
            fs.writeFileSync(outPath, inner.code, 'utf8');
            console.log(`${f.out}: ${inner.code.length} chars (result.content)`);
          }
          break;
        }
      }
      continue;
    }
    
    console.error(`Unknown format for ${f.raw}`);
  } catch (e) {
    console.error(`Error parsing ${f.raw}:`, e.message);
    
    // For the itemoption file which has the SSE prefix, try manual extraction
    const lines = raw.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('{"jsonrpc"')) {
        try {
          const parsed = JSON.parse(trimmed);
          const content = parsed.result?.content;
          if (content && Array.isArray(content)) {
            for (const item of content) {
              if (item.type === 'text') {
                const inner = JSON.parse(item.text);
                if (inner.code) {
                  fs.writeFileSync(outPath, inner.code, 'utf8');
                  console.log(`${f.out}: ${inner.code.length} chars (jsonrpc line)`);
                }
                break;
              }
            }
          }
        } catch (e2) {
          console.error(`  Also failed to parse jsonrpc line:`, e2.message);
        }
        break;
      }
    }
  }
}
