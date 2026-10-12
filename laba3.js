/**
 * ============================================================================
 * ЛАБОРАТОРНАЯ РАБОТА №3
 * Тема: Объявление функций, параметры, return, Function Expression,
 *       стрелочные функции, замыкания.
 * Файл: laba3.js
 * Запуск: node laba3.js
 *
 * ВНИМАНИЕ ПО НУМЕРАЦИИ: в присланном файле этой работы стоит заголовок
 * «Лабораторная работа №1» — это опечатка. По списку присланных документов
 * это третья лабораторная, поэтому файл назван laba3.js, а тема взята
 * из фактического содержания документа (функции, стрелки, замыкания).
 * ============================================================================
 *
 * Теория кратко:
 *   1) Function Declaration  — function sum(a, b) {}   — всплывает (hoisting),
 *      её можно вызвать ДО объявления.
 *   2) Function Expression   — const mul = function(a, b) {}  — создаётся в момент
 *      выполнения строки; к ней нельзя обратиться раньше (TDZ).
 *   3) Arrow Function        — const div = (a, b) => a / b — короткий синтаксис,
 *      неявный return у односточного тела, НЕ имеет собственных this/arguments,
 *      не может быть конструктором.
 *   4) return — возвращает значение и завершает функцию; без return -> undefined.
 *   5) Значения по умолчанию: function greet(name = "Гость") {}
 */

'use strict';

// ---------------------------------------------------------------------------
// Демонстрация hoisting: Function Declaration доступна до строки объявления
// ---------------------------------------------------------------------------
console.log('=== Демонстрация hoisting ===');
console.log('hoistedSum(2, 3) до объявления =', hoistedSum(2, 3)); // работает!

function hoistedSum(a, b) {
    return a + b;
}
console.log('hoistedSum(2, 3) после       =', hoistedSum(2, 3));

// А вот Function Expression до объявления — ошибка:
try {
    notHoisted();
} catch (err) {
    console.log('notHoisted() до объявления ->', err.name + ': ' + err.message);
}
const notHoisted = function () {
    return 'я создана позже';
};
console.log('notHoisted() после            =', notHoisted());

/* =========================================================================
 * ЗАДАЧА 1 (лёгкая): Калькулятор скидок
 * calculateDiscountedPrice(price, discount = 0)
 *   1000, 10 -> 900     500 -> 500
 * ========================================================================= */

/**
 * Считает итоговую цену с учётом скидки.
 * @param {number} price    — исходная цена
 * @param {number} discount — скидка в процентах (по умолчанию 0)
 * @returns {number} итоговая стоимость
 */
function calculateDiscountedPrice(price, discount = 0) {
    // Значение по умолчанию применяется, только если аргумент undefined
    if (typeof price !== 'number' || Number.isNaN(price)) {
        throw new TypeError('price должен быть числом');
    }

    const finalPrice = price - (price * discount) / 100;

    // Округление до копеек: убираем ошибки плавающей точки (900.0000000000001)
    return Math.round(finalPrice * 100) / 100;
}

console.log('\n=== Задача 1. Калькулятор скидок ===');
console.log('calculateDiscountedPrice(1000, 10) =', calculateDiscountedPrice(1000, 10)); // 900
console.log('calculateDiscountedPrice(500)      =', calculateDiscountedPrice(500));      // 500
console.log('calculateDiscountedPrice(1000, 0)  =', calculateDiscountedPrice(1000, 0));  // 1000
console.log('calculateDiscountedPrice(1999, 15) =', calculateDiscountedPrice(1999, 15)); // 1699.15
console.log('скидка 100%                        =', calculateDiscountedPrice(1000, 100)); // 0
// Показываем разницу между undefined (сработает default) и null (НЕ сработает):
console.log('price=100, discount=undefined ->', calculateDiscountedPrice(100, undefined)); // 100
console.log('price=100, discount=null      ->', calculateDiscountedPrice(100, null));      // 100
console.log('calculateDiscountedPrice(1000, "abc") =', calculateDiscountedPrice(1000, 'abc')); // NaN!
console.log('  ^ вывод: в реальном коде нужна валидация параметров, а не только default');

