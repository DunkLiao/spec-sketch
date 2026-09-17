# gen_index.ps1 - 無 Python 環境時使用
# 用法： powershell -ExecutionPolicy Bypass -File tools\gen_index.ps1
$ErrorActionPreference = "Stop"
$root  = Split-Path -Parent $PSScriptRoot
$specs = Join-Path $root "specs"
$out   = Join-Path $root "spec-index.json"

if (-not (Test-Path $specs)) { Write-Host "[ERROR] 找不到 specs 資料夾"; exit 1 }

function Get-Title($path) {
    $inFence = $false
    foreach ($line in (Get-Content -LiteralPath $path -Encoding UTF8 -TotalCount 80)) {
        if ($line -match '^\s*(```|~~~)') { $inFence = -not $inFence; continue }
        if ($inFence) { continue }
        if ($line -match '^\s*#\s+(.+?)\s*#*\s*$') { return ($Matches[1] -replace '[`*_]','').Trim() }
    }
    return $null
}

$projects = @()
$total = 0
foreach ($dir in (Get-ChildItem -LiteralPath $specs -Directory | Sort-Object Name)) {
    $files = Get-ChildItem -LiteralPath $dir.FullName -Filter *.md | Sort-Object @{
        Expression = { if ($_.Name -ieq 'SPEC.md') { 0 } else { 1 } }
    }, Name
    if ($files.Count -eq 0) { continue }
    $list = @()
    foreach ($f in $files) {
        $t = Get-Title $f.FullName
        if (-not $t) { $t = [System.IO.Path]::GetFileNameWithoutExtension($f.Name) }
        $list += [ordered]@{ file = $f.Name; title = $t }
        $total++
    }
    $projects += [ordered]@{ project = $dir.Name; files = $list }
}

$data = [ordered]@{
    site     = [ordered]@{ title = "規格文件庫"; subtitle = "SPEC Document Portal" }
    projects = $projects
}
$json = $data | ConvertTo-Json -Depth 8
[System.IO.File]::WriteAllText($out, $json, (New-Object System.Text.UTF8Encoding $false))
Write-Host "索引已產生：$out"
Write-Host ("專案 {0} 個，文件 {1} 份" -f $projects.Count, $total)
