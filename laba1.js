/**
 * ============================================================================
 * ЛАБОРАТОРНАЯ РАБОТА №1
 * Тема: Введение в синтаксис JavaScript: циклы, массивы, функции.
 * Файл: laba1.js
 * Запуск: node laba1.js   (или вставить в консоль браузера, F12)
 * ============================================================================
 *
 * Цель работы: изучить базовый синтаксис JavaScript и понять отличия от Python:
 * объявление переменных (let/const/var), цикл for, циклы while, массивы и функции.
 *
 * Быстрая шпаргалка «Python -> JavaScript»:
 *   x = 5                 ->  let x = 5;                 (изменяемая)
 *   PI = 3.14             ->  const PI = 3.14;           (константа)
 *   for i in range(10)    ->  for (let i = 0; i < 10; i++) { ... }
 *   список.append(x)      ->  массив.push(x)
 *   len(arr)              ->  arr.length                (это свойство, не функция)
 *   отступы вместо { }    ->  фигурные скобки { } всегда обязательны
 *   print()               ->  console.log()
 */

'use strict'; // строгий режим: "молчаливые" ошибки становятся явными (хорошая практика)

/* =========================================================================
 * НЕБОЛЬШОЙ ХЕЛПЕР ДЛЯ ПРОВЕРКИ РЕЗУЛЬТАТОВ
 * (чтобы вместо ручного сравнения глазами получить наглядный отчёт)
 * ========================================================================= */
function check(title, actual, expected) {
    const a = JSON.stringify(actual);
    const e = JSON.stringify(expected);
    const ok = a === e;
    console.log(`${ok ? '✔' : '✘'} ${title}`);
    console.log(`    получено: ${a}`);
    if (!ok) console.log(`    ожидалось: ${e}`);
    return ok;
}

/* =========================================================================
 * ЗАДАНИЕ 1. «Аналог range»
 * Написать функцию rangeJS(start, end), которая возвращает массив чисел
 * от start до end (НЕ включая end).
 * Пример: rangeJS(3, 8) -> [3, 4, 5, 6, 7]
 * ========================================================================= */

/**
 * Аналог Python-функции range().
 * @param {number} start — начало диапазона (включительно)
 * @param {number} end   — конец диапазона (НЕ включительно)
 * @returns {number[]} массив чисел [start, end)
 */
function rangeJS(start, end) {
    const result = []; // массив создаём литералом []; аналог Python: result = []

    // Классический for: (инициализация; условие; шаг)
    for (let i = start; i < end; i++) {
        // i++ — то же самое, что i = i + 1
        result.push(i); // аналог Python: result.append(i)
    }

    return result; // если забыть return, функция вернёт undefined
}

console.log('\n=== Задание 1. Аналог range ===');
console.log('rangeJS(3, 8)   =', rangeJS(3, 8)); //  [3, 4, 5, 6, 7]
console.log('rangeJS(1, 5)   =', rangeJS(1, 5)); //  [1, 2, 3, 4]
console.log('rangeJS(10, 15) =', rangeJS(10, 15)); // [10, 11, 12, 13, 14]
check('rangeJS(3, 8) совпадает с примером', rangeJS(3, 8), [3, 4, 5, 6, 7]);

// --- Альтернативное «современное» решение через Array.from --------------------
const rangeJSModern = (start, end) =>
    Array.from({ length: Math.max(0, end - start) }, (_, i) => start + i);

console.log('rangeJSModern(3, 8) =', rangeJSModern(3, 8)); // тот же результат
check('Array.from-версия работает так же', rangeJSModern(3, 8), [3, 4, 5, 6, 7]);

// --- Демонстрация "граничных" случаев ---------------------------------------
console.log('rangeJS(5, 5)  =', rangeJS(5, 5));   // []  — пустой диапазон
console.log('rangeJS(0, -3) =', rangeJS(0, -3));  // []  — отрицательный шаг не поддержан

