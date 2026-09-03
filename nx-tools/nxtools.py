#!/usr/bin/env python3
"""
nxtools.py — Read, edit and convert MapleStory asset files.

Supported formats:
  NX  (.nx)          PKG4 binary — read / edit / export / import
  WZ  (.wz, .img)   PKG1 binary (v83-v95) — read / convert to NX
  Aseprite (.ase, .aseprite) — export NX bitmaps to Aseprite; import back
  MS  (.ms)         MapleScript / newer data format — basic read

Commands:
  info    <file>                    stats for NX / WZ / ASE
  ls      <file> [path]             list children
  get     <file> <path>             print node value
  set     <file.nx> <path> <val>    edit int/float/string/vector in NX (in-place save)
  dump    <file> [path] [--json]    dump subtree
  export  <file> <path> <out>       bitmap→PNG, audio→mp3, frame→PNG
  import  <file.nx> <path> <in>     replace NX bitmap from PNG
  wz2nx   <in.wz> <out.nx>         convert WZ to NX
  ase2nx  <in.ase> <out.nx>         convert Aseprite to NX (one node per frame)
  nx2ase  <in.nx> <path> <out.ase>  export NX bitmap subtree to Aseprite animation
  shell   <file>                    interactive browser

Install: pip install lz4 Pillow
"""

import sys, os, struct, zlib, json
from pathlib import Path

# ── optional deps ─────────────────────────────────────────────────────────────
try:
    import lz4.block as _lz4
    HAS_LZ4 = True
except ImportError:
    HAS_LZ4 = False
try:
    from PIL import Image
    HAS_PIL = True
except ImportError:
    HAS_PIL = False

# ═════════════════════════════════════════════════════════════════════════════
# NX (PKG4) reader / writer
# ═════════════════════════════════════════════════════════════════════════════

T_NONE, T_INT, T_FLOAT, T_STRING, T_VEC, T_BITMAP, T_AUDIO = range(7)
TYPE_NAMES = {T_NONE:"none", T_INT:"int64", T_FLOAT:"float64",
              T_STRING:"string", T_VEC:"vector", T_BITMAP:"bitmap", T_AUDIO:"audio"}


class NXNode:
    __slots__ = ('name','type','data','first_child','child_count','_file','_idx')
    def __init__(self, name, typ, data, fc, cc, file_, idx):
        self.name=name; self.type=typ; self.data=data
        self.first_child=fc; self.child_count=cc
        self._file=file_; self._idx=idx

    @property
    def int_value(self):
        return struct.unpack_from('<q',self.data)[0] if self.type==T_INT else None
    @property
    def float_value(self):
        return struct.unpack_from('<d',self.data)[0] if self.type==T_FLOAT else None
    @property
    def string_value(self):
        if self.type!=T_STRING: return None
        return self._file.get_string(struct.unpack_from('<I',self.data)[0])
    @property
    def vector_value(self):
        if self.type!=T_VEC: return None
        return struct.unpack_from('<ii',self.data)
    @property
    def bitmap_id(self):
        return struct.unpack_from('<I',self.data)[0] if self.type==T_BITMAP else None
    @property
    def bitmap_size(self):
        if self.type!=T_BITMAP: return None
        return struct.unpack_from('<HH',self.data,4)
    @property
    def audio_id(self):
        return struct.unpack_from('<I',self.data)[0] if self.type==T_AUDIO else None
    @property
    def value(self):
        t=self.type
        if t==T_INT:    return self.int_value
        if t==T_FLOAT:  return self.float_value
        if t==T_STRING: return self.string_value
        if t==T_VEC:    return self.vector_value
        if t==T_BITMAP: return f'<bitmap {self.bitmap_size[0]}x{self.bitmap_size[1]}>'
        if t==T_AUDIO:  return f'<audio id={self.audio_id}>'
        return None

    def children(self):
        f=self._file
        return [f.nodes[self.first_child+i] for i in range(self.child_count)]
    def child(self,name):
        for c in self.children():
            if c.name==name: return c
        return None
    def __getitem__(self,name):
        c=self.child(name)
        if c is None: raise KeyError(name)
        return c
    def get(self,name,default=None):
        return self.child(name) or default
    def __repr__(self):
        t=TYPE_NAMES.get(self.type,'?')
        v=self.value
        extra=f' = {v!r}' if v is not None and self.type not in (T_BITMAP,T_AUDIO) else (f' {v}' if v else '')
        return f'<NXNode {self.name!r} [{t}]{extra} ch={self.child_count}>'


