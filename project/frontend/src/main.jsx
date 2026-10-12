/**
 * Точка входа React-приложения.
 * BrowserRouter включает HTML5 History API: адреса вида /news/slug работают
 * как обычные ссылки. На сервере все такие пути отдаёт index.html (SPA-fallback).
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <BrowserRouter>
            <App />
        </BrowserRouter>
    </React.StrictMode>
);
