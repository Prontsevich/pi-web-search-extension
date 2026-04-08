# Web Search Extension — План разработки

Расширение для pi coding agent, предоставляющее возможность поиска информации в интернете через несколько провайдеров.

---

## 📋 Обзор

### Цели
- ✅ Поиск в интернете через API (Tavily, Exa, Perplexity)
- ✅ Fallback на бесплатные источники (Google, Wikipedia, arXiv)
- ✅ Минимальный вывод в чат (статус + URL)
- ✅ Все данные доступны агенту через `details`
- ✅ Модульная архитектура для лёгкого расширения

### Приоритет провайдеров
```
1. Tavily      (1000 кредитов/месяц)
2. Exa         ($10 кредитов)
3. Perplexity  ($5 кредитов)
4. Fallback:
   - Google (через fetch_url)
   - Wikipedia API
   - arXiv API
```

---

## 🛠️ Инструменты

| Инструмент | Описание | Параметры |
|------------|----------|-----------|
| `search_web` | Базовый поиск + сниппеты | query, num_results, include_content |
| `search_news` | Поиск новостей | query, days_back, num_results |
| `search_research` | Поиск научных статей | query, num_results, include_pdf |
| `find_people` | Поиск людей по экспертизе | expertise, company, num_results |
| `find_companies` | Поиск компаний | industry, location, stage, num_results |

---

## 📁 Структура проекта

```
~/.pi/agent/extensions/web-search/
├── index.ts                    ← Регистрация 5 инструментов
├── providers/
│   ├── exa.ts                  ← Exa API client
│   ├── tavily.ts               ← Tavily API client
│   └── perplexity.ts           ← Perplexity API client
├── fallback/
│   ├── google.ts               ← Google через fetch_url
│   ├── wikipedia.ts            ← Wikipedia API
│   └── arxiv.ts                ← arXiv API
├── router/
│   └── index.ts                ← Роутинг + fallback логика
├── transformers/
│   ├── factory.ts              ← Фабрика трансформеров
│   ├── interface.ts            ← QueryTransformer interface
│   └── regex.ts                ← Regex трансформер (сейчас)
│   └── ollama.ts               ← Ollama трансформер (потом)
├── types/
│   └── index.ts                ← Общие типы (SearchResult, SearchResponse)
├── package.json                ← Зависимости (если нужны)
├── .env.example                ← Шаблон для API ключей
└── README.md                   ← Документация
```

---

## 🔐 API ключи

Хранение в системных переменных окружения (`.zshrc`):

```bash
export EXA_API_KEY="xxx"
export TAVILY_API_KEY="xxx"
export PERPLEXITY_API_KEY="xxx"
```

---

## 📊 Архитектура

### Поток выполнения
```
┌─────────────────────────────────────┐
│  search_web(query)                  │
│  (index.ts)                         │
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│  router/searchWithFallback(query)   │
│  - Выбирает провайдера              │
│  - Передаёт query как есть          │
└─────────────┬───────────────────────┘
              │
    ┌─────────┼─────────┬──────────────┐
    │         │         │              │
    ▼         ▼         ▼              ▼
┌────────┐ ┌────────┐ ┌────────┐ ┌──────────┐
│Tavily  │ │Exa     │ │Perplex │ │Fallback  │
│        │ │        │ │ity     │ │(google,  │
│        │ │        │ │        │ │wiki,     │
│        │ │        │ │        │ │arxiv)    │
└────────┴────────┴────────┴────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│  SearchResult[]                     │
│  - title                            │
│  - url                              │
│  - snippet                          │
│  - source                           │
│  - publishedDate?                   │
└─────────────────────────────────────┘
```

### Роутинг провайдеров
```
search_web(query)
    │
    ├── Tavily (основной)
    │   └── ❌ → Exa
    │       └── ❌ → Perplexity
    │           └── ❌ → Fallback
    │
    └── Fallback (по типу запроса)
        ├── Наука → arXiv
        ├── Энциклопедия → Wikipedia
        └── Остальное → Google (fetch_url)
```

---

## 🔄 Трансформация запросов

### Текущий подход (regex)
```typescript
// transformers/regex.ts
function simplifyQuery(query: string): string {
  // Удаление стоп-слов
  // Упрощение формулировок
  // Обрезка до 100 символов
}
```

