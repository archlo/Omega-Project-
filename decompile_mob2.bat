@echo off
cd /d "C:\Users\jorge\OneDrive\Desktop\ts"
"C:\Program Files\IDA Professional 9.3\idat.exe" -A -S"ida_dump.py ida_output\cskillinfo_LoadMobSkillLevelData_clean.json 0x706d30" ida\Maplestory95.exe.i64
echo Exit code: %ERRORLEVEL%
