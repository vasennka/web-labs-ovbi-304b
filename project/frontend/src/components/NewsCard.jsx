/**
 * Карточка новости и блок интеграций со сторонними сервисами.
 */

import { Link } from 'react-router-dom';

export function NewsCard({ item }) {
    return (
        <article className="card news">
            <time dateTime={item.publishedAt}>
                {new Date(item.publishedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
            </time>
            <h3>
                <Link to={`/news/${item.slug}`}>{item.title}</Link>
            </h3>
            {item.excerpt && <p>{item.excerpt}</p>}
            <p className="meta">
                {(item.tags ?? []).map((tag) => (
                    <span className="tag" key={tag}>{tag}</span>
                ))}
            </p>
        </article>
    );
}

/**
 * Виджет интеграций: показывает, что данные приходят от сторонних сервисов.
 * Если сервис недоступен, бэкенд возвращает degraded = true и мы честно
 * показываем сообщение об этом, а не «пустоту» и не падаем.
 */
export function IntegrationsPanel({ data }) {
    if (!data) return null;

    const { github, weather, fetchedAt } = data;

    return (
        <aside className="integrations">
            <h2>Сторонние сервисы</h2>
            <p className="muted small">
                Получено: {new Date(fetchedAt).toLocaleString('ru-RU')}
            </p>

            <div className={`widget ${github.degraded ? 'degraded' : ''}`}>
                <h3>GitHub · официальный SDK</h3>
                {github.fullName ? (
                    <>
                        <p><b>{github.fullName}</b></p>
                        <p className="muted small">{github.description}</p>
                        <ul className="stats">
                            <li><span>★</span> {github.stars}</li>
                            <li><span>⑂</span> {github.forks}</li>
                            <li><span>!</span> {github.openIssues}</li>
                        </ul>
                        <p className="muted small">
                            {github.fromCache ? 'из кэша (10 минут)' : 'получено сейчас'}
                            {github.stale ? ' · данные могли устареть' : ''}
                        </p>
                        <a href={github.url} target="_blank" rel="noreferrer noopener">открыть репозиторий →</a>
                    </>
                ) : (
                    <>
                        <p>Сервис недоступен, показываем заглушку.</p>
                        <p className="muted small">{github.message}</p>
                    </>
                )}
            </div>

            <div className={`widget ${weather.degraded ? 'degraded' : ''}`}>
                <h3>Погода · клиент поверх fetch</h3>
                {weather.temperature !== null && weather.temperature !== undefined ? (
                    <>
                        <p className="big">{weather.temperature} °C</p>
                        <p>{weather.description}, {weather.city}</p>
                        <p className="muted small">
                            ветер {weather.windSpeed} м/с · {weather.fromCache ? 'из кэша' : 'получено сейчас'}
                        </p>
                    </>
                ) : (
                    <>
                        <p>Сервис недоступен, показываем заглушку.</p>
                        <p className="muted small">{weather.message}</p>
                    </>
                )}
            </div>
        </aside>
    );
}
