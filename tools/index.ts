// ============================================================================
// Web Search Extension — Инструменты для pi coding agent
// ============================================================================

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { StringEnum } from "@mariozechner/pi-ai";
import { SearchRouter } from "../router";

/**
 * Регистрация всех инструментов web-search в pi
 * 
 * @param pi - ExtensionAPI от pi
 */
export function registerTools(pi: ExtensionAPI) {
  registerSearchWeb(pi);
  registerSearchNews(pi);
  registerSearchResearch(pi);
  registerFindPeople(pi);
  registerFindCompanies(pi);
}

/**
 * Инструмент 1: search_web — Базовый поиск
 * 
 * Универсальный поиск в интернете через Tavily, Exa, Perplexity или fallback.
 * Используется для 80% поисковых запросов.
 */
function registerSearchWeb(pi: ExtensionAPI) {
  pi.registerTool({
    name: "search_web",
    label: "Search Web",
    description: "Search the web for current information using multiple providers (Tavily, Exa, Perplexity) with automatic fallback to Google, Wikipedia, or arXiv",
    parameters: Type.Object({
      query: Type.String({ description: "Search query" }),
      num_results: Type.Optional(Type.Number({ default: 10, description: "Number of results (default: 10)" })),
      include_content: Type.Optional(Type.Boolean({ default: false, description: "Include full page content (default: false)" })),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      const { query, num_results = 10, include_content = false } = params;
      
      try {
        const router = new SearchRouter();
        const response = await router.search(query, {
          numResults: num_results,
          includeContent: include_content,
        });
        
        // Формируем минимальный вывод для чата
        const statusText = formatStatusText(response, "search_web");
        
        return {
          content: [{ type: "text", text: statusText }],
          details: {
            ...response,
            results: response.results.map(r => ({
              ...r,
              content: undefined, // Не показываем контент в details для краткости
            })),
          },
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: formatErrorText(error) }],
          isError: true,
        };
      }
    },
  });
}

/**
 * Инструмент 2: search_news — Поиск новостей
 * 
 * Специализированный поиск новостей через Perplexity или fallback на Hacker News.
 * Лучше всего подходит для свежих событий, релизов, анонсов.
 */
function registerSearchNews(pi: ExtensionAPI) {
  pi.registerTool({
    name: "search_news",
    label: "Search News",
    description: "Search recent news articles and announcements. Best for breaking news, product releases, and current events.",
    parameters: Type.Object({
      query: Type.String({ description: "News search query" }),
      days_back: Type.Optional(Type.Number({ default: 7, description: "Search news from last N days (default: 7)" })),
      num_results: Type.Optional(Type.Number({ default: 10, description: "Number of results (default: 10)" })),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      const { query, days_back = 7, num_results = 10 } = params;
      
      try {
        const router = new SearchRouter();
        
        // Для новостей используем Perplexity (лучшее качество) или fallback
        const response = await router.search(query, {
          numResults: num_results,
          category: "news",
          providerParams: {
            daysBack: days_back,
          },
        });
        
        const statusText = formatStatusText(response, "search_news");
        
        return {
          content: [{ type: "text", text: statusText }],
          details: response,
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: formatErrorText(error) }],
          isError: true,
        };
      }
    },
  });
}

/**
 * Инструмент 3: search_research — Поиск научных статей
 * 
 * Поиск научных публикаций через arXiv или Exa (category: research paper).
 * Лучше всего подходит для исследований, papers, академического контента.
 */
function registerSearchResearch(pi: ExtensionAPI) {
  pi.registerTool({
    name: "search_research",
    label: "Search Research",
    description: "Search scientific papers and research articles. Best for academic research, papers, and scholarly content.",
    parameters: Type.Object({
      query: Type.String({ description: "Research query" }),
      num_results: Type.Optional(Type.Number({ default: 10, description: "Number of results (default: 10)" })),
      include_pdf: Type.Optional(Type.Boolean({ default: false, description: "Include PDF links if available (default: false)" })),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      const { query, num_results = 10, include_pdf = false } = params;
      
      try {
        const router = new SearchRouter();
        
        // Для исследований используем arXiv или Exa
        const response = await router.search(query, {
          numResults: num_results,
          category: "research",
          providerParams: {
            includePdf: include_pdf,
          },
        });
        
        const statusText = formatStatusText(response, "search_research");
        
        return {
          content: [{ type: "text", text: statusText }],
          details: response,
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: formatErrorText(error) }],
          isError: true,
        };
      }
    },
  });
}

