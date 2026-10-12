# ============================================================================
# Приведение демонстрационных фото к «веб-размерам» и сборка контактного листа.
#
#   1) каждое фото уменьшается до ширины не более 1600 px и сохраняется JPEG
#      с качеством 82 (стандартная практика для сайтов: быстрая загрузка);
#   2) из всех фото собирается один контактный лист с подписями — по нему
#      удобно глазами проверить, что каждая картинка подходит по смыслу.
#
# Запуск: powershell -NoProfile -ExecutionPolicy Bypass -File tools\normalize-photos.ps1
# ============================================================================

Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = 'Continue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$root = Split-Path -Parent $PSScriptRoot
$photosDir = Join-Path $root 'project\backend\public\demo-photos'
$contactSheet = Join-Path $env:TEMP 'prisma-contact-sheet.jpg'

$maxWidth = 1600
$quality = 82

# --- Кодек JPEG с настраиваемым качеством ---------------------------------
$jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
    Where-Object { $_.MimeType -eq 'image/jpeg' }
$encoderParams = New-Object System.Drawing.Imaging.EncoderParameters 1
$encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
    [System.Drawing.Imaging.Encoder]::Quality, [int64]$quality)

function Save-Jpeg($bitmap, $path) {
    $bitmap.Save($path, $jpegCodec, $encoderParams)
}

# --- 1. Нормализация размеров ---------------------------------------------
$files = Get-ChildItem $photosDir -File | Where-Object { $_.Extension -in '.jpg', '.jpeg', '.png' } | Sort-Object Name
Write-Output "Нормализация $($files.Count) файлов (максимальная ширина $maxWidth px):"

foreach ($file in $files) {
    $before = [math]::Round($file.Length / 1KB, 0)
    $image = [System.Drawing.Image]::FromFile($file.FullName)

    $needResize = $image.Width -gt $maxWidth
    $targetWidth = if ($needResize) { $maxWidth } else { $image.Width }
    $targetHeight = [int][math]::Round($image.Height * ($targetWidth / $image.Width))

    $bitmap = New-Object System.Drawing.Bitmap $targetWidth, $targetHeight
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.DrawImage($image, 0, 0, $targetWidth, $targetHeight)
    $graphics.Dispose()
    $image.Dispose()

    $target = if ($file.Extension -eq '.png') { $file.FullName } else { [System.IO.Path]::ChangeExtension($file.FullName, '.jpg') }
    Save-Jpeg $bitmap $target
    $bitmap.Dispose()

    if ($target -ne $file.FullName) { Remove-Item $file.FullName -Force }

    $after = [math]::Round((Get-Item $target).Length / 1KB, 0)
    Write-Output ("  {0,-26} {1,6} КБ -> {2,5} КБ  ({3}x{4})" -f $file.Name, $before, $after, $targetWidth, $targetHeight)
}

# --- 2. Контактный лист ----------------------------------------------------
$files = Get-ChildItem $photosDir -File | Where-Object { $_.Extension -in '.jpg', '.jpeg', '.png' } | Sort-Object Name
$columns = 4
$cellWidth = 380
$cellHeight = 300
$labelHeight = 26
$rows = [math]::Ceiling($files.Count / $columns)

$sheet = New-Object System.Drawing.Bitmap ($columns * $cellWidth), ($rows * ($cellHeight + $labelHeight))
$canvas = [System.Drawing.Graphics]::FromImage($sheet)
$canvas.Clear([System.Drawing.Color]::FromArgb(20, 22, 26))
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
Save-Jpeg $sheet $contactSheet
$sheet.Dispose()

Write-Output "`nКонтактный лист: $contactSheet"
Write-Output "Общий размер папки: $([math]::Round(((Get-ChildItem $photosDir -File | Measure-Object Length -Sum).Sum / 1MB), 2)) МБ"
