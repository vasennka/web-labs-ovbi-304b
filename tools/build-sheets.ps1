# ============================================================================
# Сборка контактных листов из скачанных вариантов (папка prisma-candidates).
# Запуск: powershell -NoProfile -ExecutionPolicy Bypass -File tools\build-sheets.ps1
# Результат: $env:TEMP\prisma-sheet-1.jpg … для каждого запроса.
# ============================================================================

Add-Type -AssemblyName System.Drawing
$ErrorActionPreference = 'Continue'

$dir = Join-Path $env:TEMP 'prisma-candidates'
$utf8 = New-Object System.Text.UTF8Encoding $false

for ($q = 1; $q -le 3; $q++) {
    $files = Get-ChildItem $dir -File | Where-Object { $_.Name -like "q$q-*.jpg" } | Sort-Object {
        [int]($_.BaseName -replace '^q\d+-', '')
    }

    if ($files.Count -eq 0) { Write-Output "запрос ${q}: нет файлов"; continue }

    $columns = 3
    $cellWidth = 460
    $cellHeight = 340
    $labelHeight = 26
    $rows = [math]::Ceiling($files.Count / $columns)

    $sheet = New-Object System.Drawing.Bitmap ($columns * $cellWidth), ($rows * ($cellHeight + $labelHeight))
    $canvas = [System.Drawing.Graphics]::FromImage($sheet)
    $canvas.Clear([System.Drawing.Color]::FromArgb(16, 18, 22))
    $canvas.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $font = New-Object System.Drawing.Font 'Consolas', 11
    $brush = [System.Drawing.Brushes]::White

    for ($i = 0; $i -lt $files.Count; $i++) {
        $column = $i % $columns
        $row = [math]::Floor($i / $columns)
        $x = $column * $cellWidth
        $y = $row * ($cellHeight + $labelHeight)

        $image = [System.Drawing.Image]::FromFile($files[$i].FullName)
        $scale = [math]::Min(($cellWidth - 12) / $image.Width, ($cellHeight - 12) / $image.Height)
        $drawWidth = [int]($image.Width * $scale)
        $drawHeight = [int]($image.Height * $scale)
        $canvas.DrawImage($image, ($x + ($cellWidth - $drawWidth) / 2), ($y + ($cellHeight - $drawHeight) / 2), $drawWidth, $drawHeight)
        $image.Dispose()

        $canvas.DrawString($files[$i].Name, $font, $brush, ($x + 8), ($y + $cellHeight + 4))
    }

    $canvas.Dispose()
    $target = Join-Path $env:TEMP "prisma-sheet-$q.jpg"
    $sheet.Save($target, [System.Drawing.Imaging.ImageFormat]::Jpeg)
    $sheet.Dispose()

    Write-Output "лист $q -> $target  (вариантов: $($files.Count))"
}