### Будущий подход (модели)
```typescript
// transformers/ollama.ts
async function transformQuery(query: string): Promise<string> {
  // Ollama: llama3.2:1b
  // Или API: OpenRouter, Together
}
```

### Гибридная фабрика
```typescript
// transformers/factory.ts
function createTransformer(): QueryTransformer {
  if (process.env.USE_OLLAMA === "true") {
    return new OllamaTransformer();
  }
  return new RegexTransformer();
}
```

---

## ⚠️ Обработка ошибок

| Сценарий | Действие | Вывод в чат |
|----------|----------|-------------|
| API ключ невалиден | Ошибка + имя провайдера | `❌ Tavily: неверный API ключ` |
| Лимит исчерпан | Переключиться на следующий | (автоматически) |
| Таймаут (>30 сек) | 1 повтор → следующий провайдер | (автоматически) |
| Все платные упали | Fallback + уведомление | `⚠️ https://google.com/search (fallback)` |
| Все fallback упали | Ошибка + советы | `❌ Поиск недоступен. Проверьте API ключи.` |

---

## 📝 Формат вывода

### Основной провайдер
```
✅ https://api.tavily.com/search
```

### Fallback
```
⚠️ https://www.google.com/search (fallback)
ℹ️ https://en.wikipedia.org/w/api.php (fallback)
```

### Ошибка
```
❌ Поиск недоступен (все провайдеры упали)
```

---

## 📦 Типы данных

```typescript
// types/index.ts
export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string; // "tavily", "exa", "google", "wikipedia", "arxiv"
  publishedDate?: string;
}

export interface SearchResponse {
  results: SearchResult[];
  provider: string;
  isFallback: boolean;
  query: string;
}

export interface QueryTransformer {
  transform(query: string, provider: string): Promise<string>;
}
```

---

# ✅ TODO List

## Фаза 1: Базовая структура

- [ ] **1.1** Создать папку `~/.pi/agent/extensions/web-search/`
- [ ] **1.2** Создать `types/index.ts` — общие типы
- [ ] **1.3** Создать `transformers/interface.ts` — интерфейс QueryTransformer
- [ ] **1.4** Создать `transformers/regex.ts` — regex трансформер
- [ ] **1.5** Создать `transformers/factory.ts` — фабрика трансформеров

## Фаза 2: Платные провайдеры

- [ ] **2.1** Создать `providers/tavily.ts` — Tavily API client
- [ ] **2.2** Создать `providers/exa.ts` — Exa API client
- [ ] **2.3** Создать `providers/perplexity.ts` — Perplexity API client
- [ ] **2.4** Реализовать роутинг Tavily → Exa → Perplexity

## Фаза 3: Fallback провайдеры

- [ ] **3.1** Создать `fallback/google.ts` — Google через fetch_url
- [ ] **3.2** Создать `fallback/wikipedia.ts` — Wikipedia API
- [ ] **3.3** Создать `fallback/arxiv.ts` — arXiv API
- [ ] **3.4** Реализовать выбор fallback по типу запроса

## Фаза 4: Роутер

- [ ] **4.1** Создать `router/index.ts` — основная логика роутинга
- [ ] **4.2** Реализовать `searchWithFallback(query)` функцию
- [ ] **4.3** Реализовать обработку ошибок и повторов
- [ ] **4.4** Реализовать индикацию fallback в статусе

## Фаза 5: Инструменты

- [ ] **5.1** Создать `search_web` — базовый поиск
- [ ] **5.2** Создать `search_news` — поиск новостей
- [ ] **5.3** Создать `search_research` — поиск исследований
- [ ] **5.4** Создать `find_people` — поиск людей
- [ ] **5.5** Создать `find_companies` — поиск компаний

## Фаза 6: Интеграция

- [ ] **6.1** Создать `index.ts` — регистрация всех инструментов
- [ ] **6.2** Создать `.env.example` — шаблон API ключей
- [ ] **6.3** Создать `package.json` (если нужны зависимости)
- [ ] **6.4** Создать `README.md` — документация

## Фаза 7: Тестирование

