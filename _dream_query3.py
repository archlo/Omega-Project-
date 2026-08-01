import sqlite3

DB = r"C:\Users\jorge\.local\share\mimocode\mimocode.db"
conn = sqlite3.connect(DB)
conn.row_factory = sqlite3.Row
c = conn.cursor()

WORK_SESSIONS = [
    'ses_0989c98feffenY0kbNBpzyVc0j',
    'ses_09a41602effexGscwcLVM4N9X3',
    'ses_09cc90295ffePflKOGjtWss4RW',
]

for sid in WORK_SESSIONS:
    c.execute("SELECT title FROM session WHERE id=?", (sid,))
    row = c.fetchone()
    title = row['title'] if row else '???'
    print(f"\n{'='*80}")
    print(f"SESSION: {sid}")
    print(f"TITLE: {title[:80]}")
    print(f"{'='*80}")

    c.execute("""
        SELECT m.id, json_extract(m.data, '$.role') as role,
               json_extract(m.data, '$.time.created') as ts,
               m.agent_id
        FROM message m
        WHERE m.session_id = ?
        ORDER BY m.time_created
    """, (sid,))
    msgs = c.fetchall()
    print(f"Total messages: {len(msgs)}")

    c.execute("""
        SELECT p.id,
               substr(json_extract(p.data, '$.text'), 1, 300) as text_preview
        FROM message m
        JOIN part p ON p.message_id = m.id
        WHERE m.session_id = ?
          AND json_extract(m.data, '$.role') = 'user'
          AND json_extract(p.data, '$.type') = 'text'
        ORDER BY m.time_created, p.time_created
    """, (sid,))
    user_texts = c.fetchall()
    print(f"\nUser text parts: {len(user_texts)}")
    for ut in user_texts:
        print(f"  [{ut['id'][:20]}] {ut['text_preview'][:200]}")

    c.execute("""
        SELECT p.id,
               json_extract(p.data, '$.tool') as tool,
               substr(json_extract(p.data, '$.state.input'), 1, 500) as input_preview
        FROM message m
        JOIN part p ON p.message_id = m.id
        WHERE m.session_id = ?
          AND json_extract(m.data, '$.role') = 'assistant'
          AND json_extract(p.data, '$.type') = 'tool'
          AND json_extract(p.data, '$.tool') IN ('edit', 'write')
        ORDER BY m.time_created, p.time_created
    """, (sid,))
    file_edits = c.fetchall()
    print(f"\nFile edits/writes: {len(file_edits)}")
    for fe in file_edits:
        tool = fe['tool']
        preview = fe['input_preview'][:300] if fe['input_preview'] else ''
        print(f"  [{tool}] {preview}")

    c.execute("""
        SELECT p.id,
               json_extract(p.data, '$.tool') as tool,
               substr(json_extract(p.data, '$.state.input'), 1, 300) as input_preview
        FROM message m
        JOIN part p ON p.message_id = m.id
        WHERE m.session_id = ?
          AND json_extract(m.data, '$.role') = 'assistant'
          AND json_extract(p.data, '$.type') = 'tool'
          AND json_extract(p.data, '$.tool') = 'bash'
        ORDER BY m.time_created, p.time_created
    """, (sid,))
    bash_calls = c.fetchall()
    print(f"\nBash calls: {len(bash_calls)}")
    for bc in bash_calls:
        preview = bc['input_preview'][:250] if bc['input_preview'] else ''
        print(f"  {preview}")

    c.execute("""
        SELECT p.id,
               substr(json_extract(p.data, '$.text'), 1, 400) as text_preview
        FROM message m
        JOIN part p ON p.message_id = m.id
        WHERE m.session_id = ?
          AND json_extract(m.data, '$.role') = 'assistant'
          AND json_extract(p.data, '$.type') = 'text'
          AND length(json_extract(p.data, '$.text')) > 50
        ORDER BY m.time_created DESC
        LIMIT 5
    """, (sid,))
    assistant_texts = c.fetchall()
    print(f"\nLast 5 assistant text outputs (long):")
    for at in assistant_texts:
        print(f"  {at['text_preview'][:300]}")
        print()

conn.close()
