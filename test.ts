#!/usr/bin/env node
// ============================================================================
// Web Search Extension — Тестовый скрипт
// ============================================================================
//
// Использование:
//   npx ts-node test.ts
//
// Или после компиляции:
//   node test.js
//
// ============================================================================

import { SearchRouter } from "./router";
import { TavilyProvider } from "./providers/tavily";
import { ExaProvider } from "./providers/exa";
import { PerplexityProvider } from "./providers/perplexity";
import { GoogleProvider } from "./fallback/google";
import { WikipediaProvider } from "./fallback/wikipedia";
import { ArxivProvider } from "./fallback/arxiv";
import { HackerNewsProvider } from "./fallback/hackernews";

/**
 * Тестовые запросы для разных сценариев
 */
const TEST_QUERIES = {
  general: "artificial intelligence",
  news: "OpenAI announces",
  research: "transformer architecture",
  people: "machine learning researcher",
  companies: "AI startup healthcare",
  encyclopedia: "what is quantum computing",
  tech: "GitHub release",
};

/**
 * Главная функция тестирования
 */
async function runTests() {
  console.log("=".repeat(60));
  console.log("Web Search Extension — Тестирование");
  console.log("=".repeat(60));
  console.log();

  const router = new SearchRouter();

  // Тест 1: Проверка доступности провайдеров
  console.log("📋 Тест 1: Проверка доступности провайдеров");
  console.log("-".repeat(60));
  await testProviderStatus(router);
  console.log();

  // Тест 2: Базовый поиск (search_web)
  console.log("🔍 Тест 2: Базовый поиск (search_web)");
  console.log("-".repeat(60));
  await testSearchWeb(router);
  console.log();

  // Тест 3: Поиск новостей (search_news)
  console.log("📰 Тест 3: Поиск новостей (search_news)");
  console.log("-".repeat(60));
  await testSearchNews(router);
  console.log();

  // Тест 4: Поиск исследований (search_research)
  console.log("📚 Тест 4: Поиск исследований (search_research)");
  console.log("-".repeat(60));
  await testSearchResearch(router);
  console.log();

  // Тест 5: Fallback провайдеры
  console.log("🔄 Тест 5: Fallback провайдеры");
  console.log("-".repeat(60));
  await testFallbackProviders();
  console.log();

  // Тест 6: Определение типа запроса
  console.log("🎯 Тест 6: Определение типа запроса");
  console.log("-".repeat(60));
  await testQueryTypeDetection(router);
  console.log();

  // Итоги
  console.log("=".repeat(60));
  console.log("✅ Тестирование завершено!");
  console.log("=".repeat(60));
}

/**
 * Тест 1: Проверка доступности провайдеров
 */
async function testProviderStatus(router: SearchRouter) {
  const status = await router.getProviderStatus();

  for (const [provider, available] of Object.entries(status)) {
    const emoji = available ? "✅" : "❌";
    console.log(`${emoji} ${provider}: ${available ? "доступен" : "недоступен"}`);
  }
}

/**
 * Тест 2: Базовый поиск
 */
async function testSearchWeb(router: SearchRouter) {
  try {
    const response = await router.search(TEST_QUERIES.general, {
      numResults: 3,
    });

    console.log(`✅ Провайдер: ${response.provider}`);
    console.log(`📊 Результаты: ${response.results.length}`);
    console.log(`🔄 Fallback: ${response.isFallback ? "да" : "нет"}`);
    console.log();

    if (response.results.length > 0) {
      console.log("Топ-3 результата:");
      response.results.slice(0, 3).forEach((result, i) => {
        console.log(`${i + 1}. ${result.title}`);
        console.log(`   ${result.url}`);
        console.log(`   ${result.snippet.slice(0, 100)}...`);
        console.log();
      });
    }
  } catch (error) {
    console.log(`❌ Ошибка: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Тест 3: Поиск новостей
 */
async function testSearchNews(router: SearchRouter) {
  try {
    const response = await router.search(TEST_QUERIES.news, {
      numResults: 3,
      category: "news",
    });

    console.log(`✅ Провайдер: ${response.provider}`);
    console.log(`📊 Результаты: ${response.results.length}`);
    console.log(`🔄 Fallback: ${response.isFallback ? "да" : "нет"}`);
  } catch (error) {
    console.log(`❌ Ошибка: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Тест 4: Поиск исследований
 */
async function testSearchResearch(router: SearchRouter) {
  try {
    const response = await router.search(TEST_QUERIES.research, {
      numResults: 3,
      category: "research",
    });

    console.log(`✅ Провайдер: ${response.provider}`);
    console.log(`📊 Результаты: ${response.results.length}`);
    console.log(`🔄 Fallback: ${response.isFallback ? "да" : "нет"}`);

    if (response.results.length > 0) {
      console.log();
      console.log("Топ-3 результата:");
      response.results.slice(0, 3).forEach((result, i) => {
        console.log(`${i + 1}. ${result.title}`);
        console.log(`   ${result.url}`);
        if (result.publishedDate) {
          console.log(`   📅 ${result.publishedDate}`);
        }
        console.log();
      });
    }
  } catch (error) {
    console.log(`❌ Ошибка: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Тест 5: Fallback провайдеры
 */
async function testFallbackProviders() {
  const providers = [
    { name: "Google", instance: new GoogleProvider(), query: "test query" },
    { name: "Wikipedia", instance: new WikipediaProvider(), query: "quantum computing" },
    { name: "arXiv", instance: new ArxivProvider(), query: "machine learning" },
    { name: "Hacker News", instance: new HackerNewsProvider(), query: "AI release" },
  ];

  for (const provider of providers) {
    try {
      console.log(`\nТестирование ${provider.name}...`);
      const response = await provider.instance.search(provider.query, { numResults: 2 });
      console.log(`✅ ${provider.name}: ${response.results.length} результатов`);
    } catch (error) {
      console.log(`❌ ${provider.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * Тест 6: Определение типа запроса
 */
async function testQueryTypeDetection(router: SearchRouter) {
  const testCases = [
    { query: "что такое квантовая запутанность", expected: "ENCYCLOPEDIA" },
    { query: "исследования про нейронные сети", expected: "RESEARCH" },
    { query: "GitHub release announcement", expected: "TECH_NEWS" },
    { query: "погода в москве", expected: "GENERAL" },
  ];

  for (const testCase of testCases) {
    const queryType = (router as any).detectQueryType(testCase.query);
    const emoji = queryType === testCase.expected ? "✅" : "⚠️";
    console.log(`${emoji} "${testCase.query}" → ${queryType} (ожидалось: ${testCase.expected})`);
  }
}

// Запуск тестов
runTests().catch(console.error);
