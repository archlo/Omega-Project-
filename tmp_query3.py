import sqlite3
conn = sqlite3.connect(r'C:\Users\jorge\.local\share\mimocode\mimocode.db')
cur = conn.cursor()

# Check what files were modified in recent sessions (look for write/edit tool calls)
cur.execute("""
SELECT substr(json_extract(p.data, '$.tool'), 1, 20) as tool,
       substr(json_extract(json_extract(p.data, '$.state'), '$.input'), 1, 300) as input_preview
FROM part p
WHERE p.session_id = 'ses_0bd094b42fferBmBggDplEt7cN'
  AND json_extract(p.data, '$.type') = 'tool'
  AND json_extract(p.data, '$.tool') IN ('write', 'edit')
ORDER BY p.time_created
""")
for r in cur.fetchall():
    print(f"[{r[0]}] {r[1][:200]}")

conn.close()
