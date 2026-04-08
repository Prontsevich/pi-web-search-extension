// ============================================================================
// Web Search Extension — Wikipedia API провайдер
// ============================================================================

import type { SearchProvider, SearchResponse, SearchResult, SearchOptions, SearchError } from "../types";

/**
 * Wikipedia API провайдер
 * 
 * Преимущества:
 * - ✅ Бесплатный API без ключей
 * - ✅ Стабильный и надёжный
 * - ✅ Структурированные данные
 * - ✅ Энциклопедическая информация
 * 
 * Ограничения:
 * - ❌ Только энциклопедические статьи
 * - ❌ Не подходит для новостей
 * - ❌ Обновляется вручную (может устаревать)
 * 
 * Документация: https://www.mediawiki.org/wiki/API:Main_page
 * 
 * @example
 * const provider = new WikipediaProvider();
 * const response = await provider.search("квантовая запутанность", { numResults: 5 });
 */
export class WikipediaProvider implements SearchProvider {
  readonly name = "wikipedia";
  
  /**
   * URL Wikipedia API
   * Используем русскую и английскую версии
   */
  private readonly apiUrl = "https://en.wikipedia.org/w/api.php";
  
  /**
   * Выполнить поиск через Wikipedia API
   */
  async search(query: string, options?: SearchOptions): Promise<SearchResponse> {
    const numResults = options?.numResults ?? 10;
    
    try {
      // Формируем URL для Wikipedia API
      const url = `${this.apiUrl}?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=${numResults}&format=json&origin=*`;
      
      const response = await fetch(url, {
        headers: {
          "Accept": "application/json",
        },
        signal: AbortSignal.timeout(30000),
      });
      
      if (!response.ok) {
        throw this.createError(`Wikipedia API error: ${response.status}`, "network");
      }
      
      const data = await response.json();
      const results = this.parseResponse(data, query);
      
      return {
        results,
        provider: this.name,
        isFallback: true,
        query,
        requestUrl: url,
      };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw this.createError("Wikipedia API timeout (>30s)", "timeout");
      }
      if (error instanceof Error) {
        throw this.createError(`Wikipedia search failed: ${error.message}`, "network");
      }
      throw this.createError("Wikipedia search failed", "unknown");
    }
  }
  
  /**
   * Парсинг ответа от Wikipedia API
   */
  private parseResponse(data: any, query: string): SearchResult[] {
    const search = data.query?.search ?? [];
    
    return search.map((item: any): SearchResult => ({
      title: item.title,
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, "_"))}`,
      snippet: this.stripHtml(item.snippet),
      source: this.name,
      publishedDate: item.timestamp,
    }));
  }
  
  /**
   * Удаление HTML тегов из сниппета
   * Wikipedia возвращает сниппеты с HTML-разметкой
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, " ")
      .trim();
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
   * Проверка доступности Wikipedia API
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}?action=query&format=json&origin=*`, {
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