- [ ] **7.1** Протестировать Tavily API
- [ ] **7.2** Протестировать Exa API
- [ ] **7.3** Протестировать Perplexity API
- [ ] **7.4** Протестировать Google fallback
- [ ] **7.5** Протестировать Wikipedia fallback
- [ ] **7.6** Протестировать arXiv fallback
- [ ] **7.7** Протестировать переключение при ошибках
- [ ] **7.8** Протестировать все 5 инструментов

## Фаза 8: Публикация

- [ ] **8.1** Создать Git репозиторий
- [ ] **8.2** Добавить LICENSE
- [ ] **8.3** Запушить на GitHub
- [ ] **8.4** Обновить README с инструкцией по установке

---

## 🚀 Будущие улучшения (после релиза)

### Трансформеры на моделях
- [ ] **ML-1** Создать `transformers/ollama.ts` — Ollama трансформер
- [ ] **ML-2** Добавить конфиг `USE_OLLAMA=true`
- [ ] **ML-3** Протестировать с llama3.2:1b
- [ ] **ML-4** Добавить поддержку OpenRouter API
- [ ] **ML-5** A/B тестирование качества трансформаций

### Кэширование
- [ ] **CACHE-1** Создать `utils/cache.ts` — кэш результатов
- [ ] **CACHE-2** Реализовать TTL (1 час для новостей, 24 часа для остального)
- [ ] **CACHE-3** Добавить лимиты на размер кэша
- [ ] **CACHE-4** Протестировать экономию запросов

### Дополнительные инструменты
- [ ] **TOOLS-1** `search_and_contents` — поиск + полный контент
- [ ] **TOOLS-2** `get_contents` — контент по известным URL
- [ ] **TOOLS-3** `compare_results` — сравнение результатов от разных провайдеров

### Интеграции
- [ ] **INT-1** Интеграция с `fetch_url` для автоматического чтения топ-URL
- [ ] **INT-2** Поддержка MCP протокола (если pi добавит)
- [ ] **INT-3** Экспорт результатов в файл

---

## 📊 Статус

| Фаза | Статус | Прогресс |
|------|--------|----------|
| 1. Базовая структура | ✅ Завершено | 100% |
| 2. Платные провайдеры | ✅ Завершено | 100% |
| 3. Fallback провайдеры | ✅ Завершено | 100% |
| 4. Роутер | ✅ Завершено | 100% |
| 5. Инструменты | ✅ Завершено | 100% |
| 6. Интеграция | ✅ Завершено | 100% |
| 7. Тестирование | ✅ Завершено | 100% |
| 8. Публикация | ⬜ Не начато | 0% |

**Общий прогресс: 87.5% (7/8 фаз)**

---

## ✅ Выполнено в Фазе 1

- [x] **1.1** Создать папку `~/.pi/agent/extensions/web-search/`
- [x] **1.2** Создать `types/index.ts` — общие типы (SearchResult, SearchResponse, SearchError, SearchProvider, SearchOptions, QueryType, WebSearchConfig)
- [x] **1.3** Создать `transformers/interface.ts` — интерфейс QueryTransformer
- [x] **1.4** Создать `transformers/regex.ts` — regex трансформер (с поддержкой google, wikipedia, arxiv, hackernews)
- [x] **1.5** Создать `transformers/factory.ts` — фабрика трансформеров (с заделом на Ollama)
- [x] **1.6** Создать `transformers/index.ts` — экспорт трансформеров

---

## ✅ Выполнено в Фазе 2

- [x] **2.1** Создать `providers/tavily.ts` — Tavily API client (145 строк)
- [x] **2.2** Создать `providers/exa.ts` — Exa API client (178 строк)
- [x] **2.3** Создать `providers/perplexity.ts` — Perplexity API client (174 строки)
- [x] **2.4** Создать `providers/index.ts` — экспорт провайдеров
- [x] **2.5** Реализовать роутинг Tavily → Exa → Perplexity (в каждом провайдере)

---

## ✅ Выполнено в Фазе 3

- [x] **3.1** Создать `fallback/google.ts` — Google через fetch_url (226 строк)
- [x] **3.2** Создать `fallback/wikipedia.ts` — Wikipedia API (134 строки)
- [x] **3.3** Создать `fallback/arxiv.ts` — arXiv API (185 строк)
- [x] **3.4** Создать `fallback/hackernews.ts` — Hacker News API (116 строк)
- [x] **3.5** Создать `fallback/index.ts` — экспорт fallback провайдеров

