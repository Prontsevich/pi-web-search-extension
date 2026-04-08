// ============================================================================
// Web Search Extension — Hacker News API провайдер
// ============================================================================

import type { SearchProvider, SearchResponse, SearchResult, SearchOptions, SearchError } from "../types";

/**
 * Hacker News API провайдер
 * 
 * Преимущества:
 * - ✅ Бесплатный API без ключей
 * - ✅ Tech новости и обсуждения
 * - ✅ Актуальные релизы и обновления
 * - ✅ Сообщество разработчиков
 * 
 * Ограничения:
 * - ❌ Только IT-тематика
 * - ❌ Ограниченный архив
 * - ❌ Англоязычный контент
 * 
 * Документация: https://hn.algolia.com/api
 * 
 * @example
 * const provider = new HackerNewsProvider();
 * const response = await provider.search("AI release", { numResults: 10 });
 */
export class HackerNewsProvider implements SearchProvider {
  readonly name = "hackernews";
  
  /**
   * URL Hacker News API (Algolia)
   */
  private readonly apiUrl = "https://hn.algolia.com/api/v1/search";
  
  /**
   * Выполнить поиск через Hacker News API
   */
  async search(query: string, options?: SearchOptions): Promise<SearchResponse> {
    const numResults = options?.numResults ?? 10;
    
    try {
      // Формируем URL для Hacker News API
      const url = `${this.apiUrl}?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=${numResults}`;
      
      const response = await fetch(url, {
        headers: {
          "Accept": "application/json",
        },
        signal: AbortSignal.timeout(30000),
      });
      
      if (!response.ok) {
        throw this.createError(`Hacker News API error: ${response.status}`, "network");
      }
      
      const data = await response.json();
      const results = this.parseResponse(data);
      
      return {
        results,
        provider: this.name,
        isFallback: true,
        query,
        requestUrl: url,
      };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw this.createError("Hacker News API timeout (>30s)", "timeout");
      }
      if (error instanceof Error) {
        throw this.createError(`Hacker News search failed: ${error.message}`, "network");
      }
      throw this.createError("Hacker News search failed", "unknown");
    }
  }
  
  /**
   * Парсинг ответа от Hacker News API
   */
  private parseResponse(data: any): SearchResult[] {
    const hits = data.hits ?? [];
    
    return hits.map((hit: any): SearchResult => ({
      title: hit.title ?? "No title",
      url: hit.url ?? `https://news.ycombinator.com/item?id=${hit.objectID}`,
      snippet: `${hit.points ?? 0} points | ${hit.num_comments ?? 0} comments | ${hit.author ?? "unknown"}`,
      source: this.name,
      publishedDate: hit.created_at_i ? new Date(hit.created_at_i * 1000).toISOString().split("T")[0] : undefined,
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
   * Проверка доступности Hacker News API
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}?query=test&hitsPerPage=1`, {
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
