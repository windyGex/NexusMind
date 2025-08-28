import axios from 'axios';
import { JSDOM } from 'jsdom';
import * as cheerio from 'cheerio';

/**
 * 网页抓取工具类
 * 提供网页内容抓取、解析和分析功能
 */
class WebScrapingTools {
  constructor() {
    this.cache = new Map();
    this.userAgents = [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ];
    this.pdfParse = null;
    
    // 动态导入pdf-parse，避免在不支持的环境中出错
    this.initPDFParser();
  }

  /**
   * 初始化PDF解析器
   */
  async initPDFParser() {
    try {
      // 先尝试直接导入
      const pdfModule = await import('pdf-parse');
      this.pdfParse = pdfModule.default || pdfModule;
      console.log('✅ PDF解析器初始化成功');
    } catch (error) {
      console.warn('⚠️ PDF解析器初始化失败，PDF文件将无法正确解析:', error.message);
      console.warn('错误详情:', error);
      
      // 尝试另一种导入方式
      try {
        this.pdfParse = (await import('pdf-parse/lib/pdf-parse.js')).default;
        console.log('✅ PDF解析器通过备用方式初始化成功');
      } catch (backupError) {
        console.warn('⚠️ PDF解析器备用初始化也失败了:', backupError.message);
      }
    }
  }

  /**
   * 获取随机用户代理
   */
  getRandomUserAgent() {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }

