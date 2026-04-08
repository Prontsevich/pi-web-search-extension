// ============================================================================
// Web Search Extension — Интерфейс трансформера запросов
// ============================================================================

/**
 * Интерфейс для трансформации поисковых запросов
 * 
 * Трансформеры используются для оптимизации запросов под конкретный поисковый сервис.
 * Например:
 * - Удаление стоп-слов для Google
 * - Форматирование вопросов для Wikipedia
 * - Специальный синтаксис для arXiv
 * 
 * Архитектура поддерживает замену трансформеров:
 * - RegexTransformer (базовый, быстрый, бесплатный)
 * - OllamaTransformer (умный, на основе ML модели)
 * - ApiTransformer (через OpenRouter, Together и т.д.)
 */
export interface QueryTransformer {
  /**
   * Трансформировать поисковый запрос под конкретный сервис
   * 
   * @param query - Исходный поисковый запрос от пользователя
   * @param provider - Название целевого провайдера ("google", "wikipedia", "arxiv", etc.)
   * @returns Трансформированный запрос
   * 
   * @example
   * // Пример использования:
   * const transformer = new RegexTransformer();
   * const transformed = await transformer.transform(
   *   "Пожалуйста, найди мне информацию о квантовой запутанности",
   *   "google"
   * );
   * // Результат: "квантовая запутанность"
   */
  transform(query: string, provider: string): Promise<string>;
  
  /**
   * Название трансформера (для логирования и отладки)
   */
  readonly name: string;
  
  /**
   * Проверка доступности трансформера
   * 
   * @returns true если трансформер готов к работе
   * 
   * @example
   * // Ollama трансформер проверяет доступность локального сервера
   * if (await transformer.isAvailable()) {
   *   // Использовать Ollama
   * } else {
   *   // Fallback на regex
   * }
   */
  isAvailable?(): Promise<boolean>;
}

/**
 * Опции трансформации
 */
export interface TransformOptions {
  /** Максимальная длина запроса (по умолчанию: 100) */
  maxLength?: number;
  
  /** Язык запроса (для будущих улучшений) */
  language?: "ru" | "en";
  
  /** Дополнительные параметры для конкретного трансформера */
  providerParams?: Record<string, any>;
}

/**
 * Результат трансформации (для расширенной информации)
 */
export interface TransformResult {
  /** Трансформированный запрос */
  query: string;
  
  /** Был ли запрос изменён */
  wasModified: boolean;
  
  /** Описание изменений (для отладки) */
  changes?: string[];
  
  /** Время трансформации в миллисекундах */
  durationMs?: number;
}