/* =========================================================================
 * ЗАДАНИЕ 2. «Трансформация массива»
 * Дан массив чисел. Нужно:
 *   1) новый массив squares — квадраты элементов (через for или for...of);
 *   2) сумму всех элементов исходного массива (через while);
 *   3) ответить: какой метод в JS заменяет Python-метод append?
 * ========================================================================= */

const numbers = [2, 5, 8, 12, 3];

/* --- 2.1 Квадраты через классический for ---------------------------------- */
function squaresWithFor(arr) {
    const squares = [];
    for (let i = 0; i < arr.length; i++) {
        squares.push(arr[i] * arr[i]);
    }
    return squares;
}

/* --- 2.2 Квадраты через for...of ------------------------------------------ */
function squaresWithForOf(arr) {
    const squares = [];
    for (const value of arr) {
        // for...of перебирает ЗНАЧЕНИЯ (аналог Python-цикла for value in arr)
        squares.push(value ** 2); // ** — возведение в степень, как в Python
    }
    return squares;
}

/* --- 2.3 Сумма через while ------------------------------------------------ */
function sumWithWhile(arr) {
    let sum = 0;
    let i = 0; // счётчик объявляем ДО цикла, т.к. он живёт вне while

    while (i < arr.length) {
        sum += arr[i]; // sum += x — то же, что sum = sum + x
        i++;           // обязательно увеличиваем счётчик, иначе бесконечный цикл
    }

    return sum;
}

console.log('\n=== Задание 2. Трансформация массива ===');
console.log('Исходный массив numbers      =', numbers);
console.log('квадраты (через for)          =', squaresWithFor(numbers));   // [4, 25, 64, 144, 9]
console.log('квадраты (через for...of)     =', squaresWithForOf(numbers)); // [4, 25, 64, 144, 9]
console.log('сумма (через while)           =', sumWithWhile(numbers));     // 30

check('squares через for', squaresWithFor(numbers), [4, 25, 64, 144, 9]);
check('squares через for...of', squaresWithForOf(numbers), [4, 25, 64, 144, 9]);
check('sumWithWhile', sumWithWhile(numbers), 30);

// Бонус: то же самое, но в функциональном стиле (см. лабораторную работу №4)
console.log('сравнение: numbers.map(n => n ** 2) =', numbers.map(n => n * n));

/* ОТВЕТ НА ВОПРОС ДЛЯ ОСМЫСЛЕНИЯ:
 * В Python элементы в конец списка добавляет list.append(x).
 * В JavaScript аналог append — метод push(): массив.push(значение).
 *
 * Важные отличия:
 *   - push() ВОЗВРАЩАЕТ новую длину массива (а не сам массив!),
 *     поэтому нельзя писать arr = arr.push(x);
 *   - если нужно добавить несколько элементов — push(x, y, z) работает;
 *   - добавить в НАЧАЛО — unshift(); удалить с конца — pop(); с начала — shift().
 * Пример: */
const demo = [1, 2];
const newLength = demo.push(3);
console.log('demo =', demo, '| длина, возвращённая push() =', newLength); // [1,2,3] и 3

/* =========================================================================
 * ЗАДАНИЕ 3. «Жизнь циклов»
 * drawPyramid(height) печатает пирамидку из '#':
 *   height = 3  ->
 *   #
 *   ##
 *   ###
 * ========================================================================= */

/* --- Вариант A: вложенный for --------------------------------------------- */
function drawPyramid(height) {
    for (let row = 1; row <= height; row++) {
        let line = '';
        // внутренний цикл добавляет ровно row символов '#'
        for (let col = 0; col < row; col++) {
            line += '#'; // конкатенация строк через + (нельзя использовать , )
        }
        console.log(line);
    }
}

/* --- Вариант B: метод repeat() -------------------------------------------- */
function drawPyramidRepeat(height) {
    for (let row = 1; row <= height; row++) {
        console.log('#'.repeat(row)); // в Python: '#' * row
    }
}

console.log('\n=== Задание 3. Пирамидка, height = 3 (вложенный for) ===');
drawPyramid(3);

console.log('--- height = 5 (через repeat) ---');
drawPyramidRepeat(5);