class NXFile:
    def __init__(self, path:str):
        self.path=path; self.dirty=False
        self._buf=bytearray(Path(path).read_bytes())
        self._parse()

    def _parse(self):
        b=self._buf
        if b[:4]!=b'PKG4': raise ValueError(f"Not NX PKG4 (got {b[:4]!r})")
        (nc,no,sc,so,bc,bo,ac,ao)=struct.unpack_from('<I Q I Q I Q I Q',b,4)
        self.node_count=nc; self.str_count=sc; self.bmp_count=bc; self.aud_count=ac
        self._node_off=no; self._str_off=so; self._bmp_off=bo; self._aud_off=ao
        self._strings=[]
        for i in range(sc):
            off=struct.unpack_from('<Q',b,so+i*8)[0]
            slen=struct.unpack_from('<H',b,off)[0]
            self._strings.append(b[off+2:off+2+slen].decode('utf-8','replace'))
        self.nodes=[]
        for i in range(nc):
            off=no+i*20
            nid,fc,cc,tp=struct.unpack_from('<IIHH',b,off)
            data=bytes(b[off+12:off+20])
            nm=self._strings[nid] if nid<len(self._strings) else ''
            self.nodes.append(NXNode(nm,tp,data,fc,cc,self,i))
        self.root=self.nodes[0] if self.nodes else None

    def get_string(self,idx):
        return self._strings[idx] if idx<len(self._strings) else ''

    def resolve(self,path:str):
        parts=[p for p in path.split('/') if p]
        node=self.root
        for part in parts:
            if node is None: return None
            node=node.child(part)
        return node

    def get_bitmap_data(self,bmp_id):
        if bmp_id>=self.bmp_count: return None
        off=struct.unpack_from('<Q',self._buf,self._bmp_off+bmp_id*8)[0]
        w,h=struct.unpack_from('<II',self._buf,off)
        cs=struct.unpack_from('<I',self._buf,off+8)[0]
        cd=bytes(self._buf[off+12:off+12+cs])
        if not HAS_LZ4: raise RuntimeError("pip install lz4")
        return w,h,_lz4.decompress(cd,uncompressed_size=w*h*4)

    def get_audio_data(self,aud_id):
        if aud_id>=self.aud_count: return None
        off=struct.unpack_from('<Q',self._buf,self._aud_off+aud_id*8)[0]
        ln=struct.unpack_from('<I',self._buf,off)[0]
        return bytes(self._buf[off+4:off+4+ln])

    def _ndo(self,node): return self._node_off+node._idx*20+12

    def set_int(self,node,v):
        if node.type!=T_INT: raise TypeError(f"{node.name} is not int64")
        struct.pack_into('<q',self._buf,self._ndo(node),v)
        node.data=bytes(self._buf[self._ndo(node):self._ndo(node)+8]); self.dirty=True
    def set_float(self,node,v):
        if node.type!=T_FLOAT: raise TypeError(f"{node.name} is not float64")
        struct.pack_into('<d',self._buf,self._ndo(node),v)
        node.data=bytes(self._buf[self._ndo(node):self._ndo(node)+8]); self.dirty=True
    def set_vector(self,node,x,y):
        if node.type!=T_VEC: raise TypeError(f"{node.name} is not vector")
        struct.pack_into('<ii',self._buf,self._ndo(node),x,y)
        node.data=bytes(self._buf[self._ndo(node):self._ndo(node)+8]); self.dirty=True
    def set_string(self,node,v):
        if node.type!=T_STRING: raise TypeError(f"{node.name} is not string")
        try: sid=self._strings.index(v)
        except ValueError: raise ValueError(f"{v!r} not in string table (full rebuild needed)")
        struct.pack_into('<I',self._buf,self._ndo(node),sid)
        node.data=bytes(self._buf[self._ndo(node):self._ndo(node)+8]); self.dirty=True

    def replace_bitmap(self,node,png_path):
        if node.type!=T_BITMAP: raise TypeError("not a bitmap")
        if not HAS_PIL or not HAS_LZ4: raise RuntimeError("pip install lz4 Pillow")
        img=Image.open(png_path).convert('RGBA'); w,h=img.size
        raw=bytes(img.tobytes('raw','BGRA')); comp=_lz4.compress(raw)
        bid=struct.unpack_from('<I',node.data)[0]
        off=struct.unpack_from('<Q',self._buf,self._bmp_off+bid*8)[0]
        ocs=struct.unpack_from('<I',self._buf,off+8)[0]
        if len(comp)>ocs: raise ValueError(f"New size {len(comp)} > old {ocs}")
        struct.pack_into('<II',self._buf,off,w,h)
        struct.pack_into('<I',self._buf,off+8,len(comp))
        self._buf[off+12:off+12+len(comp)]=comp
        no=self._ndo(node); struct.pack_into('<HH',self._buf,no+4,w,h)
        node.data=bytes(self._buf[no:no+8]); self.dirty=True

    def export_bitmap(self,node,out):
        w,h,raw=self.get_bitmap_data(node.bitmap_id)
        if not HAS_PIL: raise RuntimeError("pip install Pillow")
        Image.frombytes('RGBA',(w,h),raw,'raw','BGRA').save(out)
        print(f"Exported {w}x{h} → {out}")
    def export_audio(self,node,out):
        Path(out).write_bytes(self.get_audio_data(node.audio_id))
        print(f"Exported audio → {out}")

    def save(self,path=None):
        Path(path or self.path).write_bytes(bytes(self._buf))
        self.dirty=False; print(f"Saved → {path or self.path}")


# ═════════════════════════════════════════════════════════════════════════════
# NX Builder (write a new NX PKG4 file from scratch)
# ═════════════════════════════════════════════════════════════════════════════

class NXBuilder:
    """Build a PKG4 NX file from a tree of dicts."""
    def __init__(self):
        self._nodes   = []   # list of (name_str, type, data8, children_list)
        self._strings = []   # string pool
        self._bitmaps = []   # list of (w,h,lz4_bytes)
        self._audios  = []   # list of bytes
        self._str_map = {}

    def _sid(self, s:str)->int:
        if s not in self._str_map:
            self._str_map[s]=len(self._strings)
            self._strings.append(s)
        return self._str_map[s]

    def add_node(self, name:str, typ:int, data8:bytes, children:list)->int:
        idx=len(self._nodes)
        self._nodes.append((name,typ,data8,children))
        return idx

    def add_bitmap(self, img:'Image.Image')->tuple:
        if not HAS_LZ4: raise RuntimeError("pip install lz4")
        w,h=img.size
        raw=bytes(img.convert('RGBA').tobytes('raw','BGRA'))
        comp=_lz4.compress(raw)
        bid=len(self._bitmaps); self._bitmaps.append((w,h,comp))
        data=struct.pack('<IHH',bid,w,h)+(b'\x00'*0); data=data.ljust(8,b'\x00')
        return T_BITMAP,data

    def add_audio(self, raw:bytes)->tuple:
        aid=len(self._audios); self._audios.append(raw)
        return T_AUDIO, struct.pack('<I',aid).ljust(8,b'\x00')

    def _flatten(self, tree:dict, parent_name:str="")->int:
        """Recursively build flat node list from nested dict tree.
        Dict keys = node names. Values can be:
          int/float/str → leaf nodes
          (x,y) tuple   → vector
          Image.Image   → bitmap
          bytes         → audio
          dict          → container (children)
        """
        children_idx=[]
        for k,v in tree.items():
            if isinstance(v,dict):
                child_idx=self._flatten(v,k)
            elif isinstance(v,int):
                child_idx=self._make_leaf(k,T_INT,struct.pack('<q',v).ljust(8,b'\x00'))
            elif isinstance(v,float):
                child_idx=self._make_leaf(k,T_FLOAT,struct.pack('<d',v).ljust(8,b'\x00'))
            elif isinstance(v,str):
                sid=self._sid(v)
                child_idx=self._make_leaf(k,T_STRING,struct.pack('<I',sid).ljust(8,b'\x00'))
            elif isinstance(v,tuple) and len(v)==2:
                child_idx=self._make_leaf(k,T_VEC,struct.pack('<ii',*v).ljust(8,b'\x00'))
            elif HAS_PIL and isinstance(v,Image.Image):
                tp,data=self.add_bitmap(v)
                child_idx=self._make_leaf(k,tp,data)
            elif isinstance(v,bytes):
                tp,data=self.add_audio(v)
                child_idx=self._make_leaf(k,tp,data)
            else:
                continue
            children_idx.append(child_idx)
        idx=len(self._nodes)
        self._nodes.append((parent_name,T_NONE,b'\x00'*8,children_idx))
        return idx

    def _make_leaf(self,name,typ,data):
        idx=len(self._nodes)
        self._nodes.append((name,typ,data,[]))
        return idx

    def build(self, tree:dict)->bytes:
        self._flatten(tree,"")
        return self._write()

    def _write(self)->bytes:
        nodes=self._nodes
        nc=len(nodes)
        # 1. Assign first_child and count
        # Nodes are currently in creation order; children lists have indices.
        # We need to re-order so children are contiguous.
        # Simple approach: BFS re-ordering.
        order=[]
        queue=[nc-1]  # root is last inserted
        mapping={}
        while queue:
            old=queue.pop(0)
            new=len(order); mapping[old]=new; order.append(old)
            for c in nodes[old][3]:
                queue.append(c)
        reordered=[nodes[o] for o in order]

        # Build final node tuples (name,type,data8,fc,cc)
        final=[]
        for new_i,(name,typ,data8,kids) in enumerate(reordered):
            fc=mapping[kids[0]] if kids else 0
            cc=len(kids)
            final.append((name,typ,data8,fc,cc))

        # 2. Build string block
        str_block=bytearray()
        str_offsets=[]
        for s in self._strings:
            str_offsets.append(len(str_block))
            enc=s.encode('utf-16-le')
            str_block+=struct.pack('<H',len(s))+enc

        # 3. Build bitmap block
        bmp_block=bytearray()
        bmp_offsets=[]
        for w,h,comp in self._bitmaps:
            bmp_offsets.append(len(bmp_block))
            bmp_block+=struct.pack('<III',w,h,len(comp))+comp

        # 4. Build audio block
        aud_block=bytearray()
        aud_offsets=[]
        for raw in self._audios:
            aud_offsets.append(len(aud_block))
            aud_block+=struct.pack('<I',len(raw))+raw

        # 5. Layout calculation
        HEADER=52
        node_block_off=HEADER
        node_block_sz=nc*20

        str_table_off=node_block_off+node_block_sz
        str_table_sz=len(self._strings)*8
        str_data_off=str_table_off+str_table_sz

        bmp_table_off=str_data_off+len(str_block)
        bmp_table_sz=len(self._bitmaps)*8
        bmp_data_off=bmp_table_off+bmp_table_sz

        aud_table_off=bmp_data_off+len(bmp_block)
        aud_table_sz=len(self._audios)*8
        aud_data_off=aud_table_off+aud_table_sz

        # 6. Assemble
        out=bytearray()
        out+=b'PKG4'
        out+=struct.pack('<I Q I Q I Q I Q',
                         nc,  node_block_off,
                         len(self._strings), str_table_off,
                         len(self._bitmaps), bmp_table_off,
                         len(self._audios),  aud_table_off)
        # Node block
        for name,typ,data8,fc,cc in final:
            sid=self._str_map.get(name,0)
            out+=struct.pack('<IIHH',sid,fc,cc,typ)+data8[:8].ljust(8,b'\x00')
        # String offset table
        for so in str_offsets:
            out+=struct.pack('<Q',str_data_off+so)
        # String data
        out+=str_block
        # Bitmap offset table
        for bo in bmp_offsets:
            out+=struct.pack('<Q',bmp_data_off+bo)
        # Bitmap data
        out+=bmp_block
        # Audio offset table
        for ao in aud_offsets:
            out+=struct.pack('<Q',aud_data_off+ao)
        # Audio data
        out+=aud_block

        return bytes(out)


