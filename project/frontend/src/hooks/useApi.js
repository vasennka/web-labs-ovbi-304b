/**
 * Хук useApi — единая схема загрузки данных с сервера.
 *
 * Что он решает (и почему не пишем fetch прямо в компоненте):
 *   1) три состояния из коробки: loading / error / data;
 *   2) отмена запроса при размонтировании или смене зависимостей
 *      (AbortController) — это защищает от «обновления состояния
 *      размонтированного компонента» и от гонок при быстром переключении
 *      фильтров галереи;
 *   3) функция reload() — повторить запрос (например, по кнопке «Обновить»).
 *
 * @param {(signal: AbortSignal) => Promise<any>} fetcher
 * @param {any[]} deps — зависимости: при их изменении запрос выполняется заново
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export function useApi(fetcher, deps = []) {
    const [state, setState] = useState({ loading: true, error: null, data: null });
    const [nonce, setNonce] = useState(0);           // «ручной» перезапуск запроса
    const fetcherRef = useRef(fetcher);
    fetcherRef.current = fetcher;                    // всегда актуальная функция

    useEffect(() => {
        const controller = new AbortController();

        setState((prev) => ({ ...prev, loading: true, error: null }));

        fetcherRef.current(controller.signal)
            .then((data) => {
                if (!controller.signal.aborted) setState({ loading: false, error: null, data });
            })
            .catch((err) => {
                // Отмена — это не ошибка: пользователь просто ушёл со страницы
                if (err.name === 'AbortError' || controller.signal.aborted) return;
                setState({ loading: false, error: err, data: null });
            });

        return () => controller.abort();             // очистка эффекта
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [...deps, nonce]);

    const reload = useCallback(() => setNonce((n) => n + 1), []);

    return { ...state, reload };
}
