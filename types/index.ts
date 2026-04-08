// ============================================================================
// Web Search Extension — Общие типы
// ============================================================================

/**
 * Результат поиска от любого провайдера
 * Унифицированный формат для всех источников
 */
export interface SearchResult {
  /** Заголовок результата */
  title: string;
  
  /** URL страницы */
  url: string;
  
  /** Краткое описание/сниппет */
  snippet: string;
  
  /** Источник: "tavily", "exa", "perplexity", "google", "wikipedia", "arxiv" */
  source: string;
  
  /** Дата публикации (если доступна) */
  publishedDate?: string;
  
  /** Полный контент страницы (если запрошено) */
  content?: string;
}

/**
 * Ответ от системы поиска
 */
export interface SearchResponse {
  /** Массив результатов поиска */
  results: SearchResult[];
  
  /** Провайдер, который вернул результаты */
  provider: string;
  
  /** Был ли использован fallback режим */
  isFallback: boolean;
  
  /** Исходный поисковый запрос */
  query: string;
  
  /** URL запроса (для отладки) */
  requestUrl?: string;
}

/**
 * Ошибка поиска
 */
export interface SearchError {
  /** Имя провайдера */
  provider: string;
  
  /** Сообщение об ошибке */
  message: string;
  
  /** Тип ошибки */
  type: "auth" | "rate_limit" | "timeout" | "network" | "parse" | "unknown";
  
  /** Оригинальная ошибка */
  originalError?: Error;
}

/**
 * Интерфейс для всех поисковых провайдеров
 * Каждый провайдер должен реализовать этот интерфейс
 */
export interface SearchProvider {
  /** Название провайдера */
  name: string;
  
  /** Выполнить поиск */
  search(query: string, options?: SearchOptions): Promise<SearchResponse>;
}

/**
 * Опции поиска
 */
export interface SearchOptions {
  /** Количество результатов (по умолчанию: 10) */
  numResults?: number;
  
  /** Включать полный контент страниц (по умолчанию: false) */
  includeContent?: boolean;
  
  /** Максимальное количество символов в контенте */
  maxContentLength?: number;
  
  /** Категория поиска (для поддерживающих провайдеров) */
  category?: "news" | "research" | "people" | "company";
  
  /** Дополнительные параметры для конкретного провайдера */
  providerParams?: Record<string, any>;
}

/**
 * Типы запросов для выбора fallback провайдера
 */
export enum QueryType {
  /** Обычный поисковый запрос */
  GENERAL = "general",
  
  /** Научный/исследовательский запрос */
  RESEARCH = "research",
  
  /** Запрос энциклопедического характера */
  ENCYCLOPEDIA = "encyclopedia",
  
  /** Технические новости */
  TECH_NEWS = "tech_news",
}

/**
 * Конфигурация расширения
 */
export interface WebSearchConfig {
  /** API ключи */
  apiKeys: {
    tavily?: string;
    exa?: string;
    perplexity?: string;
  };
  
  /** Приоритет провайдеров (порядок переключения) */
  providerPriority: string[];
  
  /** Использовать ли Ollama для трансформации запросов */
  useOllama: boolean;
  
  /** Таймаут запроса в миллисекундах (по умолчанию: 30000) */
  timeout: number;
  
  /** Максимальное количество повторов при ошибке */
  maxRetries: number;
}

/**
 * Конфигурация по умолчанию
 */
export const DEFAULT_CONFIG: WebSearchConfig = {
  apiKeys: {},
  providerPriority: ["tavily", "exa", "perplexity"],
  useOllama: false,
  timeout: 30000,
  maxRetries: 1,
};
