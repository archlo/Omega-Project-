#!/usr/bin/env python3
"""
nxgui.py — User-friendly GUI for browsing and editing MapleStory NX (PKG4) files.
Requires: pip install lz4 Pillow
Run:      python nxgui.py [file.nx]
"""

import sys, os, struct, threading, queue
import tkinter as tk
from tkinter import ttk, filedialog, messagebox, simpledialog
from pathlib import Path

# ── optional image support ────────────────────────────────────────────────────
try:
    from PIL import Image, ImageTk
    import io as _io
    HAS_PIL = True
except ImportError:
    HAS_PIL = False

try:
    import lz4.block as _lz4
    HAS_LZ4 = True
except ImportError:
    HAS_LZ4 = False

# ── pull in the NXFile parser from nxtools.py ─────────────────────────────────
sys.path.insert(0, str(Path(__file__).parent))
try:
    from nxtools import (NXFile, NXNode, WZFile, AseFile, read_ms,
                         wz_to_nx, ase2nx, nx2ase,
                         T_NONE, T_INT, T_FLOAT, T_STRING, T_VEC, T_BITMAP, T_AUDIO, TYPE_NAMES,
                         _open_any)
except ImportError as _e:
    messagebox.showerror("Missing nxtools", f"nxtools.py must be in the same folder.\n{_e}")
    sys.exit(1)

# ─────────────────────────────────────────────────────────────────────────────
# Colour scheme
# ─────────────────────────────────────────────────────────────────────────────
BG       = "#1e1e2e"
PANEL    = "#2a2a3e"
HEADER   = "#313155"
FG       = "#cdd6f4"
ACCENT   = "#89b4fa"
GREEN    = "#a6e3a1"
YELLOW   = "#f9e2af"
RED      = "#f38ba8"
PINK     = "#cba6f7"
TEAL     = "#94e2d5"
ORANGE   = "#fab387"
GRAY     = "#6c7086"
SEL_BG   = "#45475a"

TYPE_COLOURS = {
    "none":    GRAY,
    "int64":   TEAL,
    "float64": ORANGE,
    "string":  GREEN,
    "vector":  YELLOW,
    "bitmap":  ACCENT,
    "audio":   PINK,
}

# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def node_label(node: NXNode) -> str:
    t = TYPE_NAMES.get(node.type, "?")
    v = node.value
    if node.type == T_BITMAP:
        w, h = node.bitmap_size
        suffix = f"  [{w}×{h}]"
    elif node.type == T_AUDIO:
        suffix = "  [audio]"
    elif v is not None:
        s = repr(v)
        suffix = f"  =  {s[:60]}{'…' if len(s)>60 else ''}"
    else:
        suffix = ""
    kids = f"  ({node.child_count})" if node.child_count else ""
    return f"{node.name}{kids}{suffix}"


# ─────────────────────────────────────────────────────────────────────────────
# Main Application
# ─────────────────────────────────────────────────────────────────────────────

