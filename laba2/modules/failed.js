/**
 * Лабораторная работа №2. Модуль «Должники».
 * Роль: Программист 3.
 *
 * Функция filterFailed(data, passScore) — массив имён студентов,
 * чей балл СТРОГО ниже проходного (score < passScore).
 */

'use strict';

/**
 * @param {{name: string, score: number}[]} data
 * @param {number} passScore — проходной балл (по условию 60)
 * @returns {string[]} имена должников
 */
function filterFailed(data, passScore) {
    if (!Array.isArray(data)) return [];

    return data
        .filter((student) => student.score < passScore) // filter оставляет подходящие
        .map((student) => student.name);                // map превращает объект в имя
}

module.exports = { filterFailed };