/* Любопытная деталь: конкатенация в цикле со '+' работает, но на больших
 * объёмах это O(n^2)-подобная операция; современный способ — собрать массив
 * и вызвать join('') либо использовать repeat()/padStart(). */
console.log('обратный отсчёт (while):');
let h = 3;
while (h > 0) {
    console.log('#'.repeat(h));
    h--;
}

/* =========================================================================
 * ЗАДАНИЕ 4. «Фильтрация»
 * getExperienced(studentsList, minExp) возвращает массив ИМЁН тех студентов,
 * чей опыт (exp) >= minExp.
 * ========================================================================= */

const students = [
    { name: 'Макар', role: 'teamlead', exp: 5 },
    { name: 'Денис', role: 'programmer', exp: 4 },
    { name: 'Анна', role: 'programmer', exp: 2 },
    { name: 'Даша', role: 'designer', exp: 1 }
];

/**
 * Возвращает имена студентов с опытом не меньше minExp.
 * @param {{name: string, exp: number}[]} studentsList
 * @param {number} minExp
 * @returns {string[]}
 */
function getExperienced(studentsList, minExp) {
    const names = [];

    for (const student of studentsList) {
        // доступ к полям: student.exp (point-notation). Аналог Python: student["exp"]
        if (student.exp >= minExp) {
            names.push(student.name);
        }
    }

    return names;
}

console.log('\n=== Задание 4. Фильтрация ===');
console.log('getExperienced(students, 3) =', getExperienced(students, 3)); // ["Макар", "Денис"]
console.log('getExperienced(students, 2) =', getExperienced(students, 2)); // ["Макар","Денис","Анна"]
console.log('getExperienced(students, 9) =', getExperienced(students, 9)); // []
check('getExperienced(students, 3)', getExperienced(students, 3), ['Макар', 'Денис']);

// Тот же результат в функциональном стиле:
const getExperiencedFn = (list, minExp) =>
    list.filter(s => s.exp >= minExp).map(s => s.name);
check('функциональный вариант', getExperiencedFn(students, 3), ['Макар', 'Денис']);

/* =========================================================================
 * ПРОВЕРКА ОШИБОК, О КОТОРЫХ ПРЕДУПРЕЖДАЕТ МЕТОДИЧКА
 * ========================================================================= */
console.log('\n=== Частые ошибки (разобраны, но НЕ приводят к падению файла) ===');

// 1) Забыли let -> в строгом режиме это ReferenceError
try {
    // eslint-disable-next-line no-undef
    undeclaredVariable = 42;
} catch (err) {
    console.log('1) присваивание без объявления ->', err.name + ':', err.message);
}

// 2) Ошибка <= вместо < — включает end
const wrongRange = (start, end) => {
    const r = [];
    for (let i = start; i <= end; i++) r.push(i);
    return r;
};
console.log('2) с "<=" получилось бы', wrongRange(3, 8), 'вместо', rangeJS(3, 8));

// 3) append в JS не существует
console.log('3) Array.prototype.append ===', typeof [].append, '(нужен push)');
try {
    [].append(1);
} catch (err) {
    console.log('   вызов [].append(1) бросает ->', err.name + ':', err.message);
}

// 4) push() возвращает длину, а не массив — классическая ловушка
const trap = [];
const returned = trap.push('a');
console.log('4) arr.push("a") вернул', returned, '— это длина, а не массив');

