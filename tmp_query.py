import sqlite3
conn = sqlite3.connect(r'C:\Users\jorge\.local\share\mimocode\mimocode.db')
cur = conn.cursor()
cur.execute("SELECT id, title, time_created FROM session WHERE title NOT LIKE 'checkpoint%' ORDER BY time_created DESC LIMIT 20")
for r in cur.fetchall():
    print(r)
conn.close()
