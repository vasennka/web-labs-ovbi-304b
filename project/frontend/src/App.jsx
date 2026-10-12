/**
 * Корневой компонент SPA: маршруты (react-router) + общий каркас.
 *
 * Контакты для подвала грузим один раз наверху и передаём вниз через props —
 * это осознанный выбор: для двух-трёх полей контекст/стор избыточен
 * (подробнее о состоянии в React см. доклад, раздел «MVC/MVP/MVVM»).
 */

import { Routes, Route } from 'react-router-dom';
import { Header, Footer } from './components/Layout.jsx';
import { useApi } from './hooks/useApi.js';
import { api } from './api/client.js';

import HomePage from './pages/HomePage.jsx';
import GalleryPage from './pages/GalleryPage.jsx';
import { NewsPage, NewsItemPage } from './pages/NewsPages.jsx';
import AboutPage from './pages/AboutPage.jsx';
import ContactsPage from './pages/ContactsPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

export default function App() {
    const { data } = useApi((signal) => api.getAbout(signal), []);
    const about = data?.about ?? null;

    return (
        <>
            <Header />
            <main className="wrap">
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/gallery" element={<GalleryPage />} />
                    <Route path="/news" element={<NewsPage />} />
                    <Route path="/news/:slug" element={<NewsItemPage />} />
                    <Route path="/about" element={<AboutPage />} />
                    <Route path="/contacts" element={<ContactsPage />} />
                    <Route path="*" element={<NotFoundPage />} />
                </Routes>
            </main>
            <Footer about={about} />
        </>
    );
}
