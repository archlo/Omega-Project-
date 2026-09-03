@echo off
setlocal
set IDA="C:\Program Files\IDA Professional 9.3\idat.exe"
set IDB="C:\Users\jorge\OneDrive\Desktop\ts\ida\Maplestory95.exe.i64"
set SCRIPT="C:\Users\jorge\OneDrive\Desktop\ts\tools\ida_dump.py"
set OUTDIR="C:\Users\jorge\OneDrive\Desktop\ts\ida_output"

echo Decompile 1: CUser::SetCarryItemEffect @ 0x8edb90
%IDA% -A -S"%SCRIPT% %OUTDIR%\cuser_SetCarryItemEffect_raw2.json 0x8edb90" %IDB%
if errorlevel 1 echo FAILED: SetCarryItemEffect

echo Decompile 2: CUser::ShowAffectedSkillAni @ 0x8eb860
%IDA% -A -S"%SCRIPT% %OUTDIR%\cuser_ShowAffectedSkillAni_raw2.json 0x8eb860" %IDB%
if errorlevel 1 echo FAILED: ShowAffectedSkillAni

echo Decompile 3: CUser::UpdateAffectedSkillList @ 0x8ffaf0
%IDA% -A -S"%SCRIPT% %OUTDIR%\cuser_UpdateAffectedSkillList_raw2.json 0x8ffaf0" %IDB%
if errorlevel 1 echo FAILED: UpdateAffectedSkillList

echo Done.