/* =========================================================================
 * ЗАДАЧА 2 (лёгкая): Чётность
 * isEven — через FUNCTION EXPRESSION, возвращает boolean
 * ========================================================================= */

const isEven = function (number) {
    // ВАЖНО: % для отрицательных чисел в JS сохраняет знак: -3 % 2 === -1,
    // поэтому сравниваем не с 1, а с 0.
    return number % 2 === 0;
};

console.log('\n=== Задача 2. Чётность (Function Expression) ===');
console.log('isEven(4)  =', isEven(4));   // true
console.log('isEven(7)  =', isEven(7));   // false
console.log('isEven(0)  =', isEven(0));   // true
console.log('isEven(-3) =', isEven(-3));  // false
console.log('typeof isEven =', typeof isEven); // "function"

/* =========================================================================
 * ЗАДАЧА 3 (средняя): Форматирование имени
 * formatName(firstName = '', lastName = '') через ARROW FUNCTION:
 *   оба аргумента      -> "Фамилия, Имя"
 *   только фамилия     -> "Уважаемый(ая) Фамилия"
 *   ничего             -> "Аноним"
 * ========================================================================= */

const formatName = (firstName = '', lastName = '') => {
    // .trim() убирает случайные пробелы: formatName("  ", "Петров")
    const first = String(firstName).trim();
    const last = String(lastName).trim();

    if (first && last) return `${last}, ${first}`;      // шаблонные строки (backticks)
    if (last) return `Уважаемый(ая) ${last}`;
    if (first) return `Уважаемый(ая) ${first}`;         // бонус: передали только имя
    return 'Аноним';
};

console.log('\n=== Задача 3. Форматирование имени (Arrow Function) ===');
console.log('formatName("Иван", "Петров") =', formatName('Иван', 'Петров')); // "Петров, Иван"
console.log('formatName("Петров")         =', formatName('Петров'));        // "Уважаемый(ая) Петров"
console.log('formatName()                 =', formatName());                // "Аноним"
console.log('formatName("Анна", "")       =', formatName('Анна', ''));      // "Уважаемый(ая) Анна"

/* =========================================================================
 * ЗАДАЧА 4 (средняя): Функция в функции (higher-order function)
 * mathOperation(a, b, callback) + add / subtract / multiply
 * ========================================================================= */

// Function Declarations — операции
function add(a, b) {
    return a + b;
}
function subtract(a, b) {
    return a - b;
}
function multiply(a, b) {
    return a * b;
}

/**
 * Функция высшего порядка: принимает операцию как аргумент (callback).
 * @param {number} a
 * @param {number} b
 * @param {(x: number, y: number) => number} operation — колбэк
 * @returns {number}
 */
function mathOperation(a, b, operation) {
    if (typeof operation !== 'function') {
        throw new TypeError('operation должна быть функцией');
    }
    return operation(a, b); // «не знаю, что делать, — знает тот, кто передал операцию»
}

console.log('\n=== Задача 4. Функция в функции ===');
console.log('mathOperation(10, 5, add)      =', mathOperation(10, 5, add));      // 15
console.log('mathOperation(10, 5, subtract) =', mathOperation(10, 5, subtract)); // 5
console.log('mathOperation(10, 5, multiply) =', mathOperation(10, 5, multiply)); // 50
// Тут же можно передать стрелку «на месте» — анонимный колбэк:
console.log('mathOperation(10, 5, (a,b)=>a/b) =', mathOperation(10, 5, (a, b) => a / b)); // 2
console.log('mathOperation(10, 5, (a,b)=>a**b) =', mathOperation(10, 5, (a, b) => a ** b)); // 100000

/* =========================================================================
 * ЗАДАЧА 5 (сложная): Генератор приветствий — ЗАМЫКАНИЕ
 * ========================================================================= */

/**
 * Фабрика функций: сохраняет приветствие в замыкании и возвращает функцию,
 * которая помнит это значение.
 * @param {string} greeting — например, "Привет" или "Hello"
 * @returns {(name: string) => string}
 */
