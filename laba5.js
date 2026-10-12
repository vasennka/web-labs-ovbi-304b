/**
 * ============================================================================
 * ЛАБОРАТОРНАЯ РАБОТА №5
 * Тема: Объекты, функция-конструктор, прототипы и наследование.
 * Файл: laba5.js
 * Запуск: node laba5.js
 * ============================================================================
 *
 * КЛЮЧЕВЫЕ ИДЕИ:
 *   1) objectName.hasOwnProperty(key) — true, если свойство принадлежит САМОМУ
 *      объекту; false, если свойства нет или оно унаследовано от прототипа.
 *      (Современный аналог — статический метод Object.hasOwn(obj, key), ES2022.)
 *   2) Функция-конструктор + new: создаёт объект, кладёт его в this,
 *      связывает объект с Foo.prototype и возвращает this.
 *   3) Методы выгодно хранить НА ПРОТОТИПЕ: тогда все экземпляры используют
 *      одну и ту же функцию, а не собственные копии -> экономия памяти.
 *   4) Наследование: Child.prototype = Object.create(Parent.prototype),
 *      затем Child.prototype.constructor = Child (иначе ссылка «затрётся»).
 *   5) instanceof идёт вверх по цепочке прототипов; Object.getPrototypeOf(obj)
 *      возвращает то, на что указывает внутренний слот [[Prototype]].
 *
 * Как читается свойство: obj.x -> ищем в obj; не нашли -> идём в
 * Object.getPrototypeOf(obj); потом в его прототип ... до null.
 * Это и есть «цепочка прототипов».
 */

'use strict';

const line = (t) => console.log('\n=== ' + t + ' ===');

/* =========================================================================
 * ЗАДАНИЕ 1. Создание объектов и работа со свойствами
 * ========================================================================= */

line('Задание 1. Объект-литерал Book');

// Объект создаётся литералом { }: имя: значение через запятую
const book = {
    title: 'JavaScript: The Good Parts',
    author: 'Douglas Crockford',
    year: 2008,
    pages: 176,

    // Метод объекта. Внутри него this указывает на сам объект,
    // ВЫЗВАННЫЙ через точку: book.getInfo() -> this === book
    getInfo() {
        return `«${this.title}» — ${this.author}, ${this.year} г., ${this.pages} стр.`;
    }
};

console.log('book =', book);
console.log('book.getInfo() =', book.getInfo());

// --- Обращение к свойствам двумя способами ---------------------------------
console.log("\n-- доступ к свойствам --");
console.log('через точку:    book.title      =', book.title);
console.log('через скобки:   book["author"]  =', book['author']); // удобно для динамических имён
const dynamicKey = 'year';
console.log('динамический ключ book[dynamicKey] =', book[dynamicKey]);

// --- Добавление нового свойства ДИНАМИЧЕСКИ --------------------------------
console.log('\n-- добавление свойства --');
book.language = 'English';       // обычное свойство
book.isbn = '978-0596517748';    // ещё одно
book[Symbol('internal')] = 1;    // свойства-символы не видны в for...in и не мешают
console.log('после добавления: language =', book.language, '| isbn =', book.isbn);
console.log('Object.keys(book) =', Object.keys(book)); // списком: свой-ключи объекта (без унаследованных)

// --- Удаление свойства -----------------------------------------------------
console.log('\n-- удаление свойства --');
const deleted = delete book.isbn;
console.log('delete book.isbn ->', deleted, '| book.isbn теперь =', book.isbn); // true, undefined
console.log('Object.keys(book) =', Object.keys(book));

// --- Проверка наличия свойства: in и hasOwnProperty() ----------------------
console.log('\n-- проверка наличия свойства --');

// Оператор in проверяет объект И ВСЮ цепочку прототипов
console.log("'title' in book                       =", 'title' in book);        // true (своё)
console.log("'isbn' in book                        =", 'isbn' in book);         // false (удалён)
console.log("'toString' in book                    =", 'toString' in book);     // true — УНАСЛЕДОВАНО от Object.prototype!

