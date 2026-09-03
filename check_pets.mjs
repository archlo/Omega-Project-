import { WzPackage } from './src/wz/WzPackage.js';

try {
  const pkg = await WzPackage.OpenBase('./wz_client', 'Character.nx');
  console.error('Package opened');
  const pet = pkg.getNode('Pet');
  if (!pet) {
    console.error('No Pet dir found');
    process.exit(0);
  }
  const kids = pet.getChildren();
  console.error('Pet count:', kids.length);
  for (const name of kids.slice(0, 5)) {
    console.error('Checking:', name);
    const pn = pkg.getNode('Pet/' + name);
    if (pn) {
      const children = pn.getChildren();
      console.error('  Children:', JSON.stringify(children.slice(0, 15)));
      const info = pn.getChild('info');
      if (info) {
        const ic = info.getChildren();
        console.error('  info:', JSON.stringify(ic.slice(0, 15)));
      }
    }
  }
  process.exit(0);
} catch(e) {
  console.error('Error:', e);
  process.exit(1);
}
