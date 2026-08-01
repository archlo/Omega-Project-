@echo off
setlocal
set IDA="C:\Program Files\IDA Professional 9.3\idat.exe"
set IDB="C:\Users\jorge\OneDrive\Desktop\ts\ida\Maplestory95.exe.i64"
set SCRIPT="C:\Users\jorge\OneDrive\Desktop\ts\tools\ida_dump.py"
set OUTDIR="C:\Users\jorge\OneDrive\Desktop\ts\ida_output"

echo === CItemInfo Decompile Batch ===

echo 1/20: GetItemName
%IDA% -A -S"%SCRIPT% %OUTDIR%\citeminfo_GetItemName.json 0x5b1640" %IDB%
if errorlevel 1 echo FAILED: GetItemName

echo 2/20: GetItemDesc
%IDA% -A -S"%SCRIPT% %OUTDIR%\citeminfo_GetItemDesc.json 0x5b16e0" %IDB%
if errorlevel 1 echo FAILED: GetItemDesc

echo 3/20: GetItemProp
%IDA% -A -S"%SCRIPT% %OUTDIR%\citeminfo_GetItemProp.json 0x5a72a0" %IDB%
if errorlevel 1 echo FAILED: GetItemProp

echo 4/20: GetItemInfo
%IDA% -A -S"%SCRIPT% %OUTDIR%\citeminfo_GetItemInfo.json 0x5a8f20" %IDB%
if errorlevel 1 echo FAILED: GetItemInfo

echo 5/20: GetEquipItem
%IDA% -A -S"%SCRIPT% %OUTDIR%\citeminfo_GetEquipItem.json 0x5c0820" %IDB%
if errorlevel 1 echo FAILED: GetEquipItem

echo 6/20: GetBundleItem
%IDA% -A -S"%SCRIPT% %OUTDIR%\citeminfo_GetBundleItem.json 0x5b5200" %IDB%
if errorlevel 1 echo FAILED: GetBundleItem

echo 7/20: GetItemSlot
%IDA% -A -S"%SCRIPT% %OUTDIR%\citeminfo_GetItemSlot.json 0x5c3b20" %IDB%
if errorlevel 1 echo FAILED: GetItemSlot

echo 8/20: GetItemString
%IDA% -A -S"%SCRIPT% %OUTDIR%\citeminfo_GetItemString.json 0x5a9bc0" %IDB%
if errorlevel 1 echo FAILED: GetItemString

echo 9/20: GetSetItemEffect
%IDA% -A -S"%SCRIPT% %OUTDIR%\citeminfo_GetSetItemEffect.json 0x594ed0" %IDB%
if errorlevel 1 echo FAILED: GetSetItemEffect

echo 10/20: GetSetItemInfo
%IDA% -A -S"%SCRIPT% %OUTDIR%\citeminfo_GetSetItemInfo.json 0x721590" %IDB%
if errorlevel 1 echo FAILED: GetSetItemInfo

echo 11/20: GetCoupleChairItem
%IDA% -A -S"%SCRIPT% %OUTDIR%\citeminfo_GetCoupleChairItem.json 0x94aef0" %IDB%
if errorlevel 1 echo FAILED: GetCoupleChairItem

echo 12/20: GetPortableChairRecoveryRate
%IDA% -A -S"%SCRIPT% %OUTDIR%\citeminfo_GetPortableChairRecoveryRate.json 0x5ac750" %IDB%
if errorlevel 1 echo FAILED: GetPortableChairRecoveryRate

echo 13/20: IsTherePortableChairStatUp
%IDA% -A -S"%SCRIPT% %OUTDIR%\citeminfo_IsTherePortableChairStatUp.json 0x5ac8e0" %IDB%
if errorlevel 1 echo FAILED: IsTherePortableChairStatUp

echo 14/20: CheckUseRequirement
%IDA% -A -S"%SCRIPT% %OUTDIR%\citeminfo_CheckUseRequirement.json 0x5b6ba0" %IDB%
if errorlevel 1 echo FAILED: CheckUseRequirement

echo 15/20: IsAbleToEquip
%IDA% -A -S"%SCRIPT% %OUTDIR%\citeminfo_IsAbleToEquip.json 0x501110" %IDB%
if errorlevel 1 echo FAILED: IsAbleToEquip

echo 16/20: GetItemPrice
%IDA% -A -S"%SCRIPT% %OUTDIR%\citeminfo_GetItemPrice.json 0x5aac90" %IDB%
if errorlevel 1 echo FAILED: GetItemPrice

echo 17/20: CalcEquipItemQuality
%IDA% -A -S"%SCRIPT% %OUTDIR%\citeminfo_CalcEquipItemQuality.json 0x5c2a30" %IDB%
if errorlevel 1 echo FAILED: CalcEquipItemQuality

echo 18/20: GetBulletPAD
%IDA% -A -S"%SCRIPT% %OUTDIR%\citeminfo_GetBulletPAD.json 0x5ac630" %IDB%
if errorlevel 1 echo FAILED: GetBulletPAD

echo 19/20: GetMaxLevel
%IDA% -A -S"%SCRIPT% %OUTDIR%\citeminfo_GetMaxLevel.json 0x5c09b0" %IDB%
if errorlevel 1 echo FAILED: GetMaxLevel

echo 20/20: GetLevelInfo
%IDA% -A -S"%SCRIPT% %OUTDIR%\citeminfo_GetLevelInfo.json 0x5c39d0" %IDB%
if errorlevel 1 echo FAILED: GetLevelInfo

echo === Done ===
