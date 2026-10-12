#!/usr/bin/env node
/**
 * ============================================================================
 * Конвертер Markdown -> Word (.docx) без внешних зависимостей.
 * Лабораторные работы №1–8 / проект «Фотостудия PRISMA».
 * ============================================================================
 *
 * Зачем он нужен: студенту требуются доклады в формате Word, а установленный
 * Word на машине может отсутствовать (и тогда автоматизация через COM недоступна).
 * .docx — это обычный ZIP-архив с XML внутри, поэтому файл можно собрать вручную.
 *
 * Что поддерживается из Markdown:
 *   # H1 (титул), ## H2, ### H3          — заголовки со стилями Word
 *   обычные абзацы                        — стиль Normal
 *   - пункты списка (в т.ч. вложенные)    — маркер «•» с отступом
 *   1. нумерованные пункты                — сохраняем номер как текст
 *   | таблицы |                            — настоящая таблица Word с рамками
 *   ``` код ```                           — моноширинный стиль с серой заливкой
 *   > цитата                              — стиль Quote (отступ + курсив)
 *   ---                                    — горизонтальная линия
 *   **жирный**, `код`, *курсив*           — форматирование внутри абзаца
 *   [текст](ссылка)                       — текст + адрес в скобках
 *
 * Запуск:  node tools/md2docx.js <файл.md> [<файл2.md> ...] [--out=папка]
 * ============================================================================
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

/* =========================================================================
 * 1. Минимальный ZIP-архиватор (формат .docx = ZIP + XML)
 * ========================================================================= */

const CRC_TABLE = (() => {
    const table = new Int32Array(256);
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        table[i] = c;
    }
    return table;
})();

function crc32(buffer) {
    let crc = -1;
    for (let i = 0; i < buffer.length; i++) {
        crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buffer[i]) & 0xff];
    }
    return (crc ^ -1) >>> 0;
}

/**
 * @param {{name: string, data: Buffer}[]} entries
 * @returns {Buffer} содержимое ZIP-файла
 */
function createZip(entries) {
    const localParts = [];
    const centralParts = [];
    let offset = 0;

    for (const entry of entries) {
        const nameBuffer = Buffer.from(entry.name, 'utf8');
        const data = entry.data;
        const compressed = zlib.deflateRawSync(data, { level: 9 });
        const crc = crc32(data);

        const local = Buffer.alloc(30);
        local.writeUInt32LE(0x04034b50, 0);   // сигнатура локального заголовка
        local.writeUInt16LE(20, 4);           // версия, необходимая для распаковки
        local.writeUInt16LE(0x0800, 6);       // флаг: имена файлов в UTF-8
        local.writeUInt16LE(8, 8);            // метод сжатия: deflate
        local.writeUInt16LE(0, 10);           // время (фиксированное)
        local.writeUInt16LE(0x21, 12);        // дата: 1980-01-01
        local.writeUInt32LE(crc, 14);
        local.writeUInt32LE(compressed.length, 18);
        local.writeUInt32LE(data.length, 22);
        local.writeUInt16LE(nameBuffer.length, 26);
        local.writeUInt16LE(0, 28);           // extra field отсутствует

        localParts.push(local, nameBuffer, compressed);

        const central = Buffer.alloc(46);
        central.writeUInt32LE(0x02014b50, 0); // сигнатура записи центрального каталога
        central.writeUInt16LE(20, 4);         // версия создателя
        central.writeUInt16LE(20, 6);         // версия для распаковки
        central.writeUInt16LE(0x0800, 8);
        central.writeUInt16LE(8, 10);
        central.writeUInt16LE(0, 12);
        central.writeUInt16LE(0x21, 14);
        central.writeUInt32LE(crc, 16);
        central.writeUInt32LE(compressed.length, 20);
        central.writeUInt32LE(data.length, 24);
        central.writeUInt16LE(nameBuffer.length, 28);
        central.writeUInt16LE(0, 30);         // extra
        central.writeUInt16LE(0, 32);         // comment
        central.writeUInt16LE(0, 34);         // номер диска
        central.writeUInt16LE(0, 36);         // внутренние атрибуты
        central.writeUInt32LE(0, 38);         // внешние атрибуты
        central.writeUInt32LE(offset, 42);    // смещение локального заголовка

        centralParts.push(central, nameBuffer);
        offset += local.length + nameBuffer.length + compressed.length;
    }

    const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0);         // конец центрального каталога
    end.writeUInt16LE(0, 4);
    end.writeUInt16LE(0, 6);
    end.writeUInt16LE(entries.length, 8);
    end.writeUInt16LE(entries.length, 10);
    end.writeUInt32LE(centralSize, 12);
    end.writeUInt32LE(offset, 16);
    end.writeUInt16LE(0, 20);

    return Buffer.concat([...localParts, ...centralParts, end]);
}