# ═════════════════════════════════════════════════════════════════════════════
# WZ (PKG1) reader  —  supports GMS v83-v95 style WZ
# ═════════════════════════════════════════════════════════════════════════════

class WZFile:
    """
    Parse a MapleStory WZ file (PKG1 format, v83-v95).
    Supports main WZ containers and embedded .img data.
    """

    # WZ encryption keys
    _KEYS = {
        'gms': bytes([0xAA,0xFB,0xD3,0x07,0x74,0x9C,0x72,0x95,0x98,0x56,0xAD,0xC5,0x47,0x5D,0x60,0xD3]),
        'kms': bytes([0x52,0x00,0x7E,0x00,0x52,0x00,0x7E,0x00,0x52,0x00,0x7E,0x00,0x52,0x00,0x7E,0x00]),
        'none':bytes(16),
    }

    def __init__(self, path:str, region:str='gms'):
        self.path=path
        self._buf=Path(path).read_bytes()
        self._key=self._KEYS.get(region,self._KEYS['gms'])
        self._version_hash=0
        self.root=None
        self._parse()

    # ── Header ────────────────────────────────────────────────────────────────
    def _parse(self):
        b=self._buf
        magic=b[0:4]
        if magic not in (b'PKG1',):
            # Could be a standalone .img — treat as single image
            self._is_img=True
            self._img_offset=0
            self._enc_version=0
            self._compute_version()
            self.root=self._read_dir(0)
            return
        self._is_img=False
        fsize=struct.unpack_from('<Q',b,4)[0]
        hsize=struct.unpack_from('<I',b,12)[0]
        # copyright string at [16..hsize]
        copy_len=struct.unpack_from('<H',b,16)[0]
        self._header_end=hsize
        # Encrypted version at header_end
        self._enc_version=struct.unpack_from('<H',b,hsize)[0]
        self._compute_version()
        self._dir_offset=hsize+2
        self.root=self._read_dir(self._dir_offset)

    def _compute_version(self):
        # Try versions 1-255 and find matching hash
        ev=self._enc_version
        for v in range(1,1000):
            s=str(v)
            h=0
            for c in s: h=(32*h)^ord(c)
            enc=(0xFF^((h>>24)&0xFF))|(0xFF^((h>>16)&0xFF))<<8|\
                (0xFF^((h>>8)&0xFF))<<16|(0xFF^(h&0xFF))<<24
            if (enc&0xFFFF)==ev:
                self._version=v; self._version_hash=h; return
        self._version=83; self._version_hash=0  # fallback

    # ── Offset decryption ─────────────────────────────────────────────────────
    def _decrypt_offset(self,enc_off,block_off):
        key=(0x581C3F6D^self._version_hash)&0xFFFFFFFF
        off=(enc_off^(~(block_off-self._dir_offset)&0xFFFFFFFF))&0xFFFFFFFF
        off=(((off<<(key&0x1F))|(off>>(32-(key&0x1F))))&0xFFFFFFFF)^key
        return off+self._dir_offset

    # ── String reading ────────────────────────────────────────────────────────
    def _read_string(self, pos:int)->(str,int):
        b=self._buf
        t=b[pos]; pos+=1
        if t==0x00 or t==0x73:
            # small-string or type 0
            ln=struct.unpack_from('<B',b,pos)[0]; pos+=1
            if ln==0xFF:
                ln=struct.unpack_from('<I',b,pos)[0]; pos+=4
            mask=0xAA
            chars=bytearray()
            for i in range(ln):
                chars.append(b[pos+i]^mask); mask=(mask+1)&0xFF
            pos+=ln
            return chars.decode('latin-1','replace'),pos
        elif t==0x01 or t==0x1B:
            # unicode string
            ln=struct.unpack_from('<B',b,pos)[0]; pos+=1
            if ln==0xFF:
                ln=struct.unpack_from('<I',b,pos)[0]; pos+=4
            mask=0xAAAA
            words=[]
            for i in range(ln):
                w=struct.unpack_from('<H',b,pos+i*2)[0]^mask
                words.append(w); mask=(mask+1)&0xFFFF
            pos+=ln*2
            return ''.join(chr(w) for w in words),pos
        else:
            return '',pos

    def _read_packed_string(self,pos,offset_base)->(str,int):
        b=self._buf
        t=b[pos]; pos+=1
        if t in (0x00,0x73): return self._read_string(pos-1)
        elif t in (0x01,0x1B): return self._read_string(pos-1)
        elif t==0x04:
            soff=struct.unpack_from('<I',b,pos)[0]; pos+=4
            s,_=self._read_string(offset_base+soff)
            return s,pos
        return '',pos

    # ── Directory / node reading ──────────────────────────────────────────────
    def _read_dir(self,pos:int)->dict:
        b=self._buf
        count=self._read_compressed_int(pos); pos=count[1]; count=count[0]
        nodes={}
        for _ in range(count):
            t=b[pos]; pos+=1
            if t==1:
                pos+=10; continue          # unknown type 1
            elif t==2:
                soff=struct.unpack_from('<I',b,pos)[0]; pos+=4
                name,_=self._read_string(self._dir_offset+soff)
            elif t==3 or t==4:
                name,pos=self._read_packed_string(pos,self._dir_offset)
            else:
                break
            sz=self._read_compressed_int(pos); pos=sz[1]; sz=sz[0]
            cs=self._read_compressed_int(pos); pos=cs[1]; cs=cs[0]
            off=self._decrypt_offset(struct.unpack_from('<I',b,pos)[0],pos); pos+=4
            node={'_type':'dir' if t==3 else 'img','_offset':off,'_size':sz,
                  '_name':name,'_children':None}
            nodes[name]=node
        return nodes

    def _read_compressed_int(self,pos)->(int,int):
        b=self._buf; v=struct.unpack_from('<b',b,pos)[0]; pos+=1
        if v==-128:
            v=struct.unpack_from('<i',b,pos)[0]; pos+=4
        return v,pos

    def _read_compressed_long(self,pos)->(int,int):
        b=self._buf; v=struct.unpack_from('<b',b,pos)[0]; pos+=1
        if v==-128:
            v=struct.unpack_from('<q',b,pos)[0]; pos+=8
        return v,pos

    def _ensure_loaded(self,node:dict):
        if node.get('_children') is not None: return
        off=node['_offset']
        if node['_type']=='dir':
            node['_children']=self._read_dir(off)
        else:
            node['_children']=self._read_img(off)

    def _read_img(self,pos:int)->dict:
        b=self._buf
        # Skip version check byte
        t=b[pos]; pos+=1
        if t!=0x73: return {}   # not a prop
        s,pos=self._read_packed_string(pos,pos)   # should be "Property"
        pos+=2   # unknown 2 bytes
        return self._read_properties(pos)[0]

    def _read_properties(self,pos:int)->(dict,int):
        b=self._buf
        count=self._read_compressed_int(pos); pos=count[1]; count=count[0]
        props={}
        for _ in range(count):
            name,pos=self._read_packed_string(pos,self._dir_offset)
            t=b[pos]; pos+=1
            if t==0:   props[name]=None
            elif t==2 or t==11:
                v=struct.unpack_from('<H',b,pos)[0]; pos+=2; props[name]=v
            elif t==3:
                v,pos=self._read_compressed_int(pos); props[name]=v
            elif t==4:
                st=b[pos]; pos+=1
                if st==0x80: v=struct.unpack_from('<f',b,pos)[0]; pos+=4
                else: v=0.0
                props[name]=v
            elif t==5:
                v=struct.unpack_from('<d',b,pos)[0]; pos+=8; props[name]=v
            elif t==8:
                s,pos=self._read_packed_string(pos,self._dir_offset); props[name]=s
            elif t==9:
                skip=struct.unpack_from('<I',b,pos)[0]; pos+=4
                sub,pos2=self._read_extended(pos); props[name]=sub; pos+=skip
            elif t==20:
                v,pos=self._read_compressed_long(pos); props[name]=v
            else:
                break
        return props,pos

    def _read_extended(self,pos:int)->(object,int):
        b=self._buf
        t=b[pos]; pos+=1
        if t==0x01 or t==0x1B:
            name,pos=self._read_packed_string(pos-1,self._dir_offset)
        elif t in (0x73,0x00):
            name,pos=self._read_packed_string(pos-1,self._dir_offset)
        else:
            name=str(t)
        if name in ('Property','Convex'):
            obj,pos=self._read_properties(pos if name!='Property' else pos+2)
            return obj,pos
        elif name=='Canvas':
            pos+=1   # unknown
            has_props=b[pos]; pos+=1
            props={}
            if has_props:
                pos+=2; props,pos=self._read_properties(pos)
            w,pos=self._read_compressed_int(pos)
            h,pos=self._read_compressed_int(pos)
            fmt=struct.unpack_from('<H',b,pos)[0]; pos+=2
            pos+=4   # unknown
            data_len=struct.unpack_from('<I',b,pos)[0]; pos+=4
            raw_data=bytes(b[pos:pos+data_len]); pos+=data_len
            img=self._decompress_canvas(raw_data,w,h,fmt)
            result={'_w':w,'_h':h,'_fmt':fmt,'_img':img,**props}
            return result,pos
        elif name=='Vector':
            x,pos=self._read_compressed_int(pos)
            y,pos=self._read_compressed_int(pos)
            return (x,y),pos
        elif name=='Sound_DX8':
            pos+=1
            slen,pos=self._read_compressed_int(pos)
            hlen=b[pos]; pos+=1; pos+=hlen
            raw=bytes(b[pos:pos+slen]); pos+=slen
            return {'_audio':raw},pos
        elif name=='UOL':
            pos+=1
            s,pos=self._read_packed_string(pos,self._dir_offset)
            return {'_uol':s},pos
        return {},pos

    def _decompress_canvas(self,data:bytes,w,h,fmt)->bytes|None:
        if not HAS_PIL: return None
        try:
            inner=zlib.decompress(data[2:] if data[:2]==b'\x78\x9c' or data[:2]==b'\x78\xda' else data)
        except Exception:
            try: inner=zlib.decompress(data)
            except: return data   # raw
        if fmt==1:
            # BGRA4444 → BGRA8888
            out=bytearray(w*h*4)
            for i in range(w*h):
                b1=inner[i*2] if i*2<len(inner) else 0
                b2=inner[i*2+1] if i*2+1<len(inner) else 0
                out[i*4+0]=(b1&0x0F)*17
                out[i*4+1]=(b1>>4)*17
                out[i*4+2]=(b2&0x0F)*17
                out[i*4+3]=(b2>>4)*17
            return bytes(out)
        elif fmt==2:
            return inner[:w*h*4]   # already BGRA8888
        elif fmt==513:
            # BGR565 → BGRA8888
            out=bytearray(w*h*4)
            for i in range(w*h):
                px=struct.unpack_from('<H',inner,i*2)[0] if i*2+1<len(inner) else 0
                out[i*4+0]=(px&0x1F)<<3; out[i*4+1]=((px>>5)&0x3F)<<2
                out[i*4+2]=(px>>11)<<3; out[i*4+3]=255
            return bytes(out)
        return inner

    # ── Public navigation ─────────────────────────────────────────────────────
    def get(self,path:str):
        parts=[p for p in path.split('/') if p]
        cur=self.root
        for part in parts:
            if not isinstance(cur,dict): return None
            if part not in cur: return None
            node=cur[part]
            if isinstance(node,dict) and '_type' in node:
                self._ensure_loaded(node); cur=node.get('_children',{})
            else:
                cur=node
        return cur

    def ls(self,path:str='')->list:
        if not path:
            return list(self.root.keys())
        cur=self.get(path)
        if isinstance(cur,dict): return list(cur.keys())
        return []


