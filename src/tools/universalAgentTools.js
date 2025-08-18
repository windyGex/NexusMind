import { chromium } from 'playwright';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { format, subDays } from 'date-fns';
import _ from 'lodash';

/**
 * 通用智能体工具集
 * 提供搜索、分析、报告生成等核心功能
 */
export class UniversalAgentTools {
  constructor() {
    this.browser = null;
    this.cache = new Map();
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
   * 智能搜索工具
   */
  async intelligentSearch(query, options = {}) {
    const cacheKey = `search_${query}_${JSON.stringify(options)}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      // 使用ToolRegistry中的webSearch实现
      const { ToolRegistry } = await import('../core/ToolRegistry.js');
      const toolRegistry = new ToolRegistry();
      
      console.log(`开始智能搜索: ${query}`);
      
      // 调用webSearch方法
      const searchResult = await toolRegistry.webSearch({ 
        query,
        num: options.numResults || 10
      });
      
      // 转换结果格式以保持兼容性
      const results = searchResult.results.map((result, index) => ({
        title: result.title,
        url: result.link,
        snippet: result.snippet,
        rank: result.position || index + 1
      }));

      const result = {
        query,
        results,
        totalResults: searchResult.count,
        searchEngine: 'serper',
        timestamp: new Date()
      };

      this.cache.set(cacheKey, result);
      console.log(`搜索完成: 找到 ${results.length} 个结果`);
      return result;

    } catch (error) {
      console.error('智能搜索错误:', error);
      return {
        query,
        results: [],
        error: error.message,
        timestamp: new Date()
      };
    }
  }


  /**
   * 网页内容抓取工具
   */
  async scrapeWebContent(url, options = {}) {
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
      
      const timeout = options.timeout || 10000; // 减少默认超时时间
      await page.setDefaultTimeout(timeout);

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
          metaDescription: document.querySelector('meta[name="description"]')?.content || ''
        };
      });

      // 提取结构化数据（简化版）
      const structuredData = await this.extractStructuredDataFromPage(page);

      const result = {
        url,
        title: content.title,
        text: content.text,
        structuredData,
        timestamp: new Date()
      };

      this.cache.set(cacheKey, result);
      await page.close();
      return result;

    } catch (error) {
      console.error('网页抓取错误:', error);
      return {
        url,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * 批量网页抓取工具
   */
  async batchScrapeWebsites(urls, options = {}) {
    const results = [];
    const maxConcurrent = options.maxConcurrent || 3;
    
    // 分批处理URL
    for (let i = 0; i < urls.length; i += maxConcurrent) {
      const batch = urls.slice(i, i + maxConcurrent);
      const batchPromises = batch.map(url => this.scrapeWebContent(url, options));
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            url: batch[index],
            error: result.reason.message,
            timestamp: new Date()
          });
        }
      });
    }

    return {
      totalUrls: urls.length,
      successfulScrapes: results.filter(r => !r.error).length,
      failedScrapes: results.filter(r => r.error).length,
      results,
      timestamp: new Date()
    };
  }

  /**
   * 内容分析工具
   */
  async analyzeContent(content, options = {}) {
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

      const analysis = {
        textLength: contentObj.text ? contentObj.text.length : 0,
        wordCount: contentObj.text ? contentObj.text.split(/\s+/).length : 0,
        headingStructure: this.analyzeHeadingStructure(contentObj.headings || []),
        linkAnalysis: this.analyzeLinks(contentObj.links || []),
        contentType: this.detectContentType(contentObj),
        keyTopics: await this.extractKeyTopics(contentObj.text || ''),
        sentiment: await this.analyzeSentiment(contentObj.text || ''),
        readability: this.calculateReadability(contentObj.text || ''),
        timestamp: new Date()
      };

      return analysis;
    } catch (error) {
      console.error('内容分析错误:', error);
      return {
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * 信息提取工具
   */
  async extractInformation(content, extractionRules = {}) {
    try {
      const extractedInfo = {
        facts: [],
        statistics: [],
        dates: [],
        names: [],
        organizations: [],
        locations: [],
        customExtractions: {}
      };

      const text = content.text || '';

      // 提取事实
      if (extractionRules.extractFacts) {
        extractedInfo.facts = this.extractFacts(text);
      }

      // 提取统计数据
      if (extractionRules.extractStatistics) {
        extractedInfo.statistics = this.extractStatistics(text);
      }

      // 提取日期
      if (extractionRules.extractDates) {
        extractedInfo.dates = this.extractDates(text);
      }

      // 提取人名
      if (extractionRules.extractNames) {
        extractedInfo.names = this.extractNames(text);
      }

      // 提取组织
      if (extractionRules.extractOrganizations) {
        extractedInfo.organizations = this.extractOrganizations(text);
      }

      // 提取地点
      if (extractionRules.extractLocations) {
        extractedInfo.locations = this.extractLocations(text);
      }

      // 自定义提取
      if (extractionRules.customPatterns) {
        for (const [key, pattern] of Object.entries(extractionRules.customPatterns)) {
          extractedInfo.customExtractions[key] = this.extractWithPattern(text, pattern);
        }
      }

      return {
        url: content.url,
        extractedInfo,
        extractionRules,
        timestamp: new Date()
      };

    } catch (error) {
      console.error('信息提取错误:', error);
      return {
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * 生成分析报告工具
   */
  async generateAnalysisReport(data, options = {}) {
    try {
      const report = {
        executiveSummary: this.generateExecutiveSummary(data),
        methodology: this.generateMethodology(data),
        keyFindings: this.generateKeyFindings(data),
        detailedAnalysis: this.generateDetailedAnalysis(data),
        conclusions: this.generateConclusions(data),
        recommendations: this.generateRecommendations(data),
        references: this.generateReferences(data),
        metadata: {
          generatedAt: new Date(),
          dataSources: data.sources || [],
          analysisType: options.analysisType || 'comprehensive',
          wordCount: 0
        }
      };

      // 计算总字数
      const fullReport = JSON.stringify(report, null, 2);
      report.metadata.wordCount = fullReport.split(' ').length;

      return report;

    } catch (error) {
      console.error('报告生成错误:', error);
      return {
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * 提取结构化数据（简化版，避免使用完整HTML）
   */
  async extractStructuredDataFromPage(page) {
    try {
      const structuredData = await page.evaluate(() => {
        const result = [];

        // 提取JSON-LD
        document.querySelectorAll('script[type="application/ld+json"]').forEach(elem => {
          try {
            const data = JSON.parse(elem.textContent);
            result.push(data);
          } catch (e) {
            // 忽略无效的JSON
          }
        });

        // 提取微数据
        document.querySelectorAll('[itemtype]').forEach(elem => {
          const itemType = elem.getAttribute('itemtype');
          const itemData = {};
          
          elem.querySelectorAll('[itemprop]').forEach(prop => {
            const propName = prop.getAttribute('itemprop');
            const propValue = prop.textContent.trim();
            itemData[propName] = propValue;
          });
          
          if (Object.keys(itemData).length > 0) {
            result.push({
              '@type': itemType,
              ...itemData
            });
          }
        });

        return result;
      });

      return structuredData;
    } catch (error) {
      console.error('结构化数据提取错误:', error);
      return [];
    }
  }

  /**
   * 提取结构化数据（保留原方法以兼容性）
   */
  async extractStructuredData(html) {
    try {
      const $ = cheerio.load(html);
      const structuredData = [];

      // 提取JSON-LD
      $('script[type="application/ld+json"]').each((i, elem) => {
        try {
          const data = JSON.parse($(elem).html());
          structuredData.push(data);
        } catch (e) {
          // 忽略无效的JSON
        }
      });

      // 提取微数据
      $('[itemtype]').each((i, elem) => {
        const itemType = $(elem).attr('itemtype');
        const itemData = {};
        
        $(elem).find('[itemprop]').each((j, prop) => {
          const propName = $(prop).attr('itemprop');
          const propValue = $(prop).text().trim();
          itemData[propName] = propValue;
        });
        
        if (Object.keys(itemData).length > 0) {
          structuredData.push({
            '@type': itemType,
            ...itemData
          });
        }
      });

      return structuredData;
    } catch (error) {
      console.error('结构化数据提取错误:', error);
      return [];
    }
  }

  analyzeHeadingStructure(headings) {
    const structure = {
      levels: {},
      hierarchy: [],
      depth: 0
    };

    headings.forEach(heading => {
      const level = heading.level;
      if (!structure.levels[level]) {
        structure.levels[level] = [];
      }
      structure.levels[level].push(heading.text);
    });

    structure.depth = Object.keys(structure.levels).length;
    return structure;
  }

  analyzeLinks(links) {
    const analysis = {
      totalLinks: links.length,
      internalLinks: 0,
      externalLinks: 0,
      domains: new Set(),
      linkTypes: {}
    };

    links.forEach(link => {
      try {
        const url = new URL(link.href);
        analysis.domains.add(url.hostname);
        
        if (link.href.startsWith('/') || link.href.startsWith('#')) {
          analysis.internalLinks++;
        } else {
          analysis.externalLinks++;
        }

        const fileType = this.getFileType(link.href);
        if (!analysis.linkTypes[fileType]) {
          analysis.linkTypes[fileType] = 0;
        }
        analysis.linkTypes[fileType]++;
      } catch (e) {
        // 忽略无效URL
      }
    });

    analysis.domains = Array.from(analysis.domains);
    return analysis;
  }

  detectContentType(content) {
    const text = content.text || '';
    const title = content.title || '';
    
    if (text.includes('新闻') || title.includes('新闻')) return 'news';
    if (text.includes('博客') || title.includes('博客')) return 'blog';
    if (text.includes('产品') || title.includes('产品')) return 'product';
    if (text.includes('服务') || title.includes('服务')) return 'service';
    if (text.includes('研究') || title.includes('研究')) return 'research';
    
    return 'general';
  }

  async extractKeyTopics(text) {
    try {
      // 确保text是字符串
      if (typeof text !== 'string') {
        console.warn('extractKeyTopics: text不是字符串类型', typeof text);
        return [];
      }

      // 简单的关键词提取（实际应用中可以使用更复杂的NLP算法）
      const words = text.toLowerCase().split(/\s+/);
      const wordFreq = {};
      
      words.forEach(word => {
        if (word.length > 3) {
          wordFreq[word] = (wordFreq[word] || 0) + 1;
        }
      });
      
      return Object.entries(wordFreq)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([word, freq]) => ({ word, frequency: freq }));
    } catch (error) {
      console.error('关键词提取错误:', error);
      return [];
    }
  }

  async analyzeSentiment(text) {
    try {
      // 确保text是字符串
      if (typeof text !== 'string') {
        console.warn('analyzeSentiment: text不是字符串类型', typeof text);
        return 'neutral';
      }

      // 简单的情感分析（实际应用中可以使用更复杂的NLP算法）
      const positiveWords = ['好', '优秀', '成功', '满意', '喜欢', '推荐'];
      const negativeWords = ['差', '失败', '不满', '讨厌', '不推荐', '问题'];
      
      const words = text.toLowerCase().split(/\s+/);
      let positiveCount = 0;
      let negativeCount = 0;
      
      words.forEach(word => {
        if (positiveWords.includes(word)) positiveCount++;
        if (negativeWords.includes(word)) negativeCount++;
      });
      
      const total = positiveCount + negativeCount;
      if (total === 0) return 'neutral';
      
      const score = (positiveCount - negativeCount) / total;
      if (score > 0.1) return 'positive';
      if (score < -0.1) return 'negative';
      return 'neutral';
    } catch (error) {
      console.error('情感分析错误:', error);
      return 'neutral';
    }
  }

  calculateReadability(text) {
    const sentences = text.split(/[。！？.!?]/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const characters = text.replace(/\s/g, '').length;
    
    return {
      sentenceCount: sentences.length,
      wordCount: words.length,
      characterCount: characters,
      averageSentenceLength: words.length / sentences.length || 0,
      averageWordLength: characters / words.length || 0
    };
  }

  extractFacts(text) {
    const factPatterns = [
      /([^。！？]+是[^。！？]+)/g,
      /([^。！？]+有[^。！？]+)/g,
      /([^。！？]+包含[^。！？]+)/g
    ];
    
    const facts = [];
    factPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        facts.push(...matches);
      }
    });
    
    return facts.slice(0, 10);
  }

  extractStatistics(text) {
    const statPatterns = [
      /(\d+(?:\.\d+)?%?)/g,
      /(百分之\d+)/g,
      /(\d+个)/g,
      /(\d+次)/g
    ];
    
    const stats = [];
    statPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        stats.push(...matches);
      }
    });
    
    return stats.slice(0, 10);
  }

  extractDates(text) {
    const datePatterns = [
      /(\d{4}年\d{1,2}月\d{1,2}日)/g,
      /(\d{4}-\d{1,2}-\d{1,2})/g,
      /(\d{1,2}月\d{1,2}日)/g
    ];
    
    const dates = [];
    datePatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        dates.push(...matches);
      }
    });
    
    return dates;
  }

  extractNames(text) {
    const namePatterns = [
      /([一-龯]{2,4}(?:先生|女士|教授|博士|老师))/g,
      /([A-Z][a-z]+ [A-Z][a-z]+)/g
    ];
    
    const names = [];
    namePatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        names.push(...matches);
      }
    });
    
    return names;
  }

  extractOrganizations(text) {
    const orgPatterns = [
      /([^。！？]+公司)/g,
      /([^。！？]+集团)/g,
      /([^。！？]+大学)/g,
      /([^。！？]+研究所)/g
    ];
    
    const organizations = [];
    orgPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        organizations.push(...matches);
      }
    });
    
    return organizations;
  }

  extractLocations(text) {
    const locationPatterns = [
      /([^。！？]+省)/g,
      /([^。！？]+市)/g,
      /([^。！？]+县)/g,
      /([^。！？]+区)/g
    ];
    
    const locations = [];
    locationPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        locations.push(...matches);
      }
    });
    
    return locations;
  }

  extractWithPattern(text, pattern) {
    const matches = text.match(new RegExp(pattern, 'g'));
    return matches || [];
  }

  getFileType(url) {
    const extension = url.split('.').pop().toLowerCase();
    const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'svg'];
    const documentTypes = ['pdf', 'doc', 'docx', 'txt'];
    
    if (imageTypes.includes(extension)) return 'image';
    if (documentTypes.includes(extension)) return 'document';
    return 'webpage';
  }

  // 报告生成辅助方法
  generateExecutiveSummary(data) {
    return `本报告基于对${data.sources?.length || 0}个信息源的综合分析，主要关注${data.focus || '相关主题'}。`;
  }

  generateMethodology(data) {
    return `研究方法包括网络搜索、内容抓取、信息提取和综合分析等步骤。`;
  }

  generateKeyFindings(data) {
    return `主要发现包括：\n1. 发现1\n2. 发现2\n3. 发现3`;
  }

  generateDetailedAnalysis(data) {
    return `详细分析内容将根据具体数据生成。`;
  }

  generateConclusions(data) {
    return `基于以上分析，得出以下结论：\n1. 结论1\n2. 结论2`;
  }

  generateRecommendations(data) {
    return `建议：\n1. 建议1\n2. 建议2`;
  }

  generateReferences(data) {
    return `参考资料：\n${(data.sources || []).map(source => `- ${source}`).join('\n')}`;
  }
} 