/* =========================================================================
 * 2. Markdown -> WordprocessingML
 * ========================================================================= */

const escapeXml = (text) =>
    String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        // управляющие символы, недопустимые в XML
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

/** Превращает строку с markdown-разметкой в набор «ранов» Word. */
function inlineToRuns(text, { forceBold = false } = {}) {
    // Разбиваем по **жирному**, `коду`, *курсиву* и [ссылкам](url) — с сохранением разделителей
    const tokens = String(text).split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*\n]+\*|\[[^\]]+\]\([^)]+\))/g);
    const runs = [];

    for (const token of tokens) {
        if (!token) continue;

        let value = token;
        let bold = forceBold;
        let italic = false;
        let code = false;

        if (/^\*\*[^*]+\*\*$/.test(token)) {
            value = token.slice(2, -2);
            bold = true;
        } else if (/^`[^`]+`$/.test(token)) {
            value = token.slice(1, -1);
            code = true;
        } else if (/^\*[^*\n]+\*$/.test(token)) {
            value = token.slice(1, -1);
            italic = true;
        } else if (/^\[[^\]]+\]\([^)]+\)$/.test(token)) {
            const match = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
            // В подписи ссылки убираем markdown-разметку (`код`, *курсив*), чтобы
            // в Word не оставались служебные символы
            const label = match[1].replace(/[`*]/g, '').trim();
            const target = match[2];
            value = label === target ? target : `${label} (${target})`;
        } else if (forceBold) {
            // текст вне разметки внутри ячейки-заголовка
            bold = true;
        }

        const properties = [];
        if (bold) properties.push('<w:b/>');
        if (italic) properties.push('<w:i/>');
        if (code) {
            properties.push('<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:cs="Consolas"/>');
            properties.push('<w:sz w:val="19"/><w:szCs w:val="19"/>');
            properties.push('<w:color w:val="A31515"/>');
        }

        const rPr = properties.length ? `<w:rPr>${properties.join('')}</w:rPr>` : '';
        runs.push(`<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(value)}</w:t></w:r>`);
    }

    return runs.join('') || '<w:r><w:t xml:space="preserve"></w:t></w:r>';
}

/** Абзац с указанным стилем и (опционально) дополнительными свойствами. */
function paragraph(text, { style = null, bold = false, indent = null, color = null, spacingAfter = null } = {}) {
    const props = [];
    if (style) props.push(`<w:pStyle w:val="${style}"/>`);
    if (indent !== null) props.push(`<w:ind w:left="${indent}"/>`);
    if (spacingAfter !== null) props.push(`<w:spacing w:after="${spacingAfter}"/>`);
    const pPr = props.length ? `<w:pPr>${props.join('')}</w:pPr>` : '';
    const runs = inlineToRuns(text, { forceBold: bold, color });
    return `<w:p>${pPr}${runs}</w:p>`;
}

