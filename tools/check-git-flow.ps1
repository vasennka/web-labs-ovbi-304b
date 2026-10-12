# ============================================================================
# Сквозная проверка git-логики ярлыков на ЛОКАЛЬНОМ тестовом репозитории.
# Реальная сеть и GitHub не используются: роль GitHub играет bare-репозиторий.
# Запуск: powershell -NoProfile -ExecutionPolicy Bypass -File tools\check-git-flow.ps1
# ============================================================================

$ErrorActionPreference = 'Continue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$root = Split-Path -Parent $PSScriptRoot
$temp = Join-Path $env:TEMP 'git-flow-check'
$bare = Join-Path $env:TEMP 'git-flow-remote.git'
$work = Join-Path $temp 'works'

if (Test-Path $temp) { Remove-Item $temp -Recurse -Force }
if (Test-Path $bare) { Remove-Item $bare -Recurse -Force }
New-Item -ItemType Directory -Path $temp -Force | Out-Null

# --- 1. Копия работ (как будто студент только что скачал папку) -------------
robocopy $root $work /E /XD node_modules /NFL /NDL /NJH /NJS /NP | Out-Null
if (Test-Path (Join-Path $work '.git')) { Remove-Item (Join-Path $work '.git') -Recurse -Force }

# --- 2. «GitHub»: пустой bare-репозиторий -----------------------------------
git init --bare -q $bare
Write-Output ("Тестовый удалённый репозиторий: " + $bare)

# --- 3. Локальный репозиторий и первый коммит (как в ярлыке) ----------------
Set-Location $work
git init -q .
git branch -M main
git config user.name "Ivan Petrov"
git config user.email "ivan@example.com"
git config core.autocrlf false
git add .
git commit -q -m "Laboratory works 1-8 and project PRISMA, topic 25"
git remote add origin $bare
git push -u origin main *> $null
Write-Output ("Первый push: " + $(if ($LASTEXITCODE -eq 0) { 'успешно' } else { 'ОШИБКА' }))

$remoteCount = (git --git-dir=$bare ls-tree -r --name-only main | Measure-Object -Line).Lines
$localCount = (git ls-files | Measure-Object -Line).Lines
Write-Output ("  файлов в локальном коммите: $localCount")
Write-Output ("  файлов дошло до удалённого репозитория: $remoteCount")
Write-Output ("  количество коммитов в удалённом: " + (git --git-dir=$bare rev-list --count main))

# --- 4. Имитируем правку и ярлык «Отправить изменения на Git повторно» ------
Add-Content -Path (Join-Path $work 'README.md') -Value "`n<!-- проверка повторной отправки -->" -Encoding UTF8
git add .
git commit -q -m "update"
git push *> $null
Write-Output ("`nПовторная отправка (правка README): " + $(if ($LASTEXITCODE -eq 0) { 'успешно' } else { 'ОШИБКА' }))
Write-Output ("  коммитов в удалённом после правки: " + (git --git-dir=$bare rev-list --count main))

# --- 5. Итог -----------------------------------------------------------------
Write-Output "`nПроверка .gitignore на реальном репозитории:"
$junk = git ls-files | Select-String -Pattern 'node_modules/|db\.json|\.sqlite|/dist/|(^|/)\.env$'
if ($junk) { Write-Output "  ВНИМАНИЕ, попало лишнее:"; $junk } else { Write-Output "  OK: node_modules, база, .env и сборки не попали в репозиторий" }
Write-Output ("  всего файлов: " + (git ls-files | Measure-Object -Line).Lines)

Set-Location $root
Remove-Item $temp, $bare -Recurse -Force -ErrorAction SilentlyContinue
Write-Output "`nВременные репозитории удалены. Проверка завершена."
