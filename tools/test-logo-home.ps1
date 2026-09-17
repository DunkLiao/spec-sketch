$html = Get-Content -Raw -Encoding UTF8 (Join-Path $PSScriptRoot '..\index.html')

if ($html -notmatch '<a[^>]+class="logo"[^>]+href="#/"') {
  throw 'Logo must link to the home hash.'
}

if ($html -notmatch 'aria-label="[^"]+"') {
  throw 'Logo link must have an aria-label.'
}

Write-Output 'Logo home-link check passed.'
