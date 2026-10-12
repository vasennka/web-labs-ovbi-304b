/**
 * ============================================================================
 * ЛАБОРАТОРНАЯ РАБОТА №8. ЗАДАНИЕ 1.
 * Компонент ProgressBar: полоса растёт на 1% каждые `speed` миллисекунд.
 * ============================================================================
 *
 * Как работает компонент:
 *   1) useState хранит ТЕКУЩИЙ процент. Состояние — «память» компонента между
 *      рендерами; при его изменении React перерисовывает только этот компонент.
 *   2) useEffect запускает setInterval один раз (пустой массив зависимостей [])
 *      и ВОЗВРАЩАЕТ функцию очистки clearInterval. Это обязательно:
 *        - иначе при удалении компонента таймер продолжит жить (утечка памяти);
 *        - в React 18 StrictMode эффект намеренно вызывается дважды, и без
 *          очистки мы получили бы два параллельных таймера.
 *   3) Прогресс останавливается по достижении 100% — таймер снимается эффектом
 *      очистки, потому что зависимость [value] пересоздаёт интервал. Чтобы
 *      не пересоздавать таймер на каждом шаге, мы используем функциональное
 *      обновление setValue(v => ...) и зависимость [speed, value === 100].
 *
 *   4) Кнопка «Заново» сбрасывает состояние в 0 и перезапускает цикл.
 *   5) Ширина полосы задаётся inline-стилем style={{ width: `${value}%` }} —
 *      это данные, а не верстка, поэтому className здесь не подходит.
 */

import { useEffect, useRef, useState } from 'react';

export default function ProgressBar({ speed = 100, title = 'Прогресс', color = '#2f6feb' }) {
    const [value, setValue] = useState(0);      // текущий процент
    const timerRef = useRef(null);              // ссылка на id таймера

    const isDone = value >= 100;

    useEffect(() => {
        // Если достигли 100% — таймер не нужен
        if (isDone) return undefined;

        // Запускаем интервал: каждые `speed` мс увеличиваем на 1%
        timerRef.current = setInterval(() => {
            setValue((prev) => {
                const next = prev + 1;
                return next >= 100 ? 100 : next; // не выходим за 100%
            });
        }, speed);

        // ФУНКЦИЯ ОЧИСТКИ: React вызовет её перед следующим запуском эффекта
        // и при удалении компонента со страницы.
        return () => {
            clearInterval(timerRef.current);
            timerRef.current = null;
        };
    }, [speed, isDone]); // эффект перезапускается, если изменилась скорость или статус готовности

    const restart = () => {
        clearInterval(timerRef.current);   // на всякий случай: снимаем старый таймер
        setValue(0);                       // сброс состояния -> эффект запустит новый интервал
    };

    return (
        <section className="progress-card">
            <header className="progress-header">
                <span className="progress-title">{title}</span>
                <span className="progress-speed">скорость: {speed} мс / 1%</span>
            </header>

            {/* Дорожка и полоса. width — динамический стиль, поэтому inline */}
            <div className="progress-track" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
                <div className="progress-fill" style={{ width: `${value}%`, background: color }} />
            </div>

            <footer className="progress-footer">
                <span className="progress-percent">{value}%</span>

                {isDone ? (
                    <>
                        <strong className="progress-done">Готово!</strong>
                        <button type="button" className="btn-restart" onClick={restart}>
                            Заново
                        </button>
                    </>
                ) : (
                    <span className="progress-hint">заполняется…</span>
                )}
            </footer>
        </section>
    );
}
