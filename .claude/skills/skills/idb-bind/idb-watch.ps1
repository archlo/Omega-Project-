<#
.SYNOPSIS
  Detect when an IDA Pro database (.i64) is free to bind, and optionally block
  until it is. Used by the `idb-bind` skill so a session can wait for another
  IDA GUI / idalib session to release the database, then continue automatically.

.DESCRIPTION
  The headless idalib worker needs exclusive access to the .i64. While the IDA
  GUI (or another idalib session) holds it, `idalib_open` fails. This script tests
  exclusive openability (FileAccess.ReadWrite, FileShare.None) — the same access
  idalib needs — without modifying the file (it opens then immediately closes).

  Path-agnostic: the .i64 path is passed via -Path (resolve it from the local,
  gitignored CLAUDE.local.md IDA_IDB entry). Never hard-code the path here.

.PARAMETER Path
  Absolute path to the .i64 database.

.PARAMETER Mode
  Check : print status once and exit (0 free, 2 locked, 3 missing).
  Wait  : poll until free (or -TimeoutSeconds elapses), then exit (0 free, 2 timeout).

.PARAMETER IntervalSeconds
  Poll interval for Wait mode (default 15). Kept short enough to feel responsive,
  long enough not to thrash a large file.

.PARAMETER TimeoutSeconds
  Max seconds to wait in Wait mode; 0 = wait forever (default 0).

.EXAMPLE
  powershell -File idb-watch.ps1 -Path "<i64>" -Mode Check
.EXAMPLE
  powershell -File idb-watch.ps1 -Path "<i64>" -Mode Wait -IntervalSeconds 20
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$Path,
    [ValidateSet('Check', 'Wait')][string]$Mode = 'Check',
    [int]$IntervalSeconds = 15,
    [int]$TimeoutSeconds = 0
)

function Test-IdbFree {
    param([string]$P)
    try {
        $fs = [System.IO.File]::Open(
            $P,
            [System.IO.FileMode]::Open,
            [System.IO.FileAccess]::ReadWrite,
            [System.IO.FileShare]::None)
        $fs.Close(); $fs.Dispose()
        return $true
    }
    catch {
        return $false
    }
}

function Get-LikelyHolders {
    # Best-effort: surface IDA processes that may hold the lock. Not authoritative.
    $names = 'ida', 'ida64', 'idat', 'idat64', 'idaq', 'idaq64'
    $procs = Get-Process -Name $names -ErrorAction SilentlyContinue
    if ($procs) { return ($procs | ForEach-Object { "$($_.ProcessName)($($_.Id))" }) -join ', ' }
    return ''
}

if (-not (Test-Path -LiteralPath $Path)) {
    Write-Output "IDB_STATUS=MISSING"
    exit 3
}

if ($Mode -eq 'Check') {
    if (Test-IdbFree -P $Path) {
        Write-Output "IDB_STATUS=FREE"
        exit 0
    }
    $h = Get-LikelyHolders
    Write-Output ("IDB_STATUS=LOCKED" + ($(if ($h) { " holders=$h" } else { "" })))
    exit 2
}

# Wait mode
$start = Get-Date
$tick = 0
while ($true) {
    if (Test-IdbFree -P $Path) {
        $waited = [int]((Get-Date) - $start).TotalSeconds
        Write-Output "IDB_STATUS=FREE waited=${waited}s"
        exit 0
    }
    if ($TimeoutSeconds -gt 0 -and ((Get-Date) - $start).TotalSeconds -ge $TimeoutSeconds) {
        Write-Output "IDB_STATUS=TIMEOUT waited=${TimeoutSeconds}s holders=$(Get-LikelyHolders)"
        exit 2
    }
    $tick++
    if ($tick % 8 -eq 1) {
        Write-Output "IDB_STATUS=LOCKED waiting... holders=$(Get-LikelyHolders)"
    }
    Start-Sleep -Seconds $IntervalSeconds
}
