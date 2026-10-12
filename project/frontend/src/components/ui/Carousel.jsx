/**
 * ============================================================================
 * САМОДЕЛЬНЫЙ КОНТРОЛ №1 — <Carousel /> (карусель галереи)
 * ============================================================================
 *
 * Написан с нуля, без сторонних библиотек (swiper/embla и т.п.).
 * Что умеет:
 *   - листание стрелками «назад/вперёд» и переход по точкам-индикаторам;
 *   - управление с клавиатуры (←/→/Home/End) — элемент focusable;
 *   - перетаскивание мышью/пальцем (Pointer Events + setPointerCapture);
 *   - автопрокрутка с паузой при наведении, фокусе и во время перетаскивания;
 *   - бесконечная прокрутка по кругу;
 *   - доступность: role="region", aria-roledescription="carousel",
 *     aria-live="polite", aria-выражение для активной точки.
 *
 * КАК ЭТО РАБОТАЕТ (объяснение для защиты):
 *   1) Состояние index — номер текущего слайда, dragX — текущий сдвиг при
 *      перетаскивании (в пикселях).
 *   2) «Лента» слайдов — это flex-контейнер. Мы сдвигаем его через
 *      transform: translateX(calc(-index * 100% + dragX px)). Плавность задаёт
 *      CSS-transition; во время перетаскивания transition отключается, иначе
 *      сдвиг «догонял» бы палец с задержкой.
 *   3) Pointer Events унифицируют мышь, палец и стилус: pointerdown ->
 *      setPointerCapture -> pointermove считает дельту -> pointerup решает,
 *      листать или вернуть слайд на место (порог = 15% ширины или быстрый «щелчок»).
 *   4) Автопрокрутка — useEffect с setInterval, зависящий от [paused, index]:
 *      при каждой смене слайда таймер перезапускается, поэтому пользователь
 *      всегда получает полный интервал на просмотр кадра.
 *   5) Вся логика изолирована в компоненте: страница галереи просто передаёт
 *      массив элементов. Это пример «умного» переиспользуемого контрола.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const DRAG_THRESHOLD_RATIO = 0.15;  // на сколько ширины нужно сдвинуть, чтобы перелистнуть
const SWIPE_VELOCITY = 0.5;         // px/мс — быстрый «щелчок» листает даже при малом сдвиге

export default function Carousel({
    items = [],
    autoPlayMs = 5000,
    ariaLabel = 'Галерея работ'
}) {
    const count = items.length;
    const [index, setIndex] = useState(0);
    const [dragX, setDragX] = useState(0);
    const [paused, setPaused] = useState(false);

    const rootRef = useRef(null);
    const dragState = useRef({ active: false, startX: 0, startTime: 0, moved: 0 });

    // --- Навигация ---------------------------------------------------------
    const goTo = useCallback((next) => {
        if (count === 0) return;
        // Нормализация «по кругу»: -1 -> count-1, count -> 0
        const normalized = ((next % count) + count) % count;
        setIndex(normalized);
    }, [count]);

    const next = useCallback(() => goTo(index + 1), [goTo, index]);
    const prev = useCallback(() => goTo(index - 1), [goTo, index]);

    // --- Автопрокрутка -----------------------------------------------------
    useEffect(() => {
        if (autoPlayMs <= 0 || paused || count <= 1) return undefined;

        const timer = setInterval(() => {
            setIndex((current) => (current + 1) % count); // функциональное обновление — без «замыкания на старое значение»
        }, autoPlayMs);

        return () => clearInterval(timer);            // очистка обязательна
    }, [autoPlayMs, paused, count, index]);           // index -> таймер перезапускается на каждом слайде

    // --- Перетаскивание (Pointer Events) -----------------------------------
    const onPointerDown = (event) => {
        // Реагируем только на основную кнопку мыши/касание
        if (event.pointerType === 'mouse' && event.button !== 0) return;

        dragState.current = {
            active: true,
            startX: event.clientX,
            startTime: performance.now(),
            moved: 0
        };
        event.currentTarget.setPointerCapture(event.pointerId); // получаем все события до pointerup
        setPaused(true);
    };

    const onPointerMove = (event) => {
        const state = dragState.current;
        if (!state.active) return;

        const delta = event.clientX - state.startX;
        state.moved = Math.abs(delta);
        setDragX(delta);
    };

    const onPointerUp = (event) => {
        const state = dragState.current;
        if (!state.active) return;

        const width = rootRef.current?.offsetWidth ?? 1;
        const delta = event.clientX - state.startX;
        const elapsed = Math.max(1, performance.now() - state.startTime);
        const velocity = Math.abs(delta) / elapsed;

        const shouldSlide =
            Math.abs(delta) > width * DRAG_THRESHOLD_RATIO || velocity > SWIPE_VELOCITY;

        state.active = false;
        setDragX(0);
        setPaused(false);

        if (shouldSlide) {
            // Обратите внимание: это обычный if — мы сознательно НЕ используем
            // «логические» конструкции с побочными эффектами (см. лабу №6).
            if (delta < 0) next();
            else prev();
        }
    };

    // Клик по слайду после перетаскивания не должен «срабатывать» как открытие
    const onClickCapture = (event) => {
        if (dragState.current.moved > 8) {
            event.preventDefault();
            event.stopPropagation();
            dragState.current.moved = 0;
        }
    };

    // --- Клавиатура --------------------------------------------------------
    const onKeyDown = (event) => {
        if (event.key === 'ArrowRight') { event.preventDefault(); next(); }
        if (event.key === 'ArrowLeft') { event.preventDefault(); prev(); }
        if (event.key === 'Home') { event.preventDefault(); goTo(0); }
        if (event.key === 'End') { event.preventDefault(); goTo(count - 1); }
    };

    const current = items[index];
    const trackStyle = useMemo(() => ({
        transform: `translateX(calc(${-index * 100}% + ${dragX}px))`,
        transition: dragX === 0 ? 'transform .35s cubic-bezier(.22,.61,.36,1)' : 'none'
    }), [index, dragX]);

    if (count === 0) {
        return <p className="muted">Пока нет работ для показа.</p>;
    }

    return (
        <section
            ref={rootRef}
            className={`carousel ${paused ? 'is-paused' : ''}`}
            role="region"
            aria-roledescription="карусель"
            aria-label={ariaLabel}
            tabIndex={0}
            onKeyDown={onKeyDown}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
        >
            <div
                className="carousel-viewport"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onClickCapture={onClickCapture}
            >
                <div className="carousel-track" style={trackStyle}>
                    {items.map((item, i) => (
                        <figure
                            className="carousel-slide"
                            key={item.id ?? i}
                            aria-hidden={i !== index}
                            /* aria-live только у активного слайда — скринридер не «тараторит» */
                            aria-live={i === index ? 'polite' : 'off'}
                        >
                            <div className="slide-photo">
                                <img src={item.imageUrl} alt={item.title} draggable="false" loading="lazy" />
                            </div>
                            <figcaption>
                                <h3>{item.title}</h3>
                                <p>{item.description}</p>
                                <p className="meta">
                                    <span className="tag accent">{item.category}</span>
                                    {item.author} · {item.shotAt}
                                </p>
                            </figcaption>
                        </figure>
                    ))}
                </div>

                {/* Стрелки */}
                {count > 1 && (
                    <>
                        <button type="button" className="carousel-arrow prev" onClick={prev} aria-label="Предыдущая работа">‹</button>
                        <button type="button" className="carousel-arrow next" onClick={next} aria-label="Следующая работа">›</button>
                    </>
                )}
            </div>

            {/* Нижняя панель: счётчик, точки, пауза */}
            <div className="carousel-bar">
                <span className="carousel-counter" aria-hidden="true">
                    {index + 1} / {count}
                </span>

                <div className="carousel-dots" role="tablist" aria-label="Выбор работы">
                    {items.map((item, i) => (
                        <button
                            key={item.id ?? i}
                            type="button"
                            role="tab"
                            className={i === index ? 'dot active' : 'dot'}
                            aria-selected={i === index}
                            aria-label={`Работа ${i + 1}: ${item.title}`}
                            onClick={() => goTo(i)}
                        />
                    ))}
                </div>

                <button
                    type="button"
                    className="carousel-toggle"
                    onClick={() => setPaused((p) => !p)}
                    aria-pressed={paused}
                >
                    {paused ? '▶ включить авто' : '❚❚ пауза'}
                </button>
            </div>

            {/* Индикатор-прогресс для наглядности (чисто визуальный) */}
            <div className="carousel-progress" aria-hidden="true">
                <span style={{ width: `${((index + 1) / count) * 100}%` }} />
            </div>

            <p className="muted small carousel-hint">
                Управление: стрелки на клавиатуре ←/→, перетаскивание мышью или пальцем,
                точки внизу. Автопрокрутка приостанавливается при наведении, фокусе и перетаскивании.
                {current ? ` Текущая работа: «${current.title}».` : ''}
            </p>
        </section>
    );
}