class NXBrowser(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("NX Browser")
        self.geometry("1100x700")
        self.configure(bg=BG)
        self.minsize(700, 450)

        self.nx:    NXFile | None = None
        self.wz:    WZFile | None = None
        self.ase:   AseFile| None = None
        self._fmt:  str           = 'none'   # 'nx' | 'wz' | 'ase' | 'ms'
        self.path:  str    | None = None
        # iid → NXNode (NX mode) or dict/str (WZ/ASE mode)
        self._node_map: dict[str, object] = {}
        self._wz_path_map: dict[str, str] = {}   # iid → wz path string
        self._preview_img = None

        self._build_menu()
        self._build_ui()
        self._apply_styles()

        if len(sys.argv) > 1:
            self._open(sys.argv[1])

    # ── Menu ──────────────────────────────────────────────────────────────────
    def _build_menu(self):
        mb = tk.Menu(self, bg=PANEL, fg=FG, activebackground=ACCENT, activeforeground=BG, tearoff=0)
        self.configure(menu=mb)

        def _m(parent):
            return tk.Menu(parent, tearoff=0, bg=PANEL, fg=FG,
                           activebackground=ACCENT, activeforeground=BG)

        fm = _m(mb); mb.add_cascade(label="File", menu=fm)
        fm.add_command(label="Open…  (NX / WZ / ASE / MS)   Ctrl+O", command=self._cmd_open)
        fm.add_command(label="Save NX   Ctrl+S",  command=self._cmd_save)
        fm.add_command(label="Save As…", command=self._cmd_save_as)
        fm.add_separator()
        fm.add_command(label="Exit", command=self.destroy)

        em = _m(mb); mb.add_cascade(label="Node", menu=em)
        em.add_command(label="Edit value     F2",  command=self._cmd_edit)
        em.add_command(label="Export…        F5",  command=self._cmd_export)
        em.add_command(label="Import PNG…    F6",  command=self._cmd_import)
        em.add_separator()
        em.add_command(label="Copy path      Ctrl+P", command=self._cmd_copy_path)

        cm = _m(mb); mb.add_cascade(label="Convert", menu=cm)
        cm.add_command(label="WZ → NX…",  command=self._cmd_wz2nx)
        cm.add_command(label="ASE → NX…", command=self._cmd_ase2nx)
        cm.add_command(label="NX → ASE… (export frames)", command=self._cmd_nx2ase)
        cm.add_separator()
        cm.add_command(label="Export all bitmaps to folder…", command=self._cmd_export_all)

        hm = _m(mb); mb.add_cascade(label="Help", menu=hm)
        hm.add_command(label="Keyboard shortcuts", command=self._show_help)
        hm.add_command(label="Supported formats", command=self._show_formats)

        self.bind("<Control-o>", lambda _: self._cmd_open())
        self.bind("<Control-s>", lambda _: self._cmd_save())
        self.bind("<Control-p>", lambda _: self._cmd_copy_path())
        self.bind("<F2>",        lambda _: self._cmd_edit())
        self.bind("<F5>",        lambda _: self._cmd_export())
        self.bind("<F6>",        lambda _: self._cmd_import())

    # ── Layout ────────────────────────────────────────────────────────────────
    def _build_ui(self):
        # ── top toolbar ──────────────────────────────────────────────────────
        tb = tk.Frame(self, bg=HEADER, pady=4)
        tb.pack(fill="x")

        self._btn(tb, "📂 Open",    self._cmd_open).pack(side="left", padx=6)
        self._btn(tb, "💾 Save",    self._cmd_save).pack(side="left", padx=2)
        tk.Frame(tb, bg=HEADER, width=14).pack(side="left")
        self._btn(tb, "✏️ Edit",   self._cmd_edit).pack(side="left", padx=2)
        self._btn(tb, "📤 Export", self._cmd_export).pack(side="left", padx=2)
        self._btn(tb, "📥 Import", self._cmd_import).pack(side="left", padx=2)
        tk.Frame(tb, bg=HEADER, width=14).pack(side="left")
        self._btn(tb, "WZ→NX",    self._cmd_wz2nx).pack(side="left", padx=2)
        self._btn(tb, "ASE→NX",   self._cmd_ase2nx).pack(side="left", padx=2)
        self._btn(tb, "NX→ASE",   self._cmd_nx2ase).pack(side="left", padx=2)
        tk.Frame(tb, bg=HEADER, width=14).pack(side="left")
        # Format badge
        self._fmt_lbl = tk.Label(tb, text="—", bg=HEADER, fg=TEAL,
                                  font=("Consolas", 10, "bold"), width=5)
        self._fmt_lbl.pack(side="left", padx=4)

        # Search
        tk.Label(tb, text="🔍", bg=HEADER, fg=FG).pack(side="left")
        self._search_var = tk.StringVar()
        self._search_var.trace_add("write", lambda *_: self._on_search())
        se = tk.Entry(tb, textvariable=self._search_var, bg=PANEL, fg=FG,
                      insertbackground=FG, relief="flat", width=24, font=("Consolas", 10))
        se.pack(side="left", padx=4, ipady=3)

        # Dirty indicator
        self._dirty_lbl = tk.Label(tb, text="", bg=HEADER, fg=RED, font=("Consolas", 10, "bold"))
        self._dirty_lbl.pack(side="right", padx=8)

        # File label
        self._file_lbl = tk.Label(tb, text="No file open", bg=HEADER, fg=GRAY,
                                  font=("Consolas", 10))
        self._file_lbl.pack(side="right", padx=8)

        # ── main panes ───────────────────────────────────────────────────────
        paned = tk.PanedWindow(self, orient="horizontal", bg=BG,
                               sashwidth=5, sashrelief="flat")
        paned.pack(fill="both", expand=True)

        # ── left: tree ────────────────────────────────────────────────────────
        left = tk.Frame(paned, bg=BG)
        paned.add(left, minsize=260, width=360)

        tk.Label(left, text="Node Tree", bg=BG, fg=ACCENT,
                 font=("Consolas", 11, "bold")).pack(anchor="w", padx=8, pady=(6, 2))

        tree_frame = tk.Frame(left, bg=BG)
        tree_frame.pack(fill="both", expand=True, padx=4, pady=4)

        self.tree = ttk.Treeview(tree_frame, columns=("type",), show="tree headings",
                                  selectmode="browse")
        self.tree.heading("#0",    text="Name", anchor="w")
        self.tree.heading("type",  text="Type", anchor="w")
        self.tree.column("#0",     width=220, minwidth=120)
        self.tree.column("type",   width=70,  minwidth=50)

        vsb = ttk.Scrollbar(tree_frame, orient="vertical",   command=self.tree.yview)
        hsb = ttk.Scrollbar(tree_frame, orient="horizontal", command=self.tree.xview)
        self.tree.configure(yscrollcommand=vsb.set, xscrollcommand=hsb.set)
        hsb.pack(side="bottom", fill="x")
        vsb.pack(side="right",  fill="y")
        self.tree.pack(fill="both", expand=True)

        self.tree.bind("<<TreeviewSelect>>", self._on_select)
        self.tree.bind("<<TreeviewOpen>>",   self._on_expand)
        self.tree.bind("<Double-1>",          lambda _: self._cmd_edit())

        # ── right: detail panel ───────────────────────────────────────────────
        right = tk.Frame(paned, bg=BG)
        paned.add(right, minsize=200)

        # path bar
        self._path_var = tk.StringVar(value="")
        path_frame = tk.Frame(right, bg=HEADER)
        path_frame.pack(fill="x")
        tk.Label(path_frame, text="Path:", bg=HEADER, fg=GRAY,
                 font=("Consolas", 9)).pack(side="left", padx=6)
        tk.Entry(path_frame, textvariable=self._path_var, bg=HEADER, fg=ACCENT,
                 relief="flat", readonlybackground=HEADER, state="readonly",
                 font=("Consolas", 9)).pack(side="left", fill="x", expand=True, padx=4, pady=3)
        self._btn(path_frame, "📋", self._cmd_copy_path, small=True).pack(side="right", padx=4)

        # info labels
        info = tk.Frame(right, bg=PANEL)
        info.pack(fill="x", padx=6, pady=4)

        self._lbl_name  = self._info_row(info, "Name:",     0)
        self._lbl_type  = self._info_row(info, "Type:",     1)
        self._lbl_value = self._info_row(info, "Value:",    2)
        self._lbl_kids  = self._info_row(info, "Children:", 3)

        # edit button
        btn_row = tk.Frame(right, bg=BG)
        btn_row.pack(fill="x", padx=6)
        self._btn(btn_row, "✏️  Edit value  (F2)",  self._cmd_edit).pack(side="left", padx=2, pady=4)
        self._btn(btn_row, "📤 Export  (F5)",       self._cmd_export).pack(side="left", padx=2)
        self._btn(btn_row, "📥 Import  (F6)",       self._cmd_import).pack(side="left", padx=2)

        # image preview
        tk.Label(right, text="Preview", bg=BG, fg=ACCENT,
                 font=("Consolas", 10, "bold")).pack(anchor="w", padx=8, pady=(4, 0))

        self._preview_frame = tk.Label(right, bg=PANEL, relief="flat",
                                        text="(select a bitmap node)", fg=GRAY,
                                        font=("Consolas", 10))
        self._preview_frame.pack(fill="both", expand=True, padx=6, pady=4)

        # status bar
        self._status = tk.Label(self, text="Ready", bg=HEADER, fg=GRAY,
                                 anchor="w", font=("Consolas", 9), pady=2)
        self._status.pack(side="bottom", fill="x", padx=6)

    def _info_row(self, parent, label, row):
        tk.Label(parent, text=label, bg=PANEL, fg=GRAY,
                 font=("Consolas", 10), anchor="e", width=10).grid(
                     row=row, column=0, padx=(6,2), pady=1, sticky="e")
        lbl = tk.Label(parent, text="—", bg=PANEL, fg=FG,
                       font=("Consolas", 10), anchor="w", wraplength=340)
        lbl.grid(row=row, column=1, padx=(2,6), pady=1, sticky="w")
        return lbl

    def _btn(self, parent, text, cmd, small=False):
        sz = 9 if small else 10
        return tk.Button(parent, text=text, command=cmd,
                         bg=PANEL, fg=FG, activebackground=ACCENT, activeforeground=BG,
                         relief="flat", cursor="hand2", padx=6 if not small else 3,
                         pady=3, font=("Consolas", sz))

    def _apply_styles(self):
        style = ttk.Style(self)
        style.theme_use("clam")
        style.configure("Treeview",
                         background=PANEL, foreground=FG, fieldbackground=PANEL,
                         rowheight=22, font=("Consolas", 10), borderwidth=0)
        style.configure("Treeview.Heading",
                         background=HEADER, foreground=ACCENT, font=("Consolas", 10, "bold"))
        style.map("Treeview",
                  background=[("selected", SEL_BG)],
                  foreground=[("selected", FG)])
        style.configure("Vertical.TScrollbar",   background=PANEL, troughcolor=BG)
        style.configure("Horizontal.TScrollbar", background=PANEL, troughcolor=BG)
        self.option_add("*TCombobox*Listbox.background", PANEL)

    # ── File open / save ──────────────────────────────────────────────────────
    def _cmd_open(self):
        p = filedialog.askopenfilename(
            title="Open asset file",
            filetypes=[
                ("All supported", "*.nx *.wz *.img *.ase *.aseprite *.ms"),
                ("NX files",      "*.nx"),
                ("WZ files",      "*.wz *.img"),
                ("Aseprite",      "*.ase *.aseprite"),
                ("MapleScript",   "*.ms"),
                ("All files",     "*.*"),
            ])
        if p:
            self._open(p)

    def _open(self, path: str):
        try:
            self._status_set(f"Loading {path}…")
            fmt, obj = _open_any(path)
            self.path = path
            self._fmt  = fmt
            self.nx  = obj if fmt == 'nx'  else None
            self.wz  = obj if fmt == 'wz'  else None
            self.ase = obj if fmt == 'ase' else None
            self._file_lbl.configure(text=Path(path).name)
            self._dirty_lbl.configure(text="")
            self._fmt_lbl.configure(
                text=fmt.upper(),
                fg={'nx':TEAL,'wz':YELLOW,'ase':PINK,'ms':ORANGE}.get(fmt, GRAY))
            self._populate_tree()
            # Status message per format
            if fmt == 'nx':
                self._status_set(f"NX  {self.nx.node_count:,} nodes  |  "
                                 f"{self.nx.str_count:,} strings  |  "
                                 f"{self.nx.bmp_count:,} bitmaps  |  "
                                 f"{self.nx.aud_count:,} audio")
            elif fmt == 'wz':
                self._status_set(f"WZ  version={self.wz._version}  |  "
                                 f"root entries={len(self.wz.root)}")
            elif fmt == 'ase':
                self._status_set(f"Aseprite  {self.ase.w}×{self.ase.h}  |  "
                                 f"{self.ase.num_frames} frames  |  "
                                 f"{len(self.ase.layers)} layers  |  "
                                 f"{len(self.ase.tags)} tags")
            elif fmt == 'ms':
                self._status_set(f"MS  {obj.get('format','?')}  {obj.get('size',0):,} bytes")
            else:
                self._status_set(f"Unknown format: {path}")
        except Exception as e:
            messagebox.showerror("Open failed", str(e))

    def _cmd_save(self):
        if not self.nx: return
        if not self.nx.dirty:
            self._status_set("Nothing to save.")
            return
        self.nx.save()
        self._dirty_lbl.configure(text="")
        self._status_set("Saved.")

    def _cmd_save_as(self):
        if not self.nx: return
        p = filedialog.asksaveasfilename(
            title="Save As", defaultextension=".nx",
            filetypes=[("NX files", "*.nx"), ("All files", "*.*")])
        if p:
            self.nx.save(p)
            self._dirty_lbl.configure(text="")

    # ── Tree population ───────────────────────────────────────────────────────
    def _populate_tree(self):
        self.tree.delete(*self.tree.get_children())
        self._node_map.clear()
        self._wz_path_map.clear()
        if self._fmt == 'nx' and self.nx and self.nx.root:
            self._insert_node("", self.nx.root)
        elif self._fmt == 'wz' and self.wz:
            self._populate_wz("", self.wz.root, "")
        elif self._fmt == 'ase' and self.ase:
            self._populate_ase()
        elif self._fmt == 'ms':
            self.tree.insert("", "end", text="(MS file — use info command)", values=("ms",))

    def _populate_wz(self, parent_iid: str, d: dict, wz_path: str):
        """Insert WZ directory entries into tree."""
        for name, node in list(d.items())[:200]:   # cap for performance
            t = node.get('_type', '?') if isinstance(node, dict) and '_type' in node else type(node).__name__
            iid = self.tree.insert(parent_iid, "end", text=name, values=(t,), tags=("wz",))
            self.tree.tag_configure("wz", foreground=YELLOW)
            full = f"{wz_path}/{name}" if wz_path else name
            self._wz_path_map[iid] = full
            self._node_map[iid] = node
            # Add dummy expander for dirs/imgs
            if isinstance(node, dict) and node.get('_type') in ('dir', 'img'):
                self.tree.insert(iid, "end", text="…loading…", values=("",), tags=("dummy",))

    def _populate_ase(self):
        """Show Aseprite frames + layers + tags."""
        ase = self.ase
        layers_iid = self.tree.insert("", "end", text=f"Layers ({len(ase.layers)})", values=("group",))
        for i, lay in enumerate(ase.layers):
            self.tree.insert(layers_iid, "end", text=f"{i}: {lay['name']}", values=("layer",), tags=("ase",))
        self.tree.tag_configure("ase", foreground=PINK)

        tags_iid = self.tree.insert("", "end", text=f"Tags ({len(ase.tags)})", values=("group",))
        for t in ase.tags:
            self.tree.insert(tags_iid, "end", text=f"{t['name']}  f{t['from']}-{t['to']}", values=("tag",), tags=("ase",))

        frames_iid = self.tree.insert("", "end", text=f"Frames ({ase.num_frames})", values=("group",), open=True)
        for fi, frame in enumerate(ase.frames):
            iid = self.tree.insert(frames_iid, "end",
                                   text=f"Frame {fi}  ({frame['dur_ms']} ms)  {len(frame['cels'])} cels",
                                   values=("frame",), tags=("ase",))
            self._node_map[iid] = ('ase_frame', fi)

    def _insert_node(self, parent_iid: str, node: NXNode) -> str:
        t     = TYPE_NAMES.get(node.type, "?")
        colour = TYPE_COLOURS.get(t, FG)
        label  = node.name or "(root)"
        iid    = self.tree.insert(
            parent_iid, "end",
            text=label,
            values=(t,),
            tags=(t,),
            open=False,
        )
        self.tree.tag_configure(t, foreground=colour)
        self._node_map[iid] = node
        # Insert a dummy child so the expander shows
        if node.child_count > 0:
            self.tree.insert(iid, "end", text="…loading…", values=("",), tags=("dummy",))
        return iid

    def _on_expand(self, _evt):
        iid = self.tree.focus()
        children = self.tree.get_children(iid)
        if len(children) != 1 or self.tree.item(children[0], "text") != "…loading…":
            return
        self.tree.delete(children[0])
        obj = self._node_map.get(iid)
        if self._fmt == 'nx' and isinstance(obj, NXNode):
            for child in obj.children():
                self._insert_node(iid, child)
        elif self._fmt == 'wz' and isinstance(obj, dict) and '_type' in obj:
            self.wz._ensure_loaded(obj)
            ch = obj.get('_children', {})
            if isinstance(ch, dict):
                wz_path = self._wz_path_map.get(iid, '')
                self._populate_wz(iid, ch, wz_path)

    # ── Selection → detail panel ──────────────────────────────────────────────
    def _on_select(self, _evt):
        iid  = self.tree.focus()
        obj  = self._node_map.get(iid)

        # ── ASE frame ────────────────────────────────────────────────────────
        if isinstance(obj, tuple) and len(obj) == 2 and obj[0] == 'ase_frame':
            fi = obj[1]
            frame = self.ase.frames[fi]
            self._lbl_name.configure(text=f"Frame {fi}")
            self._lbl_type.configure(text="frame", fg=PINK)
            self._lbl_value.configure(text=f"{frame['dur_ms']} ms  |  {len(frame['cels'])} cels", fg=PINK)
            self._lbl_kids.configure(text="—")
            self._path_var.set(f"frames/{fi}")
            if HAS_PIL:
                img = self.ase.composite_frame(fi)
                if img:
                    pw = max(1, self._preview_frame.winfo_width()  - 8)
                    ph = max(1, self._preview_frame.winfo_height() - 8)
                    if pw < 50: pw = 400
                    if ph < 50: ph = 300
                    ratio = min(pw / img.width, ph / img.height, 1.0)
                    nw, nh = max(1, int(img.width*ratio)), max(1, int(img.height*ratio))
                    disp = img.resize((nw, nh), Image.NEAREST) if ratio < 1 else img
                    tk_img = ImageTk.PhotoImage(disp)
                    self._preview_img = tk_img
                    self._preview_frame.configure(image=tk_img, text="")
            return

        # ── WZ node ──────────────────────────────────────────────────────────
        if self._fmt == 'wz' and isinstance(obj, dict) and '_type' in obj:
            nm = obj.get('_name', self.tree.item(iid, 'text'))
            t  = obj.get('_type', '?')
            self._lbl_name.configure(text=nm)
            self._lbl_type.configure(text=t, fg=YELLOW)
            self._lbl_value.configure(text=f"offset={obj.get('_offset','?')} size={obj.get('_size','?')}", fg=YELLOW)
            ch = obj.get('_children')
            self._lbl_kids.configure(text=str(len(ch)) if isinstance(ch, dict) else "?")
            self._path_var.set(self._wz_path_map.get(iid, ''))
            self._preview_frame.configure(image="", text="(WZ — load to preview)")
            return

        # ── NX node ───────────────────────────────────────────────────────────
        node = obj
        if not isinstance(node, NXNode):
            return
        t = TYPE_NAMES.get(node.type, "?")
        colour = TYPE_COLOURS.get(t, FG)

        self._lbl_name.configure(text=node.name or "(root)")
        self._lbl_type.configure(text=t, fg=colour)
        self._lbl_kids.configure(text=str(node.child_count))

        # Build value text
        if node.type == T_BITMAP:
            w, h = node.bitmap_size
            val_text = f"{w} × {h} pixels  (bitmap id {node.bitmap_id})"
        elif node.type == T_AUDIO:
            val_text = f"audio  id={node.audio_id}"
        elif node.value is not None:
            val_text = repr(node.value)
        else:
            val_text = "—"
        self._lbl_value.configure(text=val_text, fg=colour)

        # Build path
        path = self._path_of(iid)
        self._path_var.set(path)

        # Bitmap preview
        self._show_preview(node)

    def _path_of(self, iid: str) -> str:
        parts = []
        cur   = iid
        while cur:
            node = self._node_map.get(cur)
            if node:
                parts.append(node.name or "")
            cur = self.tree.parent(cur)
        return "/".join(reversed(parts))

    def _show_preview(self, node: NXNode):
        self._preview_img = None
        if node.type != T_BITMAP or not HAS_PIL or not HAS_LZ4:
            msg = "(select a bitmap node)"
            if node.type == T_BITMAP and not HAS_PIL:
                msg = "pip install Pillow to preview bitmaps"
            elif node.type == T_BITMAP and not HAS_LZ4:
                msg = "pip install lz4 to preview bitmaps"
            elif node.type == T_AUDIO:
                msg = f"🔊 Audio  id={node.audio_id}"
            elif node.type == T_NONE:
                msg = f"Container  ({node.child_count} children)"
            else:
                msg = ""
            self._preview_frame.configure(image="", text=msg)
            return

        try:
            w, h, raw = self.nx.get_bitmap_data(node.bitmap_id)
            img = Image.frombytes("RGBA", (w, h), raw, "raw", "BGRA")

            # Scale to fit preview area
            pw = max(1, self._preview_frame.winfo_width()  - 8)
            ph = max(1, self._preview_frame.winfo_height() - 8)
            if pw < 50: pw = 400
            if ph < 50: ph = 300
            ratio = min(pw / w, ph / h, 1.0)
            nw, nh = max(1, int(w * ratio)), max(1, int(h * ratio))
            if ratio < 1:
                img = img.resize((nw, nh), Image.NEAREST)

            tk_img = ImageTk.PhotoImage(img)
            self._preview_img = tk_img
            self._preview_frame.configure(image=tk_img, text="")
        except Exception as e:
            self._preview_frame.configure(image="", text=f"Preview error:\n{e}")

    # ── Commands ──────────────────────────────────────────────────────────────
    def _cmd_copy_path(self):
        self.clipboard_clear()
        self.clipboard_append(self._path_var.get())
        self._status_set("Path copied to clipboard.")

    def _cmd_edit(self):
        iid  = self.tree.focus()
        node = self._node_map.get(iid)
        if node is None or not self.nx:
            return

        t = TYPE_NAMES.get(node.type, "?")
        if node.type == T_BITMAP:
            messagebox.showinfo("Edit bitmap",
                "Use 📥 Import to replace a bitmap with a PNG file.")
            return
        if node.type == T_AUDIO:
            messagebox.showinfo("Edit audio", "Audio editing is not yet supported.")
            return
        if node.type == T_NONE:
            messagebox.showinfo("Container node",
                f"This node is a container with {node.child_count} children.")
            return

        # Build prompt
        cur_val = str(node.value) if node.value is not None else ""
        if node.type == T_VEC:
            x, y = node.vector_value
            cur_val = f"{x},{y}"
            prompt = "Enter new vector as  x,y"
        elif node.type == T_INT:
            prompt = "Enter new integer value (hex 0x… or decimal)"
        elif node.type == T_FLOAT:
            prompt = "Enter new float value"
        else:
            prompt = "Enter new string value"

        dlg = _EditDialog(self, f"Edit  {node.name}", prompt, cur_val)
        self.wait_window(dlg)
        if dlg.result is None:
            return
        new_val = dlg.result

        try:
            if node.type == T_INT:
                self.nx.set_int(node, int(new_val, 0) if new_val.startswith("0x") else int(new_val))
            elif node.type == T_FLOAT:
                self.nx.set_float(node, float(new_val))
            elif node.type == T_STRING:
                self.nx.set_string(node, new_val)
            elif node.type == T_VEC:
                xs, ys = new_val.split(",")
                self.nx.set_vector(node, int(xs), int(ys))
            self._dirty_lbl.configure(text="● unsaved")
            self._on_select(None)
            self._status_set(f"Updated {node.name} → {node.value!r}")
            # Refresh tree label
            self.tree.item(iid, text=node.name)
        except Exception as e:
            messagebox.showerror("Edit failed", str(e))

    def _cmd_export(self):
        iid  = self.tree.focus()
        node = self._node_map.get(iid)
        if node is None or not self.nx:
            return
        if node.type == T_BITMAP:
            if not HAS_PIL or not HAS_LZ4:
                messagebox.showerror("Missing deps", "pip install lz4 Pillow")
                return
            p = filedialog.asksaveasfilename(
                title="Export bitmap as PNG",
                defaultextension=".png",
                initialfile=f"{node.name}.png",
                filetypes=[("PNG", "*.png")])
            if p:
                try:
                    self.nx.export_bitmap(node, p)
                    self._status_set(f"Exported → {p}")
                except Exception as e:
                    messagebox.showerror("Export failed", str(e))
        elif node.type == T_AUDIO:
            p = filedialog.asksaveasfilename(
                title="Export audio",
                defaultextension=".mp3",
                initialfile=f"{node.name}.mp3",
                filetypes=[("Audio", "*.mp3 *.ogg"), ("All", "*.*")])
            if p:
                try:
                    self.nx.export_audio(node, p)
                    self._status_set(f"Exported audio → {p}")
                except Exception as e:
                    messagebox.showerror("Export failed", str(e))
        else:
            messagebox.showinfo("Export", "Only bitmap and audio nodes can be exported.")

    def _cmd_import(self):
        iid  = self.tree.focus()
        node = self._node_map.get(iid)
        if node is None or not self.nx:
            return
        if node.type != T_BITMAP:
            messagebox.showinfo("Import", "Only bitmap nodes can be replaced via import.")
            return
        if not HAS_PIL or not HAS_LZ4:
            messagebox.showerror("Missing deps", "pip install lz4 Pillow")
            return
        p = filedialog.askopenfilename(
            title="Import PNG to replace bitmap",
            filetypes=[("PNG", "*.png"), ("Images", "*.png *.jpg *.bmp"), ("All", "*.*")])
        if p:
            try:
                self.nx.replace_bitmap(node, p)
                self._dirty_lbl.configure(text="● unsaved")
                self._show_preview(node)
                self._status_set(f"Bitmap replaced from {p}  (unsaved)")
            except Exception as e:
                messagebox.showerror("Import failed", str(e))

    # ── Search ────────────────────────────────────────────────────────────────
    def _on_search(self):
        q = self._search_var.get().strip().lower()
        if not q or not self.nx:
            return
        results = []
        def _walk(node, path):
            if q in node.name.lower():
                results.append((path, node))
            for c in node.children():
                _walk(c, path + "/" + c.name)
        _walk(self.nx.root, self.nx.root.name)
        if results:
            path, node = results[0]
            self._status_set(f"Found {len(results)} matches — showing first: {path}")
            self._navigate_to(path)
        else:
            self._status_set(f"No nodes matching '{q}'")

    def _navigate_to(self, path: str):
        """Expand tree to path and select the target node."""
        parts = [p for p in path.split("/") if p][1:]  # skip root name
        cur_iid = next(iter(self.tree.get_children("")), None)
        if cur_iid is None:
            return
        for part in parts:
            self._on_expand(None) if self.tree.get_children(cur_iid) and \
                self.tree.item(self.tree.get_children(cur_iid)[0], "text") == "…loading…" else None
            # Expand
            kids = self.tree.get_children(cur_iid)
            if kids and self.tree.item(kids[0], "text") == "…loading…":
                self.tree.delete(kids[0])
                node = self._node_map.get(cur_iid)
                if node:
                    for c in node.children():
                        self._insert_node(cur_iid, c)
            # Find child
            found = None
            for iid in self.tree.get_children(cur_iid):
                n = self._node_map.get(iid)
                if n and n.name == part:
                    found = iid
                    break
            if found is None:
                break
            cur_iid = found
            self.tree.item(cur_iid, open=True)
        self.tree.focus(cur_iid)
        self.tree.selection_set(cur_iid)
        self.tree.see(cur_iid)
        self._on_select(None)

    # ── Convert commands ─────────────────────────────────────────────────────
    def _cmd_wz2nx(self):
        wz_path = filedialog.askopenfilename(
            title="Select WZ file to convert",
            filetypes=[("WZ files", "*.wz *.img"), ("All", "*.*")])
        if not wz_path: return
        nx_path = filedialog.asksaveasfilename(
            title="Save as NX file",
            defaultextension=".nx",
            initialfile=Path(wz_path).stem + ".nx",
            filetypes=[("NX files", "*.nx")])
        if not nx_path: return
        region = simpledialog.askstring("Region", "Encryption region (gms / kms / none):", initialvalue="gms")
        if region is None: return
        try:
            self._status_set(f"Converting {Path(wz_path).name} → NX…")
            self.update()
            wz_to_nx(wz_path, nx_path, region or "gms")
            self._status_set(f"Done → {nx_path}")
            if messagebox.askyesno("Open result?", f"Open the converted NX file?\n{nx_path}"):
                self._open(nx_path)
        except Exception as e:
            messagebox.showerror("Conversion failed", str(e))

    def _cmd_ase2nx(self):
        ase_path = filedialog.askopenfilename(
            title="Select Aseprite file",
            filetypes=[("Aseprite", "*.ase *.aseprite"), ("All", "*.*")])
        if not ase_path: return
        nx_path = filedialog.asksaveasfilename(
            title="Save as NX file",
            defaultextension=".nx",
            initialfile=Path(ase_path).stem + ".nx",
            filetypes=[("NX files", "*.nx")])
        if not nx_path: return
        try:
            self._status_set(f"Converting {Path(ase_path).name} → NX…")
            self.update()
            ase2nx(ase_path, nx_path)
            self._status_set(f"Done → {nx_path}")
            if messagebox.askyesno("Open result?", f"Open the converted NX file?\n{nx_path}"):
                self._open(nx_path)
        except Exception as e:
            messagebox.showerror("Conversion failed", str(e))

    def _cmd_nx2ase(self):
        if not self.nx:
            messagebox.showinfo("NX→ASE", "Open an NX file first.")
            return
        path = self._path_var.get()
        if not path:
            messagebox.showinfo("NX→ASE", "Select a node (directory of bitmaps or single bitmap).")
            return
        out = filedialog.asksaveasfilename(
            title="Save as Aseprite",
            defaultextension=".aseprite",
            filetypes=[("Aseprite", "*.ase *.aseprite")])
        if not out: return
        try:
            self._status_set(f"Exporting {path} → ASE…")
            self.update()
            nx2ase(self.path, path, out)
            self._status_set(f"Done → {out}")
        except Exception as e:
            messagebox.showerror("Export failed", str(e))

    def _cmd_export_all(self):
        """Export every bitmap in the open NX file to a folder."""
        if not self.nx:
            messagebox.showinfo("Export all", "Open an NX file first."); return
        if not HAS_PIL or not HAS_LZ4:
            messagebox.showerror("Missing deps", "pip install lz4 Pillow"); return
        folder = filedialog.askdirectory(title="Export all bitmaps to folder")
        if not folder: return
        out_dir = Path(folder)
        count = 0
        errors = 0
        def _walk(node, pfx):
            nonlocal count, errors
            if node.type == T_BITMAP:
                try:
                    safe = pfx.replace("/","_").replace("\\","_") or f"bitmap_{node.bitmap_id}"
                    self.nx.export_bitmap(node, str(out_dir / f"{safe}.png"))
                    count += 1
                except: errors += 1
            for c in node.children():
                _walk(c, f"{pfx}/{c.name}" if pfx else c.name)
        _walk(self.nx.root, "")
        self._status_set(f"Exported {count} bitmaps to {folder}  ({errors} errors)")

    # ── Helpers ───────────────────────────────────────────────────────────────
    def _status_set(self, msg: str):
        self._status.configure(text=msg)

    def _show_help(self):
        messagebox.showinfo("Keyboard shortcuts",
            "Ctrl+O    Open NX / WZ / ASE / MS file\n"
            "Ctrl+S    Save NX (in-place)\n"
            "Ctrl+P    Copy node path\n"
            "F2        Edit selected NX node value\n"
            "F5        Export bitmap/audio/ASE frame\n"
            "F6        Import PNG to replace NX bitmap\n"
            "Double-click    Edit value\n"
            "Search box     Jump to first matching node name\n\n"
            "Convert menu:\n"
            "  WZ→NX   Convert a .wz or .img file to PKG4 NX\n"
            "  ASE→NX  Convert Aseprite frames to NX bitmap nodes\n"
            "  NX→ASE  Export NX bitmap subtree as Aseprite animation\n"
        )

    def _show_formats(self):
        messagebox.showinfo("Supported formats",
            "NX  (.nx)            PKG4 binary — full read/edit/export/import\n"
            "WZ  (.wz, .img)      PKG1 binary (GMS v83-v95) — browse + convert to NX\n"
            "Aseprite (.ase)      Pixel art — browse frames + convert to/from NX\n"
            "MS  (.ms)            MapleScript text/binary — basic info display\n\n"
            "pip install lz4 Pillow   for bitmap support"
        )


# ─────────────────────────────────────────────────────────────────────────────
# Edit dialog
# ─────────────────────────────────────────────────────────────────────────────

class _EditDialog(tk.Toplevel):
    def __init__(self, parent, title, prompt, initial):
        super().__init__(parent)
        self.title(title)
        self.resizable(False, False)
        self.configure(bg=BG)
        self.result = None
        self.grab_set()
        self.transient(parent)

        tk.Label(self, text=prompt, bg=BG, fg=FG,
                 font=("Consolas", 11), wraplength=340).pack(padx=20, pady=(16, 6))

        self._var = tk.StringVar(value=initial)
        e = tk.Entry(self, textvariable=self._var, bg=PANEL, fg=FG,
                     insertbackground=FG, relief="flat", width=36,
                     font=("Consolas", 12))
        e.pack(padx=20, pady=6, ipady=6)
        e.select_range(0, "end")
        e.focus_set()
        e.bind("<Return>", lambda _: self._ok())
        e.bind("<Escape>", lambda _: self.destroy())

        row = tk.Frame(self, bg=BG)
        row.pack(pady=(4, 16))
        self._mkbtn(row, "  OK  ", self._ok,    ACCENT, BG).pack(side="left", padx=8)
        self._mkbtn(row, "Cancel", self.destroy, PANEL, FG).pack(side="left", padx=8)

        self.update_idletasks()
        x = parent.winfo_x() + (parent.winfo_width()  - self.winfo_width())  // 2
        y = parent.winfo_y() + (parent.winfo_height() - self.winfo_height()) // 2
        self.geometry(f"+{x}+{y}")

    def _mkbtn(self, parent, text, cmd, bg, fg):
        return tk.Button(parent, text=text, command=cmd,
                         bg=bg, fg=fg, activebackground=SEL_BG, activeforeground=FG,
                         relief="flat", cursor="hand2", padx=14, pady=6,
                         font=("Consolas", 11))

    def _ok(self):
        self.result = self._var.get()
        self.destroy()


# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    app = NXBrowser()
    app.mainloop()
