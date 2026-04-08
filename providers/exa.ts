// ============================================================================
// Web Search Extension — Exa API провайдер
// ============================================================================

import type { SearchProvider, SearchResponse, SearchResult, SearchOptions, SearchError } from "../types";

/**
 * Exa API провайдер
 * 
 * Преимущества:
 * - ✅ Нейронный поиск (понимает смысл, а не ключевые слова)
 * - ✅ Категории (news, research paper, people, company)
 * - ✅ Извлечение контента
 * - ✅ Поиск по коду (GitHub)
 * 
 * Документация: https://docs.exa.ai
 * 
 * @example
 * const provider = new ExaProvider();
 * const response = await provider.search("AI research", { 
 *   numResults: 10,
 *   category: "research"
 * });
 */
export class ExaProvider implements SearchProvider {
  readonly name = "exa";
  
  private readonly baseUrl = "https://api.exa.ai/search";
  private readonly apiKey?: string;
  
  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.EXA_API_KEY;
  }
  
  /**
   * Выполнить поиск через Exa API
   */
  async search(query: string, options?: SearchOptions): Promise<SearchResponse> {
    const numResults = options?.numResults ?? 10;
    const includeContent = options?.includeContent ?? false;
    const maxContentLength = options?.maxContentLength ?? 5000;
    const category = options?.category;
    
    // Проверяем API ключ
    if (!this.apiKey) {
      throw this.createError("EXA_API_KEY not set", "auth");
    }
    
    try {
      const body: any = {
        query,
        type: "auto", // auto, fast, deep, deep-reasoning
        num_results: numResults,
      };
      
      // Добавляем категорию если указана
      if (category) {
        body.category = this.mapCategory(category);
      }
      
      // Добавляем контент если запрошено
      if (includeContent) {
        body.contents = {
          highlights: {
            max_characters: Math.min(maxContentLength, 4000),
          },
        };
      }
      
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30000),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw this.createError(
          `Exa API error: ${response.status} ${errorData.error?.message || response.statusText}`,
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
        throw this.createError("Exa API timeout (>30s)", "timeout");
      }
      throw error;
    }
  }
  
  /**
   * Маппинг категории из внутреннего формата в Exa
   */
  private mapCategory(category: string): string {
    const categoryMap: Record<string, string> = {
      "news": "news",
      "research": "research paper",
      "people": "people",
      "company": "company",
    };
    
    return categoryMap[category] || "auto";
  }
  
  /**
   * Парсинг ответа от Exa API
   */
  private parseResponse(data: any, includeContent: boolean, maxContentLength: number): SearchResult[] {
    const results = data.results ?? [];
    
    return results.map((result: any): SearchResult => ({
      title: result.title ?? "No title",
      url: result.url ?? "",
      snippet: includeContent 
        ? (result.highlights?.[0] ?? result.text?.slice(0, 500) ?? "")
        : (result.text?.slice(0, 200) ?? ""),
      source: this.name,
      publishedDate: result.publishedDate,
      content: includeContent && result.text
        ? result.text.slice(0, maxContentLength)
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
          "x-api-key": this.apiKey,
        },
        body: JSON.stringify({
          query: "test",
          num_results: 1,
        }),
        signal: AbortSignal.timeout(5000),
      });
      
      return response.ok || response.status === 429;
    } catch {
      return false;
    }
  }
}
