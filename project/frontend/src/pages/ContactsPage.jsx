/**
 * Контакты: форма обратной связи (со самодельным StarRating) и адресные данные.
 */

import { api } from '../api/client.js';
import { useApi } from '../hooks/useApi.js';
import ContactForm from '../components/ContactForm.jsx';
import { Loader } from '../components/ui/Feedback.jsx';

export default function ContactsPage() {
    const { data, loading } = useApi((signal) => api.getAbout(signal), []);
    const about = data?.about;

    return (
        <>
            <section className="page-head">
                <h1>Контакты и обратная связь</h1>
                <p className="lead">
                    Форма отправляет данные на <code>POST /api/v1/contact</code> — тот же эндпоинт
                    используется серверной EJS-версией страницы.
                </p>
            </section>

            <div className="two-col">
                <section>
                    <h2>Написать нам</h2>
                    <ContactForm />
                </section>

                <aside>
                    <h2>Как нас найти</h2>
                    {loading && <Loader text="Загружаем контакты…" />}
                    {about && (
                        <table className="kv">
                            <tbody>
                            <tr><th>Адрес</th><td>{about.address}</td></tr>
                            <tr><th>Телефон</th><td>{about.phone}</td></tr>
                            <tr><th>E-mail</th><td>{about.email}</td></tr>
                            <tr><th>Часы</th><td>{about.workHours}</td></tr>
                            </tbody>
                        </table>
                    )}

                    <h2>Что происходит с сообщением</h2>
                    <ol className="steps">
                        <li>Валидация на клиенте (быстрые подсказки) и на сервере (источник истины).</li>
                        <li>Доменная сущность <code>ContactMessage</code> проверяет e-mail, длину текста и honeypot.</li>
                        <li>Сообщение сохраняется в базу через репозиторий.</li>
                        <li>Администратору уходит письмо (порт <code>Mailer</code>; в учебном проекте — в консоль).</li>
                        <li>Сообщение появляется в админке: «Обратная связь».</li>
                    </ol>
                    <p className="muted small">
                        Ограничение частоты: не больше 10 отправок в 5 минут с одного IP
                        (сервис <code>RateLimiter</code>).
                    </p>
                </aside>
            </div>
        </>
    );
}