/** Таблица Word с рамками; первая строка — заголовочная. */
function table(rows) {
    const borders = [
        '<w:tblBorders>',
        '<w:top w:val="single" w:sz="6" w:space="0" w:color="BFBFBF"/>',
        '<w:left w:val="single" w:sz="6" w:space="0" w:color="BFBFBF"/>',
        '<w:bottom w:val="single" w:sz="6" w:space="0" w:color="BFBFBF"/>',
        '<w:right w:val="single" w:sz="6" w:space="0" w:color="BFBFBF"/>',
        '<w:insideH w:val="single" w:sz="6" w:space="0" w:color="BFBFBF"/>',
        '<w:insideV w:val="single" w:sz="6" w:space="0" w:color="BFBFBF"/>',
        '</w:tblBorders>'
    ].join('');

    const rowXml = rows
        .map((cells, rowIndex) => {
            const isHeader = rowIndex === 0;
            const cellsXml = cells
                .map((cell) => {
                    const shading = isHeader
                        ? '<w:shd w:val="clear" w:color="auto" w:fill="EFF3F8"/>'
                        : '';
                    const cellProps = `<w:tcPr><w:tcW w:w="0" w:type="auto"/>${shading}<w:vAlign w:val="top"/></w:tcPr>`;
                    const body = inlineToRuns(cell, { forceBold: isHeader });
                    const pPr = isHeader ? '<w:pPr><w:spacing w:after="0"/></w:pPr>' : '<w:pPr><w:spacing w:after="0"/></w:pPr>';
                    return `<w:tc>${cellProps}<w:p>${pPr}${body}</w:p></w:tc>`;
                })
                .join('');
            const headerRow = isHeader ? '<w:trPr><w:tblHeader/></w:trPr>' : '';
            return `<w:tr>${headerRow}${cellsXml}</w:tr>`;
        })
        .join('');

    return `<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/>${borders}</w:tblPr>${rowXml}</w:tbl>`;
}

/** Горизонтальная линия. */
const horizontalRule = () =>
    '<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="BFBFBF"/></w:pBdr><w:spacing w:before="120" w:after="120"/></w:pPr></w:p>';

/** Разбор строки таблицы вида `| a | b |`. */
const parseTableRow = (line) =>
    line
        .trim()
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map((cell) => cell.trim());

const isTableSeparator = (line) => /^\|?[\s:|-]+\|[\s:|-]*$/.test(line.trim()) && line.includes('-');

/**
 * Является ли строка началом нового блока (а не продолжением абзаца).
 * В Markdown одиночный перенос строки внутри абзаца — это «мягкий» перенос,
 * который склеивается с остальным текстом в один абзац. Без этой проверки
 * конструкции вида **жирный текст, разорванный переносом** ломались бы.
 */
