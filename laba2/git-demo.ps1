# ===========================================================================
# Лабораторная работа №2. Воспроизводимая демонстрация командного Git-флоу.
#
# Запуск (из папки js-labs):
#     powershell -ExecutionPolicy Bypass -File laba2\git-demo.ps1 |
#         Out-File -Encoding utf8 laba2\git-demo-log.txt
#
# Скрипт создаёт репозиторий laba2\git-demo с ветками main / develop / feature/*,
# делает коммиты от лица участников команды, выполняет слияния (--no-ff)
# и демонстрирует разрешение конфликта слияния.
# ===========================================================================

$ErrorActionPreference = 'Continue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$Root = Join-Path $PSScriptRoot 'git-demo'
if (Test-Path $Root) { Remove-Item $Root -Recurse -Force }
New-Item -ItemType Directory -Force -Path $Root | Out-Null
Set-Location $Root

function Step([string]$title) {
    Write-Output ''
    Write-Output "### $title"
}

function Git([string]$Command) {
    Write-Output "PS> git $Command"
    $result = cmd /c "git $Command 2>&1" | Out-String
    Write-Output $result.TrimEnd()
}

# Запись файла в UTF-8 БЕЗ BOM (иначе git показывает BOM как мусорный символ)
function SaveFile([string]$relativePath, [string[]]$lines) {
    $full = Join-Path $Root $relativePath
    [System.IO.File]::WriteAllText($full, ($lines -join "`n") + "`n", (New-Object System.Text.UTF8Encoding $false))
}

# --- 1. Инициализация (в реальности: git clone <url репозитория>) -----------
Step '1. ИНИЦИАЛИЗАЦИЯ РЕПОЗИТОРИЯ (в реальности: git clone <url>)'
Git 'init -q .'
Git 'config user.name "Makar"'
Git 'config user.email "makar@example.com"'
Git "config core.autocrlf false"
New-Item -ItemType File -Path 'README.md' -Force | Out-Null
Add-Content -Path 'README.md' -Value '# Командный репозиторий (демо git-флоу лабы №2)'
Git 'add README.md'
Git 'commit -m "chore: init repository"'

# --- 2. Тимлид создаёт main и develop ---------------------------------------
Step '2. ТИМЛИД СОЗДАЁТ ВЕТКУ main (стабильная) И develop (разработка)'
Git 'branch -M main'
Git 'switch -c develop'

# --- 3. Личные ветки участников от develop ----------------------------------
Step '3. КАЖДЫЙ УЧАСТНИК СОЗДАЁТ ЛИЧНУЮ ВЕТКУ feature/<имя> ОТ develop'
Git 'switch -c feature/denis develop'

# --- 4. Программист 1 (Денис) ------------------------------------------------
Step '4. ПРОГРАММИСТ 1 (ДЕНИС): calculateAverage(data)'
New-Item -ItemType Directory -Force -Path 'modules' | Out-Null
SaveFile 'modules/average.js' @(
    '// Программист 1 (Денис): calculateAverage(data)',
    'module.exports = { calculateAverage };'
)
Git 'add modules/average.js'
Git 'commit -m "feat(average): calculateAverage - средний балл группы"'
Git 'switch develop'

# --- 5. Тимлид принимает PR #1 ----------------------------------------------
Step '5. ТИМЛИД ПРИНИМАЕТ PR #1: ревью + merge --no-ff'
Git 'merge --no-ff feature/denis -m "Merge PR #1: feature/denis -> develop"'

# --- 6. Программист 3 (Анна) -------------------------------------------------
Step '6. ПРОГРАММИСТ 3 (АННА): filterFailed(data, passScore)'
Git 'switch -c feature/anna develop'
SaveFile 'modules/failed.js' @(
    '// Программист 3 (Анна): filterFailed(data, passScore)',
    'module.exports = { filterFailed };'
)
Git 'add modules/failed.js'
Git 'commit -m "feat(failed): filterFailed - список должников"'
Git 'switch develop'
Git 'merge --no-ff feature/anna -m "Merge PR #2: feature/anna -> develop"'

# --- 7. Программист 4 (Даша) -------------------------------------------------
Step '7. ПРОГРАММИСТ 4 (ДАША): addLetterGrade(data)'
Git 'switch -c feature/dasha develop'
SaveFile 'modules/letter.js' @(
    '// Программист 4 (Даша): addLetterGrade(data)',
    'module.exports = { addLetterGrade };'
)
Git 'add modules/letter.js'
Git 'commit -m "feat(letter): addLetterGrade - буквенные оценки"'
Git 'switch develop'
Git 'merge --no-ff feature/dasha -m "Merge PR #3: feature/dasha -> develop"'

# --- 8. Релиз ---------------------------------------------------------------
Step '8. ФИНАЛЬНЫЙ РЕЛИЗ: develop -> main (делает тимлид)'
Git 'switch main'
Git 'merge --no-ff develop -m "Release v1.0: анализ успеваемости (develop -> main)"'

# --- 9. История -------------------------------------------------------------
Step '9. ИСТОРИЯ РЕПОЗИТОРИЯ: git log --oneline --graph --all --decorate'
Git 'log --oneline --graph --all --decorate'

Step '10. СПИСОК ВЕТОК: git branch -a'
Git 'branch -a'

# --- 11. Конфликт -----------------------------------------------------------
Step '11. ДЕМОНСТРАЦИЯ КОНФЛИКТА СЛИЯНИЯ'
Write-Output '--- ветка A правит строку и попадает в develop'
Git 'switch -c feature/conflict-a develop'
SaveFile 'modules/notes.txt' 'средний балл считаем через reduce'
Git 'add modules/notes.txt'
Git 'commit -m "docs(a): вариант через reduce"'
Git 'switch develop'
Git 'merge --no-ff feature/conflict-a -m "Merge PR #4: feature/conflict-a"'

Write-Output '--- ветка B стартует от develop и правит ТУ ЖЕ строку'
Git 'switch -c feature/conflict-b develop'
SaveFile 'modules/notes.txt' 'средний балл считаем через for'
Git 'add modules/notes.txt'
Git 'commit -m "docs(b): вариант через for"'

Write-Output '--- пока B ждёт ревью, develop тоже меняет эту строку'
Git 'switch develop'
SaveFile 'modules/notes.txt' 'средний балл считаем через цикл'
Git 'add modules/notes.txt'
Git 'commit -m "docs(develop): уточнение формулировки"'

Write-Output '--- merge даёт CONFLICT: git не знает, какую версию оставить'
Git 'merge feature/conflict-b -m "Merge PR #5: feature/conflict-b"'

Write-Output '--- содержимое конфликтного файла: маркеры <<<<<<< ======= >>>>>>>'
Get-Content 'modules/notes.txt' -Encoding UTF8 | ForEach-Object { Write-Output "    $_" }

Write-Output '--- статус: UU = "both modified" (конфликт не разрешён)'
Git 'status --short'

Write-Output '--- РАЗРЕШЕНИЕ: оставляем объединённый вариант'
SaveFile 'modules/notes.txt' 'средний балл считаем через reduce, for или цикл'
Git 'add modules/notes.txt'
Git 'commit -m "fix: конфликт PR #5 разрешён вручную"'
Git 'status --short'

Step '12. ИТОГОВАЯ ИСТОРИЯ (последние 6 коммитов)'
Git 'log --oneline --graph -6'

Step '13. ВСЕ ВЕТКИ ПОСЛЕ РАБОТЫ'
Git 'branch -a'
