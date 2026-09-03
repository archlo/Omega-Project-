# nx-tools

Python toolkit for reading, editing, and converting MapleStory asset files.

## Supported Formats

| Format | Extension | Support |
|--------|-----------|---------|
| NX PKG4 | `.nx` | Read · Edit · Export · Import |
| WZ PKG1 | `.wz` `.img` | Read · Convert to NX (GMS v83–v95) |
| Aseprite | `.ase` `.aseprite` | Read frames · Convert to/from NX |
| MapleScript | `.ms` | Basic info display |

## Requirements

```
pip install lz4 Pillow
```

- `lz4` — decompress bitmap data inside NX/WZ files
- `Pillow` — image decode/encode for bitmap preview and export

## Files

| File | Purpose |
|------|---------|
| `nxtools.py` | Core library + CLI |
| `nxgui.py` | GUI browser (tkinter) |
| `make_dump.py` | IDA/IDB dump generator — run from IDA Pro |

---

## CLI — `nxtools.py`

### Commands

```bash
# File info
python nxtools.py info  UI.wz
python nxtools.py info  UI.nx
python nxtools.py info  sprite.ase

# Browse nodes
python nxtools.py ls    UI.nx
python nxtools.py ls    UI.nx  UIWindow.img/Skill

# Read a node
python nxtools.py get   UI.nx  UIWindow.img/Skill/backgrnd

# Edit a value (saves in-place)
python nxtools.py set   UI.nx  SomeNode/intVal   42
python nxtools.py set   UI.nx  SomeNode/floatVal 3.14
python nxtools.py set   UI.nx  SomeNode/str      "hello"
python nxtools.py set   UI.nx  SomeNode/vec      "128,50"

# Dump subtree
python nxtools.py dump  UI.nx  UIWindow.img/Skill
python nxtools.py dump  UI.nx  UIWindow.img/Skill  --json > skill.json

# Export
python nxtools.py export  UI.nx   UIWindow.img/Skill/backgrnd  out.png
python nxtools.py export  Sound.nx  BgmLogin/1                  login.mp3
python nxtools.py export  sprite.ase  0                         frame0.png

# Import (replace bitmap — new compressed size must be ≤ old)
python nxtools.py import  UI.nx  UIWindow.img/Skill/backgrnd  new_bg.png

# Convert WZ → NX
python nxtools.py wz2nx   UI.wz         UI_converted.nx
python nxtools.py wz2nx   UI.wz         UI_converted.nx  kms   # region flag

# Convert Aseprite → NX  (one bitmap node per frame)
python nxtools.py ase2nx  sprite.ase    sprite.nx

# Export NX bitmap subtree → Aseprite animation
python nxtools.py nx2ase  UI.nx  UIWindow.img/Skill  skill_anim.aseprite

# Interactive shell
python nxtools.py shell  UI.nx
```

### WZ regions

| Flag | Encryption | Use for |
|------|-----------|---------|
| `gms` | GMS key (default) | Global MapleStory v83–v95 |
| `kms` | KMS key | Korean MapleStory |
| `none` | No encryption | Unencrypted WZ |

### Interactive shell commands

```
ls [name]           list children (optional sub-node)
cd <name|..>        navigate into / up
get <name>          print node type + value
set <name> <val>    edit int / float / string / vector
export <name> <file>  save bitmap as PNG or audio as mp3
import <name> <file>  replace bitmap from PNG
tree [depth]        print subtree (default depth 2)
find <substr>       search node names from current position
info                file statistics
save [file]         write changes to disk
exit                quit (prompts to save if dirty)
```

---

## GUI — `nxgui.py`

```bash
python nxgui.py           # open empty
python nxgui.py UI.nx     # open file directly
```

### Features

- **Multi-format open** — NX / WZ / Aseprite / MS, auto-detected
- **Lazy tree** — expands nodes on click, handles files with 50k+ nodes
- **Bitmap preview** — click any bitmap node to see image in panel
- **Aseprite preview** — click frame to see composited image
- **Edit dialog** — F2 or double-click to edit int / float / string / vector
- **Export** — F5 — bitmap → PNG, audio → mp3/ogg, ASE frame → PNG
- **Import** — F6 — replace bitmap from PNG file
- **Convert** — toolbar + menu:
  - WZ → NX (with region selector)
  - ASE → NX
  - NX → ASE
  - Export all bitmaps to folder
- **Search** — type in search box, jumps to first matching node name
- **Path bar** — shows full path, Ctrl+P copies to clipboard
- **Dirty indicator** — shows unsaved changes

### Keyboard shortcuts

| Key | Action |
|-----|--------|
| Ctrl+O | Open file |
| Ctrl+S | Save NX in-place |
| Ctrl+P | Copy node path |
| F2 | Edit value |
| F5 | Export |
| F6 | Import PNG |
| Double-click | Edit value |

---

## IDA Dump — `make_dump.py`

Generates `dump.txt` and `dump.json` from a named IDB file inside IDA Pro.

```
File → Script file → make_dump.py
```

Output includes per-system: pixel coordinates, WZ asset paths, string pool IDs, packet decode sequences, switch tables, top constants, named function calls.

Edit the `SYSTEMS` list at the top to match your binary's address layout.

---

## NX PKG4 Format (reference)

```
Header (52 bytes):
  [0]   4B  magic "PKG4"
  [4]   4B  node_count
  [8]   8B  node_block_offset
  [16]  4B  string_count
  [20]  8B  string_offset_table_offset
  [28]  4B  bitmap_count
  [32]  8B  bitmap_offset_table_offset
  [40]  4B  audio_count
  [44]  8B  audio_offset_table_offset

Node (20 bytes each):
  [0]   4B  name_id     → string table index
  [4]   4B  first_child → node index
  [8]   2B  child_count
  [10]  2B  type  (0=none 1=int64 2=float64 3=string 4=vector 5=bitmap 6=audio)
  [12]  8B  data  (type-specific)
```

Bitmaps are LZ4-compressed BGRA pixels.  
Strings are UTF-16LE with a `uint16` length prefix.