  /**
   * 网页内容抓取
   */
  async scrapeWebPage(url, options = {}) {
    const cacheKey = `scrape_${url}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const {
      timeout = 30000,
      extractText = true,
      extractLinks = false,
      extractImages = false,
      extractMeta = true,
      customSelectors = {}
    } = options;

    try {
      // 检查是否为PDF文件
      if (url.toLowerCase().endsWith('.pdf')) {
        return await this.scrapePDF(url, options);
      }

      // 使用axios获取页面内容
      const response = await axios.get(url, {
        timeout,
        headers: {
          'User-Agent': this.getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        responseType: 'arraybuffer' // 处理各种内容类型
      });

      // 检查内容类型
      const contentType = response.headers['content-type'] || '';
      
      // 如果是PDF文件
      if (contentType.includes('application/pdf')) {
        return await this.scrapePDF(url, options, response.data);
      }

      // 如果是HTML内容
      if (contentType.includes('text/html')) {
        // 将buffer转换为字符串
        const htmlContent = response.data instanceof Buffer ? response.data.toString('utf8') : response.data;
        
        // 使用JSDOM解析HTML
        const dom = new JSDOM(htmlContent);
        const document = dom.window.document;

        const result = {
          url,
          title: document.title || '',
          timestamp: new Date().toISOString(),
          content: {},
          metadata: {}
        };

        // 提取meta信息
        if (extractMeta) {
          result.metadata = this.extractMetaData(document);
        }

        // 提取文本内容
        if (extractText) {
          result.content.text = this.extractTextContent(document, customSelectors);
        }

        // 提取链接
        if (extractLinks) {
          result.content.links = this.extractLinks(document);
        }

        // 提取图片
        if (extractImages) {
          result.content.images = this.extractImages(document);
        }

        // 缓存结果
        this.cache.set(cacheKey, result);
        
        return result;
      }

      // 其他类型的内容
      const result = {
        url,
        title: '',
        timestamp: new Date().toISOString(),
        content: {
          text: response.data instanceof Buffer ? response.data.toString('utf8') : response.data
        },
        metadata: {
          contentType
        }
      };

      // 缓存结果
      this.cache.set(cacheKey, result);
      
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
   * PDF内容抓取
   */
  async scrapePDF(url, options = {}, pdfBuffer = null) {
    // 等待PDF解析器初始化完成
    if (this.pdfParse === null) {
      // 等待最多2秒让解析器初始化
      let attempts = 0;
      while (this.pdfParse === null && attempts < 20) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
    }
    
    // 检查PDF解析器是否可用
    if (!this.pdfParse) {
      console.warn('PDF解析器不可用，返回原始内容');
      try {
        // 如果没有提供pdfBuffer，则从URL获取
        if (!pdfBuffer) {
          const response = await axios.get(url, {
            timeout: options.timeout || 30000,
            headers: {
              'User-Agent': this.getRandomUserAgent()
            },
            responseType: 'arraybuffer'
          });
          pdfBuffer = response.data;
        }

        // 尝试将PDF内容转换为文本（可能包含乱码）
        const text = pdfBuffer instanceof Buffer ? pdfBuffer.toString('utf8') : String(pdfBuffer);
        
        const result = {
          url,
          title: `PDF文档: ${url}`,
          timestamp: new Date().toISOString(),
          content: {
            text: text.substring(0, 1000) + (text.length > 1000 ? '...' : ''), // 限制长度
          },
          metadata: {
            contentType: 'application/pdf',
            warning: 'PDF解析器不可用，内容可能包含乱码'
          }
        };

        return result;
      } catch (error) {
        return {
          url,
          error: `PDF处理失败: ${error.message}`,
          timestamp: new Date().toISOString()
        };
      }
    }

    try {
      // 如果没有提供pdfBuffer，则从URL获取
      if (!pdfBuffer) {
        const response = await axios.get(url, {
          timeout: options.timeout || 30000,
          headers: {
            'User-Agent': this.getRandomUserAgent()
          },
          responseType: 'arraybuffer'
        });
        pdfBuffer = response.data;
      }

      // 使用pdf-parse解析PDF
      const pdfData = await this.pdfParse(pdfBuffer);
      
      const result = {
        url,
        title: pdfData.info.Title || `PDF文档: ${url}`,
        timestamp: new Date().toISOString(),
        content: {
          text: pdfData.text,
          pdfInfo: {
            author: pdfData.info.Author,
            subject: pdfData.info.Subject,
            keywords: pdfData.info.Keywords,
            creator: pdfData.info.Creator,
            producer: pdfData.info.Producer,
            creationDate: pdfData.info.CreationDate,
            modDate: pdfData.info.ModDate
          }
        },
        metadata: {
          contentType: 'application/pdf',
          numPages: pdfData.numpages,
          numRender: pdfData.numrender,
          info: pdfData.info
        }
      };

      return result;
    } catch (error) {
      console.error(`解析PDF失败: ${url}`, error.message);
      return {
        url,
        error: `PDF解析失败: ${error.message}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 提取meta数据
   */
  extractMetaData(document) {
    const meta = {};
    
    // 提取meta标签
    document.querySelectorAll('meta').forEach(el => {
      const name = el.getAttribute('name') || el.getAttribute('property');
      const content = el.getAttribute('content');
      if (name && content) {
        meta[name] = content;
      }
    });

    // 提取Open Graph数据
    const ogData = {};
    document.querySelectorAll('meta[property^="og:"]').forEach(el => {
      const property = el.getAttribute('property');
      const content = el.getAttribute('content');
      if (property && content) {
        ogData[property] = content;
      }
    });

    // 提取Twitter Card数据
    const twitterData = {};
    document.querySelectorAll('meta[name^="twitter:"]').forEach(el => {
      const name = el.getAttribute('name');
      const content = el.getAttribute('content');
      if (name && content) {
        twitterData[name] = content;
      }
    });

    return {
      ...meta,
      og: ogData,
      twitter: twitterData
    };
  }

  /**
   * 提取文本内容
   */
  extractTextContent(document, customSelectors = {}) {
    const content = {};

    // 提取标题
    const h1Element = document.querySelector('h1');
    content.title = h1Element ? h1Element.textContent.trim() : '';
    
    // 提取主要文本内容
    const mainSelectors = [
      'main',
      'article',
      '.content',
      '.main-content',
      '#content',
      '.post-content',
      '.entry-content',
      '.article-content'
    ];

    for (const selector of mainSelectors) {
      try {
        const element = document.querySelector(selector);
        if (element) {
          content.mainText = element.textContent.trim();
          break;
        }
      } catch (e) {
        continue;
      }
    }

    // 如果没有找到主要内容，使用body
    if (!content.mainText) {
      const body = document.querySelector('body');
      if (body) {
        content.mainText = body.textContent.trim();
      }
    }

    // 提取段落
    const paragraphs = Array.from(document.querySelectorAll('p'))
      .map(p => p.textContent.trim())
      .filter(text => text.length > 50); // 过滤短段落
    content.paragraphs = paragraphs;

    // 提取标题结构
    const headings = [];
    document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(h => {
      headings.push({
        level: h.tagName.toLowerCase(),
        text: h.textContent.trim()
      });
    });
    content.headings = headings;

    // 使用自定义选择器
    if (customSelectors) {
      for (const [key, selector] of Object.entries(customSelectors)) {
        try {
          const element = document.querySelector(selector);
          if (element) {
            content[key] = element.textContent.trim();
          }
        } catch (e) {
          console.warn(`自定义选择器失败: ${selector}`, e.message);
        }
      }
    }

    return content;
  }

  /**
   * 提取链接
   */
  extractLinks(document) {
    const links = [];
    document.querySelectorAll('a').forEach(a => {
      const href = a.getAttribute('href');
      const text = a.textContent.trim();
      
      if (href && href.startsWith('http')) {
        links.push({
          text,
          href,
          title: a.getAttribute('title') || ''
        });
      }
    });
    
    return links;
  }

  /**
   * 提取图片
   */
  extractImages(document) {
    const images = [];
    document.querySelectorAll('img').forEach(img => {
      const src = img.getAttribute('src');
      const alt = img.getAttribute('alt') || '';
      const title = img.getAttribute('title') || '';
      
      if (src) {
        images.push({
          src,
          alt,
          title,
          width: img.getAttribute('width'),
          height: img.getAttribute('height')
        });
      }
    });
    
    return images;
  }

  /**
   * 使用Cheerio进行更精确的内容提取
   */
  async scrapeWithCheerio(url, options = {}) {
    const {
      timeout = 30000,
      selectors = {}
    } = options;

    try {
      const response = await axios.get(url, {
        timeout,
        headers: {
          'User-Agent': this.getRandomUserAgent()
        }
      });

      const $ = cheerio.load(response.data);
      
      const result = {
        url,
        title: $('title').text().trim(),
        timestamp: new Date().toISOString(),
        extracted: {}
      };

      // 使用自定义选择器提取内容
      for (const [key, selector] of Object.entries(selectors)) {
        const element = $(selector);
        if (element.length > 0) {
          result.extracted[key] = element.text().trim();
        }
      }

      return result;

    } catch (error) {
      console.error(`Cheerio抓取失败: ${url}`, error.message);
      return {
        url,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 批量抓取网页
   */
  async scrapeMultiplePages(urls, options = {}) {
    const results = [];
    const { concurrency = 3 } = options;

    // 分批处理，避免同时发起太多请求
    for (let i = 0; i < urls.length; i += concurrency) {
      const batch = urls.slice(i, i + concurrency);
      const batchPromises = batch.map(url => this.scrapeWebPage(url, options));
      
      try {
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
      } catch (error) {
        console.error('批量抓取失败:', error);
      }
    }

    return results;
  }

  /**
   * 清理缓存
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * 获取缓存统计
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

export default WebScrapingTools;