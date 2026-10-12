/**
 * Корневой компонент приложения (лабораторная работа №8).
 *
 * Задание 1: два ProgressBar с разной скоростью (50 мс и 300 мс на 1%).
 * Дополнительно (чтобы показать обмен с сервером уже из React):
 *   - панель сообщений, работающая через WebSocket (ws://localhost:3000/ws);
 *   - она же дублирует данные в REST API, чтобы пример оставался целостным.
 */

import { useEffect, useRef, useState } from 'react';
import ProgressBar from './components/ProgressBar.jsx';

export default function App() {
    return (
        <main className="app">
            <h1>Лабораторная работа №8 — React</h1>
            <p className="lead">
                Задание 1: компонент <code>ProgressBar</code>, полоса которого растёт на 1% каждые
                <code> speed</code> миллисекунд. Ниже — два экземпляра с разной скоростью.
            </p>

            <div className="grid">
                <ProgressBar speed={50} title="Быстрый прогресс" color="#22c55e" />
                <ProgressBar speed={300} title="Медленный прогресс" color="#eab308" />
            </div>

            <WebSocketPanel />

            <footer className="app-footer">
                <a href="/ajax.html">Задание 2: AJAX + setInterval</a>
                <a href="/poll.html">Задание 3: Comet (long polling)</a>
                <a href="/ws.html">Задание 3: WebSocket (чистый JS)</a>
                <a href="/sse.html">SSE</a>
                <a href="/jsonp.html">JSONP</a>
            </footer>
        </main>
    );
}

/**
 * Панель обмена сообщениями через WebSocket.
 * Показывает, что React-компонент может подписаться на серверные события
 * так же, как на события DOM: через useEffect + очистку подписки.
 */
function WebSocketPanel() {
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState('');
    const [status, setStatus] = useState('подключение…');
    const socketRef = useRef(null);

    useEffect(() => {
        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const socket = new WebSocket(`${protocol}://${window.location.host}/ws`);
        socketRef.current = socket;

        socket.onopen = () => setStatus('открыто ✔');
        socket.onclose = () => setStatus('закрыто ✖');
        socket.onerror = () => setStatus('ошибка ✖ (нужен npm install ws)');
        socket.onmessage = (event) => {
            const payload = JSON.parse(event.data);
            if (payload.type === 'history') setMessages(payload.messages);
            if (payload.type === 'message') setMessages((prev) => [...prev, payload.message]);
        };

        // ВАЖНО: снимаем подписку и закрываем сокет при размонтировании
        return () => {
            socket.close(1000, 'component unmounted');
        };
    }, []);

    const submit = (event) => {
        event.preventDefault();
        const value = text.trim();
        if (!value) return;

        const socket = socketRef.current;
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ author: 'React', text: value }));
            setText('');
        } else {
            setStatus('нельзя отправить: соединение не открыто');
        }
    };

    return (
        <section className="ws-panel">
            <h2>Дополнительно: WebSocket из React ({status})</h2>
            <form onSubmit={submit}>
                <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Сообщение уйдёт всем подключённым вкладкам"
                />
                <button type="submit">Отправить</button>
            </form>
            <ul>
                {messages.map((m) => (
                    <li key={m.id}>
                        <b>{m.author}</b>: {m.text}
                    </li>
                ))}
            </ul>
        </section>
    );
}
