import sqlite3
import json

DB = r"C:\Users\jorge\.local\share\mimocode\mimocode.db"
conn = sqlite3.connect(DB)
c = conn.cursor()

# Get parent sessions (not checkpoint-writer) with their titles
print("=== PARENT SESSIONS (non-checkpoint-writer) ===")
c.execute("""
    SELECT id, title, time_created, time_updated, summary_additions, summary_deletions, summary_files
    FROM session
    WHERE project_id = 'f2082776-30b5-4c70-a75d-8c7daa4b6487'
      AND title NOT LIKE 'checkpoint-writer%'
      AND title != 'Auto Dream'
    ORDER BY time_created DESC
    LIMIT 10
""")
for r in c.fetchall():
    print(f"  {r[0]} | {r[1][:80]} | created={r[2]} | +{r[4]}/-{r[5]}/{r[6]}f")

# Get message counts per recent parent session
print("\n=== MESSAGE COUNTS FOR PARENT SESSIONS ===")
parent_ids = []
c.execute("""
    SELECT id, title FROM session
    WHERE project_id = 'f2082776-30b5-4c70-a75d-8c7daa4b6487'
      AND title NOT LIKE 'checkpoint-writer%'
      AND title != 'Auto Dream'
    ORDER BY time_created DESC
    LIMIT 5
""")
for r in c.fetchall():
    parent_ids.append(r[0])
    c.execute("SELECT COUNT(*) FROM message WHERE session_id = ?", (r[0],))
    cnt = c.fetchone()[0]
    print(f"  {r[0]}: {cnt} messages — {r[1][:60]}")

# Get the most recent parent session's user messages to understand what was being worked on
if parent_ids:
    latest = parent_ids[0]
    print(f"\n=== USER MESSAGES IN LATEST SESSION {latest} ===")
    c.execute("""
        SELECT substr(json_extract(data, '$.role'), 1, 10) as role,
               substr(data, 1, 300) as preview
        FROM message
        WHERE session_id = ?
        ORDER BY time_created
        LIMIT 30
    """, (latest,))
    for r in c.fetchall():
        print(f"  [{r[0]}] {r[1][:200]}")
        print()

# Check for notes.md
print("\n=== NOTES.MD CHECK ===")
import os
notes_path = r"C:\Users\jorge\.local\share\mimocode\memory\sessions\ses_0987147a1ffewJ6d8XKzqYOZ9c\notes.md"
if os.path.exists(notes_path):
    with open(notes_path, 'r', encoding='utf-8') as f:
        content = f.read()
    print(f"Found, {len(content)} bytes")
    if content.strip():
        print(content[:2000])
    else:
        print("(empty)")
else:
    print("Not found")

# Check for session checkpoints
print("\n=== SESSION CHECKPOINTS ===")
sess_base = r"C:\Users\jorge\.local\share\mimocode\memory\sessions"
for d in sorted(os.listdir(sess_base)):
    cp = os.path.join(sess_base, d, "checkpoint.md")
    if os.path.exists(cp):
        size = os.path.getsize(cp)
        print(f"  {d}/checkpoint.md ({size} bytes)")

conn.close()