// hasOwnProperty() проверяет ТОЛЬКО собственные свойства
console.log("book.hasOwnProperty('title')          =", book.hasOwnProperty('title'));      // true
console.log("book.hasOwnProperty('toString')       =", book.hasOwnProperty('toString'));   // false!
console.log("book.hasOwnProperty('isbn')           =", book.hasOwnProperty('isbn'));       // false

// Современный вариант (ES2022), устойчивый к объектам без прототипа:
console.log("Object.hasOwn(book, 'title')          =", Object.hasOwn(book, 'title'));      // true
console.log("Object.hasOwn(book, 'toString')       =", Object.hasOwn(book, 'toString'));   // false

/* ВЫВОД: in — «есть где угодно в цепочке», hasOwnProperty/Object.hasOwn —
 * «есть именно у меня». На защите это главный вопрос задания 1.
 * Дополнительно: book.toString существует, хотя мы его не писали — значит
 * все объекты наследуют Object.prototype. */

// --- Особый случай: объект с "нулевым" прототипом --------------------------
const nullProto = Object.create(null);
nullProto.x = 1;
console.log('\nобъект без прототипа: Object.getPrototypeOf(nullProto) =', Object.getPrototypeOf(nullProto));
console.log("  'toString' in nullProto =", 'toString' in nullProto); // false
try {
    nullProto.hasOwnProperty('x'); // метода нет — он же унаследован от Object.prototype
} catch (err) {
    console.log('  nullProto.hasOwnProperty ->', err.name + ':', err.message);
}
console.log('  но Object.hasOwn работает:', Object.hasOwn(nullProto, 'x')); // true

// --- Перебор свойств -------------------------------------------------------
console.log('\n-- перебор --');
for (const key in book) {
    // for...in перебирает и унаследованные перечисляемые свойства, поэтому фильтруем
    if (Object.hasOwn(book, key)) console.log(`  for...in (свой): ${key} =`, book[key]);
}
console.log('Object.entries(book) =', Object.entries(book));
// Глубокая «замороженная» копия:
const frozen = Object.freeze({ ...book });
try {
    'use strict';
    frozen.title = 'другое';
} catch (err) {
    console.log('Object.freeze -> попытка записи бросает:', err.name + ': ' + err.message);
}

/* =========================================================================
 * ЗАДАНИЕ 2. Функция-конструктор Student + методы на prototype
 * ========================================================================= */

line('Задание 2. Конструктор Student и методы на прототипе');

/**
 * Конструктор студента.
 * @param {string} name
 * @param {string} group
 * @param {number[]} grades — массив оценок
 * @constructor
 */
function Student(name, group, grades) {
    // ВАЖНО: свойства, уникальные для каждого студента, кладём в this
    this.name = name;
    this.group = group;
    // Копируем массив, чтобы внешние изменения не меняли состояние студента
    this.grades = [...grades];
}

/**
 * Средний балл. Метод живёт на Student.prototype, а НЕ в каждом объекте.
 * @returns {number}
 */
Student.prototype.getAverage = function () {
    if (this.grades.length === 0) return 0;
    const sum = this.grades.reduce((acc, g) => acc + g, 0);
    return Math.round((sum / this.grades.length) * 100) / 100;
};

/**
 * Сдал ли студент (средний балл >= 60).
 * @returns {boolean}
 */
Student.prototype.isPassed = function () {
    return this.getAverage() >= 60;
};

/** Дополнительный метод-хелпер: красивый вывод. */
Student.prototype.toString = function () {
    return `${this.name} (${this.group}): ${this.grades.join(', ')} | средний ${this.getAverage()} | ${this.isPassed() ? 'сдал' : 'должник'}`;
};