function createGreeting(greeting) {
    // Параметр greeting живёт в лексическом окружении этой функции.
    // Возвращаемая функция «замыкает» его: после выхода из createGreeting
    // переменная НЕ уничтожается, потому что на неё ссылается внутренняя функция.
    return function (name) {
        return `${greeting}, ${name}!`;
    };
}

// Вариант со стрелкой — короче и делает то же самое:
const createGreetingArrow = (greeting) => (name) => `${greeting}, ${name}!`;

console.log('\n=== Задача 5. Генератор приветствий (замыкание) ===');
const sayHi = createGreeting('Привет');
const sayHello = createGreeting('Hello');

console.log('sayHi("Анна")     =', sayHi('Анна'));       // "Привет, Анна!"
console.log('sayHello("John")  =', sayHello('John'));     // "Hello, John!"
console.log('sayHi("Денис")    =', sayHi('Денис'));      // "Привет, Денис!" — то же приветствие
console.log('стрелочный вариант:', createGreetingArrow('Здравствуйте')('Макар'));

// Доказательство, что функции НЕЗАВИСИМЫ: у каждой своё окружение
console.log('sayHi === sayHello            =', sayHi === sayHello); // false
console.log('typeof sayHi                  =', typeof sayHi);      // function
console.log('sayHi.name                    =', JSON.stringify(sayHi.name)); // "" (анонимная)

// --- Практический пример замыкания: счётчик с приватным состоянием ----------
function createCounter(start = 0) {
    let count = start;                 // НЕДОСТУПНО снаружи — только через методы
    return {
        increment: () => ++count,
        decrement: () => --count,
        get value() { return count; }  // геттер (см. лабораторную работу №6)
    };
}
const counter = createCounter(10);
counter.increment();
counter.increment();
counter.decrement();
console.log('createCounter: снаружи count =', counter.value, '| count напрямую =', counter.count); // 11, undefined

/* =========================================================================
 * ЧАСТЫЕ ОШИБКИ
 * ========================================================================= */
console.log('\n=== Частые ошибки ===');

// 1) Забыли return — функция вернёт undefined
function noReturn(x) {
    const y = x * 2; // посчитали, но не вернули
}
console.log('1) без return ->', noReturn(5)); // undefined

// 2) return с переносом строки — ASI (автоматическая вставка точки с запятой)
function brokenReturn() {
    return
    { ok: true };
}
console.log('2) return на новой строке ->', brokenReturn()); // undefined, а не объект!

// 3) Стрелка НЕ имеет собственного this — это ловушка в объектах
const timerBad = {
    seconds: 5,
    startBad: function () {
        setTimeout(() => console.log('3) стрелка в setTimeout: this.seconds =', this.seconds), 0);
    }
};
timerBad.startBad(); // 5 — стрелка взяла this из startBad

// 4) Стрелка не может быть конструктором
const Arrow = () => {};
try {
    new Arrow();
} catch (err) {
    console.log('4) new (стрелка) ->', err.name + ':', err.message);
}

// 5) Значение по умолчанию НЕ спасает от явного null/NaN
const withDefault = (a = 10) => a;
console.log('5) withDefault(undefined) =', withDefault(undefined), '| withDefault(null) =', withDefault(null), '| withDefault(NaN) =', withDefault(NaN));

