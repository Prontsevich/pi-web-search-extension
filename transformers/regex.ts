// ============================================================================
// Web Search Extension — Regex трансформер запросов
// ============================================================================

import type { QueryTransformer, TransformOptions, TransformResult } from "./interface";

/**
 * Базовый трансформер на основе регулярных выражений
 * 
 * Преимущества:
 * - ✅ Мгновенная работа (0 мс)
 * - ✅ Не требует API ключей
 * - ✅ Предсказуемые результаты
 * - ✅ Работает офлайн
 * 
 * Ограничения:
 * - ❌ Не понимает контекст
 * - ❌ Не адаптируется к стилю запроса
 * - ❌ Требует ручного добавления правил
 * 
 * @example
 * const transformer = new RegexTransformer();
 * const query = await transformer.transform(
 *   "Пожалуйста, найди последние новости об AI",
 *   "google"
 * );
 * // Результат: "AI новости"
 */
export class RegexTransformer implements QueryTransformer {
  readonly name = "RegexTransformer";
  
  /** Стоп-слова для удаления из запросов */
  private readonly stopWords = [
    // Русские
    "пожалуйста", "найди", "найти", "покажи", "показать", "хочу", "нужно",
    "мне", "для", "меня", "сделай", "сделать", "дай", "дать", "есть",
    "какие", "какой", "какая", "какое", "кто", "что", "где", "когда",
    "как", "почему", "зачем", "можно", "нельзя", "надо", "нужно",
    
    // Английские
    "please", "find", "show", "want", "need", "me", "for", "make",
    "give", "what", "who", "where", "when", "how", "why", "can",
  ];
  
  /** Паттерны для извлечения ключевой информации */
  private readonly patterns = {
    // "Что такое X" → "X"
    whatIs: /^(что такое|what is|определение)\s+(.+)/i,
    
    // "Кто такой X" → "X"
    whoIs: /^(кто такой|кто такая|who is)\s+(.+)/i,
    
    // "Найди информацию о X" → "X"
    findInfo: /^(найди информацию|find information|инфа)\s+о\s+(.+)/i,
    
    // "Последние новости о X" → "X новости"
    latestNews: /^(последние новости|latest news|новости)\s+о?\s*(.+)/i,
    
    // "Исследования про X" → "X research"
    research: /^(исследования|research|papers)\s+о?\s*(.+)/i,
  };
  
  /**
   * Трансформировать запрос под конкретный сервис
   */
  async transform(query: string, provider: string): Promise<string> {
    const startTime = Date.now();
    const originalQuery = query;
    const changes: string[] = [];
    
    let transformed = query;
    
    // Применяем трансформации в зависимости от провайдера
    switch (provider.toLowerCase()) {
      case "google":
        transformed = this.transformForGoogle(transformed, changes);
        break;
      
      case "wikipedia":
        transformed = this.transformForWikipedia(transformed, changes);
        break;
      
      case "arxiv":
        transformed = this.transformForArxiv(transformed, changes);
        break;
      
      case "hackernews":
        transformed = this.transformForHackerNews(transformed, changes);
        break;
      
      default:
        // Для остальных провайдеров минимальная обработка
        transformed = this.removeStopWords(transformed, changes);
    }
    
    // Ограничиваем длину
    transformed = transformed.slice(0, 150);
    
    const durationMs = Date.now() - startTime;
    
    // Для отладки можно вернуть расширенный результат
    // (в текущей реализации возвращаем только строку)
    return transformed;
  }
  
  /**
   * Трансформация для Google
   * Google лучше работает с краткими запросами без лишних слов
   */
  private transformForGoogle(query: string, changes: string[]): string {
    let result = query;
    
    // Удаляем стоп-слова
    result = this.removeStopWords(result, changes);
    
    // Извлекаем ключевую тему из вопросов
    for (const [name, pattern] of Object.entries(this.patterns)) {
      const match = result.match(pattern);
      if (match) {
        result = match[2].trim();
        changes.push(`Extracted from ${name}: "${result}"`);
        break;
      }
    }
    
    // Удаляем лишние пробелы
    result = result.replace(/\s+/g, " ").trim();
    
    return result;
  }
  
  /**
   * Трансформация для Wikipedia
   * Wikipedia любит точные термины и названия
   */
  private transformForWikipedia(query: string, changes: string[]): string {
    let result = query;
    
    // Для вопросов "что такое" извлекаем термин
    const whatIsMatch = result.match(this.patterns.whatIs);
    if (whatIsMatch) {
      result = whatIsMatch[2].trim();
      changes.push(`Wikipedia term extracted: "${result}"`);
      return result;
    }
    
    // Для вопросов "кто такой" извлекаем имя
    const whoIsMatch = result.match(this.patterns.whoIs);
    if (whoIsMatch) {
      result = whoIsMatch[2].trim();
      changes.push(`Wikipedia person extracted: "${result}"`);
      return result;
    }
    
    // Удаляем стоп-слова
    result = this.removeStopWords(result, changes);
    
    return result;
  }
  
  /**
   * Трансформация для arXiv
   * arXiv требует специальный синтаксис и предпочитает английские термины
   */
  private transformForArxiv(query: string, changes: string[]): string {
    let result = query;
    
    // Удаляем стоп-слова
    result = this.removeStopWords(result, changes);
    
    // Извлекаем тему исследования
    const researchMatch = result.match(this.patterns.research);
    if (researchMatch) {
      result = researchMatch[2].trim();
      changes.push(`arXiv topic extracted: "${result}"`);
    }
    
    // Добавляем префикс для поиска по всем полям
    result = `all:${result}`;
    
    return result;
  }
  
  /**
   * Трансформация для Hacker News
   * Tech новости, релизы, обсуждения
   */
  private transformForHackerNews(query: string, changes: string[]): string {
    let result = query;
    
    // Извлекаем тему новостей
    const newsMatch = result.match(this.patterns.latestNews);
    if (newsMatch) {
      result = newsMatch[2].trim();
      changes.push(`HN topic extracted: "${result}"`);
    }
    
    // Удаляем стоп-слова
    result = this.removeStopWords(result, changes);
    
    return result;
  }
  
  /**
   * Удаление стоп-слов из запроса
   */
  private removeStopWords(query: string, changes: string[]): string {
    let result = query;
    const removed: string[] = [];
    
    for (const word of this.stopWords) {
      const regex = new RegExp(`\\b${word}\\b`, "gi");
      if (regex.test(result)) {
        removed.push(word);
        result = result.replace(regex, " ");
      }
    }
    
    if (removed.length > 0) {
      changes.push(`Removed stop words: ${removed.join(", ")}`);
    }
    
    // Удаляем лишние пробелы
    result = result.replace(/\s+/g, " ").trim();
    
    return result;
  }
  
  /**
   * Проверка доступности (всегда true для regex)
   */
  async isAvailable(): Promise<boolean> {
    return true;
  }
}
