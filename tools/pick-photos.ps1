# ============================================================================
# Подбор замен для неудачных фотографий: скачиваем варианты из Wikimedia Commons
# и собираем по каждому запросу контактный лист с подписями, чтобы выбрать
# подходящие кадры глазами.
#
# Запуск: powershell -NoProfile -ExecutionPolicy Bypass -File tools\pick-photos.ps1
# Результат: папка $env:TEMP\prisma-candidates с вариантами и листами вида sheet-1.jpg
# ============================================================================

Add-Type -AssemblyName System.Drawing
$ErrorActionPreference = 'Continue'

$candidatesDir = Join-Path $env:TEMP 'prisma-candidates'
if (Test-Path $candidatesDir) { Remove-Item $candidatesDir -Recurse -Force }
New-Item -ItemType Directory -Force -Path $candidatesDir | Out-Null

$queries = @(
    'photographer taking photo camera',
    'photo studio portrait woman light',
    'photo studio softbox lighting equipment'
)

$ua = 'PRISMA-study-project/1.0 (educational use)'
$sheetIndex = 0

foreach ($query in $queries) {
    $sheetIndex++
    Write-Output "`n=== Запрос $sheetIndex`: $query"

    $api = 'https://commons.wikimedia.org/w/api.php' +
        '?action=query&generator=search' +
        '&gsrsearch=' + [uri]::EscapeDataString("filetype:bitmap $query") +
        '&gsrnamespace=6&gsrlimit=12&prop=imageinfo&iiprop=url|size' +
        '&iiurlwidth=1200&format=json&origin=*'

    try {
        $json = Invoke-RestMethod -Uri $api -Headers @{ 'User-Agent' = $ua } -TimeoutSec 40
    } catch {
        Write-Output ("  ошибка запроса: " + $_.Exception.Message)
        continue
    }

    $pages = $json.query.pages.PSObject.Properties.Value
    $files = @()

    foreach ($page in $pages) {
        $info = $page.imageinfo | Select-Object -First 1
        if (-not $info -or -not $info.thumburl) { continue }
        if ($info.thumburl -notmatch '\.(jpe?g|png)$') { continue }

        $fileName = "q$sheetIndex-" + ($files.Count + 1) + ".jpg"
        $target = Join-Path $candidatesDir $fileName

        try {
            Invoke-WebRequest -Uri $info.thumburl -OutFile $target -Headers @{ 'User-Agent' = $ua } -TimeoutSec 40
            if ((Get-Item $target).Length -lt 20000) { Remove-Item $target -Force; continue }
            $files += [pscustomobject]@{ Name = $fileName; Title = ($page.title -replace '^File:', '') }
        } catch {
            Write-Output ("  не скачалось: " + $page.title)
        }
    }

    Write-Output ("  вариантов: " + $files.Count)

    if ($files.Count -eq 0) { continue }

    # --- Контактный лист с подписями ---
    $columns = 4
    $cellWidth = 360
    $cellHeight = 270
    $labelHeight = 24
    $rows = [math]::Ceiling($files.Count / $columns)

    $sheet = New-Object System.Drawing.Bitmap ($columns * $cellWidth), ($rows * ($cellHeight + $labelHeight))
    $canvas = [System.Drawing.Graphics]::FromImage($sheet)
    $canvas.Clear([System.Drawing.Color]::FromArgb(18, 20, 24))
    $canvas.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $font = New-Object System.Drawing.Font 'Consolas', 10
    $brush = [System.Drawing.Brushes]::White

    for ($i = 0; $i -lt $files.Count; $i++) {
        $column = $i % $columns
        $row = [math]::Floor($i / $columns)
        $x = $column * $cellWidth
        $y = $row * ($cellHeight + $labelHeight)

        $image = [System.Drawing.Image]::FromFile((Join-Path $candidatesDir $files[$i].Name))
        $scale = [math]::Min(($cellWidth - 10) / $image.Width, ($cellHeight - 10) / $image.Height)
        $drawWidth = [int]($image.Width * $scale)
        $drawHeight = [int]($image.Height * $scale)
        $canvas.DrawImage($image, ($x + ($cellWidth - $drawWidth) / 2), ($y + ($cellHeight - $drawHeight) / 2), $drawWidth, $drawHeight)
        $image.Dispose()

        $caption = $files[$i].Name
        $canvas.DrawString($caption, $font, $brush, ($x + 6), ($y + $cellHeight + 2))
    }

    $canvas.Dispose()
    $sheetPath = Join-Path $env:TEMP ("prisma-sheet-$sheetIndex.jpg")
    $sheet.Save($sheetPath, [System.Drawing.Imaging.ImageFormat]::Jpeg)
    $sheet.Dispose()

    # Список названий для ориентира
    $listPath = Join-Path $env:TEMP ("prisma-sheet-$sheetIndex.txt")
    $files | ForEach-Object { "$($_.Name)`t$($_.Title)" } | Set-Content $listPath -Encoding UTF8

    Write-Output ("  лист: $sheetPath")
}

Write-Output "`nГотово. Варианты: $candidatesDir"
