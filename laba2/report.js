/**
 * Лабораторная работа №2. Итоговый отчёт.
 * Роль: тимлид (Макар). Собирает вызовы всех функций команды и демонстрирует
 * работу через console.log (пункт «Итоговое задание» методички).
 */

'use strict';

const { grades, PASS_SCORE } = require('./data');
const { calculateAverage } = require('./modules/average');   // Денис
const { findTopStudent, findTopStudentFull } = require('./modules/top');        // Программист 2
const { filterFailed } = require('./modules/failed');        // Программист 3
const { addLetterGrade } = require('./modules/letter');      // Программист 4

/**
 * Печатает итоговый отчёт по группе.
 * @param {{name: string, score: number}[]} data
 * @param {number} passScore
 */
function printReport(data, passScore) {
    const line = '─'.repeat(58);

    console.log(line);
    console.log('ОТЧЁТ «АНАЛИЗ УСПЕВАЕМОСТИ ГРУППЫ»');
    console.log(line);

    // Небольшой помощник, чтобы колонка значений была выровнена
    const row = (label, value) => console.log(label.padEnd(34, '.') + ' ' + value);

    // 1. Средний балл группы
    const average = calculateAverage(data);
    row('1) Средний балл группы', average);

    // 2. Лучший студент
    const top = findTopStudent(data);
    const topFull = findTopStudentFull(data);
    row('2) Лучший студент', `${top} (${topFull.score} баллов)`);

    // 3. Список должников
    const failed = filterFailed(data, passScore);
    row(`3) Должники (балл < ${passScore})`, failed.length ? failed.join(', ') : 'нет');

    // 4. Итоговый массив с буквенными оценками
    const withLetters = addLetterGrade(data);
    console.log('4) Буквенные оценки:');
    console.table(withLetters);

    console.log(line);
    return { average, top, failed, withLetters };
}

module.exports = { printReport, grades, PASS_SCORE };
