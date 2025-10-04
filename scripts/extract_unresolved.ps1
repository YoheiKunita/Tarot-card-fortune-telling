$ErrorActionPreference = 'Stop'

# Find memo files matching pattern and sort by name (date prefix ascending)
$files = Get-ChildItem -Recurse -File -Filter "*作業メモ*.md" | Sort-Object Name
if (-not $files) {
  Write-Output "NO_FILES"
  exit 0
}

# Collect heading hits that look like a '残課題' style section
$headings = @()
foreach ($f in $files) {
  $name = $f.Name
  $m = [regex]::Match($name, '^(\d{4}-\d{2}-\d{2})')
  if (-not $m.Success) { continue }
  $date = $m.Groups[1].Value

  # Look for headings that include typical keywords
  $hits = Select-String -Path $f.FullName -Pattern '残課題|TODO|未解決|未対応|保留|要確認' -CaseSensitive:$false
  foreach ($h in $hits) {
    if ($h.Line -match '^\s*#') {
      $headings += [pscustomobject]@{ File=$f.FullName; Date=$date; LineNumber=$h.LineNumber }
    }
  }
}

if ($headings.Count -eq 0) {
  Write-Output "NO_SECTIONS"
  exit 0
}

# Choose the latest-dated section
$latest = $headings | Sort-Object Date -Descending | Select-Object -First 1
$lines = Get-Content -Path $latest.File
$start = [int]$latest.LineNumber - 1
$end = $lines.Length
for ($i = $start + 1; $i -lt $lines.Length; $i++) {
  if ($lines[$i] -match '^\s*#') { $end = $i; break }
}
$section = $lines[$start..($end-1)]

# Extract bullet/checkbox/numbered list items
$items = @()
foreach ($line in $section) {
  if ($line -match '^\s*(?:\[ \]\s+|[-*+]\s+|\d+[\).]\s+)(.+)$') {
    $items += $matches[1].Trim()
  }
}

Write-Output ("LATEST_SECTION_FILE: " + $latest.File)
Write-Output ("LATEST_SECTION_DATE: " + $latest.Date)
if ($items.Count -eq 0) {
  Write-Output "NO_ITEMS"
} else {
  $items | ForEach-Object { "- $_" }
}

