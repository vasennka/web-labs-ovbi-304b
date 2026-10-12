#!/usr/bin/env node
/**
 * ============================================================================
 * Сборка всех докладов из Markdown в Word (.docx) одной командой.
 * ============================================================================
 *
 * Используется так:
 *     node tools/build-all-docs.js
 *     npm run docs:word            (то же самое через скрипт в package.json)
 *
 * Если правили текст доклада в папке doklady/*.md — запустите этот файл,
 * и Word-версии в doklady/word обновятся.
 * ============================================================================
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { buildDocx } = require('./md2docx');

const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'doklady', 'word');

/** Соответствие: файл Markdown -> имя документа Word */
const DOCUMENTS = [
    ['doklady/README.md', '00-ukazatel-dokladov.docx'],
    ['doklady/01-mvc-mvp-mvvm.md', '01-mvc-mvp-mvvm.docx'],
    ['doklady/02-arhitektura-backend-rest-api.md', '02-arhitektura-backend-rest-api.docx'],
    ['doklady/03-proektirovanie-api-rest-graphql-grpc.md', '03-proektirovanie-api-rest-graphql-grpc.docx'],
    ['doklady/04-autentifikaciya-i-avtorizaciya.md', '04-autentifikaciya-i-avtorizaciya.docx'],
    ['doklady/05-owasp-top-10.md', '05-owasp-top-10.docx'],
    ['doklady/06-testirovanie-i-mutacionnoe-testirovanie.md', '06-testirovanie-i-mutacionnoe-testirovanie.docx'],
    ['doklady/07-staticheskie-analizatory.md', '07-staticheskie-analizatory.docx'],
    ['project/DOKLAD.md', '08-arhitektura-s-primerami-proekta.docx']
];

fs.mkdirSync(outDir, { recursive: true });

console.log('Сборка докладов в Word (.docx)');
console.log('Откуда:', path.join(root, 'doklady'), 'и', path.join(root, 'project'));
console.log('Куда:  ', outDir, '\n');

let done = 0;

for (const [source, targetName] of DOCUMENTS) {
    const sourcePath = path.join(root, source);
    if (!fs.existsSync(sourcePath)) {
        console.log(`✘ пропущен (нет файла): ${source}`);
        continue;
    }

    const markdown = fs.readFileSync(sourcePath, 'utf8');
    const title = markdown.match(/^#\s+(.+)$/m)?.[1] ?? targetName;
    const buffer = buildDocx({ markdown, title });

    fs.writeFileSync(path.join(outDir, targetName), buffer);
    done++;
    console.log(`✔ ${targetName.padEnd(48)} ${(buffer.length / 1024).toFixed(1)} КБ`);
}

console.log(`\nГотово: ${done} документов в ${path.relative(root, outDir)}`);
console.log('Открыть папку: explorer doklady\\word');
