/**
 * Лабораторная работа №2. Модуль «Лучший студент».
 * Роль: Программист 2.
 *
 * Функция findTopStudent(data) — возвращает ИМЯ студента с максимальным баллом.
 * При равенстве баллов возвращается первый такой студент (устойчивое поведение).
 */

'use strict';

/**
 * @param {{name: string, score: number}[]} data
 * @returns {string|null} имя лучшего студента или null для пустого массива
 */
function findTopStudent(data) {
    if (!Array.isArray(data) || data.length === 0) return null;

    let best = data[0];

    for (const student of data) {
        // Строгое ">" (не ">="), поэтому при равных баллах остаётся первый
        if (student.score > best.score) {
            best = student;
        }
    }

    return best.name;
}

/** Дополнительно: сам объект лучшего студента (пригодится в отчёте). */
function findTopStudentFull(data) {
    if (!Array.isArray(data) || data.length === 0) return null;
    return data.reduce((best, s) => (s.score > best.score ? s : best));
}

module.exports = { findTopStudent, findTopStudentFull };
