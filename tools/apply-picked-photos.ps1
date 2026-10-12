# ============================================================================
# Применение выбранных вариантов: копируем подобранные кадры из папки вариантов
# в папку сайта под нужными именами (дальше их приведёт к веб-размеру
# скрипт normalize-photos.ps1).
#
# Запуск: powershell -NoProfile -ExecutionPolicy Bypass -File tools\apply-picked-photos.ps1
# ============================================================================

$ErrorActionPreference = 'Continue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$candidates = Join-Path $env:TEMP 'prisma-candidates'
$photos = Join-Path (Split-Path -Parent $PSScriptRoot) 'project\backend\public\demo-photos'

# Что на что меняем: имя кадра из подборки -> файл сайта
$map = [ordered]@{
    'q3-3.jpg' = 'about-studio'     # студия с софтбоксами и стеной Polaroid
    'q1-4.jpg' = 'about-team'       # фотограф с камерой
    'q1-6.jpg' = 'contacts-studio'  # съёмка на выезде
    'q2-6.jpg' = 'gallery-portrait-2'  # классический студийный портрет
    'q2-2.jpg' = 'gallery-portrait-3'  # портрет в полный рост
    'q3-2.jpg' = 'gallery-studio-1'    # софтбокс на стойке
    'q1-9.jpg' = 'news-4'              # репортажная съёмка группы
}

foreach ($source in $map.Keys) {
    $sourcePath = Join-Path $candidates $source
    $targetName = $map[$source] + '.jpg'
    $targetPath = Join-Path $photos $targetName

    if (-not (Test-Path $sourcePath)) {
        Write-Output "✘ нет варианта $source"
        continue
    }

    # Удаляем возможный старый файл с другим расширением
    foreach ($ext in '.png') {
        $old = Join-Path $photos ($map[$source] + $ext)
        if (Test-Path $old) { Remove-Item $old -Force }
    }

    Copy-Item $sourcePath $targetPath -Force
    $size = [math]::Round((Get-Item $targetPath).Length / 1KB, 0)
    Write-Output ("✔ {0,-20} <- {1}  ({2} КБ)" -f $targetName, $source, $size)
}

Write-Output "`nТеперь запустите нормализацию размеров: powershell -File tools\normalize-photos.ps1"