/* ============================================================================
 * КОНТРОЛЬНЫЕ ВОПРОСЫ (письменные ответы)
 * ============================================================================
 *
 * ВОПРОС 1. В чём разница между Function Declaration и Function Expression?
 *
 * Function Declaration:
 *       function sum(a, b) { return a + b; }
 *   - объявление как ОТДЕЛЬНЫЙ оператор языка, в начале строки стоит `function`;
 *   - ПОДВЕРЖЕНА hoisting: движок создаёт функцию на этапе подготовки
 *     (до выполнения кода), поэтому вызов ДО объявления работает;
 *   - имеет собственное имя sum, доступное внутри самой функции (рекурсия);
 *   - в строгом режиме и в модулях существует только в своей области видимости,
 *     но внутри блока {} в ES6 ведёт себя блочно.
 *
 * Function Expression:
 *       const sum = function (a, b) { return a + b; };
 *   - функция — это ЗНАЧЕНИЕ, которое присваивается переменной/передаётся аргументом;
 *   - создаётся в момент выполнения строки, поэтому вызвать её раньше — ошибка
 *     (для const/let — ReferenceError из-за temporal dead zone);
 *   - имя необязательно (анонимная функция); если имя дано — оно доступно только
 *     внутри самой функции: const f = function g() { g(); };
 *   - типичный случай использования: колбэк, IIFE, присваивание по условию.
 *
 * Практический вывод для ревью-кода: используйте Declaration, когда важна
 * «поднятость» и именованность; Expression/Arrow — когда функцию передают
 * как значение (колбэк) или создают условно.
 *
 * ВОПРОС 2. Что такое стрелочная функция? Когда удобно её использовать?
 *
 * Стрелочная функция — компактный синтаксис функции из ES6:
 *       const divide = (a, b) => a / b;              // неявный return
 *       const log = msg => { console.log(msg); };    // с блоком нужен явный return
 *       const make = () => ({ a: 1 });               // объект в круглых скобках
 *
 * Особенности:
 *   - НЕТ собственного this: берёт this из внешнего лексического окружения;
 *   - НЕТ объекта arguments (зато есть ...rest);
 *   - НЕ может быть конструктором (new выдаст TypeError), нет prototype;
 *   - НЕ может использовать yield (не генератор);
 *   - нельзя навесить имя метода через `super` — тоже наследуется извне.
 *
 * Когда удобно:
 *   - короткие «в одну строку» преобразования: arr.map(x => x * 2), arr.filter(...);
 *   - колбэки, которым нужен this внешней функции — например, внутри методов класса
 *     или setTimeout/setInterval, чтобы не писать const self = this / .bind(this);
 *   - функции высшего порядка и каррирование: const mul = a => b => a * b;
 * Когда НЕ стоит:
 *   - методы объекта, которым нужен свой this: const obj = { n: 1, get() { return this.n; } };
 *   - обработчики, где нужен динамический this / arguments;
 *   - когда функция должна быть конструктором или генератором.
 *
 * ВОПРОС 3. Что произойдёт, если функция не содержит return?
 *
 * Функция завершится нормально, но вернёт undefined. Ошибки не будет.
 *   - return без значения (`return;`) — тоже undefined, но завершает функцию ДОСРОЧНО;
 *   - если выполнить return в ветке if, остальные строки не выполнятся;
 *   - конструктор, который не возвращает объект, возвращает this (новый объект);
 *   - если функция вызывается как async, отсутствие return даёт Promise,
 *     который разрешается в undefined;
 *   - внутри .map()/forEach такое приводит к массивам из undefined или к
 *     отсутствию побочных эффектов — самая частая реальная ошибка новичка.
 * Ловушка ASI: `return` и значение на РАЗНЫХ строках — вернётся undefined:
 *   return
 *   { ok: true };   // вернёт undefined! (см. пример в разделе «частые ошибки»)
 *
 * ВОПРОС 4. Что такое «замыкание» (closure) на примере задачи 5?
 *
 * Замыкание — это функция вместе с её ЛЕКСИЧЕСКИМ ОКРУЖЕНИЕМ: все внешние
 * переменные, к которым функция обращается, сохраняются в памяти столько,
 * сколько живёт сама функция, даже если внешняя функция уже завершилась.
 *
 * В createGreeting("Привет"):
 *   1) при вызове создаётся локальное окружение, где greeting === "Привет";
 *   2) возвращается внутренняя функция function (name) { return greeting + ... };
 *   3) внешняя функция завершается, но её окружение НЕ собирается сборщиком мусора,
 *      потому что внутренняя функция держит на него ссылку — это и есть замыкание;
 *   4) при вызове sayHi("Анна") движок ищет greeting сначала в своём окружении,
 *      не находит и идёт вверх по цепочке областей видимости -> находит "Привет".
 * Поэтому sayHi и sayHello работают независимо: каждый вызов createGreeting
 * создаёт СВОЁ окружение. Это же позволяет делать приватное состояние
 * (пример createCounter в коде: count недоступен снаружи, только через методы) —
 * механизм, на котором строятся модули, фабрики и React-хуки.
 *
 * ======================================================================== */

console.log('\n=== Лабораторная работа №3 завершена ===');