---

## ✅ Выполнено в Фазе 4

- [x] **4.1** Создать `router/index.ts` — основная логика роутинга (404 строки)
- [x] **4.2** Реализовать `searchWithFallback(query)` функцию
- [x] **4.3** Реализовать обработку ошибок и повторов (1 повтор при timeout/network)
- [x] **4.4** Реализовать индикацию fallback в статусе (isFallback флаг в SearchResponse)
- [x] **4.5** Реализовать определение типа запроса (GENERAL, RESEARCH, ENCYCLOPEDIA, TECH_NEWS)
- [x] **4.6** Реализовать выбор fallback провайдера по типу запроса

---

## ✅ Выполнено в Фазе 5

- [x] **5.1** Создать `tools/index.ts` — регистрация 5 инструментов (304 строки)
- [x] **5.2** Создать `search_web` — базовый поиск (универсальный, 80% запросов)
- [x] **5.3** Создать `search_news` — поиск новостей (Perplexity → HackerNews)
- [x] **5.4** Создать `search_research` — поиск исследований (arXiv → Exa)
- [x] **5.5** Создать `find_people` — поиск людей (Exa category: people)
- [x] **5.6** Создать `find_companies` — поиск компаний (Exa category: company)
- [x] **5.7** Реализовать минимальный вывод в чат (статус + URL)
- [x] **5.8** Реализовать передачу данных через `details`

---

## ✅ Выполнено в Фазе 6

- [x] **6.1** Создать `index.ts` — регистрация всех инструментов (111 строк)
- [x] **6.2** Создать `.env.example` — шаблон API ключей (42 строки)
- [x] **6.3** Создать `README.md` — документация (336 строк)
- [x] **6.4** Добавить команды `/websearch-status` и `/websearch-test`

---

## ✅ Выполнено в Фазе 7

- [x] **7.1** Создать `test.ts` — тестовый скрипт (219 строк)
- [x] **7.2** Протестировать Tavily API (через SearchRouter)
- [x] **7.3** Протестировать Exa API (через SearchRouter)
- [x] **7.4** Протестировать Perplexity API (через SearchRouter)
- [x] **7.5** Протестировать Google fallback (отдельный тест)
- [x] **7.6** Протестировать Wikipedia fallback (отдельный тест)
- [x] **7.7** Протестировать arXiv fallback (отдельный тест)
- [x] **7.8** Протестировать переключение при ошибках (автоматически в router)
- [x] **7.9** Протестировать все 5 инструментов (search_web, search_news, search_research, find_people, find_companies)
- [x] **7.10** Протестировать определение типа запроса (detectQueryType)

---

## 📝 Заметки

### API ключи (тестовые)
- **Exa:** `a12a490a-b134-4f55-887d-36ecadac6664`
- **Tavily:** (есть 1000 кредитов/месяц)
- **Perplexity:** (есть $5 кредитов)

### Важные решения
- ✅ Минимальный вывод в чат (статус + URL)
- ✅ Модульная структура (providers/, fallback/, router/, transformers/)
- ✅ Гибридная трансформация (regex сейчас, модели потом)
- ✅ Fallback: Google → Wikipedia → arXiv
- ✅ Без кэширования (пока не нужно)
- ✅ API ключи из process.env (.zshrc)

### Ссылки на документацию
- **Exa:** https://docs.exa.ai/reference/exa-mcp
- **Tavily:** https://docs.tavily.com/documentation/mcp
- **Perplexity:** https://docs.perplexity.ai/docs/getting-started/integrations/mcp-server
- **arXiv:** http://export.arxiv.org/api/query
- **Wikipedia:** https://en.wikipedia.org/w/api.php
- **Hacker News:** https://hn.algolia.com/api

---

## 🎯 Следующий шаг

**Начать Фазу 1: Базовая структура**

1. Создать папку `~/.pi/agent/extensions/web-search/`
2. Создать `types/index.ts`
3. Создать `transformers/interface.ts`
4. Создать `transformers/regex.ts`
5. Создать `transformers/factory.ts`

---

**Последнее обновление:** 2026-04-08
**Версия плана:** 1.0
