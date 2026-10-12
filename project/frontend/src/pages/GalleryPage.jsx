/**
 * Галерея: фильтр по категориям (чипсы), пагинация, карточки-фотографии
 * с подписью поверх снимка при наведении и карусель для быстрого просмотра.
 */

import { useState } from 'react';
import { api } from '../api/client.js';
import { useApi } from '../hooks/useApi.js';
import Carousel from '../components/ui/Carousel.jsx';
import { Loader, ErrorBox, Pagination } from '../components/ui/Feedback.jsx';

export default function GalleryPage() {
    const [page, setPage] = useState(1);
    const [category, setCategory] = useState('');

    const { data, loading, error, reload } = useApi(
        (signal) => api.listGallery({ page, limit: 9, category }, signal),
        [page, category]
    );

    const items = data?.items ?? [];

    return (
        <>
            <section className="page-head">
                <p className="eyebrow">Портфолио</p>
                <h1>Галерея работ</h1>
                <p className="lead">
                    Всего работ: {data?.total ?? '…'}. Фильтр и пагинация выполняются на сервере
                    (параметры <code>category</code> и <code>page</code>) — приложение только передаёт их в API.
                </p>
            </section>

            <div className="filters">
                <button
                    type="button"
                    className={category === '' ? 'chip active' : 'chip'}
                    onClick={() => { setCategory(''); setPage(1); }}
                >
                    все работы
                </button>
                {(data?.categoriesInUse ?? []).map((item) => (
                    <button
                        type="button"
                        key={item}
                        className={category === item ? 'chip active' : 'chip'}
                        onClick={() => { setCategory(item); setPage(1); }}
                    >
                        {item}
                    </button>
                ))}
            </div>

            {loading && <Loader text="Загружаем галерею…" />}
            <ErrorBox error={error} onRetry={reload} />

            {!loading && items.length > 0 && (
                <>
                    <Carousel items={items} autoPlayMs={0} ariaLabel="Работы этой страницы" />

                    <div className="section-head" style={{ marginTop: 34 }}>
                        <div>
                            <p className="eyebrow">Сетка</p>
                            <h2>Все работы страницы</h2>
                        </div>
                    </div>

                    <div className="grid gallery-grid">
                        {items.map((photo) => (
                            <figure className="card" key={photo.id}>
                                <div className="photo">
                                    <img src={photo.imageUrl} alt={photo.title} loading="lazy" />
                                    <div className="overlay">
                                        <h3>{photo.title}</h3>
                                        <p>{photo.description}</p>
                                    </div>
                                </div>
                                <figcaption>
                                    <b>{photo.title}</b>
                                    <p className="meta">
                                        <span className="tag">{photo.category}</span>
                                        {photo.author} · {photo.shotAt}
                                    </p>
                                </figcaption>
                            </figure>
                        ))}
                    </div>

                    <Pagination page={data.page} pages={data.pages} onChange={setPage} />
                </>
            )}

            {!loading && items.length === 0 && (
                <p className="muted">В этой категории пока нет работ.</p>
            )}
        </>
    );
}