// --- Создание экземпляров через new ---------------------------------------
const s1 = new Student('Макар', 'ПИ-21', [85, 90, 78]);
const s2 = new Student('Денис', 'ПИ-21', [92, 88, 95]);
const s3 = new Student('Студент_X', 'ПИ-21', [45, 50, 40]);

console.log(String(s1));
console.log(String(s2));
console.log(String(s3));
console.log('s1.getAverage() =', s1.getAverage(), '| s1.isPassed() =', s1.isPassed());
console.log('s3.getAverage() =', s3.getAverage(), '| s3.isPassed() =', s3.isPassed());

// --- Доказательство, что методы НЕ дублируются ------------------------------
console.log('\n-- где живут методы --');
console.log('Object.getPrototypeOf(s1) === Student.prototype :', Object.getPrototypeOf(s1) === Student.prototype);
console.log('s1.getAverage === s2.getAverage                 :', s1.getAverage === s2.getAverage); // true!
console.log('s1.hasOwnProperty("name")                       :', s1.hasOwnProperty('name'));       // true — данные свои
console.log('s1.hasOwnProperty("getAverage")                 :', s1.hasOwnProperty('getAverage')); // false — метод унаследован
console.log('Object.keys(s1) =', Object.keys(s1)); // только name, group, grades — методы не перечисляются
console.log('Student.prototype =', Student.prototype);

/* ПОЧЕМУ ЭТО ВАЖНО (память):
 *   "метод в this"    -> 3 студента = 3 отдельных функции getAverage (3 копии кода);
 *   "метод в prototype" -> 1 функция на всех.
 * Экономим память; кроме того, метод можно добавить ВСЕМ существующим
 * объектам сразу — это и называется «монки-патчинг» прототипа. */

// Демонстрация: добавим метод ПОСЛЕ создания объектов — он появится у всех
Student.prototype.addGrade = function (grade) {
    this.grades.push(grade);
    return this.getAverage();
};
console.log('после Student.prototype.addGrade: s1.addGrade(100) ->', s1.addGrade(100));
console.log('обновившийся s1:', String(s1));

// --- Проверка instanceof ---------------------------------------------------
console.log('\n-- instanceof --');
console.log('s1 instanceof Student      :', s1 instanceof Student);        // true
console.log('s1 instanceof Object       :', s1 instanceof Object);         // true (цепочка выше)
console.log('Student.prototype instanceof Object :', Student.prototype instanceof Object); // true
console.log('typeof Student             :', typeof Student);              // "function"

// --- Что будет, если забыть new (частый вопрос на защите) -------------------
console.log('\n-- вызов конструктора БЕЗ new --');
function strictCtor(name) {
    'use strict';
    if (!new.target) throw new TypeError('Конструктор нужно вызывать с new');
    this.name = name;
}
try {
    strictCtor('тест без new');
} catch (err) {
    console.log('без new ->', err.name + ':', err.message);
}
console.log('new strictCtor("Макар").name =', new strictCtor('Макар').name); // ок
// new.target позволяет отличить вызов через new от обычного вызова:
function WithNewTarget() {
    console.log('  new.target определён?', new.target !== undefined, '->', new.target ? new.target.name : 'обычный вызов');
}
new WithNewTarget();
WithNewTarget();

/* =========================================================================
 * ЗАДАНИЕ 3. Цепочка прототипов и наследование
 * ========================================================================= */

line('Задание 3. Animal -> Dog (наследование через Object.create)');

/**
 * Родительский конструктор.
 * @constructor
 */
function Animal(name, sound) {
    this.name = name;
    this.sound = sound;
}

/** Метод на прототипе родителя. */
Animal.prototype.speak = function () {
    return `${this.name} издаёт звук: ${this.sound}`;
};

Animal.prototype.getKind = function () {
    return 'Animal';
};

/**
 * Дочерний конструктор.
 * @constructor
 */
