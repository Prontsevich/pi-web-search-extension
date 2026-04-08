// ============================================================================
// Web Search Extension — Роутер поисковых провайдеров
// ============================================================================

import type { SearchResponse, SearchResult, SearchOptions, SearchError } from "../types";
import { QueryType } from "../types";
import { TavilyProvider, ExaProvider, PerplexityProvider } from "../providers";
import { GoogleProvider, WikipediaProvider, ArxivProvider, HackerNewsProvider } from "../fallback";
import { createTransformer } from "../transformers";

/**
 * Роутер для выбора и переключения между поисковыми провайдерами
 * 
 * Логика работы:
 * 1. Пробуем платные провайдеры по приоритету (Tavily → Exa → Perplexity)
 * 2. При ошибке переключаемся на следующий провайдер
 * 3. Если все платные упали → выбираем fallback по типу запроса
 * 4. Fallback: Google (универсальный), Wikipedia (энциклопедия), arXiv (наука), HN (tech)
 * 
 * @example
 * const router = new SearchRouter();
 * const response = await router.search("AI news", { numResults: 10 });
 */
export class SearchRouter {
  /** Поисковые провайдеры */
  private providers: {
    tavily: TavilyProvider;
    exa: ExaProvider;
    perplexity: PerplexityProvider;
    google: GoogleProvider;
    wikipedia: WikipediaProvider;
    arxiv: ArxivProvider;
    hackernews: HackerNewsProvider;
  };
  
  /** Приоритет провайдеров */
  private readonly providerPriority = ["tavily", "exa", "perplexity"];
  
  /** Максимальное количество повторов при ошибке */
  private readonly maxRetries = 1;
  
  /** Таймаут запроса в миллисекундах */
  private readonly timeout = 30000;
  
  /** Трансформер запросов */
  private transformer = createTransformer();
  
  constructor() {
    this.providers = {
      tavily: new TavilyProvider(),
      exa: new ExaProvider(),
      perplexity: new PerplexityProvider(),
      google: new GoogleProvider(),
      wikipedia: new WikipediaProvider(),
      arxiv: new ArxivProvider(),
      hackernews: new HackerNewsProvider(),
    };
  }
  
  /**
   * Выполнить поиск с автоматическим переключением между провайдерами
   * 
   * @param query - Поисковый запрос
   * @param options - Опции поиска
   * @returns SearchResponse с результатами
   * 
   * @throws SearchError если все провайдеры упали
   */
  async search(query: string, options?: SearchOptions): Promise<SearchResponse> {
    const errors: SearchError[] = [];
    
    // Шаг 1: Пробуем платные провайдеры по приоритету
    for (const providerName of this.providerPriority) {
      const provider = this.providers[providerName as keyof typeof this.providers];
      
      try {
        // Проверяем доступность провайдера
        if (!(await provider.isAvailable())) {
          errors.push({
            provider: providerName,
            message: "Provider not available (missing API key?)",
            type: "auth",
          });
          continue;
        }
        
        // Трансформируем запрос под провайдера
        const transformedQuery = await this.transformer.transform(query, providerName);
        
        // Выполняем поиск с повторами
        const response = await this.searchWithRetry(provider, transformedQuery, options);
        
        // Проверяем, есть ли результаты
        if (response.results.length > 0) {
          return response;
        }
        
        // Пустые результаты — пробуем следующий провайдер
        errors.push({
          provider: providerName,
          message: "No results found",
          type: "unknown",
        });
      } catch (error) {
        const searchError = this.normalizeError(error, providerName);
        errors.push(searchError);
        
        // Если это auth ошибка — не пробуем этот провайдер дальше
        if (searchError.type === "auth") {
          continue;
        }
        
        // Для других ошибок пробуем следующий провайдер
      }
    }
    
    // Шаг 2: Все платные упали → используем fallback
    console.warn("[WebSearch] All paid providers failed, using fallback");
    
    return this.searchFallback(query, options, errors);
  }
  
  /**
   * Поиск с повторами при ошибке
   */
  private async searchWithRetry(
    provider: any,
    query: string,
    options?: SearchOptions,
    retriesLeft?: number
  ): Promise<SearchResponse> {
    const retries = retriesLeft ?? this.maxRetries;
    
    try {
      return await provider.search(query, options);
    } catch (error) {
      const searchError = this.normalizeError(error, provider.name);
      
      // Повторяем только при timeout или network ошибке
      if (retries > 0 && (searchError.type === "timeout" || searchError.type === "network")) {
        console.warn(`[WebSearch] ${provider.name} failed, retrying... (${retries} left)`);
        return this.searchWithRetry(provider, query, options, retries - 1);
      }
      
      throw error;
    }
  }
  
  /**
   * Fallback поиск по типу запроса
   */
  private async searchFallback(
    query: string,
    options?: SearchOptions,
    previousErrors?: SearchError[]
  ): Promise<SearchResponse> {
    // Определяем тип запроса
    const queryType = this.detectQueryType(query);
    
    // Выбираем fallback провайдера по типу запроса
    const fallbackProvider = this.selectFallbackProvider(queryType);
    
    console.log(`[WebSearch] Using fallback provider: ${fallbackProvider} (query type: ${queryType})`);
    
    try {
      // Трансформируем запрос под fallback провайдера
      const transformedQuery = await this.transformer.transform(query, fallbackProvider);
      
      // Выполняем поиск
      const provider = this.providers[fallbackProvider as keyof typeof this.providers];
      const response = await provider.search(transformedQuery, options);
      
      return response;
    } catch (error) {
      // Если fallback тоже упал — пробуем альтернативные
      return this.searchFallbackAlternatives(query, options, previousErrors, fallbackProvider);
    }
  }
  
