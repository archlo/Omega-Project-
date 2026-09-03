@echo off
setlocal
set IDA="C:\Program Files\IDA Professional 9.3\idat.exe"
set IDB="C:\Users\jorge\OneDrive\Desktop\ts\ida\Maplestory95.exe.i64"
set SCRIPT="C:\Users\jorge\OneDrive\Desktop\ts\tools\ida_dump.py"
set OUTDIR="C:\Users\jorge\OneDrive\Desktop\ts\ida_output"

echo Finding function addresses by name...

echo 1. CUser::SetCarryItemEffect
%IDA% -A -S"%SCRIPT% --names %OUTDIR%\find_SetCarryItemEffect.json SetCarryItemEffect" %IDB%

echo 2. CUser::ShowAffectedSkillAni
%IDA% -A -S"%SCRIPT% --names %OUTDIR%\find_ShowAffectedSkillAni.json ShowAffectedSkillAni" %IDB%

echo 3. CUser::UpdateAffectedSkillList
%IDA% -A -S"%SCRIPT% --names %OUTDIR%\find_UpdateAffectedSkillList.json UpdateAffectedSkillList" %IDB%

echo Done finding addresses.