function Dog(name) {
    // 1) ВЫЗЫВАЕМ конструктор родителя В КОНТЕКСТЕ нового объекта (this).
    //    Если этого не сделать, свойства name/sound не попадут в объект.
    Animal.call(this, name, 'Гав');

    // 2) Своё свойство
    this.tricks = [];
}

// 3) Наследуем прототип: Dog.prototype получает в [[Prototype]] Animal.prototype.
//    Object.create(Parent.prototype) создаёт НОВЫЙ объект — это важно, иначе
//    мы бы испортили Animal.prototype.
Dog.prototype = Object.create(Animal.prototype);

// 4) Восстанавливаем ссылку constructor — она «затёрлась» на шаге 3.
Dog.prototype.constructor = Dog;

// 5) Переопределяем (override) speak и вызываем родительскую версию через .call
Dog.prototype.speak = function () {
    // super-аналог: Animal.prototype.speak.call(this)
    return Animal.prototype.speak.call(this) + ' — точнее, громко ГАВ!';
};

// 6) Добавляем НОВЫЙ метод, которого у родителя нет
Dog.prototype.learn = function (trick) {
    this.tricks.push(trick);
    return `${this.name} выучил(а): ${trick}`;
};

Dog.prototype.getKind = function () {
    return 'Dog'; // полное переопределение без вызова родителя
};

// --- Проверка работы -------------------------------------------------------
const generic = new Animal('Кто-то', '…');
const rex = new Dog('Рекс');

console.log('generic.speak()      =', generic.speak());
console.log('rex.speak()          =', rex.speak());                 // переопределённый
console.log('rex.learn("сидеть")  =', rex.learn('сидеть'));
console.log('rex.learn("голос")   =', rex.learn('голос'));
console.log('rex.tricks           =', rex.tricks);
console.log('rex.name / rex.sound =', rex.name, '/', rex.sound);    // свойства родителя

console.log('\n-- цепочка прототипов --');
console.log('Object.getPrototypeOf(rex) === Dog.prototype                :', Object.getPrototypeOf(rex) === Dog.prototype);              // true
console.log('Object.getPrototypeOf(Dog.prototype) === Animal.prototype   :', Object.getPrototypeOf(Dog.prototype) === Animal.prototype); // true
console.log('Object.getPrototypeOf(Animal.prototype) === Object.prototype :', Object.getPrototypeOf(Animal.prototype) === Object.prototype); // true
console.log('Object.getPrototypeOf(Object.prototype)                     :', Object.getPrototypeOf(Object.prototype));                  // null — конец цепочки

// Наглядно: пройдём всю цепочку от rex до null
console.log('\nцепочка от rex вверх:');
let proto = Object.getPrototypeOf(rex);
let depth = 0;
while (proto !== null) {
    const label = proto === Dog.prototype ? 'Dog.prototype'
        : proto === Animal.prototype ? 'Animal.prototype'
            : proto === Object.prototype ? 'Object.prototype'
                : '(объект)';
    console.log(`  ${++depth}. ${label}`);
    proto = Object.getPrototypeOf(proto);
}
console.log(`  ${depth + 1}. null — цепочка закончилась`);

console.log('\n-- instanceof и поиск методов --');
console.log('rex instanceof Dog        :', rex instanceof Dog);        // true
console.log('rex instanceof Animal     :', rex instanceof Animal);     // true — цепочка!
console.log('rex instanceof Object     :', rex instanceof Object);     // true
console.log('generic instanceof Dog    :', generic instanceof Dog);    // false
console.log('rex.constructor === Dog   :', rex.constructor === Dog);   // true (шаг 4 сработал)
console.log('rex.hasOwnProperty("name")   :', rex.hasOwnProperty('name'));    // true
console.log('rex.hasOwnProperty("speak")  :', rex.hasOwnProperty('speak'));   // false — метод на прототипе
console.log('"speak" in rex               :', 'speak' in rex);                 // true — есть в цепочке
console.log('rex.getKind()             :', rex.getKind(), '(переопределён) | generic:', generic.getKind());

