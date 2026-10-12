/**
 * ============================================================================
 * ЛАБОРАТОРНАЯ РАБОТА №6
 * Тема: Классы и наследование (class ... extends), исключения, короткое
 *       вычисление логических операторов.
 * Файл: laba6.js
 * Запуск: node laba6.js
 * ============================================================================
 *
 * КЛЮЧЕВЫЕ ИДЕИ:
 *   - class — синтаксическая надстройка над прототипами (см. лабораторную №5):
 *     методы всё так же лежат на prototype, но запись короче и безопаснее;
 *   - static — член класса, принадлежащий самому классу, а не экземпляру;
 *   - #private — приватное поле/метод: доступно только внутри тела класса,
 *     снаружи obj.#field — SyntaxError;
 *   - геттеры/сеттеры (get/set) выглядят как свойства, а внутри — функции;
 *   - свои типы ошибок: class MyError extends Error, поле cause — исходная причина;
 *   - && / || / ?? возвращают ЗНАЧЕНИЕ одного из операндов и вычисляются
 *     «коротко»: правый операнд может вообще не выполниться.
 */

'use strict';

const line = (t) => console.log('\n=== ' + t + ' ===');

/* =========================================================================
 * ЗАДАНИЕ 1. Класс BankAccount: приватные поля, геттеры, static
 * ========================================================================= */

class BankAccount {
    // Статическое поле: одно на весь класс (общее для всех экземпляров)
    static count = 0;

    // Приватное поле: доступно ТОЛЬКО внутри класса
    #balance = 0;

    /**
     * @param {string} owner — владелец счёта
     * @param {number} initialBalance — начальный баланс
     */
    constructor(owner, initialBalance = 0) {
        this.owner = owner;                 // публичное поле
        this.#balance = initialBalance;     // приватное поле
        BankAccount.count += 1;             // считаем созданные счета
    }

    // ГЕТТЕР без сеттера => свойство «только для чтения» снаружи
    get balance() {
        return this.#balance;
    }

    deposit(amount) {
        if (typeof amount !== 'number' || Number.isNaN(amount) || amount <= 0) {
            throw new InvalidAmountError(amount, 'Сумма пополнения должна быть положительным числом');
        }
        this.#balance += amount;
        return this.#balance;
    }

    withdraw(amount) {
        if (typeof amount !== 'number' || Number.isNaN(amount) || amount <= 0) {
            throw new InvalidAmountError(amount, 'Сумма снятия должна быть положительным числом');
        }
        if (amount > this.#balance) {
            throw new InsufficientFundsError(amount, this.#balance);
        }
        this.#balance -= amount;
        return this.#balance;
    }

    // Статический метод: сравнивает два счёта по балансу
    static compare(a, b) {
        if (!(a instanceof BankAccount) || !(b instanceof BankAccount)) {
            throw new TypeError('compare ожидает два экземпляра BankAccount');
        }
        return a.balance - b.balance; // <0: a беднее, 0: равны, >0: a богаче
    }

    /** Служебный «дружественный» метод: показать, что приватное поле видно внутри класса. */
    describe() {
        return `${this.owner}: ${this.#balance} ₽`;
    }

    /**
     * Проверка наличия ПРИВАТНОГО поля у произвольного объекта.
     * Выражение #balance in obj допустимо только внутри класса, где #balance объявлено.
     */
    static hasPrivateBalance(obj) {
        return #balance in obj;
    }

    toString() {
        return `BankAccount(${this.owner}, ${this.#balance})`;
    }
}

/* =========================================================================
 * ЗАДАНИЕ 2. Иерархия собственных ошибок
 * BankError extends Error
 *   ├── InsufficientFundsError (requested, available)
 *   └── InvalidAmountError
 * ========================================================================= */

class BankError extends Error {
    constructor(message, options) {
        super(message, options);   // options = { cause: исходнаяОшибка }
        this.name = 'BankError';   // иначе err.name будет "Error"
    }
}

class InsufficientFundsError extends BankError {
    /**
     * @param {number} requested — сколько хотели снять
     * @param {number} available — сколько есть
     */
    constructor(requested, available) {
        super(`Недостаточно средств: запрошено ${requested} ₽, доступно ${available} ₽`);
        this.name = 'InsufficientFundsError';
        this.requested = requested;
        this.available = available;
    }
}

class InvalidAmountError extends BankError {
    constructor(amount, reason = 'Некорректная сумма') {
        super(`${reason}: ${JSON.stringify(amount)}`);
        this.name = 'InvalidAmountError';
        this.amount = amount;
    }
}

/* =========================================================================
 * ЗАДАНИЕ 1 (продолжение). SavingsAccount extends BankAccount
 * ========================================================================= */

class SavingsAccount extends BankAccount {
    #rate = 5;        // процентная ставка (приватное поле)
    withdrawalLimit;  // публичное поле: максимум за одно снятие

