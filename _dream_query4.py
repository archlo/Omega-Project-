import sqlite3

DB = r"C:\Users\jorge\.local\share\mimocode\mimocode.db"
conn = sqlite3.connect(DB)
conn.row_factory = sqlite3.Row
c = conn.cursor()

# Get the assistant text summaries from the latest session
sid = 'ses_0989c98feffenY0kbNBpzyVc0j'

print("=== ASSISTANT TEXT SUMMARIES (long, from end of session) ===")
c.execute("""
    SELECT p.id,
           json_extract(p.data, '$.text') as text
    FROM message m
    JOIN part p ON p.message_id = m.id
    WHERE m.session_id = ?
      AND json_extract(m.data, '$.role') = 'assistant'
      AND json_extract(p.data, '$.type') = 'text'
      AND length(json_extract(p.data, '$.text')) > 200
    ORDER BY m.time_created DESC
    LIMIT 3
""", (sid,))
for r in c.fetchall():
    text = r['text']
    print(f"\n--- {r['id'][:30]} ---")
    print(text[:3000])
    print("...")

# Also check the ses_09e502575ffeaeN2L79y01mf8v session (CUIToolTip)
print("\n\n=== CUIToolTip COMPREHENSIVE SESSION ===")
sid2 = 'ses_09e502575ffeaeN2L79y01mf8v'
c.execute("""
    SELECT p.id,
           json_extract(p.data, '$.text') as text
    FROM message m
    JOIN part p ON p.message_id = m.id
    WHERE m.session_id = ?
      AND json_extract(m.data, '$.role') = 'user'
      AND json_extract(p.data, '$.type') = 'text'
    ORDER BY m.time_created
    LIMIT 15
""", (sid2,))
for r in c.fetchall():
    text = r['text']
    if text and len(text.strip()) > 10:
        print(f"  [{r['id'][:20]}] {text[:300]}")

conn.close()
