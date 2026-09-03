# PowerShell script to update all skills from C#/.Net to TypeScript
# Server path: C:\Users\jorge\OneDrive\Desktop\server

$ErrorActionPreference = "Stop"

# Collect all SKILL.md files and agent .md files
$files = @()
$files += Get-ChildItem -Path "C:\Users\jorge\OneDrive\Desktop\ts\.claude\skills" -Recurse -Filter "SKILL.md" | Select-Object -ExpandProperty FullName
$files += Get-ChildItem -Path "C:\Users\jorge\OneDrive\Desktop\ts\.agents\skills" -Recurse -Filter "SKILL.md" | Select-Object -ExpandProperty FullName
$agentFiles = Get-ChildItem -Path "C:\Users\jorge\OneDrive\Desktop\ts\.agents" -Filter "*.md" -File | Select-Object -ExpandProperty FullName
$files += $agentFiles

Write-Host "Updating $($files.Count) files..."

foreach ($file in $files) {
    Write-Host "Processing: $file"
    $content = Get-Content -Path $file -Raw -Encoding UTF8
    $original = $content

    # === Path replacements (order matters: more specific first) ===

    # MapleClaude.Net paths
    $content = $content -replace 'src/MapleClaude\.Net/Packet/OpCodes\.cs', 'src/net/packet/OpCodes.ts'
    $content = $content -replace 'src/MapleClaude\.Net/Handlers/', 'src/net/handlers/'
    $content = $content -replace 'src/MapleClaude\.Net/Crypto/', 'src/net/crypto/'
    $content = $content -replace 'src/MapleClaude\.Net/', 'src/'
    $content = $content -replace 'MapleClaude\.Net/Packet/OpCodes\.cs', 'src/net/packet/OpCodes.ts'
    $content = $content -replace 'MapleClaude\.Net/Handlers/', 'src/net/handlers/'
    $content = $content -replace 'MapleClaude\.Net/Crypto/', 'src/net/crypto/'
    $content = $content -replace 'MapleClaude\.Net\.Tests', 'vitest'
    $content = $content -replace 'MapleClaude\.Net', 'src'

    # MapleClaude paths
    $content = $content -replace 'src/MapleClaude/Wz/', 'src/wz/'
    $content = $content -replace 'src/MapleClaude/Stages/', 'src/stages/'
    $content = $content -replace 'src/MapleClaude/UI/Game/', 'src/ui/game/'
    $content = $content -replace 'src/MapleClaude/UI/', 'src/ui/'
    $content = $content -replace 'src/MapleClaude/Character/', 'src/character/'
    $content = $content -replace 'src/MapleClaude/Map/', 'src/map/'
    $content = $content -replace 'src/MapleClaude/Item/', 'src/Item/'
    $content = $content -replace 'src/MapleClaude/Skill/', 'src/skill/'
    $content = $content -replace 'src/MapleClaude/Quest/', 'src/Quest/'
    $content = $content -replace 'src/MapleClaude/Audio/', 'src/Audio/'
    $content = $content -replace 'src/MapleClaude/', 'src/'

    # MapleClaude project references (in descriptions/other text)
    $content = $content -replace 'the MapleClaude codebase', 'the MapleClaude codebase'
    $content = $content -replace 'the MapleClaude project', 'the MapleClaude project'

    # === Build/test command replacements ===
    $content = $content -replace 'dotnet build', 'npx tsc --noEmit'
    $content = $content -replace 'dotnet test', 'npx vitest'
    $content = $content -replace 'dotnet watch', 'watch.ps1'

    # === C# file references to TS ===
    $content = $content -replace 'StatDetailInfo\.cs', 'StatDetailInfo.ts'
    $content = $content -replace 'MobController\.cs', 'MobController.ts'
    $content = $content -replace 'MobInfo\.cs', 'MobInfo.ts'
    $content = $content -replace 'MobAttack\.cs', 'MobAttack.ts'
    $content = $content -replace 'MobSkillRef\.cs', 'MobSkillRef.ts'
    $content = $content -replace 'MobSkillType\.cs', 'MobSkillType.ts'
    $content = $content -replace 'Revive\.cs', 'Revive.ts'
    $content = $content -replace 'TombstoneEffect\.cs', 'TombstoneEffect.ts'
    $content = $content -replace 'FieldScene\.cs', 'FieldScene.ts'
    $content = $content -replace 'GameStage\.cs', 'GameStage.ts'
    $content = $content -replace 'GameSender\.cs', 'GameSender.ts'
    $content = $content -replace 'MobInfoService\.cs', 'MobInfoService.ts'
    $content = $content -replace 'DropPool\.cs', 'DropPool.ts'
    $content = $content -replace 'CUIItemInven\.cs', 'CUIItemInven.ts'

    # === C# language references ===
    $content = $content -replace 'typed C# model', 'typed TypeScript model'
    $content = $content -replace 'typed C# models', 'typed TypeScript models'
    $content = $content -replace 'C# client', 'TypeScript client'
    $content = $content -replace 'C# parsers', 'TypeScript parsers'
    $content = $content -replace 'C# code', 'TypeScript code'
    $content = $content -replace 'C# model', 'TypeScript model'
    $content = $content -replace 'C# decoder', 'TypeScript decoder'
    $content = $content -replace 'C# encoder', 'TypeScript encoder'
    $content = $content -replace 'C# type', 'TypeScript type'
    $content = $content -replace 'C# stage', 'TypeScript stage'
    $content = $content -replace 'C# service', 'TypeScript service'
    $content = $content -replace 'C# rebuild loop', 'TypeScript rebuild loop'
    $content = $content -replace 'in C\#', 'in TypeScript'
    $content = $content -replace 'into C\#', 'into TypeScript'
    $content = $content -replace 'from C\#', 'from TypeScript'
    $content = $content -replace 'produces a typed C# model', 'produces a typed TypeScript model'

    # === .cs to .ts in generic references ===
    $content = $content -replace 'Xxx\.cs\b', 'Xxx.ts'
    $content = $content -replace '\bInfo\.cs\b', 'Info.ts'
    $content = $content -replace '\bInfoService\.cs\b', 'InfoService.ts'
    $content = $content -replace '\bProvider\.cs\b', 'Provider.ts'

    # === MonoGame → PixiJS ===
    $content = $content -replace 'MonoGame', 'PixiJS'
    $content = $content -replace 'SpriteBatch', 'PixiJS Container'

    # === XAudio2 → Web Audio ===
    $content = $content -replace 'XAudio2', 'Web Audio API'

    # === .wz → .nx (in description text about file format) ===
    # Only change in the description/frontmatter where it refers to using .nx files
    # Keep .wz in WZ path references (e.g. Mob.wz, Sound.wz) as those are WZ package names
    # Change only where it says "using the .wz files" or ".wz files"
    $content = $content -replace 'the `\.wz` files', 'the `.nx` files'
    $content = $content -replace 'a directory containing the `\.wz` files', 'a directory containing the `.nx` files'
    $content = $content -replace 'containing the `.wz` files', 'containing the `.nx` files'

    # === Server path ===
    $content = $content -replace 'the running Kinoko server', 'the running server at C:\Users\jorge\OneDrive\Desktop\server'

    # Only write if changed
    if ($content -ne $original) {
        Set-Content -Path $file -Value $content -Encoding UTF8 -NoNewline
        Write-Host "  UPDATED"
    } else {
        Write-Host "  (no changes)"
    }
}

Write-Host "`nDone! Updated skill and agent files."
