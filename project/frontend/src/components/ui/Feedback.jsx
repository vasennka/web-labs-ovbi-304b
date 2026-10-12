/**
 * Небольшие вспомогательные компоненты интерфейса.
 */

export function Loader({ text = 'Загружаем…' }) {
    return (
        <div className="loader" role="status" aria-live="polite">
            <span className="spinner" aria-hidden="true" />
            {text}
        </div>
    );
}

export function ErrorBox({ error, onRetry }) {
    if (!error) return null;

    return (
        <div className="alert error" role="alert">
            <b>Не удалось загрузить данные.</b>
            <p>{error.message}</p>
            {error.details && (
                <ul>
                    {Object.entries(error.details).map(([field, message]) => (
                        <li key={field}><b>{field}:</b> {message}</li>
                    ))}
                </ul>
            )}
            {onRetry && (
                <button type="button" className="btn" onClick={onRetry}>Повторить запрос</button>
            )}
        </div>
    );
}

/** Пагинация списков: кнопки «назад/вперёд» и номера страниц. */
export function Pagination({ page, pages, onChange }) {
    if (pages <= 1) return null;

    const numbers = Array.from({ length: pages }, (_, i) => i + 1)
        // Показываем не больше 7 кнопок: окно вокруг текущей страницы
        .filter((p) => p === 1 || p === pages || Math.abs(p - page) <= 1);

    return (
        <nav className="pagination" aria-label="Страницы">
            <button type="button" className="btn" disabled={page <= 1} onClick={() => onChange(page - 1)}>
                ← назад
            </button>

            {numbers.map((p, i) => (
                <span key={p}>
                    {i > 0 && numbers[i - 1] !== p - 1 && <span className="muted"> … </span>}
                    <button
                        type="button"
                        className={p === page ? 'btn primary' : 'btn'}
                        aria-current={p === page ? 'page' : undefined}
                        onClick={() => onChange(p)}
                    >
                        {p}
                    </button>
                </span>
            ))}

            <button type="button" className="btn" disabled={page >= pages} onClick={() => onChange(page + 1)}>
                вперёд →
            </button>
        </nav>
    );
}