/* =========================================================================
 * КОНТРОЛЬНЫЕ ВОПРОСЫ (письменные ответы)
 * ========================================================================= *
 *
 * ВОПРОС 1. Чем отличается объявление переменной через let от const?
 *
 * - let создаёт ПЕРЕМЕННУЮ: значение можно переприсваивать.
 *       let counter = 0; counter = 1;   // ок
 * - const создаёт КОНСТАНТНУЮ ПРИВЯЗКУ: переприсваивание запрещено,
 *   попытка бросит TypeError ("Assignment to constant variable"). Обязательно
 *   инициализировать при объявлении.
 *       const PI = 3.14;   PI = 3;  // TypeError
 *
 * ВАЖНЫЙ НЮАНС (частая ошибка на защите): const защищает не объект, а ПРИВЯЗКУ.
 * Если в const хранится объект или массив, его СОДЕРЖИМОЕ менять можно:
 *       const arr = [1, 2];
 *       arr.push(3);        // ок, arr стал [1, 2, 3]
 *       arr = [9];          // TypeError — переприсваивание самой переменной
 * Чтобы объект нельзя было менять, нужен Object.freeze().
 *
 * Ещё отличия:
 * - область видимости: и let, и const — блочные (видимы внутри { }), а старый
 *   var — функциональная (поднимается наверх функции, hoisting). Пример:
 *       for (var i = 0; i < 3; i++) {}
 *       console.log(i);   // 3 — var "утекла" из блока
 *       for (let j = 0; j < 3; j++) {}
 *       console.log(j);   // ReferenceError — let не выходит за пределы блока
 * - temporal dead zone: к let/const нельзя обратиться до строки объявления
 *   (ReferenceError), тогда как var до объявления даёт undefined.
 *
 * Практическое правило: по умолчанию пишите const; меняйте на let только там,
 * где значение действительно переприсваивается. var не используйте.
 *
 * ВОПРОС 2. Почему в JS нельзя написать `for i in range(5)` как в Python?
 *            Чем это чревато?
 *
 * Потому что конструкции языка устроены иначе:
 *   1) В JavaScript НЕТ встроенной функции range() — диапазоны не являются
 *      отдельным типом. В Python range() — объект-последовательность, которую
 *      перебирает for-in. В JS «числовой диапазон» пишут циклом for или
 *      создают массив (что мы и сделали в задании 1).
 *   2) Ключевое слово `in` в JS означает совсем другое: оно проверяет наличие
 *      СВОЙСТВА у объекта и перебирает КЛЮЧИ. Конструкция `for (x in obj)`
 *      синтаксически верна, но перебирает имена свойств, а не значения:
 *          const arr = ['a', 'b'];
 *          for (const i in arr) console.log(i);        // "0", "1" — строки!
 *      А выражение `i in range(5)` попытается найти свойство "i" в объекте
 *      range(5) и либо бросит ReferenceError (если range не объявлен), либо
 *      молча даст false.
 *
 * ЧЕМ ЧРЕВАТО (типичные грабли):
 *   - for...in перебирает и УНАСЛЕДОВАННЫЕ свойства из prototype, а также
 *     перечислимые свойства, добавленные в Array.prototype — классическая
 *     уязвимость старого кода;
 *   - ключи массива приходят СТРОКАМИ ("0", "1", "2"), из-за чего
 *     arr[i] == arr[i + 1] может сработать/не сработать нелогично
 *     (конкатенация вместо сложения);
 *   - порядок обхода for...in формально не гарантирован для обычных объектов;
 *   - попытка написать `for (let i = 0; i < range(5); i++)` даст NaN-условие
 *     и цикл не выполнится ни разу.
 * Правильные аналоги: for (let i = 0; i < 5; i++) {}, for...of по массиву или
 * метод forEach(). Именно поэтому мы написали свой rangeJS().
 *
 * ВОПРОС 3. Какой метод массива заменяет Python-метод append?
 *
 * push(). Он добавляет один или несколько элементов в КОНЕЦ массива и
 * возвращает НОВУЮ ДЛИНУ массива (а не сам массив — это частый источник
 * багов). Соответствия методов Python и JS:
 *   list.append(x)      -> arr.push(x)
 *   list.insert(0, x)   -> arr.unshift(x)
 *   list.pop()          -> arr.pop()          (с конца; в JS возвращает элемент)
 *   list.pop(0)         -> arr.shift()        (с начала)
 *   list.extend(other)  -> arr.push(...other)
 *   list.remove(x)      -> arr.splice(arr.indexOf(x), 1)
 *   x in list           -> arr.includes(x)
 *
 * =========================================================================
 * ИТОГ: все 4 задания выполнены, результаты выведены выше.
 * ========================================================================= */

console.log('\n=== Лабораторная работа №1 завершена ===');
