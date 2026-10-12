# Доклад №7. Статические анализаторы и утилиты контроля архитектурной целостности

**Что разбирается:** чем статический анализ отличается от тестов, какие классы проверок
бывают, какие инструменты использовать в JS/Node/React и как автоматически следить за тем,
чтобы архитектура проекта не «поехала».

---

## 1. Зачем нужен статический анализ

Тест проверяет **поведение**: «функция вернула 900». Статический анализатор проверяет **код,
не запуская его**: «здесь переменная не используется», «здесь возможен `null`», «модуль
`domain` импортирует `express` — это нарушение слоя».

Компромисс: анализатор не знает смысла, поэтому он ошибается (false positives), зато:

* находит ошибки **до запуска**, на этапе сохранения файла;
* работает быстро и одинаково на любой машине;
* умеет проверять то, что тестами проверить нельзя — **структуру зависимостей**.

Три уровня «жёсткости» от дешёвого к дорогому:

```
1) форматирование/стиль          (нужен ли спор о пробелах вообще)
2) поиск ошибок и мёртвого кода  (ESLint, TS-компилятор)
3) контроль архитектуры          (границы слоёв, правила импортов, метрики сложности)
```

## 2. Класс 1: линтеры и форматтеры

**Prettier** — форматирование без обсуждений: «одна кнопка — единый стиль».

```json
{
  "semi": true,
  "singleQuote": true,
  "printWidth": 110,
  "tabWidth": 4
}
```

**ESLint** — правила качества и потенциальных ошибок. Смысловые правила, которые реально
ловят баги, а не стиль:

```json
{
  "extends": ["eslint:recommended"],
  "rules": {
    "no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "no-undef": "error",
    "eqeqeq": ["error", "smart"],
    "no-implicit-coercion": "warn",
    "consistent-return": "error",
    "no-return-await": "error",
    "require-atomic-updates": "error",
    "no-promise-executor-return": "error",
    "no-async-promise-executor": "error"
  }
}
```

Пример реальной пользы: `no-async-promise-executor` ловит классику «`new Promise(async (resolve) => ...)`»,
где исключение внутри `async`-функции не попадает в `reject` и приводит к «зависшему» промису.

**Интеграция с редактором и pre-commit.** Автоформат при сохранении + проверка только
изменённых файлов перед коммитом:

```bash
npm i -D husky lint-staged
npx husky init
echo "npx lint-staged" > .husky/pre-commit
```

```json
{
  "lint-staged": {
    "*.js": ["eslint --fix", "prettier --write"],
    "*.css": ["prettier --write"]
  }
}
```

## 3. Класс 2: типы против `null` (JS + JSDoc или TypeScript)

JS не проверяет типы во время выполнения. Два способа получить проверку на этапе сборки:

* **TypeScript** — полная статическая типизация;
* **JS + JSDoc + `checkJs`** — тот же анализатор, но без переписывания кода на TS:

```js
// @ts-check
/**
 * @param {number} price
 * @param {number} [discount=0]
 * @returns {number}
 */
function calculateDiscountedPrice(price, discount = 0) { return price - price * discount / 100; }

calculateDiscountedPrice('1000');   // tsc (allowJs+checkJs) подсветит ошибку типа аргумента
```

Дополнительно: `strictNullChecks` (в TS) ловит `cannot read property of undefined` —
одну из самых частых ошибок в JS. В нашем стиле кода активно используются значения
по умолчанию и проверки, потому что без типов такие места — главный источник падений.

## 4. Класс 3: безопасность и качество кода

| Инструмент | Что ищет |
|---|---|
| `npm audit` / `better-npm-audit` | известные CVE в зависимостях |
| `eslint-plugin-security` | `eval`, `child_process` с вводом, опасные регулярки (ReDoS) |
| `eslint-plugin-no-unsanitized` | присваивание в `innerHTML`, `document.write` |
| Semgrep | шаблоны уязвимостей (в т.ч. свои правила для команды) |
| Snyk / SonarQube | комплексно: зависимости + код + «запахи» |

Пример правила, которое стоит включить в веб-проекте:

