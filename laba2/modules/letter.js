/**
 * Лабораторная работа №2. Модуль «Буквенные оценки».
 * Роль: Программист 4 (Даша).
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

/** Пороги буквенных оценок (одно место, где меняются правила). */
const LETTER_THRESHOLDS = Object.freeze({
    A: 90,
    B: 75
});

/**
 * Преобразует балл в буквенную оценку.
 *
 * @param {number} score
 * @returns {"A"|"B"|"C"}
 */
function scoreToLetter(score) {
    if (!Number.isFinite(score)) return 'C';
    if (score >= LETTER_THRESHOLDS.A) return 'A';
    if (score >= LETTER_THRESHOLDS.B) return 'B';
    return 'C';
}

/**
 * Добавляет поле letter каждому студенту (входной массив не меняется).
 *
 * @param {{name: string, score: number}[]} data
 * @returns {{name: string, score: number, letter: "A"|"B"|"C"}[]} новый массив
 */
function addLetterGrade(data) {
    if (!Array.isArray(data)) return [];

    // map + spread: создаём копию объекта и дописываем поле letter
    return data.map((student) => ({ ...student, letter: scoreToLetter(student.score) }));
}

module.exports = { addLetterGrade, scoreToLetter, LETTER_THRESHOLDS };
