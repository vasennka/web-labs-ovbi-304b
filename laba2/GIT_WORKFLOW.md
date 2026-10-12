# Лабораторная работа №2 — Git-флоу команды

Документ описывает **как именно выполнялась** командная часть лабораторной работы №2.
Реальный вывод всех команд лежит рядом: `git-demo-log.txt` (создаётся скриптом `git-demo.ps1`).

## 0. Роли

| Участник | Роль | Задача в коде |
|---|---|---|
| Макар | тимлид, архитектор | репозиторий, ветки `main`/`develop`, `laba2.js`, `data.js`, `report.js`, ревью PR, релиз |
| Денис | программист 1 | `calculateAverage(data)` — `laba2/modules/average.js` |
| (программист 2) | программист 2 | `findTopStudent(data)` — `laba2/modules/top.js` |
| Анна | программист 3 | `filterFailed(data, passScore)` — `laba2/modules/failed.js` |
| Даша | программист 4 | `addLetterGrade(data)` — `laba2/modules/letter.js` |

## 1. Этап 1 — настройка репозитория

```bash
# каждый участник клонирует общий репозиторий преподавателя
git clone <url-репозитория>
cd <repo>

# тимлид создаёт стабильную ветку main
git switch -c main
git push -u origin main

# и ветку разработки develop
git switch -c develop
git push -u origin develop

# каждый участник создаёт ЛИЧНУЮ ветку от develop
git switch -c feature/makar develop
git switch -c feature/denis develop
git switch -c feature/anna  develop
git switch -c feature/dasha develop
```

## 2. Этап 2 — разработка (50 мин)

Каждый работает только в своей ветке и коммитит только свой файл —
именно поэтому слияния проходят почти без конфликтов.

```bash
git switch feature/denis
# ... правим laba2/modules/average.js ...
git add laba2/modules/average.js
git commit -m "feat(average): calculateAverage — средний балл группы"
git push -u origin feature/denis
```

Соглашение о сообщениях коммитов (Conventional Commits):

| Тип | Когда |
|---|---|
| `feat` | новая функциональность |
| `fix` | исправление бага |
| `docs` | только документация |
| `chore` | служебное (настройка, зависимости) |

## 3. Этап 3 — интеграция (20 мин)

```bash
# 1) участник открывает Pull Request feature/denis -> develop, ревьюер = Макар
# 2) Макар читает diff, оставляет комментарии в PR (при необходимости — правки)
# 3) после апрува Макар вливает PR (кнопка Merge на GitHub или локально):
git switch develop
git pull
git merge --no-ff feature/denis -m "Merge PR #1: feature/denis -> develop"
git push origin develop

# 4) финально тимлид выпускает релиз:
git switch main
git merge --no-ff develop -m "Release v1.0: анализ успеваемости (develop -> main)"
git push origin main
```

Флаг `--no-ff` **не даёт** сделать fast-forward: в истории остаётся отдельный
коммит-слияние, и по `git log --graph` видно, что PR действительно был.

## 4. Разрешение конфликта

Конфликт возникает, когда две ветки меняют **одну и ту же строку**.
В демо-скрипте это специально воспроизведено (`feature/conflict-b` против `develop`):

```
CONFLICT (content): Merge conflict in modules/notes.txt
Automatic merge failed; fix conflicts and then commit the result.
```

В файле появляются маркеры:

```
<<<<<<< HEAD
средний балл считаем через цикл       <- версия, которая уже в develop
=======
средний балл считаем через for        <- версия из вливаемой ветки
>>>>>>> feature/conflict-b
```

Порядок действий:

```bash
# 1. открыть файл, оставить корректный вариант, УБРАТЬ все маркеры <<< === >>>
# 2. сообщить git'у, что файл разрешён:
git add laba2/modules/notes.txt
# 3. завершить слияние:
git commit -m "fix: конфликт PR #5 разрешён вручную"
```

Проверить, что конфликтов больше нет: `git status` (файл уходит из «Unmerged paths»).

## 5. Полезные команды «на каждый день»

```bash
git status                 # что изменено и в какой ветке я нахожусь
git diff                   # что именно я изменил (ещё не в индексе)
git diff --staged          # что войдёт в коммит
git log --oneline --graph --all --decorate   # вся история веток
git pull --rebase          # подтянуть чужие изменения без лишнего merge-коммита
git stash                  # временно отложить незакоммиченные изменения
git switch -c fix/typo     # новая ветка «на лету»
git restore file.js        # откатить изменения файла
```

## 6. Как воспроизвести демонстрацию

```powershell
# из папки js-labs
powershell -ExecutionPolicy Bypass -File laba2\git-demo.ps1 |
    Out-File -Encoding utf8 laba2\git-demo-log.txt
```

Скрипт заново создаёт `laba2/git-demo/` (настоящий git-репозиторий с ветками
`main`, `develop`, `feature/*`), проходит все 3 этапа, показывает
`git log --graph --all --decorate` и демонстрирует разрешение конфликта.