  /**
   * Альтернативные fallback провайдеры
   */
  private async searchFallbackAlternatives(
    query: string,
    options?: SearchOptions,
    previousErrors?: SearchError[],
    failedProvider?: string
  ): Promise<SearchResponse> {
    const alternatives = this.getFallbackAlternatives(failedProvider);
    
    for (const providerName of alternatives) {
      try {
        const transformedQuery = await this.transformer.transform(query, providerName);
        const provider = this.providers[providerName as keyof typeof this.providers];
        const response = await provider.search(transformedQuery, options);
        
        if (response.results.length > 0) {
          return response;
        }
      } catch (error) {
        console.warn(`[WebSearch] Fallback ${providerName} failed`);
        continue;
      }
    }
    
    // Все провайдеры упали
    throw this.createAllProvidersFailedError(previousErrors ?? []);
  }
  
  /**
   * Определение типа запроса
   */
  private detectQueryType(query: string): QueryType {
    const q = query.toLowerCase();
    
    // Научный/исследовательский запрос
    if (
      q.includes("исследование") ||
      q.includes("paper") ||
      q.includes("study") ||
      q.includes("архив") ||
      q.includes("рецензия") ||
      q.includes("научн") ||
      q.includes("статья")
    ) {
      return QueryType.RESEARCH;
    }
    
    // Энциклопедический запрос
    if (
      q.startsWith("что такое") ||
      q.startsWith("кто такой") ||
      q.startsWith("кто такая") ||
      q.includes("определение") ||
      q.includes("история") ||
      q.match(/^(что|кто|как|почему|зачем)\s+/i)
    ) {
      return QueryType.ENCYCLOPEDIA;
    }
    
    // Tech новости
    if (
      q.includes("релиз") ||
      q.includes("версия") ||
      q.includes("обновление") ||
      q.includes("github") ||
      q.includes("open source") ||
      q.includes("release") ||
      q.includes("announces")
    ) {
      return QueryType.TECH_NEWS;
    }
    
    // По умолчанию — общий запрос
    return QueryType.GENERAL;
  }
  
  /**
   * Выбор fallback провайдера по типу запроса
   */
  private selectFallbackProvider(queryType: QueryType): string {
    switch (queryType) {
      case QueryType.RESEARCH:
        return "arxiv";
      
      case QueryType.ENCYCLOPEDIA:
        return "wikipedia";
      
      case QueryType.TECH_NEWS:
        return "hackernews";
      
      case QueryType.GENERAL:
      default:
        return "google";
    }
  }
  
  /**
   * Альтернативные fallback провайдеры
   */
  private getFallbackAlternatives(failedProvider?: string): string[] {
    const allFallbacks = ["google", "wikipedia", "arxiv", "hackernews"];
    
    if (!failedProvider) {
      return allFallbacks;
    }
    
    return allFallbacks.filter(p => p !== failedProvider);
  }
  
  /**
   * Нормализация ошибки
   */
  private normalizeError(error: any, provider: string): SearchError {
    if (error && typeof error === "object" && "provider" in error) {
      return error as SearchError;
    }
    
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        return {
          provider,
          message: "Request timeout",
          type: "timeout",
          originalError: error,
        };
      }
      
      const message = error.message.toLowerCase();
      
      if (message.includes("auth") || message.includes("key") || message.includes("401")) {
        return {
          provider,
          message: error.message,
          type: "auth",
          originalError: error,
        };
      }
      
      if (message.includes("rate") || message.includes("limit") || message.includes("429")) {
        return {
          provider,
          message: error.message,
          type: "rate_limit",
          originalError: error,
        };
      }
      
      if (message.includes("network") || message.includes("fetch") || message.includes("econnrefused")) {
        return {
          provider,
          message: error.message,
          type: "network",
          originalError: error,
        };
      }
      
      return {
        provider,
        message: error.message,
        type: "unknown",
        originalError: error,
      };
    }
    
    return {
      provider,
      message: String(error),
      type: "unknown",
    };
  }
  
  /**
   * Создание ошибки "все провайдеры упали"
   */
  private createAllProvidersFailedError(errors: SearchError[]): SearchError {
    const providerList = errors.map(e => `${e.provider} (${e.type})`).join(", ");
    
    return {
      provider: "all",
      message: `All providers failed: ${providerList}`,
      type: "unknown",
    };
  }
  
  /**
   * Получить статус провайдеров (для отладки)
   */
  async getProviderStatus(): Promise<Record<string, boolean>> {
    const status: Record<string, boolean> = {};
    
    for (const [name, provider] of Object.entries(this.providers)) {
      status[name] = await provider.isAvailable();
    }
    
    return status;
  }
}

/**
 * Функция для быстрого поиска (обёртка над SearchRouter)
 * 
 * @example
 * const results = await searchWithFallback("AI news");
 */
export async function searchWithFallback(
  query: string,
  options?: SearchOptions
): Promise<SearchResponse> {
  const router = new SearchRouter();
  return router.search(query, options);
}

/**
 * Функция для выбора провайдера по типу запроса (без выполнения поиска)
 * 
 * @example
 * const provider = selectProviderForQuery("что такое квантовая запутанность");
 * // Returns: "wikipedia"
 */
export function selectProviderForQuery(query: string): string {
  const router = new SearchRouter();
  const queryType = (router as any).detectQueryType(query);
  return (router as any).selectFallbackProvider(queryType);
}