function isBlockStart(line) {
    const trimmed = line.trim();
    if (!trimmed) return true;
    if (/^```/.test(trimmed)) return true;
    if (/^#{1,4}\s/.test(trimmed)) return true;
    if (trimmed.startsWith('|')) return true;
    if (/^\s*>\s?/.test(line)) return true;
    if (/^\s*[-*]\s+/.test(line)) return true;
    if (/^\s*\d+\.\s+/.test(line)) return true;
    if (/^\s*---+\s*$/.test(trimmed)) return true;
    return false;
}

/** Склеивает абзац из нескольких строк (мягкие переносы -> пробел). */
function collectParagraphLines(lines, startIndex) {
    const parts = [lines[startIndex].trim()];
    let index = startIndex + 1;
    while (index < lines.length && !isBlockStart(lines[index])) {
        parts.push(lines[index].trim());
        index++;
    }
    return { text: parts.join(' '), nextIndex: index };
}

/**
 * Изображение в Word: `<w:drawing>` со ссылкой на файл в word/media.
 * Размеры пересчитываются в EMU (1 px = 9525 EMU) и вписываются в ширину страницы.
 */
function imageParagraph(relId, imageId, { widthEmu, heightEmu, name, caption }) {
    const drawing = `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="120" w:after="60"/></w:pPr>
      <w:r><w:drawing>
        <wp:inline distT="0" distB="0" distL="0" distR="0">
          <wp:extent cx="${widthEmu}" cy="${heightEmu}"/>
          <wp:effectExtent l="0" t="0" r="0" b="0"/>
          <wp:docPr id="${imageId}" name="Изображение ${imageId}" descr="${escapeXml(name)}"/>
          <wp:cNvGraphicFramePr>
            <a:graphicFrameLocks noChangeAspect="1"/>
          </wp:cNvGraphicFramePr>
          <a:graphic>
            <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
              <pic:pic>
                <pic:nvPicPr>
                  <pic:cNvPr id="${imageId}" name="${escapeXml(name)}"/>
                  <pic:cNvPicPr/>
                </pic:nvPicPr>
                <pic:blipFill>
                  <a:blip r:embed="${relId}"/>
                  <a:stretch><a:fillRect/></a:stretch>
                </pic:blipFill>
                <pic:spPr>
                  <a:xfrm><a:off x="0" y="0"/><a:ext cx="${widthEmu}" cy="${heightEmu}"/></a:xfrm>
                  <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
                </pic:spPr>
              </pic:pic>
            </a:graphicData>
          </a:graphic>
        </wp:inline>
      </w:drawing></w:r></w:p>`;

    const captionXml = caption
        ? `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="200"/></w:pPr><w:r><w:rPr><w:i/><w:sz w:val="18"/><w:color w:val="595959"/></w:rPr><w:t xml:space="preserve">${escapeXml(caption)}</w:t></w:r></w:p>`
        : '';

    return drawing + captionXml;
}

/** Размеры PNG/JPEG читаем из заголовка файла, чтобы сохранить пропорции. */
function readImageSize(buffer, extension) {
    if (extension === '.png' && buffer.length > 24) {
        return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
    }
    if (extension === '.jpg' || buffer === '.jpeg') {
        // Поиск маркера SOFn в JPEG
        let offset = 2;
        while (offset < buffer.length - 9) {
            if (buffer[offset] !== 0xff) { offset++; continue; }
            const marker = buffer[offset + 1];
            const length = buffer.readUInt16BE(offset + 2);
            if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
                return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
            }
            offset += 2 + length;
        }
    }
    return { width: 1200, height: 800 }; // запасное значение
}

/** Пересчёт размера под ширину полосы набора (A4 с нашими полями). */
const USABLE_WIDTH_EMU = 6_120_000;
const USABLE_HEIGHT_EMU = 9_000_000;
const PX_TO_EMU = 9525;

function fitImageToPage(widthPx, heightPx) {
    let widthEmu = widthPx * PX_TO_EMU;
    let heightEmu = heightPx * PX_TO_EMU;

    if (widthEmu > USABLE_WIDTH_EMU) {
        const scale = USABLE_WIDTH_EMU / widthEmu;
        widthEmu = USABLE_WIDTH_EMU;
        heightEmu = Math.round(heightEmu * scale);
    }
    if (heightEmu > USABLE_HEIGHT_EMU) {
        const scale = USABLE_HEIGHT_EMU / heightEmu;
        heightEmu = USABLE_HEIGHT_EMU;
        widthEmu = Math.round(widthEmu * scale);
    }
    return { widthEmu, heightEmu };
}

/**
 * Главная функция: markdown -> XML тела документа Word.
 * @param {string} markdown
 * @param {{ images?: object[], baseDir?: string }} [options]
 */
function markdownToBody(markdown, { images = [], baseDir = null } = {}) {
    const lines = markdown.replace(/\r\n/g, '\n').split('\n');
    const body = [];
    let index = 0;
    let isFirstHeading = true;

    while (index < lines.length) {
        const line = lines[index];

        // --- Изображение: ![подпись](путь.png) -----------------------------
        const imageMatch = line.trim().match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
        if (imageMatch) {
            const caption = imageMatch[1];
            const relativePath = imageMatch[2];
            const imagePath = path.isAbsolute(relativePath)
                ? relativePath
                : path.resolve(baseDir ?? process.cwd(), relativePath);

            if (fs.existsSync(imagePath)) {
                const data = fs.readFileSync(imagePath);
                const extension = path.extname(imagePath).toLowerCase();
                const { width, height } = readImageSize(data, extension);
                const { widthEmu, heightEmu } = fitImageToPage(width, height);

                images.push({ data, extension, name: path.basename(imagePath), caption });
                const index = images.length;
                body.push(imageParagraph(`rIdImg${index}`, index, {
                    widthEmu,
                    heightEmu,
                    name: path.basename(imagePath),
                    caption
                }));
            } else {
                body.push(paragraph(`[не найден файл изображения: ${relativePath}]`, { style: 'Quote' }));
            }
            index++;
            continue;
        }

        // --- Блок кода -----------------------------------------------------
        if (/^```/.test(line.trim())) {
            index++;
            const code = [];
            while (index < lines.length && !/^```/.test(lines[index].trim())) {
                code.push(lines[index]);
                index++;
            }
            index++; // закрывающие ```
            for (const codeLine of code) {
                body.push(`<w:p><w:pPr><w:pStyle w:val="Code"/></w:pPr><w:r><w:t xml:space="preserve">${escapeXml(codeLine || ' ')}</w:t></w:r></w:p>`);
            }
            body.push(paragraph('', { style: 'Code', spacingAfter: 160 }));
            continue;
        }

        // --- Таблица -------------------------------------------------------
        if (line.trim().startsWith('|') && !isTableSeparator(line)) {
            const rows = [];
            while (index < lines.length && lines[index].trim().startsWith('|')) {
                if (!isTableSeparator(lines[index])) rows.push(parseTableRow(lines[index]));
                index++;
            }
            if (rows.length) {
                body.push(table(rows));
                body.push(paragraph('', { spacingAfter: 60 }));
            }
            continue;
        }

        // --- Горизонтальная линия -----------------------------------------
        if (/^\s*---+\s*$/.test(line)) {
            body.push(horizontalRule());
            index++;
            continue;
        }

        // --- Заголовки -----------------------------------------------------
        const heading = line.match(/^(#{1,4})\s+(.*)$/);
        if (heading) {
            const level = heading[1].length;
            const text = heading[2].trim();

            if (level === 1) {
                if (isFirstHeading) {
                    // Титул документа: единственный заголовок первого уровня в файле
                    body.push(paragraph(text, { style: 'Title' }));
                    isFirstHeading = false;
                } else {
                    body.push(paragraph(text, { style: 'Heading1' }));
                }
            } else if (level === 2) {
                // Разделы доклада: в Word это уровень 1 дерева навигации
                body.push(paragraph(text, { style: 'Heading1' }));
            } else if (level === 3) {
                body.push(paragraph(text, { style: 'Heading2' }));
            } else {
                body.push(paragraph(text, { style: 'Heading3' }));
            }
            index++;
            continue;
        }

        // --- Цитата --------------------------------------------------------
        if (/^\s*>\s?/.test(line)) {
            const quoted = [];
            while (index < lines.length && /^\s*>\s?/.test(lines[index])) {
                quoted.push(lines[index].replace(/^\s*>\s?/, ''));
                index++;
            }
            body.push(paragraph(quoted.join(' '), { style: 'Quote' }));
            continue;
        }

        // --- Списки --------------------------------------------------------
        const bullet = line.match(/^(\s*)[-*]\s+(.*)$/);
        if (bullet) {
            const depth = Math.floor(bullet[1].length / 2);
            const collected = collectParagraphLines(lines, index);
            const text = collected.text.replace(/^[-*]\s+/, '');
            body.push(paragraph(`• ${text}`, { indent: 284 + depth * 284, spacingAfter: 40 }));
            index = collected.nextIndex;
            continue;
        }

        const numbered = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
        if (numbered) {
            const depth = Math.floor(numbered[1].length / 2);
            const collected = collectParagraphLines(lines, index);
            const text = collected.text.replace(/^\d+\.\s+/, '');
            body.push(paragraph(`${numbered[2]}. ${text}`, { indent: 284 + depth * 284, spacingAfter: 40 }));
            index = collected.nextIndex;
            continue;
        }

        // --- Пустая строка --------------------------------------------------
        if (!line.trim()) {
            index++;
            continue;
        }

        // --- Обычный абзац (может занимать несколько строк) -----------------
        const collected = collectParagraphLines(lines, index);
        body.push(paragraph(collected.text));
        index = collected.nextIndex;
    }

    return body.join('');
}

/* =========================================================================
 * 3. Сборка пакета .docx
 * ========================================================================= */

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`;

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;

const DOCUMENT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>
</Relationships>`;

const FOOTER = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:p><w:pPr><w:jc w:val="center"/></w:pPr>
    <w:r><w:rPr><w:sz w:val="18"/><w:color w:val="808080"/></w:rPr><w:t xml:space="preserve">— </w:t></w:r>
    <w:r><w:rPr><w:sz w:val="18"/><w:color w:val="808080"/></w:rPr><w:fldChar w:fldCharType="begin"/></w:r>
    <w:r><w:rPr><w:sz w:val="18"/><w:color w:val="808080"/></w:rPr><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r>
    <w:r><w:rPr><w:sz w:val="18"/><w:color w:val="808080"/></w:rPr><w:fldChar w:fldCharType="end"/></w:r>
    <w:r><w:rPr><w:sz w:val="18"/><w:color w:val="808080"/></w:rPr><w:t xml:space="preserve"> —</w:t></w:r>
  </w:p>
</w:ftr>`;

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault><w:rPr>
      <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
      <w:sz w:val="22"/><w:szCs w:val="22"/>
      <w:lang w:val="ru-RU" w:eastAsia="ru-RU" w:bidi="ar-SA"/>
    </w:rPr></w:rPrDefault>
    <w:pPrDefault><w:pPr>
      <w:spacing w:after="140" w:line="276" w:lineRule="auto"/>
      <w:jc w:val="both"/>
    </w:pPr></w:pPrDefault>
  </w:docDefaults>

  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>

  <w:style w:type="paragraph" w:styleId="Title">
    <w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/>
    <w:pPr><w:spacing w:before="0" w:after="240"/><w:jc w:val="left"/><w:outlineLvl w:val="0"/></w:pPr>
    <w:rPr><w:rFonts w:ascii="Calibri Light" w:hAnsi="Calibri Light"/><w:b/><w:sz w:val="40"/><w:color w:val="1F3864"/></w:rPr>
  </w:style>

  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/>
    <w:pPr><w:keepNext/><w:spacing w:before="360" w:after="140"/><w:outlineLvl w:val="0"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="30"/><w:color w:val="1F3864"/></w:rPr>
  </w:style>

  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/>
    <w:pPr><w:keepNext/><w:spacing w:before="280" w:after="120"/><w:outlineLvl w:val="1"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="26"/><w:color w:val="2F5496"/></w:rPr>
  </w:style>

  <w:style w:type="paragraph" w:styleId="Heading3">
    <w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/>
    <w:pPr><w:keepNext/><w:spacing w:before="240" w:after="100"/><w:outlineLvl w:val="2"/></w:pPr>
    <w:rPr><w:b/><w:i/><w:sz w:val="24"/><w:color w:val="2F5496"/></w:rPr>
  </w:style>

  <w:style w:type="paragraph" w:styleId="Code">
    <w:name w:val="Code"/><w:basedOn w:val="Normal"/>
    <w:pPr>
      <w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/>
      <w:ind w:left="170"/><w:jc w:val="left"/>
      <w:shd w:val="clear" w:color="auto" w:fill="F4F4F4"/>
    </w:pPr>
    <w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:cs="Consolas"/><w:sz w:val="18"/></w:rPr>
  </w:style>

  <w:style w:type="paragraph" w:styleId="Quote">
    <w:name w:val="Quote"/><w:basedOn w:val="Normal"/>
    <w:pPr>
      <w:ind w:left="340"/>
      <w:pBdr><w:left w:val="single" w:sz="18" w:space="8" w:color="2F5496"/></w:pBdr>
    </w:pPr>
    <w:rPr><w:i/><w:color w:val="404040"/></w:rPr>
  </w:style>
</w:styles>`;

/**
 * Собирает .docx из markdown-текста.
 * @param {{markdown: string, title: string, author?: string}} options
 * @returns {Buffer}
 */
function buildDocx({ markdown, title, author = 'Студент', baseDir = null }) {
    const images = [];
    const body = markdownToBody(markdown, { images, baseDir });

    // Связи документа: стили, подвал и все изображения
    const imageRels = images
        .map((image, i) => `  <Relationship Id="rIdImg${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image${i + 1}${image.extension}"/>`)
        .join('\n');

    const documentRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>
${imageRels}
</Relationships>`;

    // Расширения картинок описываем в [Content_Types].xml
    const imageExtensions = [...new Set(images.map((image) => image.extension.replace('.', '')))]
        .map((ext) => `  <Default Extension="${ext}" ContentType="image/${ext === 'jpg' ? 'jpeg' : ext}"/>`)
        .join('\n');

    const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
${imageExtensions}
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`;

    const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document
    xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
    xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
    xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
    xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
    xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
  <w:body>
    ${body}
    <w:sectPr>
      <w:footerReference w:type="default" r:id="rId2"/>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1134" w:right="850" w:bottom="1134" w:left="1417" w:header="708" w:footer="708" w:gutter="0"/>
      <w:cols w:space="708"/>
      <w:docGrid w:linePitch="360"/>
    </w:sectPr>
  </w:body>
</w:document>`;

    const now = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
    const core = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
  xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/"
  xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>${escapeXml(title)}</dc:title>
  <dc:creator>${escapeXml(author)}</dc:creator>
  <cp:lastModifiedBy>${escapeXml(author)}</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>
</cp:coreProperties>`;

    const app = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"
  xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>md2docx (учебный проект)</Application>
  <Company>Фотостудия PRISMA</Company>
</Properties>`;

    const mediaEntries = images.map((image, i) => ({
        name: `word/media/image${i + 1}${image.extension}`,
        data: image.data
    }));

    return createZip([
        { name: '[Content_Types].xml', data: Buffer.from(contentTypes, 'utf8') },
        { name: '_rels/.rels', data: Buffer.from(ROOT_RELS, 'utf8') },
        { name: 'docProps/core.xml', data: Buffer.from(core, 'utf8') },
        { name: 'docProps/app.xml', data: Buffer.from(app, 'utf8') },
        { name: 'word/_rels/document.xml.rels', data: Buffer.from(documentRels, 'utf8') },
        { name: 'word/document.xml', data: Buffer.from(document, 'utf8') },
        { name: 'word/styles.xml', data: Buffer.from(STYLES, 'utf8') },
        { name: 'word/footer1.xml', data: Buffer.from(FOOTER, 'utf8') },
        ...mediaEntries
    ]);
}

/* =========================================================================
 * 4. Интерфейс командной строки
 * ========================================================================= */

function main() {
    const args = process.argv.slice(2);
    const outArg = args.find((a) => a.startsWith('--out='));
    const outDir = outArg ? path.resolve(outArg.slice('--out='.length)) : null;
    const files = args.filter((a) => !a.startsWith('--'));

    if (files.length === 0) {
        console.log('Использование: node tools/md2docx.js <файл.md> [...] [--out=папка]');
        process.exit(1);
    }

    if (outDir) fs.mkdirSync(outDir, { recursive: true });

    for (const file of files) {
        const source = path.resolve(file);
        if (!fs.existsSync(source)) {
            console.error(`✘ не найден: ${source}`);
            continue;
        }

        const markdown = fs.readFileSync(source, 'utf8');
        const firstHeading = markdown.match(/^#\s+(.+)$/m);
        const title = firstHeading ? firstHeading[1].trim() : path.basename(source, '.md');

        const target = outDir
            ? path.join(outDir, `${path.basename(source, '.md')}.docx`)
            : source.replace(/\.md$/, '.docx');

        const buffer = buildDocx({
            markdown,
            title,
            baseDir: path.dirname(source)   // картинки в markdown ищутся относительно .md
        });
        fs.writeFileSync(target, buffer);

        const kilobytes = (buffer.length / 1024).toFixed(1);
        console.log(`✔ ${path.relative(process.cwd(), target)}  (${kilobytes} КБ, заголовок: «${title}»)`);
    }
}

if (require.main === module) main();

module.exports = { buildDocx, markdownToBody, createZip };