/**
 * Инструмент 4: find_people — Поиск людей
 * 
 * Поиск экспертов, специалистов, исследователей через Exa (category: people).
 * Лучше всего подходит для поиска людей по экспертизе, компании, роли.
 */
function registerFindPeople(pi: ExtensionAPI) {
  pi.registerTool({
    name: "find_people",
    label: "Find People",
    description: "Find people by expertise, role, or company. Uses Exa's people category to find experts, researchers, and professionals.",
    parameters: Type.Object({
      expertise: Type.String({ description: "Area of expertise or role (e.g., 'distributed systems engineer', 'AI researcher')" }),
      company: Type.Optional(Type.String({ description: "Company or organization (optional)" })),
      num_results: Type.Optional(Type.Number({ default: 10, description: "Number of results (default: 10)" })),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      const { expertise, company, num_results = 10 } = params;
      
      // Формируем поисковый запрос
      const query = company ? `${expertise} ${company}` : expertise;
      
      try {
        const router = new SearchRouter();
        
        // Для людей используем Exa (category: people)
        const response = await router.search(query, {
          numResults: num_results,
          category: "people",
        });
        
        const statusText = formatStatusText(response, "find_people");
        
        return {
          content: [{ type: "text", text: statusText }],
          details: response,
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: formatErrorText(error) }],
          isError: true,
        };
      }
    },
  });
}

/**
 * Инструмент 5: find_companies — Поиск компаний
 * 
 * Поиск компаний, стартапов, организаций через Exa (category: company).
 * Лучше всего подходит для поиска компаний по отрасли, локации, стадии.
 */
function registerFindCompanies(pi: ExtensionAPI) {
  pi.registerTool({
    name: "find_companies",
    label: "Find Companies",
    description: "Find companies by industry, location, or stage. Uses Exa's company category to find startups, enterprises, and organizations.",
    parameters: Type.Object({
      industry: Type.String({ description: "Industry or sector (e.g., 'healthcare AI', 'fintech', 'climate tech')" }),
      location: Type.Optional(Type.String({ description: "Location or region (optional)" })),
      stage: Type.Optional(StringEnum(["startup", "enterprise", "series-a", "series-b", "series-c+"] as const, {
        description: "Company stage (optional)",
      })),
      num_results: Type.Optional(Type.Number({ default: 10, description: "Number of results (default: 10)" })),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      const { industry, location, stage, num_results = 10 } = params;
      
      // Формируем поисковый запрос
      const query = [industry, location, stage].filter(Boolean).join(" ");
      
      try {
        const router = new SearchRouter();
        
        // Для компаний используем Exa (category: company)
        const response = await router.search(query, {
          numResults: num_results,
          category: "company",
        });
        
        const statusText = formatStatusText(response, "find_companies");
        
        return {
          content: [{ type: "text", text: statusText }],
          details: response,
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: formatErrorText(error) }],
          isError: true,
        };
      }
    },
  });
}

/**
 * Форматирование статуса для вывода в чат
 * Формат: статус + провайдер + инструмент
 */
function formatStatusText(response: any, toolName: string): string {
  const { provider, isFallback, results } = response;
  
  let emoji = "✅";
  let providerName = provider;
  
  // Добавляем индикацию fallback
  if (isFallback) {
    emoji = "⚠️";
    providerName = `${provider} (fallback)`;
  }
  
  // Capitalize provider name
  providerName = providerName.charAt(0).toUpperCase() + providerName.slice(1);
  
  // Формируем вывод: Провайдер: инструмент
  return `${emoji} ${providerName}: ${toolName}`;
}

/**
 * Форматирование ошибки для вывода в чат
 */
function formatErrorText(error: any): string {
  if (error && typeof error === "object") {
    if (error.provider && error.message) {
      return `❌ ${error.provider}: ${error.message}`;
    }
    if (error.message) {
      return `❌ Search failed: ${error.message}`;
    }
  }
  
  return `❌ Search failed: ${String(error)}`;
}
