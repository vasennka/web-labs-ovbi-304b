/**
 * COMPOSITION ROOT (корень композиции).
 *
 * Единственное место в приложении, где «всё собирается вместе»:
 *   конфигурация -> база -> репозитории -> сервисы -> контроллеры.
 *
 * Здесь видно, зачем нужны порты: сервисы принимают абстракции, и мы решаем,
 * какой адаптер подставить (JSON-файл или SQLite, настоящий Octokit или заглушка).
 * В тестах на этом же месте подставляются fake-реализации — код сервисов не меняется.
 * Такой подход называют ручным внедрением зависимостей (DI).
 */

'use strict';

const config = require('./config');
const { createAppDatabase } = require('./infrastructure/storage/createDatabase');
const {
    NewsRepositoryAdapter,
    GalleryRepositoryAdapter,
    MessageRepositoryAdapter,
    UserRepositoryAdapter,
    SettingsRepositoryAdapter
} = require('./infrastructure/repositories/adapters');
const { TtlCache } = require('./infrastructure/integrations/TtlCache');
const { GitHubStatsProvider } = require('./infrastructure/integrations/GitHubStatsProvider');
const { WeatherProvider } = require('./infrastructure/integrations/WeatherProvider');
const { ConsoleMailer, BcryptHasher } = require('./infrastructure/mail/ConsoleMailer');

const { NewsService } = require('./application/services/NewsService');
const { GalleryService } = require('./application/services/GalleryService');
const { ContactService } = require('./application/services/ContactService');
const { AuthService } = require('./application/services/AuthService');
const { AboutService } = require('./application/services/AboutService');
const { RateLimiter } = require('./application/services/RateLimiter');

const { createUploadMiddleware } = require('./presentation/middleware/upload');

/**
 * Собирает объект с готовыми зависимостями.
 * @param {{ logger?: Console, overrides?: object }} [options]
 *   overrides — точка расширения для тестов: можно подменить любой сервис или провайдера.
 */
async function buildContainer({ logger = console, overrides = {} } = {}) {
    // 1. Хранилище -----------------------------------------------------------
    const db = await createAppDatabase(config);

    // 2. Репозитории (адаптеры портов) --------------------------------------
    const newsRepository = new NewsRepositoryAdapter({ db });
    const galleryRepository = new GalleryRepositoryAdapter({ db });
    const messageRepository = new MessageRepositoryAdapter({ db });
    const userRepository = new UserRepositoryAdapter({ db });
    const settingsRepository = new SettingsRepositoryAdapter({ db });

    // 3. Внешние сервисы и вспомогательные адаптеры -------------------------
    const cache = new TtlCache({ ttlMs: config.integrations.cacheTtl });
    const vcsStatsProvider = new GitHubStatsProvider({
        owner: config.integrations.github.owner,
        repo: config.integrations.github.repo,
        cache,
        logger
    });
    const weatherProvider = new WeatherProvider({
        lat: config.integrations.weather.lat,
        lon: config.integrations.weather.lon,
        city: config.integrations.weather.city,
        cache,
        logger
    });

    const mailer = new ConsoleMailer({ logger });
    const passwordHasher = new BcryptHasher();
    const rateLimiter = new RateLimiter({ windowMs: 5 * 60_000, maxAttempts: 10 });
    rateLimiter.startCleanup();

    // 4. Сервисы (use cases) ------------------------------------------------
    const newsService = new NewsService({ newsRepository });
    const galleryService = new GalleryService({ galleryRepository });
    const contactService = new ContactService({ messageRepository, mailer, logger, adminEmail: config.admin.login + '@prisma.local' });
    const authService = new AuthService({ userRepository, passwordHasher, rateLimiter: new RateLimiter({ windowMs: 5 * 60_000, maxAttempts: 5 }) });
    const aboutService = new AboutService({ settingsRepository, vcsStatsProvider, weatherProvider, logger });

    // 5. Загрузка файлов ----------------------------------------------------
    const upload = createUploadMiddleware(config.uploads);

    return {
        // инфраструктура
        config,
        db,
        logger,
        cache,
        // сервисы
        newsService,
        galleryService,
        contactService,
        authService,
        aboutService,
        // presentation-зависимости
        mailer,
        rateLimiter,
        upload,
        ...overrides
    };
}

module.exports = { buildContainer };
