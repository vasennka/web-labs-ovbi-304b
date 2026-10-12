/**
 * Точка входа React-приложения (лабораторная работа №8, задание 1).
 * createRoot — API React 18: создаёт корень и рендерит компонент <App />.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

const container = document.getElementById('root');
const root = createRoot(container);

// StrictMode включает дополнительные проверки в dev-режиме
// (двойной вызов эффектов — поэтому таймеры в компонентах обязаны
// корректно очищаться в функции-очистке useEffect).
root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
