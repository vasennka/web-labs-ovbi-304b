/**
 * Лабораторная работа №2. Модуль «Средний балл».
 * Роль: Программист 1 (Денис).
 *
 * Функция calculateAverage(data) — вычисляет средний балл группы.
 * Важно: функция ЧИСТАЯ (см. лабораторную работу №4): не меняет входной массив.
 */

'use strict';

/** Оценка считается корректной, только если это конечное число. */
const isValidScore = (value) => typeof value === 'number' && Number.isFinite(value);

/**
 * Средний балл группы.
 *
 * @param {{name: string, score: number}[]} data — массив записей об оценках
 * @returns {number} средний балл, округлённый до 2 знаков (0 для пустого массива)
 * @throws {TypeError} если передан не массив
 */
function calculateAverage(data) {
    if (!Array.isArray(data)) {
        throw new TypeError('calculateAverage ожидает массив записей об оценках');
    }
    if (data.length === 0) return 0;

    // Нечисловые оценки игнорируем: иначе одна опечатка в данных
    // превратила бы весь средний балл в NaN.
    const scores = data.map((student) => student.score).filter(isValidScore);
    if (scores.length === 0) return 0;

    const total = scores.reduce((acc, score) => acc + score, 0);

    return Math.round((total / scores.length) * 100) / 100;
}

module.exports = { calculateAverage };
