# Web Search Extension для pi coding agent

Расширение для поиска информации в интернете через несколько провайдеров с автоматическим fallback.

---

## 🚀 Возможности

- ✅ **5 поисковых инструментов** — от универсального поиска до специализированного
- ✅ **3 платных провайдера** — Tavily, Exa, Perplexity (автоматическое переключение)
- ✅ **4 fallback провайдера** — Google, Wikipedia, arXiv, Hacker News (бесплатно)
- ✅ **Умный роутинг** — выбор провайдера по типу запроса
- ✅ **Минимальный вывод** — только статус в чате, все данные в `details`
- ✅ **Трансформация запросов** — оптимизация под каждый сервис (regex + ML в будущем)

---

## 📦 Установка

### Вариант 1: Git clone (рекомендуется)

```bash
# Клонировать репозиторий
git clone https://github.com/Prontsevich/pi-fetch-url-extension.git ~/.pi/agent/extensions/web-search

# Перезагрузить pi
/reload
```

### Вариант 2: Ручное копирование

```bash
# Создать папку расширения
mkdir -p ~/.pi/agent/extensions/web-search

# Скопировать файлы расширения
cp -r /path/to/web-search/* ~/.pi/agent/extensions/web-search/

# Перезагрузить pi
/reload
```

---

## 🔐 Настройка API ключей

### Обязательно (хотя бы один):

```bash
# ~/.zshrc или ~/.bashrc
export EXA_API_KEY="your-exa-key"
export TAVILY_API_KEY="your-tavily-key"
export PERPLEXITY_API_KEY="your-perplexity-key"
```

### Получение ключей:

| Провайдер | URL | Бесплатно |
|-----------|-----|-----------|
| **Exa** | https://dashboard.exa.ai/api-keys | $10 кредитов |
| **Tavily** | https://app.tavily.com/ | 1000 запросов/месяц |
| **Perplexity** | https://www.perplexity.ai/settings/api | от $5 |

### Fallback провайдеры (не требуют ключей):

- ✅ Google (через HTML парсинг)
- ✅ Wikipedia API
- ✅ arXiv API
- ✅ Hacker News API

---

## 🛠️ Инструменты

### 1. search_web — Базовый поиск

Универсальный поиск для 80% запросов.

**Параметры:**
- `query` (string) — Поисковый запрос
- `num_results` (number, default: 10) — Количество результатов
- `include_content` (boolean, default: false) — Включать полный контент страниц

**Пример:**
```
search_web("последние новости об AI", num_results=10)
```

**Провайдеры:** Tavily → Exa → Perplexity → Google (fallback)

---

### 2. search_news — Поиск новостей

Специализированный поиск новостей и свежих событий.

**Параметры:**
- `query` (string) — Поисковый запрос
- `days_back` (number, default: 7) — Искать за последние N дней
- `num_results` (number, default: 10) — Количество результатов

**Пример:**
```
search_news("OpenAI announces", days_back=3)
```

**Провайдеры:** Perplexity → Hacker News → Google

---

### 3. search_research — Поиск исследований

Поиск научных статей и публикаций.

**Параметры:**
- `query` (string) — Поисковый запрос
- `num_results` (number, default: 10) — Количество результатов
- `include_pdf` (boolean, default: false) — Включать PDF ссылки

**Пример:**
```
search_research("transformer architecture", num_results=15)
```

**Провайдеры:** arXiv → Exa (category: research paper)

---

### 4. find_people — Поиск людей

Поиск экспертов и специалистов по экспертизе.

**Параметры:**
- `expertise` (string) — Область экспертизы (например: "distributed systems engineer")
- `company` (string, optional) — Компания или организация
- `num_results` (number, default: 10) — Количество результатов

**Пример:**
```
find_people("AI researcher", company="Stanford")
```

**Провайдеры:** Exa (category: people)

---

### 5. find_companies — Поиск компаний

Поиск компаний по отрасли и локации.

**Параметры:**
- `industry` (string) — Отрасль (например: "healthcare AI")
- `location` (string, optional) — Локация или регион
- `stage` (string, optional) — Стадия: startup, enterprise, series-a, series-b, series-c+
- `num_results` (number, default: 10) — Количество результатов

**Пример:**
```
find_companies("fintech", location="San Francisco", stage="series-a")
```

