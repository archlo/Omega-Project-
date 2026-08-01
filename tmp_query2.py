import sqlite3
conn = sqlite3.connect(r'C:\Users\jorge\.local\share\mimocode\mimocode.db')
cur = conn.cursor()

# Get user messages from the IDA Audit session
cur.execute("""
SELECT m.id, json_extract(m.data, '$.role') as role, 
       substr(json_extract(p.data, '$.text'), 1, 200) as preview
FROM message m
JOIN part p ON p.message_id = m.id
WHERE m.session_id = 'ses_0bd094b42fferBmBggDplEt7cN'
  AND json_extract(p.data, '$.type') = 'text'
  AND json_extract(m.data, '$.role') = 'user'
ORDER BY m.time_created
""")
for r in cur.fetchall():
    print(f"[{r[0]}] {r[2]}")

conn.close()