    /**
     * @param {string} owner
     * @param {number} initialBalance
     * @param {number} rate — ставка в процентах (0..100)
     * @param {number} limit — лимит одного снятия
     */
    constructor(owner, initialBalance = 0, rate = 5, limit = 10000) {
        super(owner, initialBalance); // ВСЕГДА первая строка: до обращения к this
        this.rate = rate;             // сеттер (см. ниже) проверит диапазон
        this.withdrawalLimit = limit;
    }

    get rate() {
        return this.#rate;
    }

    set rate(value) {
        if (typeof value !== 'number' || Number.isNaN(value)) {
            throw new InvalidAmountError(value, 'Ставка должна быть числом');
        }
        if (value < 0 || value > 100) {
            throw new RangeError(`Ставка должна быть в диапазоне 0..100, получено ${value}`);
        }
        this.#rate = value;
    }

    /** Начисление процентов: balance += balance * rate / 100 */
    addInterest() {
        const interest = Math.round((this.balance * this.#rate) / 100 * 100) / 100;
        this.deposit(interest);
        return interest;
    }

    /** Переопределение с лимитом на одну операцию и вызовом родителя через super */
    withdraw(amount) {
        if (amount > this.withdrawalLimit) {
            throw new BankError(
                `Превышен лимит снятия за одну операцию: ${amount} ₽ > ${this.withdrawalLimit} ₽`
            );
        }
        // Своя логика + вызов родительской версии метода
        return super.withdraw(amount);
    }

    toString() {
        return `SavingsAccount(${this.owner}, ${this.balance}, ставка ${this.#rate}%, лимит ${this.withdrawalLimit})`;
    }
}

line('Задание 1. Классы, геттеры/сеттеры, static, приватные поля');

const acc1 = new BankAccount('Макар', 1000);
const acc2 = new BankAccount('Денис', 500);

console.log('acc1 =', String(acc1), '| acc2 =', String(acc2));
console.log('acc1.balance (геттер) =', acc1.balance);
console.log('BankAccount.count (static) =', BankAccount.count);   // 2

console.log('\n-- операции --');
console.log('acc1.deposit(500)  ->', acc1.deposit(500));    // 1500
console.log('acc2.withdraw(200) ->', acc2.withdraw(200));   // 300
console.log('acc1 =', String(acc1));

console.log('\n-- статический метод compare --');
console.log('BankAccount.compare(acc1, acc2) =', BankAccount.compare(acc1, acc2)); // >0: acc1 богаче
console.log('BankAccount.compare(acc2, acc1) =', BankAccount.compare(acc2, acc1)); // <0
const sorted = [acc1, acc2].sort(BankAccount.compare);
console.log('сортировка счетов по балансу:', sorted.map(String));

console.log('\n-- SavingsAccount --');
const savings = new SavingsAccount('Анна', 10000, 10, 3000);
console.log('savings =', String(savings));
console.log('savings.rate (геттер) =', savings.rate);
savings.rate = 15;                            // сеттер
console.log('после savings.rate = 15:', savings.rate);
console.log('savings.addInterest() начислил =', savings.addInterest()); // 15% от 10000 = 1500
console.log('баланс после процентов =', savings.balance);               // 11500
try {
    savings.rate = 200;                       // вне диапазона -> бросает
} catch (err) {
    console.log('savings.rate = 200 ->', err.name + ':', err.message);
}
try {
    savings.withdraw(5000);                   // больше лимита -> бросает
} catch (err) {
    console.log('savings.withdraw(5000) ->', err.name + ':', err.message);
}
console.log('savings.withdraw(3000) через super.withdraw ->', savings.withdraw(3000)); // 8500

console.log('\n-- проверки из задания --');
console.log('acc1 instanceof BankAccount          :', acc1 instanceof BankAccount);      // true
console.log('savings instanceof SavingsAccount    :', savings instanceof SavingsAccount); // true
console.log('savings instanceof BankAccount       :', savings instanceof BankAccount);    // true (наследование)
console.log('acc1 instanceof SavingsAccount       :', acc1 instanceof SavingsAccount);    // false
console.log('Object.getPrototypeOf(SavingsAccount.prototype) === BankAccount.prototype :',
    Object.getPrototypeOf(SavingsAccount.prototype) === BankAccount.prototype);          // true
console.log('Object.getPrototypeOf(savings) === SavingsAccount.prototype :',
    Object.getPrototypeOf(savings) === SavingsAccount.prototype);                        // true
console.log('typeof BankAccount (=="function" — класс это функция) :', typeof BankAccount);
console.log('SavingsAccount.prototype.constructor === SavingsAccount :', SavingsAccount.prototype.constructor === SavingsAccount);

console.log('\n-- приватное поле недоступно снаружи --');
console.log('acc1.#balance напрямую — синтаксическая ошибка, поэтому проверяем так:');
console.log('  список публичных ключей acc1:', Object.keys(acc1));      // #balance не виден
console.log('  JSON.stringify(acc1) =', JSON.stringify(acc1));          // приватное поле не сериализуется
console.log('  "balance" in acc1 =', 'balance' in acc1, '(в прототипе — геттер)');
console.log('  доступ только через геттер: acc1.balance =', acc1.balance);
console.log('  сеттера у balance нет, поэтому запись снаружи не проходит:');
try {
    acc1.balance = 999999;                    // в строгом режиме -> TypeError
} catch (err) {
    console.log('    acc1.balance = 999999 ->', err.name + ':', err.message);
}

console.log('\n-- вызов класса без new --');
try {
    BankAccount('Кто-то');                     // класс нельзя вызвать без new
} catch (err) {
    console.log('BankAccount("Кто-то") ->', err.name + ':', err.message);
}

console.log('\n-- приватное поле ЕСТЬ, но недоступно снаружи: проверка через "#field in obj" --');
/* ВАЖНО: выражение #balance in obj разрешено ТОЛЬКО внутри класса, который
 * объявил приватное поле. Поэтому для подкласса или внешнего кода такое
 * выражение — SyntaxError («Private field must be declared in an enclosing class»).
 * Мы добавили в BankAccount статический метод hasPrivateBalance — он имеет
 * право на такую проверку. */
console.log('BankAccount.hasPrivateBalance(acc1)     =', BankAccount.hasPrivateBalance(acc1));     // true
console.log('BankAccount.hasPrivateBalance({})       =', BankAccount.hasPrivateBalance({}));       // false
console.log('BankAccount.hasPrivateBalance(savings)  =', BankAccount.hasPrivateBalance(savings)); // true (унаследовано)
try {
    // Проверка того же приватного поля «снаружи класса» невозможна на уровне синтаксиса:
    // eslint-disable-next-line no-undef
    eval('acc1.#balance');
} catch (err) {
    console.log('eval("acc1.#balance") ->', err.name + ':', err.message);
}

/* СРАВНЕНИЕ С ЗАДАНИЕМ 3 ЛАБОРАТОРНОЙ РАБОТЫ №5 (прототипная запись Animal/Dog):
 *   | Критерий                   | Прототипы (лаба №5)                     | Классы (лаба №6)                    |
 *   |----------------------------|----------------------------------------|-------------------------------------|
 *   | Строк кода на наследника   | ~25                                    | ~10                                 |
 *   | Вызов родительского ctor   | Animal.call(this, ...)                 | super(...)                          |
 *   | Вызов родительского метода | Animal.prototype.speak.call(this)      | super.speak()                       |
 *   | Восстановление constructor | вручную                                | автоматически                      |
 *   | Приватные поля             | нет (только соглашение _field)         | есть (#balance)                     |
 *   | Вызов без new              | молча ломается (this = undefined/global)| TypeError сразу                    |
 *   | Строгий режим              | нужно включать 'use strict'            | всегда                             |
 *   | Читаемость для новичка     | хуже                                   | лучше                               |
 * Итог: классы не «другой язык», а более безопасная запись того же прототипного
 * механизма. Мы выбираем классы — меньше шансов на ошибку (забытый constructor,
 * утечка this), из коробки приватность и super(). */

/* =========================================================================
 * ЗАДАНИЕ 2. Перевод денег с обработкой ошибок
 * ========================================================================= */

line('Задание 2. transfer() с try / catch / finally и разбором instanceof');

/**
 * Перевод денег между счетами.
 * @param {BankAccount} from
 * @param {BankAccount} to
 * @param {number} amount
 * @returns {string} человекочитаемый результат
 */
function transfer(from, to, amount) {
    console.log(`  попытка перевода ${amount} ₽ от ${from.owner} к ${to.owner}`);
    try {
        if (!(from instanceof BankAccount) || !(to instanceof BankAccount)) {
            throw new TypeError('Оба аргумента должны быть банковскими счетами');
        }

        from.withdraw(amount); // может выбросить InsufficientFundsError / InvalidAmountError / BankError
        to.deposit(amount);

        return `  ✔ перевод выполнен: ${from.owner} -> ${to.owner}, ${amount} ₽`;
    } catch (err) {
        // Различаем типы ошибок через instanceof и даём понятное пользователю сообщение
        if (err instanceof InsufficientFundsError) {
            return `  ✘ не хватает денег: нужно ${err.requested} ₽, а на счету ${err.available} ₽`;
        }
        if (err instanceof InvalidAmountError) {
            return `  ✘ некорректная сумма: ${err.message}`;
        }
        if (err instanceof BankError) {
            return `  ✘ банковская операция отклонена: ${err.message}`;
        }
        // НЕЗНАКОМУЮ ошибку нельзя «глотать» — её нужно пробросить дальше,
        // иначе баг потеряется и логи будут врать
        if (err instanceof TypeError) {
            return `  ✘ ошибка вызова: ${err.message}`;
        }
        throw err;
    } finally {
        // Выполняется ВСЕГДА: и после успеха, и после catch, и даже после return!
        console.log('  [finally] Операция перевода завершена');
    }
}

const a = new BankAccount('Макар', 1000);
const b = new BankAccount('Денис', 500);
const s = new SavingsAccount('Анна', 20000, 10, 5000);

console.log(transfer(a, b, 300));      // успех
console.log(transfer(a, b, 10_000));   // не хватает денег
console.log(transfer(a, b, -50));      // некорректная сумма
console.log(transfer(a, b, 'много'));  // тоже некорректная сумма (валидация в withdraw)
console.log(transfer(s, a, 9000));     // превышен лимит снятия (BankError)
console.log(transfer({}, b, 10));      // TypeError -> не банковский счёт
console.log('Итоговые балансы:', a.describe(), '|', b.describe());

/* =========================================================================
 * ЗАДАНИЕ 2 (продолжение). loadAccount(json) и Error.cause
 * ========================================================================= */

/**
 * Разбирает JSON с данными счёта и создаёт объект.
 * @param {string} json
 * @returns {BankAccount}
 */
function loadAccount(json) {
    let data;
    try {
        data = JSON.parse(json);                  // может бросить SyntaxError
    } catch (err) {
        // Заворачиваем в свой тип ошибки и сохраняем первопричину в cause
        throw new BankError('Не удалось прочитать данные счёта', { cause: err });
    }

    if (typeof data !== 'object' || data === null) {
        throw new BankError('В JSON должно быть описано, а не ' + typeof data);
    }
    if (!data.owner) {
        throw new BankError('В данных счёта не указан владелец', { cause: { field: 'owner', got: data.owner } });
    }
    if (typeof data.balance !== 'number' || data.balance < 0) {
        throw new InvalidAmountError(data.balance, 'Баланс должен быть неотрицательным числом');
    }

    return data.type === 'savings'
        ? new SavingsAccount(data.owner, data.balance, data.rate ?? 5, data.limit ?? 10000)
        : new BankAccount(data.owner, data.balance);
}

line('Задание 2 (продолжение). loadAccount() и error.cause');

const goodJson = '{"owner":"Даша","balance":750,"type":"savings","rate":12}';
console.log('успешный разбор:', String(loadAccount(goodJson)));

try {
    loadAccount('{ это не json }');
} catch (err) {
    console.log('\nошибка:', err.name + ':', err.message);
    console.log('  err instanceof BankError :', err instanceof BankError);
    console.log('  err instanceof Error     :', err instanceof Error);
    console.log('  причина (err.cause)      :', err.cause.name + ':', err.cause.message);
    console.log('  стек виден в err.stack   :', err.stack.split('\n')[1].trim());
}

for (const bad of ['{"balance": 100}', '{"owner": "X", "balance": -5}', '"строка"']) {
    try {
        loadAccount(bad);
    } catch (err) {
        console.log(`\nвход ${bad} ->`, err.name + ':', err.message);
        if (err.cause) console.log('  cause =', JSON.stringify(err.cause));
    }
}

/* ВАЖНО ПРО БЕЗОПАСНОСТЬ ТЕСТОВ:
 * try { ... } catch (err) { console.log('что-то пошло не так') } — «глушение»
 * ошибки. Так делать нельзя: неизвестные ошибки нужно пробрасывать (throw err),
 * иначе реальный баг превратится в тихую неправильную работу. */

/* =========================================================================
 * ЗАДАНИЕ 3а. Короткое вычисление логических операторов
 * ========================================================================= */

line('Задание 3а. Предсказание вывода (сначала предсказание, потом прогон)');

/* ---------------- ПРЕДСКАЗАНИЕ (до запуска) ----------------
 * account.balance стартует со 100.
 *
 * 1) r1 = canWithdraw(account, 50) && withdraw(account, 50)
 *    canWithdraw -> 100 >= 50 -> true, значит правый операнд ВЫЧИСЛЯЕТСЯ:
 *    withdraw -> balance = 50, возвращает 50. Результат && — последнее
 *    вычисленное значение, то есть 50. r1 = 50.
 *    if (!r1) -> !50 === false -> сообщение НЕ печатается.
 *
 * 2) r2 = canWithdraw(account, 50) && withdraw(account, 50)
 *    canWithdraw -> 50 >= 50 -> true -> withdraw: balance = 0, возвращает 0.
 *    r2 = 0 (ложное значение, хотя снятие УДАЛОСЬ!).
 *    if (!r2) -> !0 === true -> печатается "Второе снятие не удалось" (ложная тревога).
 *
 * 3) r3 = canWithdraw(account, 50) && withdraw(account, 50)
 *    canWithdraw -> 0 >= 50 -> false -> короткое вычисление: withdraw НЕ вызывается.
 *    r3 = false. balance остаётся 0.
 *    if (!r3) -> печатается "Третье снятие не удалось".
 *
 * 4) log("Запись в журнал") || log("Резервная запись в журнал")
 *    log() ничего не возвращает -> undefined (ложь) -> вычисляется ПРАВЫЙ операнд,
 *    значит печатаются ОБЕ строки, а logCount увеличивается на 2.
 *    (Это классический баг: автор думал, что || — «резервный вариант на случай
 *     ошибки», но || проверяет не ошибку, а ЛОЖНОСТЬ результата.)
 *
 * 5) bonus = account.balance || withdraw(account, -10)
 *    account.balance === 0 -> ложь -> выполняется withdraw(account, -10):
 *    balance -= -10, то есть balance = 10 (минус на минус даёт плюс!),
 *    withdraw возвращает 10. bonus = 10.
 *    Если бы баланс был 100 (истина), withdraw не вызвался бы, а bonus был бы 100.
 *
 * 6) Итоговый console.log: 10 4 50 0 false 10
 *    (balance, logCount, r1, r2, r3, bonus)
 *
 * Ожидаемый вывод целиком:
 *   Второе снятие не удалось
 *   Третье снятие не удалось
 *   Запись в журнал
 *   Резервная запись в журнал
 *   10 4 50 0 false 10
 * ------------------------------------------------------------ */

console.log('\n--- фактический запуск кода из задания ---');

let logCount = 0;
const account = { balance: 100 };

function log(message) {
    logCount++;
    console.log(message);
}

function canWithdraw(acc, amount) {
    return acc.balance >= amount;
}

function withdraw(acc, amount) {
    acc.balance -= amount;
    return acc.balance;
}

const r1 = canWithdraw(account, 50) && withdraw(account, 50);
if (!r1) log('Первое снятие не удалось');

const r2 = canWithdraw(account, 50) && withdraw(account, 50);
if (!r2) log('Второе снятие не удалось');

const r3 = canWithdraw(account, 50) && withdraw(account, 50);
if (!r3) log('Третье снятие не удалось');

log('Запись в журнал') || log('Резервная запись в журнал');

const bonus = account.balance || withdraw(account, -10);

console.log(account.balance, logCount, r1, r2, r3, bonus);

console.log('\n-- разбор расхождений с «наивным» ожиданием --');
console.log('1) r1 =', r1, '— это НЕ true, а 50: && и || возвращают ЗНАЧЕНИЕ операнда.');
console.log('2) r2 =', r2, '— снятие прошло успешно, но вернулся 0, и проверка !r2 дала ложную тревогу.');
console.log('3) r3 =', r3, '— тут withdraw действительно НЕ вызывался (короткое вычисление).');
console.log('4) logCount =', logCount, '— «резервная» запись выполнилась не вместо, а ВМЕСТЕ с основной.');
console.log('5) bonus =', bonus, '— withdraw(account, -10) не только вызвался, но и УВЕЛИЧИЛ баланс.');
console.log('6) баланс =', account.balance, 'вместо ожидаемых 0: минус на минус.');

/* =========================================================================
 * ЗАДАНИЕ 3б. Свои примеры неочевидного поведения
 * ========================================================================= */

line('Задание 3б. Собственные примеры: нечистые функции + && / ||');

let emailSentCount = 0;
let defaultBonusApplied = 0;
let errorScreenShown = 0;

function sendReport(items) {
    emailSentCount++;
    return `отчёт по ${items.length} позициям отправлен`;   // ВСЕГДА истинная строка!
}

function applyDefaultBonus(user) {
    defaultBonusApplied++;
    user.bonus = 100;                 // мутирует объект — побочный эффект
    return user.bonus;                // 100 — истинное значение, но см. пример №2
}

function showError() {
    errorScreenShown++;
    return true;                      // «я показал ошибку» — ИСТИНА
}

function saveForm() {
    return false;                     // сохранение не удалось
}

console.log('\nПРИМЕР 1: функция НЕ вызывается, когда это ожидалось');
const emptyItems = [];
const reportResult = emptyItems.length && sendReport(emptyItems);
console.log('  код:            const r = items.length && sendReport(items)  // items = []');
console.log('  ожидание автора: отчёт отправится (пусть и пустой)');
console.log('  факт:            r =', reportResult, '| писем отправлено:', emailSentCount, '— sendReport НЕ вызвался');
console.log('  причина:         items.length === 0 -> ложь -> короткое вычисление &&');
console.log('  Исправление (явная проверка):');
if (emptyItems.length >= 0) {                      // проверяем УСЛОВИЕ, а не значение
    sendReport(emptyItems);
}
console.log('  после исправления писем отправлено:', emailSentCount);

console.log('\nПРИМЕР 2: функция вызывается, когда НЕ ожидалось');
const userWithZeroBonus = { name: 'Денис', bonus: 0 };   // 0 — легитимное значение!
const totalBonus = userWithZeroBonus.bonus || applyDefaultBonus(userWithZeroBonus);
console.log('  код:            const total = user.bonus || applyDefaultBonus(user)  // bonus = 0');
console.log('  ожидание автора: у Дениса есть свой бонус (0), дефолт не применяется');
console.log('  факт:            total =', totalBonus, '| дефолт применён раз:', defaultBonusApplied, '| bonus стал', userWithZeroBonus.bonus);
console.log('  причина:         0 — ложное значение, поэтому || «подставил» правый операнд');
console.log('  Исправление (явная проверка на undefined/null):');
const user2 = { name: 'Анна', bonus: 0 };
const totalBonus2 = user2.bonus !== undefined && user2.bonus !== null
    ? user2.bonus
    : applyDefaultBonus(user2);
console.log('  totalBonus2 =', totalBonus2, '(для Анны дефолт не применился)');
// Современный короткий эквивалент — оператор ?? (проверяет ТОЛЬКО null/undefined):
const user3 = { name: 'Даша', bonus: 0 };
console.log('  через ??         :', user3.bonus ?? 'дефолт', '— 0 сохранился');

console.log('\nПРИМЕР 3: результат выражения — не то значение, которое ожидал автор');
const saved = saveForm() || showError();
console.log('  код:            const ok = saveForm() || showError()');
console.log('  ожидание автора: ok === true только если форма сохранилась');
console.log('  факт:            ok =', saved, '| ошибка показана раз:', errorScreenShown);
console.log('  причина:        saveForm() вернул false, а showError() вернул true -> ok = true,');
console.log('                  и следующий код считает, что сохранение прошло успешно.');
console.log('  Исправление (разделяем проверку и действие, возвращаем явный boolean):');
let ok2;
if (saveForm()) {
    ok2 = true;
} else {
    showError();
    ok2 = false;
}
console.log('  ok2 =', ok2, '— теперь честно');

/* ОБЩЕЕ ПРАВИЛО ИЗ ЭТИХ ПРИМЕРОВ:
 *   1) используйте && / || для значений, а не для «проверки успеха»;
 *   2) если функция-условие и функция-действие имеют побочные эффекты,
 *      разносите их по строкам (if / else) — так видно, что и когда выполнится;
 *   3) проверяйте на null/undefined оператором ??, а не ||, если 0, '' или false
 *      являются допустимыми значениями;
 *   4) функции-предикаты должны возвращать именно boolean
 *      (return acc.balance >= amount, а не любое значение). */

/* ============================================================================
 * КОНТРОЛЬНЫЕ ВЫВОДЫ ДЛЯ ЗАЩИТЫ
 * ============================================================================
 *  - Класс нельзя вызвать без new (TypeError), код тела класса всегда строгий.
 *  - Методы классов лежат на prototype и НЕ перечисляются в for...in.
 *  - #приватные поля недоступны снаружи; проверить наличие можно только
 *    внутри класса выражением #field in obj.
 *  - Переопределённый метод вызывает родительский через super.method().
 *  - finally выполняется всегда и полезен для «завершения операции».
 *  - Незнакомые ошибки нужно пробрасывать (throw err), а не «глотать».
 *  - && / || / ?? возвращают значение операнда и могут НЕ выполнить правую часть.
 * ======================================================================== */

console.log('\n=== Лабораторная работа №6 завершена ===');