# ═════════════════════════════════════════════════════════════════════════════
# WZ → NX converter
# ═════════════════════════════════════════════════════════════════════════════

def _wz_node_to_nx_tree(wz_val, wz_file:WZFile)->dict|int|float|str|tuple|None:
    if wz_val is None: return None
    if isinstance(wz_val,int): return wz_val
    if isinstance(wz_val,float): return wz_val
    if isinstance(wz_val,str): return wz_val
    if isinstance(wz_val,tuple): return wz_val   # vector
    if isinstance(wz_val,dict):
        if '_img' in wz_val and wz_val['_img'] and HAS_PIL:
            # Canvas node → bitmap
            w,h=wz_val['_w'],wz_val['_h']
            raw=wz_val['_img']
            try:
                img=Image.frombytes('RGBA',(w,h),raw,'raw','BGRA')
                return img
            except: pass
        if '_audio' in wz_val:
            return wz_val['_audio']
        if '_uol' in wz_val:
            return wz_val['_uol']
        # Container
        result={}
        for k,v in wz_val.items():
            if k.startswith('_'): continue
            converted=_wz_node_to_nx_tree(v,wz_file)
            if converted is not None:
                result[k]=converted
        return result if result else None
    return None


def wz_to_nx(wz_path:str, nx_path:str, region:str='gms'):
    print(f"Reading WZ: {wz_path}")
    wz=WZFile(wz_path,region)
    print(f"  Version: {wz._version}  |  Root entries: {len(wz.root)}")

    builder=NXBuilder()
    tree={}

    def _walk_wz_dir(d:dict, dest:dict):
        for name,node in d.items():
            if isinstance(node,dict) and '_type' in node:
                wz._ensure_loaded(node)
                children=node.get('_children',{})
                if isinstance(children,dict) and '_img' not in children:
                    sub={}; _walk_wz_dir(children,sub)
                    if sub: dest[name]=sub
                else:
                    converted=_wz_node_to_nx_tree(children,wz)
                    if converted is not None: dest[name]=converted
            else:
                converted=_wz_node_to_nx_tree(node,wz)
                if converted is not None: dest[name]=converted

    _walk_wz_dir(wz.root,tree)
    print(f"  Building NX with {len(tree)} top-level nodes…")
    data=builder.build(tree)
    Path(nx_path).write_bytes(data)
    print(f"  Saved → {nx_path}  ({len(data):,} bytes)")


