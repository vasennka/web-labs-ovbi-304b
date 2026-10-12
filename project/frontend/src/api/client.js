/**
 * Клиент REST API.
 *
 * Одна точка входа для всех запросов: здесь задаётся базовый URL, разбираются
 * ошибки и приводится единый формат ответа { ok, error, details }.
 * Если сервер вернул 400 с details по полям, компонент формы может их показать.
 */

const BASE = '/api/v1';

/** Ошибка, которую удобно ловить в компонентах. */
export class ApiError extends Error {
    constructor(message, { status = 0, details = null, code = 'ERROR' } = {}) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.details = details;
        this.code = code;
    }
}

/**
 * @param {string} path
 * @param {{ method?: string, body?: object, signal?: AbortSignal }} [options]
 */
export async function request(path, { method = 'GET', body, signal } = {}) {
    let response;
    try {
        response = await fetch(`${BASE}${path}`, {
            method,
            signal,
            headers: body ? { 'Content-Type': 'application/json' } : undefined,
            body: body ? JSON.stringify(body) : undefined
        });
    } catch (err) {
        // Сюда попадаем при обрыве сети или отмене запроса (AbortController)
        if (err.name === 'AbortError') throw err;
        throw new ApiError('Нет связи с сервером. Проверьте, запущен ли бэкенд.', { code: 'NETWORK' });
    }

    const isJson = response.headers.get('content-type')?.includes('application/json');
    const payload = isJson ? await response.json() : null;

    if (!response.ok) {
        throw new ApiError(payload?.error ?? `Ошибка ${response.status}`, {
            status: response.status,
            details: payload?.details ?? null,
            code: payload?.code ?? 'HTTP_ERROR'
        });
    }

    return payload;
}

/* ------------------------- Прикладные функции ------------------------- */

export const api = {
    /** @param {{page?:number, limit?:number, tag?:string, search?:string}} query */
    listNews: (query = {}, signal) =>
        request(`/news?${new URLSearchParams(clean(query)).toString()}`, { signal }),

    latestNews: (limit = 3, signal) =>
        request(`/news-latest?limit=${limit}`, { signal }),

    getNews: (slug, signal) =>
        request(`/news/${encodeURIComponent(slug)}`, { signal }),

    listGallery: (query = {}, signal) =>
        request(`/gallery?${new URLSearchParams(clean(query)).toString()}`, { signal }),

    getAbout: (signal) => request('/about', { signal }),

    getIntegrations: (signal) => request('/integrations', { signal }),

    sendContact: (data) => request('/contact', { method: 'POST', body: data })
};

/** Убираем пустые значения, чтобы не отправлять ?tag=&page= */
function clean(query) {
    return Object.fromEntries(
        Object.entries(query).filter(([, value]) => value !== undefined && value !== null && value !== '')
    );
}
