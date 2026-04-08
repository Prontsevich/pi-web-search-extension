// ============================================================================
// Web Search Extension — Perplexity API провайдер
// ============================================================================

import type { SearchProvider, SearchResponse, SearchResult, SearchOptions, SearchError } from "../types";

/**
 * Perplexity API провайдер
 * 
 * Преимущества:
 * - ✅ Глубокий анализ с цитированием
 * - ✅ AI-ответы на вопросы
 * - ✅ Свежие данные (особенно новости)
 * - ✅ Высокое качество результатов
 * 
 * Недостатки:
 * - ❌ Медленнее конкурентов (~3-5 сек)
 * - ❌ Дороже (~$0.005/запрос)
 * - ❌ Только ссылки (нет извлечения контента)
 * 
 * Документация: https://docs.perplexity.ai
 * 
 * @example
 * const provider = new PerplexityProvider();
 * const response = await provider.search("latest AI news", { numResults: 10 });
 */
export class PerplexityProvider implements SearchProvider {
  readonly name = "perplexity";
  
  private readonly baseUrl = "https://api.perplexity.ai/chat/completions";
  private readonly apiKey?: string;
  
  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.PERPLEXITY_API_KEY;
  }
  
  /**
   * Выполнить поиск через Perplexity API
   * 
   * Perplexity не имеет прямого search API, используем chat/completions
   * с моделью sonar-pro (поиск + AI анализ)
   */
  async search(query: string, options?: SearchOptions): Promise<SearchResponse> {
    const numResults = options?.numResults ?? 10;
    
    // Проверяем API ключ
    if (!this.apiKey) {
      throw this.createError("PERPLEXITY_API_KEY not set", "auth");
    }
    
    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: "sonar-pro", // или "sonar" для более быстрого ответа
          messages: [
            {
              role: "system",
              content: "Provide search results with citations. Return relevant information with source URLs.",
            },
            {
              role: "user",
              content: query,
            },
          ],
          max_tokens: 2000,
          temperature: 0.2,
        }),
        signal: AbortSignal.timeout(30000),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw this.createError(
          `Perplexity API error: ${response.status} ${errorData.error?.message || response.statusText}`,
          response.status === 401 ? "auth" : response.status === 429 ? "rate_limit" : "network"
        );
      }
      
      const data = await response.json();
      const results = this.parseResponse(data, query, numResults);
      
      return {
        results,
        provider: this.name,
        isFallback: false,
        query,
        requestUrl: this.baseUrl,
      };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw this.createError("Perplexity API timeout (>30s)", "timeout");
      }
      throw error;
    }
  }
  
  /**
   * Парсинг ответа от Perplexity API
   * 
   * Perplexity возвращает AI-ответ с цитатами, парсим их в SearchResult
   */
  private parseResponse(data: any, query: string, numResults: number): SearchResult[] {
    const choice = data.choices?.[0];
    if (!choice) {
      return [];
    }
    
    const content = choice.message?.content ?? "";
    const citations = choice.message?.citations ?? [];
    
    // Если есть цитаты — используем их
    if (citations.length > 0) {
      return citations.slice(0, numResults).map((url: string, index: number): SearchResult => ({
        title: `Source ${index + 1}`,
        url,
        snippet: content.slice(0, 200),
        source: this.name,
      }));
    }
    
    // Если цитат нет — создаём один результат с AI-ответом
    return [{
      title: "Perplexity Answer",
      url: "https://www.perplexity.ai",
      snippet: content,
      source: this.name,
    }];
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
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: "sonar-pro",
          messages: [{ role: "user", content: "test" }],
          max_tokens: 10,
        }),
        signal: AbortSignal.timeout(5000),
      });
      
      return response.ok || response.status === 429;
    } catch {
      return false;
    }
  }
}
