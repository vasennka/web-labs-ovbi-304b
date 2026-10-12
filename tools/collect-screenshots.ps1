# ============================================================================
# Раскладываем сделанные браузером скриншоты по папке отчёта.
# Снимок лежит в подпапке "0": <temp>\opencode-browser-XXXX\0\screenshot.png
# Проверяем соответствие «картинка -> страница» по размеру файла.
# Запуск: powershell -NoProfile -ExecutionPolicy Bypass -File tools\collect-screenshots.ps1
# ============================================================================

$ErrorActionPreference = 'Continue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$root = Split-Path -Parent $PSScriptRoot
$target = Join-Path $root 'отчёт\скриншоты'
New-Item -ItemType Directory -Force -Path $target | Out-Null

$tempDir = if ($env:TEMP -and (Test-Path $env:TEMP)) { $env:TEMP } else { 'C:\Users\Vasenka\AppData\Local\Temp' }

# Порядок страниц во втором (успешном) прогоне съёмки + ожидаемый размер файла
$plan = @(
    @{ name = 'laba1-1';        size = 56168 },
    @{ name = 'laba1-2';        size = 29240 },
    @{ name = 'laba2-1';        size = 47060 },
    @{ name = 'laba2-2';        size = 31499 },
    @{ name = 'laba3-1';        size = 70020 },
    @{ name = 'laba3-2';        size = 18339 },
    @{ name = 'laba4-1';        size = 69919 },
    @{ name = 'laba4-2';        size = 38700 },
    @{ name = 'laba5-1';        size = 62152 },
    @{ name = 'laba5-2';        size = 74571 },
    @{ name = 'laba5-3';        size = 68426 },
    @{ name = 'laba6-1';        size = 81877 },
    @{ name = 'laba6-2';        size = 92671 },
    @{ name = 'laba6-3';        size = 83415 },
    @{ name = 'laba7-1';        size = 0 },
    @{ name = 'laba7-2';        size = 0 },
    @{ name = 'laba7-3';        size = 0 },
    @{ name = 'laba8-selftest'; size = 0 }
)

# Собираем все снимки браузера (кроме служебной папки клиента), сортируем по времени
$shots = @()
$browserDirs = Get-ChildItem -LiteralPath $tempDir -Directory -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -like 'opencode-browser-*' -and $_.Name -notlike '*client*' }

foreach ($dir in $browserDirs) {
    $found = Get-ChildItem -LiteralPath $dir.FullName -Recurse -File -Filter 'screenshot.png' -ErrorAction SilentlyContinue
    foreach ($file in $found) { $shots += $file }
}
$shots = $shots | Sort-Object LastWriteTime

Write-Output ("Папок браузера: " + $browserDirs.Count + ", снимков найдено: " + $shots.Count)

# Последние 18 снимков = второй прогон по 18 страницам в известном порядке
$last = $shots | Select-Object -Last $plan.Count
Write-Output ("Берём последние " + $last.Count + " снимков (второй прогон)`n")

for ($i = 0; $i -lt $plan.Count; $i++) {
    $item = $plan[$i]
    if ($i -ge $last.Count) { Write-Output ("  НЕТ СНИМКА для " + $item.name); continue }

    $source = $last[$i]
    $destination = Join-Path $target ($item.name + '.png')
    Copy-Item -LiteralPath $source.FullName -Destination $destination -Force

    $check = 'проверить глазами'
    if ($item.size -gt 0) {
        $check = if ($source.Length -eq $item.size) { 'размер совпадает' } else { "РАЗМЕР НЕ СОВПАЛ (ждали $($item.size))" }
    }
    Write-Output ("  {0,-16} {1,8} байт   {2}" -f $item.name, $source.Length, $check)
}

Write-Output ("`nСкопировано в: " + $target)
$total = (Get-ChildItem $target -Filter *.png | Measure-Object).Count
Write-Output ("Файлов в папке скриншотов: " + $total)
