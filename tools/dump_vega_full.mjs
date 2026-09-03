import { WzPackage } from '../dist/wz/WzPackage.js';

const ui = await WzPackage.OpenBaseAsync('C:/Users/jorge/OneDrive/Desktop/ts/wz_client', 'UI', 95);
const vega = ui.GetItem('UIWindow.img/VegaSpell');
const items = vega?.Items;
if (items) {
  const keys = Object.keys(items).sort();
  console.log('All VegaSpell children (' + keys.length + '):');
  for (const k of keys) {
    const v = items[k];
    const typeStr = v?.constructor?.name || typeof v;
    let valStr = '';
    if (typeof v === 'number') valStr = ' = ' + v;
    else if (typeof v === 'bigint') valStr = ' = ' + v;
    else if (typeof v === 'string') valStr = ' = "' + v.slice(0, 80) + '"';
    console.log('  ' + k + ' -> ' + typeStr + valStr);
    if (v && typeof v.Items === 'object' && v.Items !== null) {
      const subKeys = Object.keys(v.Items).sort();
      if (subKeys.length > 0) {
        for (const sk of subKeys) {
          const sv = v.Items[sk];
          const st = sv?.constructor?.name || typeof sv;
          let svs = '';
          if (typeof sv === 'number') svs = ' = ' + sv;
          else if (typeof sv === 'bigint') svs = ' = ' + sv;
          else if (typeof sv === 'string') svs = ' = "' + sv.slice(0, 80) + '"';
          console.log('    ' + sk + ' -> ' + st + svs);
        }
      }
    }
  }
  const numericKeys = keys.filter(k => /^\d+$/.test(k));
  if (numericKeys.length > 0) {
    console.log('\nNumeric children (scroll list):');
    for (const k of numericKeys) {
      const child = items[k];
      if (child && typeof child.Items === 'object') {
        const itVal = child.Items['it'];
        console.log('  ' + k + '/it = ' + itVal);
      }
    }
  } else {
    console.log('\nNo numeric children found - scroll list absent from NX');
  }
}
// ui.Close();
