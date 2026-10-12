/**
 * ============================================================================
 * ЛАБОРАТОРНАЯ РАБОТА №2
 * Тема: Практическое применение. Работа с Git, репозиторием и командная
 *       разработка. Программа «Анализ успеваемости».
 * Файл: laba2.js  (по методичке это main.js — точка входа тимлида)
 *
 * Запуск:  node laba2.js      (из папки js-labs)
 * ============================================================================
 *
 * СТРУКТУРА КОМАНДНОГО ПРОЕКТА (каждый файл = отдельная ветка/PR):
 *
 *   laba2.js                       ← точка входа («main.js») тимлида (Макар)
 *   laba2/
 *     data.js                      ← данные + проходной балл (Макар, архитектура)
 *     report.js                    ← итоговый отчёт (Макар)
 *     modules/                     ← независимые модули: 1 PR = 1 функция
 *       average.js   — calculateAverage(data)        — Программист 1 (Денис)
 *       top.js       — findTopStudent(data)          — Программист 2
 *       failed.js    — filterFailed(data, passScore) — Программист 3
 *       letter.js    — addLetterGrade(data)          — Программист 4
 *
 *   laba2/git-demo/ — реальный локальный git-репозиторий, где построены ветки
 *                     main / develop / feature/* и выполнены слияния.
 *                     См. laba2/GIT_WORKFLOW.md и laba2/git-demo-log.txt
 */

'use strict';

const { grades, PASS_SCORE } = require('./laba2/data');
const { printReport } = require('./laba2/report');

const { calculateAverage } = require('./laba2/modules/average');              // Денис
const { findTopStudent, findTopStudentFull } = require('./laba2/modules/top'); // Программист 2
const { filterFailed } = require('./laba2/modules/failed');                   // Программист 3
const { addLetterGrade } = require('./laba2/modules/letter');                 // Программист 4

console.log('=== ЛАБОРАТОРНАЯ РАБОТА №2: «Анализ успеваемости» ===');
console.log('Исходные данные:');
console.table(grades);

// ---------------------------------------------------------------------------
// 1. ДЕМОНСТРАЦИЯ ОТДЕЛЬНЫХ ФУНКЦИЙ — каждую писал свой участник команды
// ---------------------------------------------------------------------------
console.log('\n--- Проверка отдельных функций команды ---');
console.log('calculateAverage(grades)  =', calculateAverage(grades));            // Денис
console.log('findTopStudent(grades)    =', findTopStudent(grades));              // Программист 2
console.log('filterFailed(grades, 60)  =', filterFailed(grades, PASS_SCORE));    // Программист 3
console.log('addLetterGrade(grades)    =');                                     // Программист 4
console.table(addLetterGrade(grades));

// ---------------------------------------------------------------------------
// 2. ИТОГОВЫЙ ОТЧЁТ (пункт «Итоговое задание» методички)
// ---------------------------------------------------------------------------
console.log('\n--- Итоговый отчёт тимлида (report.js) ---');
const result = printReport(grades, PASS_SCORE);

// ---------------------------------------------------------------------------
// 3. МИНИ-ТЕСТЫ — «проверил себя до Pull Request». Без внешних библиотек.
// ---------------------------------------------------------------------------
function assertEqual(title, actual, expected) {
    const a = JSON.stringify(actual);
    const e = JSON.stringify(expected);
    console.log(`${a === e ? '✔' : '✘'} ${title} -> ${a}`);
    if (a !== e) console.log(`    ожидалось: ${e}`);
}

console.log('\n--- Мини-тесты (self-check перед PR) ---');
assertEqual('средний балл группы', result.average, 77.6);
assertEqual('лучший студент', result.top, 'Денис');
assertEqual('лучший студент (объект)', findTopStudentFull(grades), { name: 'Денис', score: 92 });
assertEqual('должники', result.failed, ['Студент_X']);
assertEqual('буквенные оценки (name:letter)',
    result.withLetters.map(s => `${s.name}:${s.letter}`),
    ['Макар:B', 'Денис:A', 'Анна:B', 'Даша:B', 'Студент_X:C']);

// Граничные случаи — важная часть ревью: функции не должны падать.
assertEqual('пустой массив -> средний балл 0', calculateAverage([]), 0);
assertEqual('пустой массив -> лучший = null', findTopStudent([]), null);
assertEqual('пустой массив -> должников нет', filterFailed([], PASS_SCORE), []);
assertEqual('все сдали -> список должников пуст', filterFailed([{ name: 'A', score: 90 }], PASS_SCORE), []);
assertEqual('score === passScore — НЕ должник', filterFailed([{ name: 'B', score: 60 }], PASS_SCORE), []);
assertEqual('максимальный балл ничьей -> первый', findTopStudent([{ name: 'X', score: 90 }, { name: 'Y', score: 90 }]), 'X');

/* ============================================================================
 * КОНТРОЛЬНАЯ ЧАСТЬ: КАК ВЫПОЛНЯЛАСЬ КОМАНДНАЯ РАБОТА В GIT
 * (пошаговая расшифровка команд — в laba2/GIT_WORKFLOW.md,
 *  реальный вывод команд — в laba2/git-demo-log.txt)
 * ============================================================================
 *
 * ЭТАП 1. Настройка репозитория
 *   git clone <url-репозитория-преподавателя> && cd <repo>
 *   git switch -c main                       # тимлид Макар — стабильная ветка
 *   git switch -c develop                    # основная ветка разработки
 *   git switch -c feature/makar develop      # личная ветка КАЖДОГО от develop
 *   git switch -c feature/denis develop
 *   ... (feature/anna, feature/dasha)
 *
 * ЭТАП 2. Разработка (50 мин): каждый коммитит ТОЛЬКО свой модуль
 *   git switch feature/denis
 *   git add laba2/modules/average.js
 *   git commit -m "feat(average): calculateAverage — средний балл группы"
 *   git push -u origin feature/denis
 *
 * ЭТАП 3. Интеграция (20 мин)
 *   # участник открывает Pull Request feature/denis -> develop, ревьюер — Макар
 *   # Макар проверяет код, оставляет комментарии, затем вливает:
 *   git switch develop
 *   git merge --no-ff feature/denis -m "Merge PR #1: calculateAverage"
 *   git push origin develop
 *   # финальная демонстрация:
 *   git switch main
 *   git merge --no-ff develop -m "Release: анализ успеваемости"
 *   git push origin main
 *
 * КОНФЛИКТЫ: если двое правили одну строку, git пишет
 *   CONFLICT (content): Merge conflict in <file>
 * Разрешение: открыть файл, убрать маркеры <<<<<<< ======= >>>>>>>,
 *   оставить корректный код, затем: git add <file> && git commit.
 *
 * СМЫСЛ РАЗДЕЛЕНИЯ НА МОДУЛИ:
 *   - каждый участник редактирует СВОЙ файл -> слияния почти без конфликтов;
 *   - модуль тестируется отдельно (см. self-check выше);
 *   - точка входа собирает модули в одном месте — «Composition Root».
 * ========================================================================= */

console.log('\n=== Лабораторная работа №2 завершена ===');
