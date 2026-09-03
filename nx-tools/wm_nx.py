import sys
sys.path.insert(0, r'C:\Users\jorge\OneDrive\Desktop\ts\nx-tools')
from nxtools import NXFile

nx = NXFile(r'C:\Users\jorge\OneDrive\Desktop\ts\wz_client\Map.nx')

def bitmap(node):
    w, h = node.bitmap_size
    o = node.get('origin')
    o_ = repr(o.vector_value) if o and o.type == 4 else '?'
    return '%dx%d origin=%s' % (w, h, o_)

for name in ['WorldMap', 'WorldMap000', 'WorldMap010', 'WorldMap011', 'WorldMap012', 'WorldMap013']:
    b = nx.resolve('WorldMap/%s.img/BaseImg/0' % name)
    print('%s/BaseImg/0: %s' % (name, bitmap(b) if b else 'MISSING'))

print()
print('MapHelper markers:')
mh = nx.resolve('Map/MapHelper.img/worldMap/mapImage')
if mh:
    for c in mh.children():
        print('  mapImage/%s: %s' % (c.name, bitmap(c)))
else:
    print('  mapImage MISSING')
    d = nx.resolve('Map/MapHelper.img/worldMap')
    if d:
        print('  worldMap children:', [(c.name, c.type) for c in d.children()])

print()
print('info/parentMap:')
for name in ['WorldMap', 'WorldMap000', 'WorldMap010', 'WorldMap011']:
    info = nx.resolve('WorldMap/%s.img/info' % name)
    if info:
        pm = info.get('parentMap')
        print('  %s/info/parentMap = %r' % (name, pm.string_value if pm and pm.type == 3 else None))

print()
print('WorldMap.img BaseImg children names:', [c.name for c in nx.resolve('WorldMap/WorldMap.img/BaseImg').children()])
print('WorldMap010.img BaseImg children names:', [c.name for c in nx.resolve('WorldMap/WorldMap010.img/BaseImg').children()])
print('WorldMap011.img children:', [(c.name, c.type) for c in nx.resolve('WorldMap/WorldMap011.img').children()])
print('WorldMap011.img MapList count:', len(nx.resolve('WorldMap/WorldMap011.img/MapList').children()) if nx.resolve('WorldMap/WorldMap011.img/MapList') else 0)
print('WorldMap011.img MapLink:', nx.resolve('WorldMap/WorldMap011.img/MapLink') is not None)
# does WorldMap010 contain Nautilus maps (120000000)? check all mapNo lists
ml = nx.resolve('WorldMap/WorldMap010.img/MapList')
found = []
for c in ml.children():
    mn = c.get('mapNo')
    if mn:
        for m in mn.children():
            if m.int_value == 120000000:
                found.append(c.name)
print('WorldMap010 MapList items containing 120000000:', found)