# ═════════════════════════════════════════════════════════════════════════════
# Aseprite (.ase / .aseprite) reader / writer
# ═════════════════════════════════════════════════════════════════════════════

ASE_MAGIC   = 0xA5E0
ASE_VER     = 0x0100
ASE_OLD_PAL = 0x0004
ASE_OLD_PAL2= 0x0011
ASE_LAYER   = 0x2004
ASE_CEL     = 0x2005
ASE_CEL_EXTRA=0x2006
ASE_COLOR_PROFILE=0x2007
ASE_TAGS    = 0x2018
ASE_PALETTE = 0x2019
ASE_USER_DATA=0x2020
ASE_SLICE   = 0x2022
ASE_TILESET = 0x2023

class AseFile:
    """Read Aseprite binary file — all versions including 1.3+"""

    def __init__(self, path:str):
        self.path=path
        self._buf=Path(path).read_bytes()
        self.frames=[]
        self.layers=[]
        self.tags=[]
        self.w=0; self.h=0; self.depth=0; self.num_frames=0
        self._parse()

    def _parse(self):
        b=self._buf; pos=0
        # File header (128 bytes)
        fsize,magic,nf,w,h,depth,flags,speed=struct.unpack_from('<IHHHHHHI',b,pos); pos+=20
        if magic!=ASE_MAGIC: raise ValueError("Not an Aseprite file")
        pos+=8+4+2+92-28   # skip to end of 128-byte header… actually:
        # Full header is 128 bytes
        pos=128
        self.w=w; self.h=h; self.depth=depth; self.num_frames=nf

        for fi in range(nf):
            frame_start=pos
            fmsz,mg2,nchunks,dur=struct.unpack_from('<IHHH',b,pos); pos+=12
            pos+=2  # reserved
            old_nc=nchunks
            if mg2!=0xF1FA: break
            # if chunk count == 0xFFFF, use 4-byte count at +28 from frame start
            nc4=struct.unpack_from('<I',b,frame_start+28)[0]
            if old_nc==0xFFFF: nchunks=nc4
            frame={'dur_ms':dur,'cels':[],'tags':[]}
            for _ in range(nchunks):
                chunk_start=pos
                csz,ct=struct.unpack_from('<IH',b,pos); pos+=6
                chunk_data=b[pos:chunk_start+csz]; pos=chunk_start+csz
                if ct==ASE_LAYER:
                    self._read_layer(chunk_data)
                elif ct==ASE_CEL:
                    cel=self._read_cel(chunk_data,w,h,depth)
                    if cel: frame['cels'].append(cel)
                elif ct==ASE_TAGS:
                    self._read_tags(chunk_data)
            self.frames.append(frame)

    def _read_layer(self,d:bytes):
        flags,typ,child,blend,alpha=struct.unpack_from('<HHHHI',d,0)[:5]
        nlen=struct.unpack_from('<H',d,16)[0]
        name=d[18:18+nlen].decode('utf-8','replace')
        self.layers.append({'name':name,'type':typ,'blend':blend,'alpha':alpha,'flags':flags})

    def _read_cel(self,d:bytes,fw,fh,depth)->dict|None:
        li,cx,cy,alpha,ct=struct.unpack_from('<HhhBH',d,0)
        pos=7
        if ct==0:   # raw
            w2,h2=struct.unpack_from('<HH',d,pos); pos+=4
            raw=d[pos:]
            img=self._to_rgba(raw,w2,h2,depth)
        elif ct==1: # linked
            frame=struct.unpack_from('<H',d,pos)[0]
            return {'layer':li,'x':cx,'y':cy,'alpha':alpha,'type':'linked','frame':frame}
        elif ct==2: # compressed
            w2,h2=struct.unpack_from('<HH',d,pos); pos+=4
            try: raw=zlib.decompress(d[pos:])
            except: raw=d[pos:]
            img=self._to_rgba(raw,w2,h2,depth)
        elif ct==3: # compressed tilemap — skip
            return None
        else:
            return None
        if not HAS_PIL or img is None: return {'layer':li,'x':cx,'y':cy,'alpha':alpha,'type':'raw_bytes','raw':d}
        return {'layer':li,'x':cx,'y':cy,'alpha':alpha,'type':'image','img':img,'w':w2,'h':h2}

    def _to_rgba(self,raw:bytes,w,h,depth)->'Image.Image|None':
        if not HAS_PIL: return None
        if depth==32:
            return Image.frombytes('RGBA',(w,h),raw[:w*h*4],'raw','RGBA')
        elif depth==16:
            out=bytearray(w*h*4)
            for i in range(w*h):
                gr,a=raw[i*2],raw[i*2+1]
                out[i*4:i*4+4]=[gr,gr,gr,a]
            return Image.frombytes('RGBA',(w,h),bytes(out),'raw','RGBA')
        elif depth==8:
            out=bytearray(w*h*4)
            for i in range(w*h):
                v=raw[i]; out[i*4:i*4+4]=[v,v,v,255]
            return Image.frombytes('RGBA',(w,h),bytes(out),'raw','RGBA')
        return None

    def _read_tags(self,d:bytes):
        n=struct.unpack_from('<H',d,0)[0]; pos=8
        for _ in range(n):
            fr,to,dir_=struct.unpack_from('<HHB',d,pos); pos+=17
            nlen=struct.unpack_from('<H',d,pos)[0]; pos+=2
            name=d[pos:pos+nlen].decode('utf-8','replace'); pos+=nlen
            self.tags.append({'name':name,'from':fr,'to':to,'dir':dir_})

    def composite_frame(self,fi:int)->'Image.Image|None':
        """Flatten all cels in frame fi into one RGBA image."""
        if not HAS_PIL: return None
        frame=self.frames[fi]
        out=Image.new('RGBA',(self.w,self.h),(0,0,0,0))
        for cel in sorted(frame['cels'],key=lambda c:c['layer']):
            if cel['type']=='image' and cel.get('img'):
                img=cel['img'].copy()
                if cel['alpha']<255:
                    r,g,b,a=img.split()
                    a=a.point(lambda x:x*cel['alpha']//255)
                    img=Image.merge('RGBA',(r,g,b,a))
                out.paste(img,(cel['x'],cel['y']),img)
        return out


def _write_ase(frames:list, w:int, h:int, tags:list=None)->bytes:
    """Write a minimal Aseprite file with RGBA frames."""
    out=bytearray()
    nf=len(frames)
    # 128-byte file header
    out+=struct.pack('<IHHHHHHI',0,ASE_MAGIC,nf,w,h,32,0,100)
    # palette flags, pixel ratio, etc.
    out+=b'\x00'*(128-len(out))

    for fi,img in enumerate(frames):
        fc_start=len(out)
        # Frame header placeholder (16 bytes)
        out+=b'\x00'*16
        dur=100   # ms per frame
        # One chunk: CEL
        # Chunk header: size(4) + type(2) = 6 bytes
        cel_body=bytearray()
        cel_body+=struct.pack('<HhhBH',0,0,0,255,2)  # layer=0 x=0 y=0 alpha=255 type=compressed
        cel_body+=struct.pack('<HH',w,h)
        raw=bytes(img.convert('RGBA').tobytes('raw','RGBA'))
        comp=zlib.compress(raw,6)
        cel_body+=comp
        chunk=struct.pack('<IH',6+len(cel_body),ASE_CEL)+bytes(cel_body)
        out+=chunk
        # Tags chunk
        if fi==0 and tags:
            tc=bytearray()
            tc+=struct.pack('<HHH',len(tags),0,0)
            for t in tags:
                tc+=struct.pack('<HHB',t.get('from',0),t.get('to',0),t.get('dir',0))
                tc+=b'\x00'*6+b'\x00\x00\x00'  # color + reserved
                nm=t.get('name','').encode('utf-8')
                tc+=struct.pack('<H',len(nm))+nm
            tc+=struct.pack('<I',0)  # extra (v1.3 repeat)
            out+=struct.pack('<IH',6+len(tc),ASE_TAGS)+bytes(tc)
        # Patch frame header
        fend=len(out)
        struct.pack_into('<IHHHHxxxxI',out,fc_start,
                         fend-fc_start,0xF1FA,
                         1 if (fi==0 and not tags) else (2 if (fi==0 and tags) else 1),
                         dur,
                         1 if (fi==0 and not tags) else (2 if (fi==0 and tags) else 1))
    # Patch file size
    struct.pack_into('<I',out,0,len(out))
    return bytes(out)


def nx2ase(nx_path:str, node_path:str, out_path:str):
    """Export NX bitmap nodes under path as Aseprite animation frames."""
    nx=NXFile(nx_path)
    node=nx.resolve(node_path)
    if node is None: print(f"Path not found: {node_path}"); return
    if not HAS_PIL or not HAS_LZ4: print("pip install lz4 Pillow"); return
    # Collect bitmaps (children or self)
    bitmaps=[]
    if node.type==T_BITMAP:
        bitmaps=[node]
    else:
        for c in node.children():
            if c.type==T_BITMAP: bitmaps.append(c)
    if not bitmaps: print("No bitmap nodes found"); return
    frames=[]
    for n in bitmaps:
        w,h,raw=nx.get_bitmap_data(n.bitmap_id)
        frames.append(Image.frombytes('RGBA',(w,h),raw,'raw','BGRA'))
    raw_out=_write_ase(frames,frames[0].width,frames[0].height)
    Path(out_path).write_bytes(raw_out)
    print(f"Exported {len(frames)} frames → {out_path}")


def ase2nx(ase_path:str, out_path:str):
    """Convert each Aseprite frame to an NX node tree."""
    ase=AseFile(ase_path)
    builder=NXBuilder()
    tree={}
    for fi in range(ase.num_frames):
        img=ase.composite_frame(fi)
        if img is None: continue
        tp,data=builder.add_bitmap(img)
        # Use frame index as node name
        key=str(fi)
        builder._sid(key)
        tree[key]=img
    # Also store tag info as string nodes
    for t in ase.tags:
        tree[f"_tag_{t['name']}"]=f"{t['from']}-{t['to']}"
    data=builder.build(tree)
    Path(out_path).write_bytes(data)
    print(f"Converted {ase.num_frames} frames → {out_path}")


# ═════════════════════════════════════════════════════════════════════════════
# .ms file reader (MapleScript / newer WZ script format)
# ═════════════════════════════════════════════════════════════════════════════

def read_ms(path:str)->dict:
    """
    Read a .ms file. These are either:
      - Lua-like text scripts (GMS Worlds / newer)
      - Binary data blocks (some internal formats)
    Returns a dict with detected info.
    """
    raw=Path(path).read_bytes()
    result={'path':path,'size':len(raw)}
    # Check if text
    try:
        text=raw.decode('utf-8')
        result['format']='text'; result['content']=text[:4096]
        return result
    except: pass
    try:
        text=raw.decode('utf-16-le')
        result['format']='text-utf16'; result['content']=text[:4096]
        return result
    except: pass
    # Binary — check magic
    magic=raw[:4]
    if magic==b'PKG1': result['format']='wz-embedded'
    elif magic==b'PKG4': result['format']='nx-embedded'
    elif raw[:2]==b'PK': result['format']='zip-archive'
    elif raw[:3]==b'\xef\xbb\xbf': result['format']='utf8-bom-text'
    else: result['format']=f'binary-{magic.hex()}'
    result['hex_preview']=raw[:64].hex()
    return result


# ═════════════════════════════════════════════════════════════════════════════
# Display helpers
# ═════════════════════════════════════════════════════════════════════════════

def _print_tree(node:NXNode, indent=0, max_depth=3):
    pfx='  '*indent
    t=TYPE_NAMES.get(node.type,'?')
    v=node.value
    if node.type==T_BITMAP: v=f'{node.bitmap_size[0]}x{node.bitmap_size[1]}'
    extra=f' = {v!r}' if v is not None and node.type not in (T_BITMAP,T_AUDIO) else (f' [{v}]' if v else '')
    print(f'{pfx}{node.name}  [{t}]{extra}  ({node.child_count})')
    if indent<max_depth:
        for c in node.children(): _print_tree(c,indent+1,max_depth)

def _open_any(path:str):
    """Auto-detect format and open."""
    p=Path(path)
    ext=p.suffix.lower()
    if ext in ('.nx',):
        return 'nx',NXFile(path)
    elif ext in ('.wz','.img'):
        return 'wz',WZFile(path)
    elif ext in ('.ase','.aseprite'):
        return 'ase',AseFile(path)
    elif ext=='.ms':
        return 'ms',read_ms(path)
    else:
        # Try NX magic
        raw=Path(path).read_bytes(4)
        if raw==b'PKG4': return 'nx',NXFile(path)
        if raw==b'PKG1': return 'wz',WZFile(path)
    return 'unknown',None


# ═════════════════════════════════════════════════════════════════════════════
# Interactive shell (multi-format)
# ═════════════════════════════════════════════════════════════════════════════

def _shell(fmt:str, obj):
    from nxtools import NXFile as _NX
    nx=obj if fmt=='nx' else None
    wz=obj if fmt=='wz' else None
    ase=obj if fmt=='ase' else None

    cur_nx=nx.root if nx else None
    cur_wz=wz.root if wz else None
    path='/'

    print(f"Shell [{fmt}] — {obj.path if hasattr(obj,'path') else '?'}")
    print("ls / cd / get / set / export / import / tree / find / save / info / exit")

    while True:
        try: raw=input(f"nx:{path}> ").strip()
        except (EOFError,KeyboardInterrupt): break
        if not raw: continue
        parts=raw.split(maxsplit=2); cmd=parts[0].lower()
        if cmd in ('exit','quit','q'): break

        if cmd=='info':
            if nx: print(f"Nodes:{nx.node_count} Strings:{nx.str_count} Bitmaps:{nx.bmp_count} Audio:{nx.aud_count}")
            elif wz: print(f"WZ version:{wz._version} Root entries:{len(wz.root)}")
            elif ase: print(f"ASE {ase.w}x{ase.h} depth={ase.depth} frames={ase.num_frames} layers={len(ase.layers)}")

        elif cmd=='ls' and nx:
            target=cur_nx.child(parts[1]) if len(parts)>1 else cur_nx
            if target is None: print(f"Not found: {parts[1]}"); continue
            for c in target.children():
                t=TYPE_NAMES.get(c.type,'?'); v=c.value
                if c.type==T_BITMAP: v=f'{c.bitmap_size[0]}x{c.bitmap_size[1]}'
                extra=f' = {v!r}' if v is not None and c.type not in (T_BITMAP,T_AUDIO) else (f' [{v}]' if v else '')
                print(f'  {c.name:<35} [{t}]{extra}  ({c.child_count})')

        elif cmd=='ls' and wz:
            target=wz.ls(parts[1] if len(parts)>1 else '')
            for n in target: print(f'  {n}')

        elif cmd=='ls' and ase:
            for i,f in enumerate(ase.frames): print(f'  frame {i}  dur={f["dur_ms"]}ms  cels={len(f["cels"])}')
            for t in ase.tags: print(f'  tag {t["name"]} f{t["from"]}-{t["to"]}')

        elif cmd=='cd' and nx:
            if len(parts)<2 or parts[1]=='..':
                segs=[s for s in path.split('/') if s][:-1]
                cur_nx=nx.root
                for s in segs: cur_nx=cur_nx.child(s) or cur_nx
                path=('/'+'/'.join(segs)) or '/'
            else:
                c=cur_nx.child(parts[1])
                if c is None: print(f"Not found: {parts[1]}")
                else: cur_nx=c; path=path.rstrip('/')+'/'+parts[1]

        elif cmd=='get' and nx:
            n=cur_nx.child(parts[1]) if len(parts)>1 else cur_nx
            print(repr(n) if n else "Not found")

        elif cmd=='set' and nx:
            if len(parts)<3: print("usage: set <name> <val>"); continue
            n=cur_nx.child(parts[1])
            if n is None: print(f"Not found: {parts[1]}"); continue
            try:
                if n.type==T_INT: nx.set_int(n,int(parts[2],0) if '0x' in parts[2] else int(parts[2]))
                elif n.type==T_FLOAT: nx.set_float(n,float(parts[2]))
                elif n.type==T_STRING: nx.set_string(n,parts[2])
                elif n.type==T_VEC: nx.set_vector(n,*map(int,parts[2].split(',')))
                else: print(f"Cannot set {TYPE_NAMES[n.type]}"); continue
                print(f"OK: {n.name} = {n.value!r}  (unsaved)")
            except Exception as e: print(f"Error: {e}")

        elif cmd=='export':
            if len(parts)<3: print("usage: export <name> <file>"); continue
            if nx:
                n=cur_nx.child(parts[1])
                if n is None: print(f"Not found: {parts[1]}"); continue
                try:
                    if n.type==T_BITMAP: nx.export_bitmap(n,parts[2])
                    elif n.type==T_AUDIO: nx.export_audio(n,parts[2])
                    else: print(f"Cannot export {TYPE_NAMES[n.type]}")
                except Exception as e: print(f"Error: {e}")
            elif ase:
                fi=int(parts[1])
                img=ase.composite_frame(fi)
                if img: img.save(parts[2]); print(f"Frame {fi} → {parts[2]}")

        elif cmd=='import' and nx:
            if len(parts)<3: print("usage: import <name> <file>"); continue
            n=cur_nx.child(parts[1])
            if n is None or n.type!=T_BITMAP: print("Bitmap node not found"); continue
            try: nx.replace_bitmap(n,parts[2]); print("OK (unsaved)")
            except Exception as e: print(f"Error: {e}")

        elif cmd=='tree' and nx:
            depth=int(parts[1]) if len(parts)>1 else 2
            _print_tree(cur_nx,max_depth=depth)

        elif cmd=='save' and nx:
            nx.save(parts[1] if len(parts)>1 else None)

        elif cmd=='find' and nx:
            if len(parts)<2: print("usage: find <substr>"); continue
            q=parts[1].lower()
            def _find(node,p):
                for c in node.children():
                    p2=p+'/'+c.name
                    if q in c.name.lower(): print(p2)
                    _find(c,p2)
            _find(cur_nx,path.rstrip('/'))

        else:
            print(f"Unknown: {cmd}")

    if nx and nx.dirty:
        if input("Save before exit? [y/N] ").strip().lower()=='y':
            nx.save()


# ═════════════════════════════════════════════════════════════════════════════
# CLI entry
# ═════════════════════════════════════════════════════════════════════════════

def main():
    args=sys.argv[1:]
    if not args: print(__doc__); return
    cmd=args[0].lower()

    if cmd=='info':
        if len(args)<2: print("usage: nxtools.py info <file>"); return
        fmt,obj=_open_any(args[1])
        if fmt=='nx':
            sz=Path(args[1]).stat().st_size
            print(f"NX PKG4  {sz:,} bytes")
            print(f"  Nodes:{obj.node_count:,}  Strings:{obj.str_count:,}  Bitmaps:{obj.bmp_count:,}  Audio:{obj.aud_count:,}")
        elif fmt=='wz':
            print(f"WZ PKG1  version={obj._version}")
            print(f"  Root entries: {len(obj.root)}")
        elif fmt=='ase':
            print(f"Aseprite {obj.w}x{obj.h}  depth={obj.depth}  frames={obj.num_frames}  layers={len(obj.layers)}")
            for t in obj.tags: print(f"  tag: {t['name']}  f{t['from']}-{t['to']}")
        elif fmt=='ms':
            for k,v in obj.items(): print(f"  {k}: {str(v)[:120]}")
        else: print("Unknown format")

    elif cmd=='ls':
        if len(args)<2: return
        fmt,obj=_open_any(args[1])
        if fmt=='nx':
            node=obj.resolve(args[2]) if len(args)>2 else obj.root
            for c in node.children():
                t=TYPE_NAMES.get(c.type,'?')
                v=c.value
                if c.type==T_BITMAP: v=f'{c.bitmap_size[0]}x{c.bitmap_size[1]}'
                print(f'{c.name:<40} [{t}]  {v if v else ""}  ({c.child_count})')
        elif fmt=='wz':
            for n in obj.ls(args[2] if len(args)>2 else ''): print(f'  {n}')

    elif cmd=='get':
        if len(args)<3: return
        fmt,obj=_open_any(args[1])
        if fmt=='nx': print(repr(obj.resolve(args[2])))
        elif fmt=='wz': print(repr(obj.get(args[2])))

    elif cmd=='set':
        if len(args)<4: return
        nx=NXFile(args[1]); node=nx.resolve(args[2])
        if node is None: print("Not found"); return
        try:
            if node.type==T_INT: nx.set_int(node,int(args[3],0))
            elif node.type==T_FLOAT: nx.set_float(node,float(args[3]))
            elif node.type==T_STRING: nx.set_string(node,args[3])
            elif node.type==T_VEC: nx.set_vector(node,*map(int,args[3].split(',')))
            nx.save()
        except Exception as e: print(f"Error: {e}")

    elif cmd=='dump':
        if len(args)<2: return
        use_json='--json' in args; clean=[a for a in args[2:] if a!='--json']
        nx=NXFile(args[1]); node=nx.resolve(clean[0]) if clean else nx.root
        if use_json:
            def _d(n,depth=0):
                o={'name':n.name,'type':TYPE_NAMES.get(n.type,'?')}
                if n.value is not None: o['value']=n.value if not isinstance(n.value,tuple) else list(n.value)
                if depth<6 and n.child_count: o['children']=[_d(c,depth+1) for c in n.children()]
                return o
            print(json.dumps(_d(node),indent=2,ensure_ascii=False))
        else: _print_tree(node)

    elif cmd=='export':
        if len(args)<4: return
        fmt,obj=_open_any(args[1])
        if fmt=='nx':
            node=obj.resolve(args[2])
            if node is None: print("Not found"); return
            if node.type==T_BITMAP: obj.export_bitmap(node,args[3])
            elif node.type==T_AUDIO: obj.export_audio(node,args[3])
            else: print(f"Cannot export {TYPE_NAMES[node.type]}")
        elif fmt=='ase':
            fi=int(args[2]); img=obj.composite_frame(fi)
            if img: img.save(args[3]); print(f"Frame {fi} → {args[3]}")

    elif cmd=='import':
        if len(args)<4: return
        nx=NXFile(args[1]); node=nx.resolve(args[2])
        if node is None or node.type!=T_BITMAP: print("Bitmap not found"); return
        try: nx.replace_bitmap(node,args[3]); nx.save()
        except Exception as e: print(f"Error: {e}")

    elif cmd=='wz2nx':
        if len(args)<3: print("usage: wz2nx <in.wz> <out.nx> [region=gms|kms|none]"); return
        region=args[3] if len(args)>3 else 'gms'
        wz_to_nx(args[1],args[2],region)

    elif cmd=='ase2nx':
        if len(args)<3: print("usage: ase2nx <in.ase> <out.nx>"); return
        ase2nx(args[1],args[2])

    elif cmd=='nx2ase':
        if len(args)<4: print("usage: nx2ase <in.nx> <path> <out.ase>"); return
        nx2ase(args[1],args[2],args[3])

    elif cmd=='shell':
        if len(args)<2: print("usage: shell <file>"); return
        fmt,obj=_open_any(args[1])
        if obj is None: print("Could not open file"); return
        _shell(fmt,obj)

    else:
        print(f"Unknown command: {cmd}\n"); print(__doc__)


if __name__=='__main__':
    main()
