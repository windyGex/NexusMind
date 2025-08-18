import { chromium } from 'playwright';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { parse } from 'node-html-parser';
import { format, subDays } from 'date-fns';
import _ from 'lodash';

/**
 * 搜索分析工具集
 * 提供网页抓取、搜索、内容分析等功能
 */
class SearchAnalysisTools {
  constructor() {
    this.browser = null;
    this.cache = new Map();
    this.searchEngines = {
      google: 'https://www.google.com/search',
      bing: 'https://www.bing.com/search',
      yahoo: 'https://search.yahoo.com/search'
    };
  }

  /**
   * 初始化浏览器
   */
  async initBrowser() {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });
    }
    return this.browser;
  }

  /**
   * 关闭浏览器
   */
  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * 网页内容抓取
   */
  async scrapeWebPage(url, options = {}) {
    const cacheKey = `scrape_${url}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const browser = await this.initBrowser();
      const page = await browser.newPage();
      
      // 设置用户代理 - 使用正确的API
      await page.setExtraHTTPHeaders({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      });
      
      // 设置超时
      const timeout = options.timeout || 30000;
      await page.setDefaultTimeout(timeout);

      // 导航到页面
      await page.goto(url, { waitUntil: 'networkidle' });

      // 等待页面加载
      if (options.waitForSelector) {
        await page.waitForSelector(options.waitForSelector);
      }

      // 获取页面内容
      const content = await page.evaluate(() => {
        return {
          title: document.title,
          text: document.body.innerText,
          url: window.location.href,
          metaDescription: document.querySelector('meta[name="description"]')?.content || '',
          headings: Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(h => ({
            level: h.tagName.toLowerCase(),
            text: h.textContent.trim()
          })),
          links: Array.from(document.querySelectorAll('a')).map(a => ({
            text: a.textContent.trim(),
            href: a.href
          })).filter(link => link.href && link.href.startsWith('http'))
        };
      });

      // 提取结构化数据（简化版）
      const structuredData = await this.extractStructuredDataFromPage(page);

      const result = {
        url,
        title: content.title,
        text: content.text,
        structuredData,
        timestamp: new Date().toISOString()
      };

      // 缓存结果
      this.cache.set(cacheKey, result);
      
      await page.close();
      return result;

    } catch (error) {
      console.error(`抓取页面失败: ${url}`, error.message);
      return {
        url,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 提取结构化数据（简化版，避免使用完整HTML）
   */
  async extractStructuredDataFromPage(page) {
    try {
      const data = await page.evaluate(() => {
        const result = {
          meta: {},
          jsonLd: [],
          tables: [],
          headings: []
        };

        // 提取meta标签
        document.querySelectorAll('meta').forEach(el => {
          const name = el.getAttribute('name') || el.getAttribute('property');
          const content = el.getAttribute('content');
          if (name && content) {
            result.meta[name] = content;
          }
        });

        // 提取JSON-LD结构化数据
        document.querySelectorAll('script[type="application/ld+json"]').forEach(el => {
          try {
            const jsonData = JSON.parse(el.textContent);
            result.jsonLd.push(jsonData);
          } catch (e) {
            // 忽略无效的JSON
          }
        });

        // 提取表格数据（简化版）
        document.querySelectorAll('table').forEach((table, tableIndex) => {
          const tableData = [];
          table.querySelectorAll('tr').forEach(row => {
            const rowData = [];
            row.querySelectorAll('td, th').forEach(cell => {
              rowData.push(cell.textContent.trim());
            });
            if (rowData.length > 0) {
              tableData.push(rowData);
            }
          });
          if (tableData.length > 0) {
            result.tables.push(tableData);
          }
        });

        // 提取标题结构
        document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(h => {
          result.headings.push({
            level: h.tagName.toLowerCase(),
            text: h.textContent.trim()
          });
        });

        return result;
      });

      return data;
    } catch (error) {
      console.error('提取结构化数据失败:', error.message);
      return {};
    }
  }

  /**
   * 提取结构化数据（保留原方法以兼容性）
   */
  async extractStructuredData(html) {
    try {
      const $ = cheerio.load(html);
      const data = {};

      // 提取meta标签
      data.meta = {};
      $('meta').each((i, el) => {
        const name = $(el).attr('name') || $(el).attr('property');
        const content = $(el).attr('content');
        if (name && content) {
          data.meta[name] = content;
        }
      });

      // 提取JSON-LD结构化数据
      data.jsonLd = [];
      $('script[type="application/ld+json"]').each((i, el) => {
        try {
          const jsonData = JSON.parse($(el).html());
          data.jsonLd.push(jsonData);
        } catch (e) {
          // 忽略无效的JSON
        }
      });

      // 提取表格数据
      data.tables = [];
      $('table').each((i, table) => {
        const tableData = [];
        $(table).find('tr').each((j, row) => {
          const rowData = [];
          $(row).find('td, th').each((k, cell) => {
            rowData.push($(cell).text().trim());
          });
          if (rowData.length > 0) {
            tableData.push(rowData);
          }
        });
        if (tableData.length > 0) {
          data.tables.push(tableData);
        }
      });

      return data;
    } catch (error) {
      console.error('提取结构化数据失败:', error.message);
      return {};
    }
  }

  /**
   * 搜索功能
   */
  async search(query, options = {}) {
    const {
      engine = 'google',
      maxResults = 10,
      timeRange = '1y',
      language = 'en'
    } = options;

    const cacheKey = `search_${engine}_${query}_${maxResults}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const browser = await this.initBrowser();
      const page = await browser.newPage();
      
      // 构建搜索URL
      const searchUrl = this.buildSearchUrl(engine, query, {
        maxResults,
        timeRange,
        language
      });

      await page.goto(searchUrl, { waitUntil: 'networkidle' });

      // 提取搜索结果
      const results = await page.evaluate((engine) => {
        const searchResults = [];

        if (engine === 'google') {
          // Google搜索结果提取
          document.querySelectorAll('#search .g').forEach((result, index) => {
            const titleEl = result.querySelector('h3');
            const linkEl = result.querySelector('a');
            const snippetEl = result.querySelector('.VwiC3b');

            if (titleEl && linkEl) {
              searchResults.push({
                title: titleEl.textContent.trim(),
                url: linkEl.href,
                snippet: snippetEl ? snippetEl.textContent.trim() : '',
                rank: index + 1
              });
            }
          });
        } else if (engine === 'bing') {
          // Bing搜索结果提取
          document.querySelectorAll('.b_algo').forEach((result, index) => {
            const titleEl = result.querySelector('h2 a');
            const snippetEl = result.querySelector('.b_caption p');

            if (titleEl) {
              searchResults.push({
                title: titleEl.textContent.trim(),
                url: titleEl.href,
                snippet: snippetEl ? snippetEl.textContent.trim() : '',
                rank: index + 1
              });
            }
          });
        }

        return searchResults;
      }, engine);

      await page.close();

      const result = {
        query,
        engine,
        results: results.slice(0, maxResults),
        timestamp: new Date().toISOString()
      };

      // 缓存结果
      this.cache.set(cacheKey, result);
      
      return result;

    } catch (error) {
      console.error(`搜索失败: ${query}`, error.message);
      return {
        query,
        engine,
        error: error.message,
        results: [],
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 构建搜索URL
   */
  buildSearchUrl(engine, query, options = {}) {
    const params = new URLSearchParams();
    params.append('q', query);

    if (options.timeRange) {
      params.append('tbs', `qdr:${options.timeRange}`);
    }

    if (options.language) {
      params.append('lr', `lang_${options.language}`);
    }

    return `${this.searchEngines[engine]}?${params.toString()}`;
  }

  /**
   * 批量抓取网页
   */
  async scrapeMultiplePages(urls, options = {}) {
    const results = [];
    const concurrency = options.concurrency || 3;

    // 分批处理URLs
    for (let i = 0; i < urls.length; i += concurrency) {
      const batch = urls.slice(i, i + concurrency);
      const batchPromises = batch.map(url => this.scrapeWebPage(url, options));
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            url: batch[index],
            error: result.reason.message,
            timestamp: new Date().toISOString()
          });
        }
      });

      // 添加延迟避免被限制
      if (i + concurrency < urls.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  /**
   * 内容分析
   */
  async analyzeContent(content, options = {}) {
    const analysis = {
      wordCount: 0,
      sentences: [],
      keywords: [],
      entities: [],
      sentiment: 'neutral',
      topics: [],
      summary: ''
    };

    try {
      // 确保content是有效的对象或字符串
      if (!content) {
        throw new Error('内容为空或未定义');
      }

      // 如果content是字符串，转换为对象格式
      let contentObj = content;
      if (typeof content === 'string') {
        contentObj = { text: content };
      } else if (typeof content !== 'object') {
        throw new Error('内容格式无效，期望字符串或对象');
      }

      // 基本文本分析
      const text = contentObj.text || contentObj;
      
      // 确保text是字符串
      if (typeof text !== 'string') {
        throw new Error('文本内容不是字符串类型');
      }

      const words = text.split(/\s+/).filter(word => word.length > 0);
      analysis.wordCount = words.length;

      // 句子分割
      analysis.sentences = text.split(/[.!?]+/).filter(sentence => sentence.trim().length > 0);

      // 关键词提取（简单实现）
      const wordFreq = {};
      words.forEach(word => {
        const cleanWord = word.toLowerCase().replace(/[^\w]/g, '');
        if (cleanWord.length > 3) {
          wordFreq[cleanWord] = (wordFreq[cleanWord] || 0) + 1;
        }
      });

      analysis.keywords = Object.entries(wordFreq)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 20)
        .map(([word]) => word);

      // 主题识别（基于关键词）
      analysis.topics = this.identifyTopics(analysis.keywords);

      // 生成摘要
      analysis.summary = this.generateSummary(analysis.sentences, options.summaryLength || 200);

      return analysis;

    } catch (error) {
      console.error('内容分析失败:', error.message);
      return {
        error: error.message,
        ...analysis
      };
    }
  }

  /**
   * 主题识别
   */
  identifyTopics(keywords) {
    const topicKeywords = {
      'technology': ['ai', 'artificial', 'intelligence', 'machine', 'learning', 'software', 'tech', 'digital'],
      'finance': ['stock', 'market', 'investment', 'financial', 'money', 'trading', 'portfolio', 'asset'],
      'health': ['health', 'medical', 'disease', 'treatment', 'patient', 'doctor', 'hospital'],
      'politics': ['government', 'political', 'election', 'policy', 'law', 'congress', 'president'],
      'sports': ['game', 'team', 'player', 'sport', 'match', 'championship', 'league']
    };

    const topics = [];
    const keywordSet = new Set(keywords.map(k => k.toLowerCase()));

    Object.entries(topicKeywords).forEach(([topic, topicWords]) => {
      const matches = topicWords.filter(word => keywordSet.has(word));
      if (matches.length > 0) {
        topics.push({
          topic,
          confidence: matches.length / topicWords.length,
          keywords: matches
        });
      }
    });

    return topics.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * 生成摘要
   */
  generateSummary(sentences, maxLength = 200) {
    if (sentences.length === 0) return '';

    // 简单的摘要生成：选择前几个句子直到达到长度限制
    let summary = '';
    for (const sentence of sentences) {
      if ((summary + sentence).length <= maxLength) {
        summary += sentence + '. ';
      } else {
        break;
      }
    }

    return summary.trim();
  }

  /**
   * 投资分析专用搜索
   */
  async searchInvestmentData(query, options = {}) {
    const investmentSources = [
      'seekingalpha.com',
      'yahoo.com/finance',
      'marketwatch.com',
      'investing.com',
      'fool.com',
      'cnbc.com',
      'bloomberg.com'
    ];

    const results = [];
    
    for (const source of investmentSources) {
      const searchQuery = `${query} site:${source}`;
      const searchResult = await this.search(searchQuery, {
        ...options,
        maxResults: 5
      });
      
      if (searchResult.results && searchResult.results.length > 0) {
        results.push(...searchResult.results);
      }
    }

    return {
      query,
      results: results.slice(0, options.maxResults || 20),
      sources: investmentSources,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 股票数据分析
   */
  async analyzeStockData(symbol, options = {}) {
    try {
      // 搜索股票相关信息
      const searchResults = await this.searchInvestmentData(symbol, options);
      
      // 抓取相关页面
      const urls = searchResults.results.map(result => result.url);
      const scrapedPages = await this.scrapeMultiplePages(urls, {
        timeout: 15000,
        concurrency: 2
      });

      // 分析内容
      const analyses = [];
      for (const page of scrapedPages) {
        if (!page.error) {
          const analysis = await this.analyzeContent(page);
          analyses.push({
            url: page.url,
            title: page.title,
            analysis
          });
        }
      }

      // 综合分析
      const summary = this.generateInvestmentSummary(analyses, symbol);

      return {
        symbol,
        searchResults,
        scrapedPages: scrapedPages.length,
        analyses,
        summary,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error(`股票数据分析失败: ${symbol}`, error.message);
      return {
        symbol,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 生成投资建议摘要
   */
  generateInvestmentSummary(analyses, symbol) {
    const summary = {
      symbol,
      sentiment: 'neutral',
      keyPoints: [],
      recommendations: [],
      risks: [],
      opportunities: []
    };

    // 分析情感和关键点
    analyses.forEach(analysis => {
      const content = analysis.analysis;
      
      // 提取关键点
      if (content.keywords) {
        summary.keyPoints.push(...content.keywords.slice(0, 5));
      }

      // 分析情感（简单实现）
      const positiveWords = ['growth', 'profit', 'increase', 'positive', 'strong', 'bullish'];
      const negativeWords = ['decline', 'loss', 'decrease', 'negative', 'weak', 'bearish'];
      
      const text = content.summary.toLowerCase();
      const positiveCount = positiveWords.filter(word => text.includes(word)).length;
      const negativeCount = negativeWords.filter(word => text.includes(word)).length;
      
      if (positiveCount > negativeCount) {
        summary.sentiment = 'positive';
      } else if (negativeCount > positiveCount) {
        summary.sentiment = 'negative';
      }
    });

    // 去重关键点
    summary.keyPoints = [...new Set(summary.keyPoints)];

    // 生成建议
    if (summary.sentiment === 'positive') {
      summary.recommendations.push('考虑买入或持有');
      summary.opportunities.push('增长潜力');
    } else if (summary.sentiment === 'negative') {
      summary.recommendations.push('谨慎投资');
      summary.risks.push('市场风险');
    } else {
      summary.recommendations.push('继续观察');
    }

    return summary;
  }
}

export default SearchAnalysisTools; 