```js
// eslint-plugin-no-unsanitized ловит это на этапе коммита
node.innerHTML = comment;          // ← ошибка линтера: XSS-опасный sink
node.textContent = comment;        // ← так безопасно
```

## 5. Класс 4: сложность и «запахи»

Метрики, которые автоматически показывают код, который скоро станет неподдерживаемым:

| Метрика | Смысл | Порог для тревоги |
|---|---|---|
| Cyclomatic complexity | число независимых путей в функции | > 10 — тяжело тестировать |
| Cognitive complexity | сложность понимания (вложенность + прерывания) | > 15 |
| Функция, строк | длина | > 60 строк |
| Файл, строк | длина | > 500 строк |
| Параметры функции | длина сигнатуры | > 4 (намекает на объект-параметр) |
| Глубина вложенности | вложенные `if`/циклы | > 3 |

```bash
npm i -D eslint-plugin-sonarjs
# в конфиге: "extends": ["plugin:sonarjs/recommended"]
# правила: sonarjs/cognitive-complexity, sonarjs/no-duplicate-string, sonarjs/no-identical-functions
```

Польза: метрика сложности — сигнал «сюда нужно добавить тест прямо сейчас»; на сложный код
тестов приходится в разы больше, а вероятность регрессии максимальна.

## 6. Класс 5 (самое интересное): контроль архитектурной целостности

Правило зависимостей в чистой/луковой архитектуре («все стрелки внутрь») можно проверить
**автоматически**, а не на code review.

### 6.1. Готовые инструменты

**dependency-cruiser** — самый удобный в JS-экосистеме: строит граф зависимостей
и умеет валидировать свои правила.

```bash
npm i -D dependency-cruiser
npx depcruise --init
npx depcruise --config .dependency-cruiser.js src
```

```js
// .dependency-cruiser.js (фрагмент: правила для наших слоёв)
module.exports = {
    forbidden: [
        {
            name: 'domain-not-knows-anything',
            comment: 'Ядро (domain) не должно импортировать application, infrastructure, presentation и внешние модули',
            severity: 'error',
            from: { path: '^src/domain' },
            to: { pathNot: '^(node_modules|src/domain)' }
        },
        {
            name: 'application-not-knows-http-and-drivers',
            comment: 'Сценарии не знают про Express и драйверы БД',
            severity: 'error',
            from: { path: '^src/application' },
            to: { path: '^(node_modules/(express|ejs|multer)|src/(presentation|infrastructure))' }
        },
        {
            name: 'no-circular',
            comment: 'Циклические зависимости ломают загрузку модулей и мешают тестам',
            severity: 'error',
            from: {},
            to: { circular: true }
        },
        {
            name: 'no-orphans',
            comment: 'Модуль, который никто не импортирует — вероятно, мёртвый код',
            severity: 'warn',
            from: { orphan: true, pathNot: ['\\.d\\.ts$', '(^|/)index\\.js$'] },
            to: {}
        }
    ]
};
```

**ESLint-ограничения `no-restricted-imports`** — то же самое, но без дополнительного пакета:

```json
{
  "overrides": [
    {
      "files": ["src/domain/**/*.js"],
      "rules": {
        "no-restricted-imports": ["error", {
          "patterns": ["../infrastructure/*", "../presentation/*", "express", "bcryptjs", "multer"]
        }]
      }
    },
    {
      "files": ["src/application/**/*.js"],
      "rules": {
        "no-restricted-imports": ["error", {
          "patterns": ["../infrastructure/*", "../presentation/*", "express", "multer"]
        }]
      }
    }
  ]
}
```

Смысл: как только кто-то напишет `require('../../infrastructure/JsonDatabase')` внутри сервиса,
CI упадёт с понятным сообщением — ещё **до** ревью. Это и есть «автоматический архитектурный
тест».

**madge** — быстрый просмотр графа и циклических зависимостей, умеет рисовать картинку:

```bash
npm i -D madge
npx madge --circular src/            # найти циклы
npx madge --image graph.svg src/     # картинка графа для отчёта
```

