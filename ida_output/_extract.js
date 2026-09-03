const fs = require('fs');
const raw = fs.readFileSync('C:/Users/jorge/OneDrive/Desktop/ts/ida_output/cuistat_CreateTip.txt', 'utf8').replace(/^\uFEFF/, '');
const start = raw.indexOf('"code":"') + 8;
const end = raw.indexOf('","refs"');
const code = raw.substring(start, end).split('\\n').join('\n').split('\\t').join('\t').split('\\"').join('"');
fs.writeFileSync('C:/Users/jorge/OneDrive/Desktop/ts/ida_output/cuistat_CreateTip_decompiled.txt', code, 'utf8');
console.log('Written', code.length, 'chars');
