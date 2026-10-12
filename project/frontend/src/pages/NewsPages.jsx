/**
 * Страницы новостей: список (с фильтром по тегам и поиском) и отдельная новость.
 */

import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { useApi } from '../hooks/useApi.js';
import { NewsCard } from '../components/NewsCard.jsx';
import { Loader, ErrorBox, Pagination } from '../components/ui/Feedback.jsx';

/** Список новостей. */
export function NewsPage() {
    const [page, setPage] = useState(1);
    const [tag, setTag] = useState('');
    const [search, setSearch] = useState('');
    const [searchInput, setSearchInput] = useState('');

    const { data, loading, error, reload } = useApi(
        (signal) => api.listNews({ page, limit: 5, tag, search }, signal),
        [page, tag, search]
    );

    const submitSearch = (event) => {
        event.preventDefault();
        setSearch(searchInput.trim());
        setPage(1);
    };

    return (
        <>
            <section className="page-head">
                <h1>Новости студии</h1>
                <p className="lead">Всего записей: {data?.total ?? '…'}. Фильтр по тегу и поиск работают на сервере.</p>
            </section>

            <form className="filters" onSubmit={submitSearch}>
                <input
                    type="search"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Поиск по заголовку и тексту…"
                    aria-label="Поиск по новостям"
                />
                <button className="btn primary" type="submit">Найти</button>
            </form>

            <div className="filters">
                <button type="button" className={tag === '' ? 'chip active' : 'chip'} onClick={() => { setTag(''); setPage(1); }}>
                    все теги
                </button>
                {(data?.tags ?? []).map((item) => (
                    <button
                        type="button"
                        key={item}
                        className={tag === item ? 'chip active' : 'chip'}
                        onClick={() => { setTag(item); setPage(1); }}
                    >
                        {item}
                    </button>
                ))}
            </div>

            {loading && <Loader text="Загружаем новости…" />}
            <ErrorBox error={error} onRetry={reload} />

            <div className="news-list">
                {(data?.items ?? []).map((item) => <NewsCard item={item} key={item.id} />)}
            </div>

            {data && data.items.length === 0 && <p className="muted">Ничего не найдено.</p>}

            {data && <Pagination page={data.page} pages={data.pages} onChange={setPage} />}
        </>
    );
}

/** Одна новость: данные берём по slug из адреса. */
export function NewsItemPage() {
    const { slug } = useParams();
    const { data, loading, error, reload } = useApi((signal) => api.getNews(slug, signal), [slug]);

    if (loading) return <Loader text="Открываем новость…" />;
    if (error) {
        return (
            <>
                <ErrorBox error={error} onRetry={reload} />
                <p><Link to="/news">← ко всем новостям</Link></p>
            </>
        );
    }

    const news = data?.news;
    if (!news) return null;

    return (
        <article className="article">
            <p className="breadcrumbs"><Link to="/news">← все новости</Link></p>
            <h1>{news.title}</h1>
            <p className="meta">
                {new Date(news.publishedAt).toLocaleString('ru-RU')}
                {(news.tags ?? []).map((tag) => <span className="tag" key={tag}>{tag}</span>)}
            </p>

            {news.coverUrl && <img className="cover" src={news.coverUrl} alt={news.title} />}

            {news.content.split('\n').map((paragraph, index) =>
                paragraph.trim() ? <p key={index}>{paragraph}</p> : null
            )}

            <p className="muted small">
                Ресурс REST API: <code>GET /api/v1/news/{news.slug}</code> · ID: {news.id}
            </p>
        </article>
    );
}
