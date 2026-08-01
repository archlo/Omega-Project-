@echo off
setlocal
set IDA="C:\Program Files\IDA Professional 9.3\idat.exe"
set IDB="C:\Users\jorge\OneDrive\Desktop\ts\ida\Maplestory95.exe.i64"
set SCRIPT="C:\Users\jorge\OneDrive\Desktop\ts\tools\ida_dump.py"
set OUTDIR="C:\Users\jorge\OneDrive\Desktop\ts\ida_output"

echo Decompile 1: CUser::SetCarryItemEffect @ 0x930020
%IDA% -A -S"%SCRIPT% %OUTDIR%\cuser_SetCarryItemEffect_raw.json 0x930020" %IDB%
if errorlevel 1 echo FAILED: SetCarryItemEffect

echo Decompile 2: CUser::ShowAffectedSkillAni @ 0x92d010
%IDA% -A -S"%SCRIPT% %OUTDIR%\cuser_ShowAffectedSkillAni_raw.json 0x92d010" %IDB%
if errorlevel 1 echo FAILED: ShowAffectedSkillAni

echo Decompile 3: CUser::Update @ 0x937330
%IDA% -A -S"%SCRIPT% %OUTDIR%\cuser_Update_raw.json 0x937330" %IDB%
if errorlevel 1 echo FAILED: Update

echo Decompile 4: CUser::UpdateAffectedSkillList @ 0x922540
%IDA% -A -S"%SCRIPT% %OUTDIR%\cuser_UpdateAffectedSkillList_raw.json 0x922540" %IDB%
if errorlevel 1 echo FAILED: UpdateAffectedSkillList

echo Done.
