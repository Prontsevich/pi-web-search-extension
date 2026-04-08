// ============================================================================
// Web Search Extension — Google Search через fetch_url
// ============================================================================

import type { SearchProvider, SearchResponse, SearchResult, SearchOptions, SearchError } from "../types";

/**
 * Google Search через fetch_url
 * 
 * Преимущества:
 * - ✅ Не требует API ключа
 * - ✅ Полноценный поисковик
 * - ✅ Актуальные результаты
 * - ✅ Бесконечный лимит
 * 
 * Ограничения:
 * - ❌ HTML парсинг (может ломаться при изменении структуры Google)
 * - ❌ Медленнее API (~2-5 сек)
 * - ❌ Google может блокировать автоматические запросы
 * 
 * @example
 * const provider = new GoogleProvider();
 * const response = await provider.search("AI news", { numResults: 10 });
 */
export class GoogleProvider implements SearchProvider {
  readonly name = "google";
  
  /**
   * URL поиска Google
   * Используем обычную поисковую выдачу
   */
  private readonly searchUrl = "https://www.google.com/search";
  
  /**
   * Выполнить поиск через Google
   * 
   * @param query - Поисковый запрос
   * @param options - Опции поиска
   */
  async search(query: string, options?: SearchOptions): Promise<SearchResponse> {
    const numResults = options?.numResults ?? 10;
    
    try {
      // Формируем URL для Google поиска
      const url = `${this.searchUrl}?q=${encodeURIComponent(query)}&num=${numResults}&hl=en`;
      
      // Используем fetch_url для получения HTML
      // В реальной реализации это будет вызов инструмента fetch_url
      const html = await this.fetchHtml(url);
      
      // Парсим HTML результаты
      const results = this.parseGoogleHtml(html, numResults);
      
      return {
        results,
        provider: this.name,
        isFallback: true,
        query,
        requestUrl: url,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw this.createError(`Google search failed: ${error.message}`, "network");
      }
      throw this.createError("Google search failed", "unknown");
    }
  }
  
  /**
   * Получение HTML страницы
   * 
   * В реальной реализации будет использовать fetch_url инструмент pi
   */
  private async fetchHtml(url: string): Promise<string> {
    // TODO: Заменить на вызов fetch_url инструмента pi
    // const result = await fetchUrl(url, { format: "raw" });
    // return result.fullContent;
    
    // Временная реализация через обычный fetch
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      signal: AbortSignal.timeout(30000),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.text();
  }
  
  /**
   * Парсинг HTML выдачи Google
   * 
   * Извлекаем результаты из структуры Google SERP
   */
  private parseGoogleHtml(html: string, numResults: number): SearchResult[] {
    const results: SearchResult[] = [];
    
    // Регулярные выражения для парсинга результатов Google
    // Примечание: структура Google может меняться, это приблизительный парсинг
    
    // Ищем блоки результатов <div class="g"> или <div data-hveid>
    const resultRegex = /<div[^>]*class=["']g["'][^>]*>([\s\S]*?)<\/div>/gi;
    
    let match;
    let count = 0;
    
    while ((match = resultRegex.exec(html)) !== null && count < numResults) {
      const block = match[1];
      
      // Извлекаем заголовок <h3>
      const titleMatch = block.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
      const title = titleMatch 
        ? this.stripHtml(titleMatch[1]).trim()
        : "No title";
      
      // Извлекаем URL <a href>
      const urlMatch = block.match(/<a[^>]*href=["']([^"']*)["'][^>]*>/i);
      const url = urlMatch ? urlMatch[1] : "";
      
      // Пропускаем внутренние ссылки Google
      if (url.startsWith("/search") || url.startsWith("https://www.google.com")) {
        continue;
      }
      
      // Извлекаем сниппет (текст описания)
      const snippetMatch = block.match(/<div[^>]*class=["'][^"']*VwiC3b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
      const snippet = snippetMatch
        ? this.stripHtml(snippetMatch[1]).slice(0, 200).trim()
        : "";
      
      if (url && title !== "No title") {
        results.push({
          title,
          url,
          snippet,
          source: this.name,
        });
        count++;
      }
    }
    
    // Если не нашли через class="g", пробуем альтернативный парсинг
    if (results.length === 0) {
      return this.parseGoogleFallback(html, numResults);
    }
    
    return results;
  }
  
  /**
   * Альтернативный парсинг Google (fallback)
   */
  private parseGoogleFallback(html: string, numResults: number): SearchResult[] {
    const results: SearchResult[] = [];
    
    // Ищем все ссылки с заголовками
    const linkRegex = /<a[^>]*href=["']([^"']*\/url\?q=([^"']*))["'][^>]*>([\s\S]*?)<\/a>/gi;
    
    let match;
    let count = 0;
    
    while ((match = linkRegex.exec(html)) !== null && count < numResults) {
      const fullUrl = match[2] || match[1];
      const title = this.stripHtml(match[3]).trim();
      
      // Пропускаем короткие или служебные заголовки
      if (title.length < 10 || title.includes("Google")) {
        continue;
      }
      
      // Декодируем URL
      const url = decodeURIComponent(fullUrl.split("&")[0]);
      
      results.push({
        title,
        url,
        snippet: "", // Сниппет сложно извлечь без точной структуры
        source: this.name,
      });
      count++;
    }
    
    return results;
  }
  
  /**
   * Удаление HTML тегов из строки
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
   * Проверка доступности (всегда true для Google)
   */
  async isAvailable(): Promise<boolean> {
    // Google всегда доступен, но может блокировать запросы
    return true;
  }
}