// --- Частая ошибка: забыли восстановить constructor ------------------------
function BrokenDog(name) {
    Animal.call(this, name, 'Гав');
}
BrokenDog.prototype = Object.create(Animal.prototype); // constructor НЕ восстановлен
console.log('\n-- ошибка новичка --');
console.log('new BrokenDog("Шарик").constructor === BrokenDog :', new BrokenDog('Шарик').constructor === BrokenDog); // false!
console.log('  ... потому что constructor унаследован от Animal.prototype =', new BrokenDog('Шарик').constructor.name);

// --- Сравнение с классами (см. лабораторную работу №6) ---------------------
line('Сравнение: тот же код на классах (ES6)');
class AnimalClass {
    constructor(name, sound) {
        this.name = name;
        this.sound = sound;
    }
    speak() {
        return `${this.name} издаёт звук: ${this.sound}`;
    }
}
class DogClass extends AnimalClass {
    constructor(name) {
        super(name, 'Гав');
    }
    speak() {
        return super.speak() + ' — точнее, громко ГАВ!';
    }
}
const classDog = new DogClass('Рекс');
console.log('classDog.speak() =', classDog.speak());
console.log('DogClass.prototype === объект с constructor :', DogClass.prototype.constructor === DogClass);
console.log('getPrototypeOf(DogClass.prototype) === AnimalClass.prototype :', Object.getPrototypeOf(DogClass.prototype) === AnimalClass.prototype);
console.log('classDog instanceof AnimalClass :', classDog instanceof AnimalClass);
/* ВЫВОД: класс — это «синтаксический сахар» над прототипами. Результат тот же,
 * но кода меньше и он безопаснее: super(), автоматический constructor,
 * вызов без new запрещён, тело всегда в строгом режиме. */

/* ============================================================================
 * ИТОГИ / ОТВЕТЫ ДЛЯ УСТНОЙ ЗАЩИТЫ
 * ============================================================================
 *
 * 1) Чем in отличается от hasOwnProperty()?
 *    in ищет свойство во ВСЕЙ цепочке прототипов, hasOwnProperty — только в самом
 *    объекте. Пример: 'toString' in book -> true, book.hasOwnProperty('toString')
 *    -> false. Сегодня вместо hasOwnProperty удобнее Object.hasOwn(obj, key):
 *    он работает и для объектов, созданных через Object.create(null).
 *
 * 2) Почему методы выгодно писать через prototype?
 *    Функция создаётся один раз для всех экземпляров. Если писать this.method =
 *    function () {} в конструкторе, каждая копия объекта получит собственную
 *    функцию (лишний расход памяти и невозможность единой точки изменения).
 *
 * 3) Зачем Object.create(Parent.prototype) при наследовании?
 *    Он создаёт новый объект-прототип, чей [[Prototype]] равен прототипу
 *    родителя, и НЕ копирует свойства родителя в дочерний прототип. Писать
 *    Child.prototype = Parent.prototype нельзя — тогда дочерние методы попадут
 *    и в родителя («загрязнение» прототипа).
 *
 * 4) Зачем восстанавливать Child.prototype.constructor?
 *    Строка Child.prototype = Object.create(...) полностью заменяет объект
 *    прототипа, и свойство constructor (которое было своим у Child.prototype)
 *    теряется — начинает работать унаследованный конструктор родителя.
 *    Это ломает код, который делает obj.constructor === Child.
 *
 * 5) Что проверяет instanceof?
 *    Проходит по цепочке прототипов объекта и проверяет, встречается ли там
 *    Constructor.prototype. Поэтому rex instanceof Animal === true.
 *    Object.getPrototypeOf(obj) возвращает один конкретный шаг цепочки.
 * ======================================================================== */

console.log('\n=== Лабораторная работа №5 завершена ===');