**Анализ «сверху вниз»: arch-unit тесты как обычные тесты.** Библиотеки вроде
`archunit`/`dependency-cruiser` можно запускать в тест-раннере — тогда нарушение слоёв
ломает прогон тестов, а не отдельный скрипт:

```js
// test/architecture.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const walk = (dir) => readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
});

test('domain не зависит от infrastructure/presentation/express', () => {
    const files = walk('src/domain').filter((f) => f.endsWith('.js'));
    const forbidden = /require\((['"])(\.\.\/(infrastructure|presentation)|express|multer|ejs)/;

    for (const file of files) {
        const content = readFileSync(file, 'utf8');
        assert.ok(!forbidden.test(content), `Нарушение слоя в ${file}`);
    }
});

test('application не импортирует драйверы БД и фреймворки', () => {
    const forbidden = /require\((['"])(express|multer|node:sqlite|better-sqlite3)/;
    for (const file of walk('src/application').filter((f) => f.endsWith('.js'))) {
        assert.ok(!forbidden.test(readFileSync(file, 'utf8')), `Нарушение слоя в ${file}`);
    }
});
```

Преимущество такого теста: он ничего не знает про конкретные имена классов и продолжает
работать при рефакторинге; а падение даёт точное имя файла-нарушителя.

### 6.2. Что ещё полезно проверять автоматически

* **Запрет «магических» обращений к БД в контроллерах**: правило на импорт `db` вне `infrastructure`.
* **Запрет `console.log` в домене и сервисах** (там должен быть логгер-порт).
* **Запрет прямых `fetch` вне `infrastructure/integrations`** — иначе интеграция расползётся по коду.
* **Публичный API модуля**: разрешить импорт только из `index.js` пакета (правило
  `no-restricted-imports` с `patterns: ['!./index.js']` — «private modules»).
* **Соглашения об именах** (`eslint-plugin-filename-rules`): `*Service.js`, `*Repository.js`,
  `*.controller.js` — по имени файла видно слой.

## 7. Как это встроить в процесс

```json
// package.json
{
  "scripts": {
    "lint": "eslint .",
    "format": "prettier --write .",
    "types": "tsc --noEmit",           // с allowJs+checkJs, если проект на JS
    "arch": "depcruise --config .dependency-cruiser.js src",
    "audit:ci": "better-npm-audit audit --level=high",
    "check": "npm run lint && npm run types && npm run arch && npm run test"
  }
}
```

```yaml
# .github/workflows/ci.yml (фрагмент)
- run: npm ci
- run: npm run lint
- run: npx depcruise --config .dependency-cruiser.js src
- run: npm audit --audit-level=high
- run: npm test
```

Практика: **не включать все правила сразу**. Если при первом запуске линтер даёт 3000 ошибок,
команда его отключит. Правильный путь: включить 5–10 самых полезных правил, остальные —
постепенно, с «храповиком» (количество предупреждений не должно расти).

## 8. Мини-выводы

* Статический анализ — самая дешёвая обратная связь: ошибка находится до запуска, на сохранении файла.
* Форматтер прекращает споры о стиле, линтер ловит настоящие ошибки (промисы, `==`, неиспользуемые
  переменные), типы закрывают `undefined`-падения.
* Сложность и «запахи» — метрики поддерживаемости: сложный код требует больше тестов.
* Архитектурную целостность можно проверять правилами импортов
  (`dependency-cruiser`, `no-restricted-imports`, arch-тесты) — тогда «стрелки внутрь»
  защищены CI, а не памятью разработчика.
* Интеграция: pre-commit (быстро) → CI на pull request (полно) → ночные запуски (глубоко).

**Вопросы для самопроверки**

1. Чем статический анализ отличается от тестов и что он умеет такого, чего не умеют тесты?
2. Какое правило ESLint ловит `new Promise(async (resolve) => ...)` и в чём опасность?
3. Что даёт `checkJs` в обычном JS-проекте без переписывания на TypeScript?
4. Как запретить слою `domain` импортировать Express — назовите два способа.
5. Зачем нужна метрика когнитивной сложности и что с ней делать на практике?
6. Почему нельзя включать в проекте сразу все правила линтера?
