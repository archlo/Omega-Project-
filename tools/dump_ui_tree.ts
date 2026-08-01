import { WzPackage } from '../src/wz/WzPackage.js';
import { WzCanvas } from '../src/wz/WzCanvas.js';

const dir = 'C:/Users/jorge/OneDrive/Desktop/ts/wz_client';
const pkg = WzPackage.OpenBase(dir, 'UI');

// Navigate to chatSpace
const bar = pkg.GetItem('StatusBar2.img/mainBar');
console.log('mainBar:', bar?.constructor?.name);

const chatSpace = (bar as any)?.Get?.('chatSpace');
console.log('chatSpace:', chatSpace?.constructor?.name);
console.log('chatSpace instanceof WzCanvas:', chatSpace instanceof WzCanvas);
console.log('chatSpace is WzCanvas?', chatSpace instanceof WzCanvas);

// Check if it's a canvas and what properties it has
if (chatSpace) {
  console.log('chatSpace keys:', Object.keys(chatSpace).join(', '));
  console.log('chatSpace.Width:', (chatSpace as any).Width);
  console.log('chatSpace.Height:', (chatSpace as any).Height);
}

// Now check: when ChatBar does ui.GetItem('StatusBar2.img/mainBar') as WzProperty
// The result is an NxProperty — but the ChatBar code expects WzProperty.
// Is NxProperty the same thing? Let me check
import { WzProperty } from '../src/wz/WzProperty.js';
console.log('\nchatSpace instanceof WzProperty:', chatSpace instanceof WzProperty);
console.log('bar instanceof WzProperty:', bar instanceof WzProperty);

// Check what the NxImage.Root returns
const sb2 = pkg.GetItem('StatusBar2.img');
console.log('\nStatusBar2.img Root:', (sb2 as any)?.Root?.constructor?.name);
const mainBarFromRoot = (sb2 as any)?.Root?.Get?.('mainBar');
console.log('mainBar from Root.Get:', mainBarFromRoot?.constructor?.name);
console.log('mainBar from Root.Get instanceof WzProperty:', mainBarFromRoot instanceof WzProperty);
