import idaapi, idautils, idc, json
out = {}

# CUISkill::OnButtonClicked at 0x851480
target1 = 0x851480
lines1 = []
curr = target1
for _ in range(80):
    line = idc.GetDisasm(curr)
    lines1.append(f"{hex(curr)}: {line}")
    curr = idc.next_head(curr)
    if curr == idc.BADADDR: break
out['skill_onbuttonclicked'] = lines1

# CUISkill::ShiftMacroUIState at 0x84a040
target2 = 0x84a040
lines2 = []
curr = target2
for _ in range(60):
    line = idc.GetDisasm(curr)
    lines2.append(f"{hex(curr)}: {line}")
    curr = idc.next_head(curr)
    if curr == idc.BADADDR: break
out['shift_macro_ui_state'] = lines2

with open('tools/_out.json', 'w') as f:
    json.dump(out, f, indent=2)
idc.qexit(0)
