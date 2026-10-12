/**
 * Лабораторная работа №2. Модуль «Средний балл».
 * Роль: Программист 1 (Денис).
 *
 * Функция calculateAverage(data) — вычисляет средний балл группы.
 * Важно: функция ЧИСТАЯ (см. лабораторную работу №4): не меняет входной массив.
 */

'use strict';

/**
 * @param {{name: string, score: number}[]} data — массив записей об оценках
 * @returns {number} средний балл, округлённый до 2 знаков (0 для пустого массива)
 */
function calculateAverage(data) {
    if (!Array.isArray(data) || data.length === 0) return 0;

    // reduce сворачивает массив в одно значение: (аккумулятор, элемент) => ...
    const total = data.reduce((acc, student) => acc + student.score, 0);

    return Math.round((total / data.length) * 100) / 100;
}

module.exports = { calculateAverage };
