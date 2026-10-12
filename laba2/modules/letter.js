/**
 * Лабораторная работа №2. Модуль «Буквенные оценки».
 * Роль: Программист 4.
 *
 * Функция addLetterGrade(data) добавляет каждому студенту поле letter:
 *   "A" — score >= 90
 *   "B" — 75..89
 *   "C" — < 75
 *
 * Реализация НЕ мутирует входные данные (возвращает новый массив),
 * что защищает от побочных эффектов при передаче одного массива в разные модули.
 */

'use strict';

/**
 * Преобразует балл в буквенную оценку.
 * @param {number} score
 * @returns {"A"|"B"|"C"}
 */
function scoreToLetter(score) {
    if (score >= 90) return 'A';
    if (score >= 75) return 'B';
    return 'C';
}

/**
 * @param {{name: string, score: number}[]} data
 * @returns {{name: string, score: number, letter: "A"|"B"|"C"}[]} новый массив
 */
function addLetterGrade(data) {
    if (!Array.isArray(data)) return [];

    // map + spread: создаём копию объекта и дописываем поле letter
    return data.map((student) => ({ ...student, letter: scoreToLetter(student.score) }));
}

module.exports = { addLetterGrade, scoreToLetter };
