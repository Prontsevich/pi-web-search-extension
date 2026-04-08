// ============================================================================
// Web Search Extension для pi coding agent
// ============================================================================
//
// Расширение для поиска информации в интернете через несколько провайдеров:
// - Платные: Tavily, Exa, Perplexity
// - Fallback: Google, Wikipedia, arXiv, Hacker News
//
// Установка:
// 1. Скопировать папку web-search в ~/.pi/agent/extensions/
// 2. Добавить API ключи в .zshrc:
//    export EXA_API_KEY="xxx"
//    export TAVILY_API_KEY="xxx"
//    export PERPLEXITY_API_KEY="xxx"
// 3. Перезагрузить pi или выполнить /reload
//
// Использование:
// - search_web(query) — базовый поиск
// - search_news(query) — поиск новостей
// - search_research(query) — поиск исследований
// - find_people(expertise) — поиск людей
// - find_companies(industry) — поиск компаний
//
// ============================================================================

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { registerTools } from "./tools";

/**
 * Точка входа расширения
 * 
 * @param pi - ExtensionAPI от pi coding agent
 */
export default function (pi: ExtensionAPI) {
  // Уведомление о загрузке расширения
  pi.on("session_start", async (_event, ctx) => {
    ctx.ui.notify("web-search extension loaded", "info");
    
    // Логирование доступных провайдеров (для отладки)
    logProviderStatus(pi);
  });
  
  // Регистрация инструментов
  registerTools(pi);
  
  // Команда для проверки статуса провайдеров
  pi.registerCommand("websearch-status", {
    description: "Check web search provider status",
    handler: async (_args, ctx) => {
      const { SearchRouter } = await import("./router");
      const router = new SearchRouter();
      const status = await router.getProviderStatus();
      
      let message = "Web Search Provider Status:\n\n";
      
      for (const [provider, available] of Object.entries(status)) {
        const emoji = available ? "✅" : "❌";
        message += `${emoji} ${provider}: ${available ? "available" : "unavailable"}\n`;
      }
      
      ctx.ui.notify(message.trim(), "info");
    },
  });
  
  // Команда для быстрого теста поиска
  pi.registerCommand("websearch-test", {
    description: "Test web search with a sample query",
    handler: async (_args, ctx) => {
      const { searchWithFallback } = await import("./router");
      
      ctx.ui.notify("Testing web search...", "info");
      
      try {
        const response = await searchWithFallback("test query", { numResults: 3 });
        
        ctx.ui.notify(
          `Search successful!\nProvider: ${response.provider}\nResults: ${response.results.length}\nFallback: ${response.isFallback}`,
          "success"
        );
      } catch (error) {
        ctx.ui.notify(
          `Search failed: ${error instanceof Error ? error.message : String(error)}`,
          "error"
        );
      }
    },
  });
}

/**
 * Логирование статуса провайдеров (для отладки)
 */
async function logProviderStatus(pi: ExtensionAPI) {
  try {
    const { SearchRouter } = await import("./router");
    const router = new SearchRouter();
    const status = await router.getProviderStatus();
    
    const available = Object.entries(status).filter(([_, v]) => v).length;
    const total = Object.keys(status).length;
    
    pi.sendMessage({
      customType: "web-search-status",
      content: `Web search: ${available}/${total} providers available`,
      display: false, // Не показывать в чате
      details: { status },
    });
  } catch (error) {
    console.warn("[WebSearch] Failed to check provider status:", error);
  }
}
