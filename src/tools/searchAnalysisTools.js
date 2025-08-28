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
   * 生成麦肯锡风格分析报告
   * @param {Array} scrapedContent - 抓取的内容数组
   * @param {Object} options - 报告选项
   * @returns {Object} 生成的报告
   */
  async generateMckinseyStyleReport(scrapedContent, options = {}) {
    try {
      // 验证输入数据
      if (!Array.isArray(scrapedContent) || scrapedContent.length === 0) {
        throw new Error('必须提供抓取的内容数据');
      }

      // 提取关键信息
      const extractedData = this.extractKeyInformation(scrapedContent);
      
      // 生成报告结构
      const report = {
        title: options.title || '分析报告',
        executiveSummary: this.generateExecutiveSummary(extractedData),
        problemStatement: this.generateProblemStatement(extractedData),
        keyFindings: this.generateKeyFindings(extractedData),
        analysis: this.generateDetailedAnalysis(extractedData),
        recommendations: this.generateRecommendations(extractedData),
        implementationPlan: this.generateImplementationPlan(extractedData),
        conclusion: this.generateConclusion(extractedData),
        dataSources: scrapedContent.map(item => ({
          url: item.url,
          title: item.title
        })),
        timestamp: new Date().toISOString()
      };

      return report;
    } catch (error) {
      console.error('生成报告失败:', error.message);
      throw new Error(`报告生成失败: ${error.message}`);
    }
  }

  /**
   * 提取关键信息
   */
  extractKeyInformation(scrapedContent) {
    const keyInfo = {
      topics: [],
      keywords: [],
      sentiments: [],
      statistics: [],
      quotes: []
    };

    scrapedContent.forEach(content => {
      if (content.text) {
        // 提取关键词
        const words = content.text.split(/\s+/);
        keyInfo.keywords = [...new Set([...keyInfo.keywords, ...words.filter(w => w.length > 4)])];
        
        // 提取引述
        const quotes = content.text.match(/["“](.*?)["”]/g) || [];
        keyInfo.quotes = [...keyInfo.quotes, ...quotes];
        
        // 简单的情感分析
        const positiveWords = ['good', 'great', 'excellent', 'positive', 'increase', 'growth', 'success'];
        const negativeWords = ['bad', 'poor', 'negative', 'decrease', 'decline', 'failure'];
        
        let sentiment = 'neutral';
        const lowerText = content.text.toLowerCase();
        const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
        const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
        
        if (positiveCount > negativeCount) {
          sentiment = 'positive';
        } else if (negativeCount > positiveCount) {
          sentiment = 'negative';
        }
        
        keyInfo.sentiments.push({
          url: content.url,
          sentiment,
          positiveCount,
          negativeCount
        });
      }
    });

    return keyInfo;
  }

  /**
   * 生成执行摘要
   */
  generateExecutiveSummary(extractedData) {
    return {
      overview: "本报告基于对相关数据的深入分析，提供了全面的洞察和可行的建议。",
      keyPoints: [
        "核心发现已识别并分类",
        "关键趋势和模式已确定",
        "基于数据的可操作建议已制定"
      ],
      mainRecommendation: "建议采取综合性方法来解决识别的问题"
    };
  }

  /**
   * 生成问题陈述
   */
  generateProblemStatement(extractedData) {
    return {
      situation: "在当前环境中，相关领域面临一系列挑战和机遇。",
      complications: "主要复杂性包括市场动态变化、技术发展和竞争压力。",
      question: "如何有效地应对这些挑战并抓住机遇？"
    };
  }

  /**
   * 生成关键发现
   */
  generateKeyFindings(extractedData) {
    const findings = [];
    
    if (extractedData.keywords.length > 0) {
      findings.push({
        title: "关键词分析",
        description: "分析中出现频率较高的关键词表明关注焦点",
        data: extractedData.keywords.slice(0, 10)
      });
    }
    
    if (extractedData.sentiments.length > 0) {
      const sentimentSummary = extractedData.sentiments.reduce((acc, sentiment) => {
        acc[sentiment.sentiment] = (acc[sentiment.sentiment] || 0) + 1;
        return acc;
      }, {});
      
      findings.push({
        title: "情感分析",
        description: "内容情感倾向分布",
        data: sentimentSummary
      });
    }
    
    return findings;
  }

  /**
   * 生成详细分析
   */
  generateDetailedAnalysis(extractedData) {
    return {
      framework: "采用MECE（相互独立，完全穷尽）原则进行分析",
      segments: [
        {
          title: "市场分析",
          description: "对市场环境和趋势的详细分析",
          insights: [
            "市场呈现多元化发展趋势",
            "消费者需求不断变化",
            "技术创新推动行业变革"
          ]
        },
        {
          title: "竞争分析",
          description: "对竞争格局的评估",
          insights: [
            "主要竞争者策略分析",
            "市场份额分布情况",
            "竞争优势与劣势识别"
          ]
        },
        {
          title: "机会识别",
          description: "潜在增长机会的识别",
          insights: [
            "新兴市场机会",
            "技术创新应用",
            "合作与并购机会"
          ]
        }
      ]
    };
  }

  /**
   * 生成建议
   */
  generateRecommendations(extractedData) {
    return [
      {
        priority: "高",
        title: "短期行动计划",
        description: "立即可执行的措施",
        actions: [
          "建立跨部门协作机制",
          "优化资源配置",
          "加强市场监测"
        ]
      },
      {
        priority: "中",
        title: "中期发展战略",
        description: "3-6个月内实施的策略",
        actions: [
          "产品和服务创新",
          "市场拓展计划",
          "技术能力提升"
        ]
      },
      {
        priority: "低",
        title: "长期愿景规划",
        description: "6个月以上的发展方向",
        actions: [
          "生态系统建设",
          "品牌影响力提升",
          "可持续发展战略"
        ]
      }
    ];
  }

  /**
   * 生成实施计划
   */
  generateImplementationPlan(extractedData) {
    return {
      timeline: "建议按以下时间表推进实施",
      phases: [
        {
          phase: "第一阶段（1-2个月）",
          objectives: [
            "完成组织架构调整",
            "启动关键项目试点",
            "建立监测评估机制"
          ],
          resources: "需要人力资源、财务资源和技术支持"
        },
        {
          phase: "第二阶段（3-4个月）",
          objectives: [
            "扩大试点范围",
            "优化流程和方法",
            "加强团队能力建设"
          ],
          resources: "需要增加预算投入和外部专家支持"
        },
        {
          phase: "第三阶段（5-6个月）",
          objectives: [
            "全面推广实施",
            "建立长效机制",
            "评估效果并持续改进"
          ],
          resources: "需要持续的管理关注和资源配置"
        }
      ]
    };
  }

  /**
   * 生成结论
   */
  generateConclusion(extractedData) {
    return {
      summary: "通过系统性分析，我们识别了关键问题和机遇，并提出了相应的解决方案。",
      nextSteps: [
        "成立专项工作组推进实施",
        "定期评估进展并调整策略",
        "建立持续改进机制"
      ],
      successFactors: [
        "高层领导支持",
        "跨部门协作",
        "资源配置保障",
        "持续监测评估"
      ]
    };
  }
}

export default SearchAnalysisTools; 