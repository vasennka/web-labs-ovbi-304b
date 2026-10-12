/**
 * ============================================================================
 * САМОДЕЛЬНЫЙ КОНТРОЛ №2 — <StarRating /> (оценка сайта звёздами)
 * ============================================================================
 *
 * В HTML есть <input type="range">, но «звёзды с подсказкой при наведении»
 * приходится собирать руками. Контрол реализован по паттерну ARIA radiogroup:
 *
 *   - role="radiogroup" на контейнере, role="radio" + aria-checked на звёздах;
 *   - «roving tabindex»: в таблицу порядка табуляции входит только активная
 *     звезда (tabIndex = 0), остальные — -1. Так пользователь не «пробегает»
 *     пятью остановками Tab, но может двигаться стрелками ←/→;
 *   - Home/End выбирают первую/последнюю оценку;
 *   - hoverPreview показывает предварительную оценку при наведении и
 *     НЕ меняет значение до клика (важно для формы: предпросмотр ≠ выбор);
 *   - onChange(value) — управляемый компонент: значение хранит родитель.
 *
 * Значение можно сбросить, кликнув по уже выбранной звезде (или кнопкой «сбросить»).
 */

import { useId, useRef, useState } from 'react';

const STARS = [1, 2, 3, 4, 5];
const LABELS = {
    1: 'ужасно',
    2: 'так себе',
    3: 'нормально',
    4: 'хорошо',
    5: 'отлично'
};

export default function StarRating({ value = null, onChange, label = 'Оценка сайта' }) {
    const [hovered, setHovered] = useState(null);
    const groupId = useId();
    const refs = useRef([]);

    const shown = hovered ?? value ?? 0;

    /** Переместить фокус на звезду с индексом i и выбрать её */
    const select = (next) => {
        onChange?.(next === value ? null : next); // повторный клик — сброс
        refs.current[next - 1]?.focus();
    };

    const onKeyDown = (event) => {
        const current = value ?? 1;
        if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
            event.preventDefault();
            select(Math.min(5, current + 1));
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
            event.preventDefault();
            select(Math.max(1, current - 1));
        } else if (event.key === 'Home') {
            event.preventDefault();
            select(1);
        } else if (event.key === 'End') {
            event.preventDefault();
            select(5);
        } else if (event.key === ' ' || event.key === 'Enter') {
            event.preventDefault();
            select(current);
        }
    };

    return (
        <div className="star-rating">
            <span className="star-rating-label" id={`${groupId}-label`}>
                {label}
            </span>

            <div
                className="star-rating-row"
                role="radiogroup"
                aria-labelledby={`${groupId}-label`}
                onMouseLeave={() => setHovered(null)}
                onKeyDown={onKeyDown}
            >
                {STARS.map((star) => {
                    const isActive = star <= shown;
                    return (
                        <button
                            key={star}
                            ref={(node) => { refs.current[star - 1] = node; }}
                            type="button"
                            role="radio"
                            aria-checked={value === star}
                            aria-label={`${star} — ${LABELS[star]}`}
                            // roving tabindex: в табуляции одна остановка
                            tabIndex={(value ?? 1) === star ? 0 : -1}
                            className={isActive ? 'star active' : 'star'}
                            onMouseEnter={() => setHovered(star)}
                            onFocus={() => setHovered(star)}
                            onClick={() => select(star)}
                        >
                            ★
                        </button>
                    );
                })}
            </div>

            <span className="star-rating-value" aria-live="polite">
                {shown > 0 ? `${shown}/5 — ${LABELS[shown]}` : 'не выбрано'}
            </span>

            {value !== null && (
                <button type="button" className="link" onClick={() => onChange?.(null)}>
                    сбросить
                </button>
            )}

            <input type="hidden" name="rating" value={value ?? ''} />
        </div>
    );
}
