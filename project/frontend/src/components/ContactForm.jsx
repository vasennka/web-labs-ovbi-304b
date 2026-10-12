/**
 * Форма обратной связи (React-версия).
 *
 * Особенности:
 *   - контролируемые поля: состояние формы живёт в React, а не в DOM;
 *   - наша самодельная «звёздная» оценка <StarRating /> внутри формы;
 *   - honeypot-поле (скрытое от пользователя) — защита от ботов;
 *   - клиентская валидация для быстрой подсказки + серверная (источник истины):
 *     ошибки полей приходят в err.details и раскладываются по нужным input'ам;
 *   - кнопка блокируется на время отправки (защита от двойного POST).
 */

import { useState } from 'react';
import { api, ApiError } from '../api/client.js';
import StarRating from './ui/StarRating.jsx';

const EMPTY = { name: '', email: '', message: '', rating: null };

export default function ContactForm() {
    const [values, setValues] = useState(EMPTY);
    const [errors, setErrors] = useState({});
    const [status, setStatus] = useState('idle'); // idle | sending | sent | failed
    const [serverMessage, setServerMessage] = useState('');

    const setField = (field) => (event) => {
        const value = event?.target ? event.target.value : event;
        setValues((prev) => ({ ...prev, [field]: value }));
        setErrors((prev) => ({ ...prev, [field]: undefined }));
    };

    /** Быстрая проверка на клиенте (сервер проверит ещё раз — он источник истины). */
    const validate = () => {
        const found = {};
        if (values.name.trim().length < 2) found.name = 'Укажите имя (минимум 2 символа)';
        if (!/^[^\s@]+@[^\s@]+\.[a-zA-Zа-яА-Я]{2,}$/.test(values.email.trim())) found.email = 'Некорректный e-mail';
        if (values.message.trim().length < 10) found.message = 'Минимум 10 символов';
        setErrors(found);
        return Object.keys(found).length === 0;
    };

    const onSubmit = async (event) => {
        event.preventDefault();
        if (!validate()) return;

        setStatus('sending');
        setServerMessage('');

        try {
            const response = await api.sendContact({
                name: values.name.trim(),
                email: values.email.trim(),
                message: values.message.trim(),
                rating: values.rating,
                website: '' // honeypot всегда пустой у человека
            });

            setStatus('sent');
            setValues(EMPTY);
            setServerMessage(
                `Спасибо! Сообщение №${response.id} принято. ` +
                (response.notified ? 'Администратор получил уведомление.' : 'Уведомление будет отправлено позже.')
            );
        } catch (err) {
            setStatus('failed');
            if (err instanceof ApiError && err.details) {
                setErrors(err.details);         // показываем ошибки по полям от сервера
                setServerMessage('Проверьте отмеченные поля.');
            } else {
                setServerMessage(err.message ?? 'Что-то пошло не так');
            }
        }
    };

    return (
        <form className="contact-form stack" onSubmit={onSubmit} noValidate>
            {status === 'sent' && <div className="alert success" role="status">{serverMessage}</div>}
            {status === 'failed' && <div className="alert error" role="alert">{serverMessage}</div>}

            <label>
                Ваше имя *
                <input
                    type="text"
                    value={values.name}
                    onChange={setField('name')}
                    aria-invalid={Boolean(errors.name)}
                    placeholder="Как к вам обращаться"
                />
                {errors.name && <span className="field-error">{errors.name}</span>}
            </label>

            <label>
                E-mail *
                <input
                    type="email"
                    value={values.email}
                    onChange={setField('email')}
                    aria-invalid={Boolean(errors.email)}
                    placeholder="you@example.com"
                />
                {errors.email && <span className="field-error">{errors.email}</span>}
            </label>

            <label>
                Сообщение *
                <textarea
                    rows="6"
                    value={values.message}
                    onChange={setField('message')}
                    aria-invalid={Boolean(errors.message)}
                    placeholder="Расскажите о съёмке: дата, место, задача"
                />
                {errors.message && <span className="field-error">{errors.message}</span>}
            </label>

            {/* САМОДЕЛЬНЫЙ КОНТРОЛ: оценка сайта звёздами */}
            <StarRating
                value={values.rating}
                onChange={(rating) => setValues((prev) => ({ ...prev, rating }))}
                label="Оцените сайт (необязательно)"
            />

            {/* honeypot: спрятан от людей, боты обычно заполняют */}
            <label className="honeypot" aria-hidden="true">
                Ваш сайт
                <input type="text" tabIndex={-1} autoComplete="off" />
            </label>

            <button className="btn primary" type="submit" disabled={status === 'sending'}>
                {status === 'sending' ? 'Отправляем…' : 'Отправить сообщение'}
            </button>

            <p className="muted small">
                Данные уходят на <code>POST /api/v1/contact</code>. Сервер проверит поля доменной
                сущностью <code>ContactMessage</code>, сохранит сообщение и уведомит администратора.
            </p>
        </form>
    );
}
