const fs = require('fs');

const raw = fs.readFileSync('ida_output/cuitooltip_settooltip_itemoption_raw.json', 'utf8');
const lines = raw.split('\n');
const jsonLine = lines[1];

// Find the "code" field
const codeIdx = jsonLine.indexOf('"code"');
console.log('code field at:', codeIdx);
if (codeIdx >= 0) {
  console.log('Context:', jsonLine.substring(codeIdx, codeIdx + 100));
  
  // Find the value start (after "code":")
  const valueStart = jsonLine.indexOf('":', codeIdx) + 2;
  console.log('Value starts at:', valueStart);
  
  // The value is a JSON string, so it starts with "
  // We need to find the matching closing "
  let i = valueStart;
  while (i < jsonLine.length && jsonLine[i] === ' ') i++;
  
  if (jsonLine[i] === '"') {
    // Find the end of the string (handle escaped quotes)
    i++;
    let code = '';
    while (i < jsonLine.length) {
      if (jsonLine[i] === '\\') {
        // Escaped character
        const next = jsonLine[i + 1];
        if (next === 'n') {
          code += '\n';
        } else if (next === '"') {
          code += '"';
        } else if (next === '\\') {
          code += '\\';
        } else {
          code += next;
        }
        i += 2;
      } else if (jsonLine[i] === '"') {
        // End of string
        break;
      } else {
        code += jsonLine[i];
        i++;
      }
    }
    
    console.log('Extracted code length:', code.length);
    fs.writeFileSync('ida_output/cuitooltip_settooltip_itemoption_clean.txt', code, 'utf8');
    console.log('Written to cuitooltip_settooltip_itemoption_clean.txt');
  }
}
