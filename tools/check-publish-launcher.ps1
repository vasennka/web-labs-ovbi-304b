# ============================================================================
# Проверка ярлыка «ВЫЛОЖИТЬ НА GIT» в изолированной копии (без отправки в сеть).
# Запуск: powershell -NoProfile -ExecutionPolicy Bypass -File tools\check-publish-launcher.ps1
#
# Скрипт: 1) нормализует файл ярлыка (CRLF, ASCII, убирает chcp 65001 —
# он мешает команде set /p читать ввод в этой кодировке консоли);
# 2) копирует работы во временную папку, эмулируя чистый клон;
# 3) запускает ярлык с подставленными ответами;
# 4) проверяет, что создан репозиторий, коммит, remote и что мусор не попал.
# ============================================================================

$ErrorActionPreference = 'Continue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$root = Split-Path -Parent $PSScriptRoot
$launcher = Get-ChildItem -Path $root -Recurse -Filter *.cmd |
    Where-Object { $_.Name -match 'GIT' -and $_.Name -notmatch 'demo' } |
    Select-Object -First 1
if (-not $launcher) { throw 'Ярлык для выкладки на Git не найден' }
Write-Output ("Ярлык: " + $launcher.FullName)

# --- 1. Нормализация файла ярлыка -------------------------------------------
$lines = [System.IO.File]::ReadAllLines($launcher.FullName, [System.Text.Encoding]::UTF8)
$fixed = $lines | Where-Object { $_ -notmatch '^chcp 65001' }   # убираем проблемный chcp
[System.IO.File]::WriteAllText($launcher.FullName, (($fixed -join "`r`n") + "`r`n"), [System.Text.Encoding]::ASCII)
$nonAscii = [regex]::Matches(([System.IO.File]::ReadAllText($launcher.FullName)), '[^\x00-\x7F]').Count
Write-Output ("Исправлено: строк " + $fixed.Count + ", не-ASCII: " + $nonAscii)

# --- 2. Копия работ в TEMP ---------------------------------------------------
$test = Join-Path $env:TEMP 'git-publish-check'
if (Test-Path $test) { Remove-Item $test -Recurse -Force }
robocopy $root $test /E /XD node_modules /NFL /NDL /NJH /NJS /NP | Out-Null
if (Test-Path (Join-Path $test '.git')) { Remove-Item (Join-Path $test '.git') -Recurse -Force }

# --- 3. Ответы на вопросы ----------------------------------------------------
$answersFile = Join-Path $test 'answers.txt'
@('Ivan Petrov', 'ivan@example.com', 'testuser123', 'web-labs-prisma', '', '', '') |
    Set-Content -Path $answersFile -Encoding ASCII

# --- 4. Запуск ярлыка --------------------------------------------------------
$launcherInTest = Get-ChildItem -Path $test -Recurse -Filter *.cmd |
    Where-Object { $_.Name -match 'GIT' -and $_.Name -notmatch 'demo' } |
    Select-Object -First 1

$outFile = Join-Path $test 'launcher-output.txt'
cmd /c ('"{0}" < "{1}" > "{2}" 2>&1' -f $launcherInTest.FullName, $answersFile, $outFile)
Write-Output ("Код возврата: " + $LASTEXITCODE + "  (1 = ожидаемо: push в несуществующий репозиторий)")

Write-Output "`n--------------- ВЫВОД ЯРЛЫКА ---------------"
Get-Content $outFile -Encoding UTF8 | Select-Object -Skip 12 -First 40
Write-Output "-------------------------------------------"

# --- 5. Результат ------------------------------------------------------------
Push-Location $test
$commit  = (git log --oneline 2>&1) -join ' | '
$remote  = (git remote -v 2>&1 | Select-Object -First 1)
$author  = (git config user.name 2>&1) + ' <' + (git config user.email 2>&1) + '>'
$tracked = (git ls-files 2>&1 | Measure-Object -Line).Lines
$junk    = (git ls-files 2>&1 | Select-String -Pattern 'node_modules/|db\.json|\.sqlite|/dist/|(^|/)\.env$' | Measure-Object).Count
Pop-Location

Write-Output "`nПроверка результата:"
Write-Output ("  репозиторий создан : " + (Test-Path (Join-Path $test '.git')))
Write-Output ("  коммит             : " + $commit)
Write-Output ("  автор коммита      : " + $author)
Write-Output ("  remote             : " + $remote)
Write-Output ("  файлов в коммите   : " + $tracked)
Write-Output ("  мусор (node_modules/.env/база/dist) в коммите: " + $junk + "  (должно быть 0)")
