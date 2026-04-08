// ============================================================================
// Web Search Extension — arXiv API провайдер
// ============================================================================

import type { SearchProvider, SearchResponse, SearchResult, SearchOptions, SearchError } from "../types";

/**
 * arXiv API провайдер
 * 
 * Преимущества:
 * - ✅ Бесплатный API без ключей
 * - ✅ Научные статьи (физика, CS, математика, ML)
 * - ✅ Свежие препринты
 * - ✅ Структурированные метаданные
 * 
 * Ограничения:
 * - ❌ Только научные публикации
 * - ❌ Atom XML формат (сложный парсинг)
 * - ❌ Англоязычные статьи
 * 
 * Документация: https://arxiv.org/help/api
 * 
 * @example
 * const provider = new ArxivProvider();
 * const response = await provider.search("transformer architecture", { numResults: 10 });
 */
export class ArxivProvider implements SearchProvider {
  readonly name = "arxiv";
  
  /**
   * URL arXiv API
   */
  private readonly apiUrl = "http://export.arxiv.org/api/query";
  
  /**
   * Выполнить поиск через arXiv API
   */
  async search(query: string, options?: SearchOptions): Promise<SearchResponse> {
    const numResults = options?.numResults ?? 10;
    
    try {
      // Формируем URL для arXiv API
      // Используем префикс "all:" для поиска по всем полям
      const searchQuery = query.startsWith("all:") ? query : `all:${query}`;
      
      const url = `${this.apiUrl}?search_query=${encodeURIComponent(searchQuery)}&max_results=${numResults}&sortBy=relevance&sortOrder=descending`;
      
      const response = await fetch(url, {
        headers: {
          "Accept": "application/atom+xml",
        },
        signal: AbortSignal.timeout(30000),
      });
      
      if (!response.ok) {
        throw this.createError(`arXiv API error: ${response.status}`, "network");
      }
      
      const xml = await response.text();
      const results = this.parseArxivXml(xml);
      
      return {
        results,
        provider: this.name,
        isFallback: true,
        query,
        requestUrl: url,
      };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw this.createError("arXiv API timeout (>30s)", "timeout");
      }
      if (error instanceof Error) {
        throw this.createError(`arXiv search failed: ${error.message}`, "network");
      }
      throw this.createError("arXiv search failed", "unknown");
    }
  }
  
  /**
   * Парсинг Atom XML ответа от arXiv
   */
  private parseArxivXml(xml: string): SearchResult[] {
    const results: SearchResult[] = [];
    
    // Извлекаем записи <entry> из Atom XML
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
    let match;
    
    while ((match = entryRegex.exec(xml)) !== null) {
      const entry = match[1];
      
      // Извлекаем заголовок
      const titleMatch = entry.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const title = titleMatch ? this.stripXml(titleMatch[1]).trim() : "No title";
      
      // Извлекаем URL
      const urlMatch = entry.match(/<id[^>]*>([\s\S]*?)<\/id>/i);
      const url = urlMatch ? urlMatch[1].trim() : "";
      
      // Извлекаем аннотацию (summary)
      const summaryMatch = entry.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i);
      const summary = summaryMatch ? this.stripXml(summaryMatch[1]).slice(0, 300).trim() : "";
      
      // Извлекаем дату публикации
      const publishedMatch = entry.match(/<published[^>]*>([\s\S]*?)<\/published>/i);
      const publishedDate = publishedMatch ? publishedMatch[1].split("T")[0] : undefined;
      
      // Извлекаем авторов
      const authors: string[] = [];
      const authorRegex = /<author[^>]*>([\s\S]*?)<\/author>/gi;
      let authorMatch;
      while ((authorMatch = authorRegex.exec(entry)) !== null) {
        const nameMatch = authorMatch[1].match(/<name[^>]*>([\s\S]*?)<\/name>/i);
        if (nameMatch) {
          authors.push(nameMatch[1].trim());
        }
      }
      
      if (url && title !== "No title") {
        results.push({
          title: this.formatTitle(title),
          url,
          snippet: summary,
          source: this.name,
          publishedDate,
        });
      }
    }
    
    return results;
  }
  
  /**
   * Форматирование заголовка
   * arXiv заголовки могут быть в верхнем регистре
   */
  private formatTitle(title: string): string {
    // Если заголовок полностью в верхнем регистре (кроме первого слова)
    // оставляем как есть (это научный стиль)
    return title.replace(/\s+/g, " ").trim();
  }
  
  /**
   * Удаление XML тегов из строки
   */
  private stripXml(xml: string): string {
    return xml
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#xA;/g, "\n")
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
   * Проверка доступности arXiv API
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}?search_query=test&max_results=1`, {
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
