import sqlite3
import json
import sys

DB = r"C:\Users\jorge\.local\share\mimocode\mimocode.db"
conn = sqlite3.connect(DB)
c = conn.cursor()

print("=== TABLES ===")
c.execute("SELECT name FROM sqlite_master WHERE type='table'")
for r in c.fetchall():
    print(r[0])

print("\n=== SCHEMA ===")
c.execute("SELECT name, sql FROM sqlite_master WHERE type='table'")
for r in c.fetchall():
    print(f"--- {r[0]} ---")
    print(r[1])
    print()

print("\n=== RECENT SESSIONS (last 20) ===")
try:
    c.execute("PRAGMA table_info(session)")
    cols = [row[1] for row in c.fetchall()]
    print(f"Session columns: {cols}")
    c.execute("SELECT * FROM session ORDER BY rowid DESC LIMIT 20")
    for r in c.fetchall():
        print(r)
except Exception as e:
    print(f"Error: {e}")

print("\n=== DB FILE SIZE ===")
import os
print(f"{os.path.getsize(DB)} bytes")

conn.close()