**Провайдеры:** Exa (category: company)

---

## 📊 Приоритет провайдеров

### Платные (автоматическое переключение):

```
1. Tavily      (1000 кредитов/месяц)
   ↓ ❌
2. Exa         ($10 кредитов)
   ↓ ❌
3. Perplexity  ($5 кредитов)
   ↓ ❌
4. Fallback
```

### Fallback (по типу запроса):

| Тип запроса | Ключевые слова | Провайдер |
|-------------|----------------|-----------|
| **Наука** | исследование, paper, study, архив | arXiv |
| **Энциклопедия** | что такое, кто такой, определение | Wikipedia |
| **Tech новости** | релиз, версия, GitHub, release | Hacker News |
| **Остальное** | всё остальное | Google |

---

## 💡 Примеры использования

### Общий поиск
```
Прочитай статью про квантовые вычисления
→ search_web("квантовые вычисления")
→ fetch_url(top_url)
```

### Поиск новостей
```
Найди последние анонсы AI компаний
→ search_news("AI company announces", days_back=7)
```

### Поиск исследований
```
Найди статьи про transformer architecture
→ search_research("transformer architecture", num_results=20)
```

### Поиск экспертов
```
Кто работает над distributed systems в Google?
→ find_people("distributed systems", company="Google")
```

### Поиск компаний
```
Найди AI стартапы в здравоохранении
→ find_companies("healthcare AI", stage="startup")
```

---

## 📝 Формат вывода

### Успех
```
✅ https://api.tavily.com/search
```

### Fallback
```
⚠️ https://www.google.com/search (fallback)
```

### Ошибка
```
❌ tavily: TAVILY_API_KEY not set
```

**Все данные доступны в `details`:**
- `results[]` — массив результатов поиска
- `provider` — провайдер, который вернул результаты
- `isFallback` — был ли использован fallback режим
- `query` — исходный запрос

---

## 🔧 Команды расширения

### /websearch-status
Проверить доступность провайдеров.

```
/websearch-status
```

### /websearch-test
Тестовый поиск для проверки работы.

```
/websearch-test
```

---

## 🏗️ Архитектура

```
web-search/
├── index.ts                    ← Точка входа
├── tools/
│   └── index.ts                ← 5 инструментов для pi
├── router/
│   └── index.ts                ← Роутинг + fallback логика
├── providers/
│   ├── tavily.ts               ← Tavily API
│   ├── exa.ts                  ← Exa API
│   └── perplexity.ts           ← Perplexity API
├── fallback/
│   ├── google.ts               ← Google (fetch_url)
│   ├── wikipedia.ts            ← Wikipedia API
│   ├── arxiv.ts                ← arXiv API
│   └── hackernews.ts           ← Hacker News API
├── transformers/
│   ├── interface.ts            ← QueryTransformer интерфейс
│   ├── regex.ts                ← Regex трансформер
│   └── factory.ts              ← Фабрика трансформеров
├── types/
│   └── index.ts                ← Общие типы
├── .env.example                ← Шаблон API ключей
└── README.md                   ← Этот файл
```

---

## 🚀 Будущие улучшения

### Трансформеры на моделях
- [ ] Ollama интеграция (llama3.2:1b)
- [ ] OpenRouter API (дешёвые модели)
- [ ] A/B тестирование качества

### Кэширование
- [ ] Кэш результатов (TTL: 1 час для новостей, 24 часа для остального)
- [ ] Лимиты на размер кэша

### Дополнительные инструменты
- [ ] `search_and_contents` — поиск + полный контент
- [ ] `get_contents` — контент по известным URL
- [ ] `compare_results` — сравнение от разных провайдеров

---

## 📄 Лицензия

MIT License — см. файл [LICENSE](LICENSE)

---

## 🔗 Ссылки

- **GitHub:** https://github.com/Prontsevich/pi-fetch-url-extension
- **Exa Docs:** https://docs.exa.ai
- **Tavily Docs:** https://docs.tavily.com
- **Perplexity Docs:** https://docs.perplexity.ai
- **arXiv API:** https://arxiv.org/help/api
- **Wikipedia API:** https://www.mediawiki.org/wiki/API:Main_page
- **Hacker News API:** https://hn.algolia.com/api

---

**Версия:** 1.0  
**Последнее обновление:** 2026-04-08
