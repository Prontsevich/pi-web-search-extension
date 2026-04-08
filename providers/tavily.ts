// ============================================================================
// Web Search Extension — Tavily API провайдер
// ============================================================================

import type { SearchProvider, SearchResponse, SearchResult, SearchOptions, SearchError } from "../types";

/**
 * Tavily API провайдер
 * 
 * Преимущества:
 * - ✅ Оптимизирован для AI агентов
 * - ✅ Встроенное извлечение контента
 * - ✅ Быстрый ответ (~1 сек)
 * - ✅ Хорошее качество результатов
 * 
 * Документация: https://docs.tavily.com
 * 
 * @example
 * const provider = new TavilyProvider();
 * const response = await provider.search("AI news", { numResults: 10 });
 */
export class TavilyProvider implements SearchProvider {
  readonly name = "tavily";
  
  private readonly baseUrl = "https://api.tavily.com/search";
  private readonly apiKey?: string;
  
  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.TAVILY_API_KEY;
  }
  
  /**
   * Выполнить поиск через Tavily API
   */
  async search(query: string, options?: SearchOptions): Promise<SearchResponse> {
    const numResults = options?.numResults ?? 10;
    const includeContent = options?.includeContent ?? false;
    const maxContentLength = options?.maxContentLength ?? 5000;
    
    // Проверяем API ключ
    if (!this.apiKey) {
      throw this.createError("TAVILY_API_KEY not set", "auth");
    }
    
    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          api_key: this.apiKey,
          query,
          max_results: numResults,
          include_content: includeContent,
          include_answer: true,
          include_raw_content: false,
          search_depth: "basic",
        }),
        signal: AbortSignal.timeout(30000),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw this.createError(
          `Tavily API error: ${response.status} ${errorData.error?.message || response.statusText}`,
          response.status === 401 ? "auth" : response.status === 429 ? "rate_limit" : "network"
        );
      }
      
      const data = await response.json();
      const results = this.parseResponse(data, includeContent, maxContentLength);
      
      return {
        results,
        provider: this.name,
        isFallback: false,
        query,
        requestUrl: this.baseUrl,
      };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw this.createError("Tavily API timeout (>30s)", "timeout");
      }
      throw error;
    }
  }
  
  /**
   * Парсинг ответа от Tavily API
   */
  private parseResponse(data: any, includeContent: boolean, maxContentLength: number): SearchResult[] {
    const results = data.results ?? [];
    
    return results.map((result: any): SearchResult => ({
      title: result.title ?? "No title",
      url: result.url ?? "",
      snippet: result.content ?? result.snippet ?? "",
      source: this.name,
      publishedDate: result.published_date,
      content: includeContent && result.content 
        ? result.content.slice(0, maxContentLength) 
        : undefined,
    }));
  }
  
  /**
   * Создание объекта ошибки
   */
  private createError(message: string, type: SearchError["type"]): SearchError {
    return {
      provider: this.name,
      message,
      type,
    };
  }
  
  /**
   * Проверка доступности API ключа
   */
  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }
    
    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          api_key: this.apiKey,
          query: "test",
          max_results: 1,
        }),
        signal: AbortSignal.timeout(5000),
      });
      
      return response.ok || response.status === 429; // 429 = ключ валиден, лимит исчерпан
    } catch {
      return false;
    }
  }
}
