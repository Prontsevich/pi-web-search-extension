// ============================================================================
// Web Search Extension — Фабрика трансформеров запросов
// ============================================================================

import type { QueryTransformer } from "./interface";
import { RegexTransformer } from "./regex";

/**
 * Конфигурация для создания трансформера
 */
export interface TransformerConfig {
  /**
   * Тип трансформера
   * - "auto": Автоматический выбор (Ollama если доступен, иначе regex)
   * - "regex": Всегда использовать regex
   * - "ollama": Всегда использовать Ollama (требует установки)
   */
  type?: "auto" | "regex" | "ollama";
  
  /**
   * Использовать ли Ollama
   * Приоритет над type: "auto"
   */
  useOllama?: boolean;
  
  /**
   * Модель Ollama для трансформации
   * По умолчанию: "llama3.2:1b"
   */
  ollamaModel?: string;
  
  /**
   * URL Ollama сервера
   * По умолчанию: "http://localhost:11434"
   */
  ollamaUrl?: string;
}

/**
 * Фабрика для создания трансформеров запросов
 * 
 * Поддерживает гибридный подход:
 * - Сейчас: RegexTransformer (быстро, бесплатно, надёжно)
 * - В будущем: OllamaTransformer (умнее, понимает контекст)
 * 
 * @example
 * // Базовое использование (regex)
 * const transformer = createTransformer();
 * 
 * @example
 * // С явным указанием типа
 * const transformer = createTransformer({ type: "regex" });
 * 
 * @example
 * // С Ollama (если установлен)
 * const transformer = createTransformer({ 
 *   type: "ollama",
 *   ollamaModel: "llama3.2:1b"
 * });
 * 
 * @example
 * // Автоматический выбор (Ollama если доступен)
 * const transformer = createTransformer({ type: "auto" });
 */
export function createTransformer(config?: TransformerConfig): QueryTransformer {
  const type = config?.type ?? "auto";
  const useOllama = config?.useOllama ?? false;
  
  // Если явно указан regex — используем его
  if (type === "regex") {
    return new RegexTransformer();
  }
  
  // Если явно указан Ollama — пробуем создать
  if (type === "ollama" || useOllama) {
    try {
      // Динамический импорт для ленивой загрузки
      // OllamaTransformer будет создан в Фазе "Будущие улучшения"
      const { OllamaTransformer } = require("./ollama");
      const transformer = new OllamaTransformer({
        model: config?.ollamaModel ?? "llama3.2:1b",
        url: config?.ollamaUrl ?? "http://localhost:11434",
      });
      
      return transformer;
    } catch (error) {
      // Ollama трансформер ещё не создан или недоступен
      // Fallback на regex
      console.warn("[WebSearch] Ollama transformer not available, falling back to regex");
      return new RegexTransformer();
    }
  }
  
  // Автоматический выбор (type === "auto")
  // Проверяем переменную окружения
  const envUseOllama = process.env.USE_OLLAMA === "true";
  
  if (envUseOllama) {
    try {
      const { OllamaTransformer } = require("./ollama");
      const transformer = new OllamaTransformer({
        model: config?.ollamaModel ?? "llama3.2:1b",
        url: config?.ollamaUrl ?? "http://localhost:11434",
      });
      
      return transformer;
    } catch (error) {
      console.warn("[WebSearch] USE_OLLAMA=true but Ollama transformer not available, using regex");
      return new RegexTransformer();
    }
  }
  
  // По умолчанию используем regex
  return new RegexTransformer();
}

/**
 * Проверка доступности Ollama
 * 
 * @returns true если Ollama сервер доступен
 * 
 * @example
 * const available = await checkOllamaAvailability();
 * if (available) {
 *   // Можно использовать Ollama трансформер
 * }
 */
export async function checkOllamaAvailability(
  url: string = "http://localhost:11434"
): Promise<boolean> {
  try {
    const response = await fetch(`${url}/api/tags`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });
    
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Получить список доступных моделей Ollama
 * 
 * @param url URL Ollama сервера
 * @returns Массив названий моделей
 */
export async function getOllamaModels(
  url: string = "http://localhost:11434"
): Promise<string[]> {
  try {
    const response = await fetch(`${url}/api/tags`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });
    
    if (!response.ok) {
      return [];
    }
    
    const data = await response.json();
    return data.models?.map((m: any) => m.name) ?? [];
  } catch (error) {
    return [];
  }
}

/**
 * Рекомендуемые модели для трансформации запросов
 */
export const RECOMMENDED_MODELS = {
  /** Самая быстрая (500MB) */
  fastest: "qwen2.5:0.5b",
  
  /** Баланс скорости и качества (1.2GB) */
  balanced: "llama3.2:1b",
  
  /** Лучшее качество (2GB) */
  best: "phi3:mini",
} as const;
