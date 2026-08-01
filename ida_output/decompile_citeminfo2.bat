@echo off
setlocal
set IDA="C:\Program Files\IDA Professional 9.3\idat.exe"
set IDB="C:\Users\jorge\OneDrive\Desktop\ts\ida\Maplestory95.exe.i64"
set SCRIPT="C:\Users\jorge\OneDrive\Desktop\ts\tools\ida_dump.py"
set OUTDIR="C:\Users\jorge\OneDrive\Desktop\ts\ida_output"

echo === CItemInfo Batch 2 ===

echo 1/20: GetLevelAbilityInfo
%IDA% -A -S"%SCRIPT% %OUTDIR%\citeminfo_GetLevelAbilityInfo.json 0x5c3a60" %IDB%
if errorlevel 1 echo FAILED

echo 2/20: IsGrowthItem
%IDA% -A -S"%SCRIPT% %OUTDIR%\citeminfo_IsGrowthItem.json 0x5c39b0" %IDB%
if errorlevel 1 echo FAILED

echo 3/20: GetMaxLEV
%IDA% -A -S"%SCRIPT% %OUTDIR%\citeminfo_GetMaxLEV.json 0x5acb70" %IDB%
if errorlevel 1 echo FAILED

echo 4/20: GetRequiredLEV
%IDA% -A -S"%SCRIPT% %OUTDIR%\citeminfo_GetRequiredLEV.json 0x5aca50" %IDB%
if errorlevel 1 echo FAILED

echo 5/20: IsCashItem_long
%IDA% -A -S"%SCRIPT% %OUTDIR%\citeminfo_IsCashItem.json 0x5aaf60" %IDB%
if errorlevel 1 echo FAILED

echo 6/20: IsEquipItem
%IDA% -A -S"%SCRIPT% %OUTDIR%\citeminfo_IsEquipItem.json 0x4c6320" %IDB%
if errorlevel 1 echo FAILED

echo 7/20: GetSpecialProp
%IDA% -A -S"%SCRIPT% %OUTDIR%\citeminfo_GetSpecialProp.json 0x5a6ee0" %IDB%
if errorlevel 1 echo FAILED

echo 8/20: GetSpecialName
%IDA% -A -S"%SCRIPT% %OUTDIR%\citeminfo_GetSpecialName.json 0x5a8460" %IDB%
if errorlevel 1 echo FAILED

echo 9/20: GetSpecialDesc
%IDA% -A -S"%SCRIPT% %OUTDIR%\citeminfo_GetSpecialDesc.json 0x5a85b0" %IDB%
if errorlevel 1 echo FAILED

echo 10/20: GetSpecialIcon
%IDA% -A -S"%SCRIPT% %OUTDIR%\citeminfo_GetSpecialIcon.json 0x5a87b0" %IDB%
if errorlevel 1 echo FAILED

echo 11/20: DrawGradeFrame
%IDA% -A -S"%SCRIPT% %OUTDIR%\citeminfo_DrawGradeFrame.json 0x594d10" %IDB%
if errorlevel 1 echo FAILED

echo 12/20: DrawItemIconForSlot
%IDA% -A -S"%SCRIPT% %OUTDIR%\citeminfo_DrawItemIconForSlot.json 0x5c0a40" %IDB%
if errorlevel 1 echo FAILED

echo 13/20: DrawSpecialIconForSlot
%IDA% -A -S"%SCRIPT% %OUTDIR%\citeminfo_DrawSpecialIconForSlot.json 0x5a8920" %IDB%
if errorlevel 1 echo FAILED

echo 14/20: RegisterEquipItemInfo
%IDA% -A -S"%SCRIPT% %OUTDIR%\citeminfo_RegisterEquipItemInfo.json 0x5b8ef0" %IDB%
if errorlevel 1 echo FAILED

echo 15/20: RegisterSetItemInfo
%IDA% -A -S"%SCRIPT% %OUTDIR%\citeminfo_RegisterSetItemInfo.json 0x5af950" %IDB%
if errorlevel 1 echo FAILED

echo 16/20: RegisterSetItemEffect
%IDA% -A -S"%SCRIPT% %OUTDIR%\citeminfo_RegisterSetItemEffect.json 0x5ace40" %IDB%
if errorlevel 1 echo FAILED

echo 17/20: RegisterGachaponItemInfo
%IDA% -A -S"%SCRIPT% %OUTDIR%\citeminfo_RegisterGachaponItemInfo.json 0x5bf040" %IDB%
if errorlevel 1 echo FAILED

echo 18/20: GetItemTypeName
%IDA% -A -S"%SCRIPT% %OUTDIR%\citeminfo_GetItemTypeName.json 0x59f140" %IDB%
if errorlevel 1 echo FAILED

echo 19/20: GetAppliableKarmaType
%IDA% -A -S"%SCRIPT% %OUTDIR%\citeminfo_GetAppliableKarmaType.json 0x5c09f0" %IDB%
if errorlevel 1 echo FAILED

echo 20/20: CheckDamageModifiedByEquipUpgrade
%IDA% -A -S"%SCRIPT% %OUTDIR%\citeminfo_CheckDamageModifiedByEquipUpgrade.json 0x5a44a0" %IDB%
if errorlevel 1 echo FAILED

echo === Done ===
