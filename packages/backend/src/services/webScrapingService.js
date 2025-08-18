import axios from 'axios';
import { JSDOM } from 'jsdom';

class WebScrapingService {
  constructor() {
    this.isInitialized = true;
  }

  async initialize() {
    // 使用axios和jsdom，无需特殊初始化
    this.isInitialized = true;
    console.log('✅ WebScrapingService 初始化成功');
  }

  async close() {
    // 无需特殊清理
    this.isInitialized = false;
  }

  async scrapeWebPage(url, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const {
      waitForTimeout = 0,
      extractText = true,
      extractLinks = false,
      extractImages = false,
      customSelectors = {}
    } = options;

    try {
      // 使用axios获取页面内容
      const response = await axios.get(url, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      // 使用JSDOM解析HTML
      const dom = new JSDOM(response.data);
      const document = dom.window.document;

      const result = {
        url,
        title: document.title || '',
        timestamp: new Date().toISOString(),
        content: {}
      };

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

      return result;
    } catch (error) {
      console.error(`❌ 抓取页面失败 ${url}:`, error);
      throw error;
    }
  }

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
      '.entry-content'
    ];

    for (const selector of mainSelectors) {
      try {
        const element = document.querySelector(selector);
        if (element) {
          content.mainText = element.textContent;
          break;
        }
      } catch (e) {
        // 忽略错误，继续尝试下一个选择器
      }
    }

    // 如果没有找到主要内容，提取body文本
    if (!content.mainText) {
      const bodyElement = document.querySelector('body');
      content.mainText = bodyElement ? bodyElement.textContent : '';
    }

    // 提取自定义选择器内容
    for (const [key, selector] of Object.entries(customSelectors)) {
      try {
        const element = document.querySelector(selector);
        content[key] = element ? element.textContent.trim() : '';
      } catch (e) {
        content[key] = '';
      }
    }

    return content;
  }

  extractLinks(document) {
    const links = document.querySelectorAll('a[href]');
    return Array.from(links).map(link => ({
      text: link.textContent ? link.textContent.trim() : '',
      href: link.href,
      title: link.title || ''
    }));
  }

  extractImages(document) {
    const images = document.querySelectorAll('img');
    return Array.from(images).map(img => ({
      src: img.src,
      alt: img.alt || '',
      title: img.title || '',
      width: img.width || 0,
      height: img.height || 0
    }));
  }

  // 股票投资分析相关方法
  async analyzeStockInvestment(urls, analysisType = 'comprehensive') {
    const results = [];
    
    for (const url of urls) {
      try {
        const scrapedData = await this.scrapeWebPage(url, {
          waitForTimeout: 3000,
          extractText: true,
          extractLinks: false,
          extractImages: false
        });
        
        const analysis = await this.performStockAnalysis(scrapedData, analysisType);
        results.push({
          url,
          scrapedData,
          analysis
        });
      } catch (error) {
        console.error(`❌ 分析页面失败 ${url}:`, error);
        results.push({
          url,
          error: error.message
        });
      }
    }
    
    return results;
  }

  async performStockAnalysis(scrapedData, analysisType) {
    const { title, content } = scrapedData;
    const text = content.text?.mainText || '';
    
    // 基础分析
    const analysis = {
      type: analysisType,
      timestamp: new Date().toISOString(),
      summary: '',
      sentiment: 'neutral',
      confidence: 0,
      recommendations: [],
      riskLevel: 'medium'
    };

    // 根据分析类型进行不同的处理
    switch (analysisType) {
      case 'comprehensive':
        analysis.summary = await this.generateComprehensiveSummary(title, text);
        analysis.sentiment = this.analyzeSentiment(text);
        analysis.recommendations = this.generateRecommendations(text);
        analysis.riskLevel = this.assessRiskLevel(text);
        break;
        
      case 'technical':
        analysis.summary = await this.generateTechnicalAnalysis(title, text);
        analysis.recommendations = this.generateTechnicalRecommendations(text);
        break;
        
      case 'fundamental':
        analysis.summary = await this.generateFundamentalAnalysis(title, text);
        analysis.recommendations = this.generateFundamentalRecommendations(text);
        break;
        
      default:
        analysis.summary = await this.generateBasicSummary(title, text);
    }

    return analysis;
  }

  async generateComprehensiveSummary(title, text) {
    // 这里可以集成AI模型进行更智能的分析
    const summary = `基于对"${title}"的分析，该内容主要涉及${this.extractKeyTopics(text)}。`;
    return summary;
  }

  async generateTechnicalAnalysis(title, text) {
    return `技术分析：${title} 的技术指标显示${this.extractTechnicalIndicators(text)}。`;
  }

  async generateFundamentalAnalysis(title, text) {
    return `基本面分析：${title} 的基本面数据显示${this.extractFundamentalData(text)}。`;
  }

  async generateBasicSummary(title, text) {
    return `基础分析：${title} 的内容主要包含${this.extractKeyTopics(text)}。`;
  }

  analyzeSentiment(text) {
    const positiveWords = ['上涨', '利好', '增长', '盈利', '突破', '强势', '看好', '推荐'];
    const negativeWords = ['下跌', '利空', '亏损', '风险', '下跌', '弱势', '看空', '谨慎'];
    
    let positiveCount = 0;
    let negativeCount = 0;
    
    positiveWords.forEach(word => {
      const regex = new RegExp(word, 'g');
      const matches = text.match(regex);
      if (matches) positiveCount += matches.length;
    });
    
    negativeWords.forEach(word => {
      const regex = new RegExp(word, 'g');
      const matches = text.match(regex);
      if (matches) negativeCount += matches.length;
    });
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  generateRecommendations(text) {
    const recommendations = [];
    
    // 基于文本内容生成建议
    if (text.includes('买入') || text.includes('推荐')) {
      recommendations.push('考虑买入');
    }
    
    if (text.includes('卖出') || text.includes('减持')) {
      recommendations.push('考虑卖出');
    }
    
    if (text.includes('持有') || text.includes('观望')) {
      recommendations.push('建议持有');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('需要更多信息进行判断');
    }
    
    return recommendations;
  }

  generateTechnicalRecommendations(text) {
    const recommendations = [];
    
    if (text.includes('突破') || text.includes('上涨趋势')) {
      recommendations.push('技术面看涨，可考虑买入');
    }
    
    if (text.includes('支撑') || text.includes('底部')) {
      recommendations.push('接近支撑位，可关注反弹机会');
    }
    
    if (text.includes('阻力') || text.includes('顶部')) {
      recommendations.push('接近阻力位，注意回调风险');
    }
    
    return recommendations;
  }

  generateFundamentalRecommendations(text) {
    const recommendations = [];
    
    if (text.includes('盈利') || text.includes('增长')) {
      recommendations.push('基本面良好，长期看好');
    }
    
    if (text.includes('亏损') || text.includes('下滑')) {
      recommendations.push('基本面承压，需要谨慎');
    }
    
    return recommendations;
  }

  assessRiskLevel(text) {
    const highRiskWords = ['高风险', '暴跌', '崩盘', '危机', '违约'];
    const lowRiskWords = ['稳定', '安全', '保守', '稳健'];
    
    for (const word of highRiskWords) {
      if (text.includes(word)) return 'high';
    }
    
    for (const word of lowRiskWords) {
      if (text.includes(word)) return 'low';
    }
    
    return 'medium';
  }

  extractKeyTopics(text) {
    const topics = [];
    const commonTopics = ['股票', '投资', '市场', '经济', '政策', '技术', '基本面'];
    
    commonTopics.forEach(topic => {
      if (text.includes(topic)) {
        topics.push(topic);
      }
    });
    
    return topics.length > 0 ? topics.join('、') : '投资相关内容';
  }

  extractTechnicalIndicators(text) {
    const indicators = [];
    const commonIndicators = ['MACD', 'KDJ', 'RSI', '均线', '成交量', '布林带'];
    
    commonIndicators.forEach(indicator => {
      if (text.includes(indicator)) {
        indicators.push(indicator);
      }
    });
    
    return indicators.length > 0 ? indicators.join('、') : '技术指标';
  }

  extractFundamentalData(text) {
    const data = [];
    const commonData = ['市盈率', '市净率', '营收', '利润', '负债', '现金流'];
    
    commonData.forEach(item => {
      if (text.includes(item)) {
        data.push(item);
      }
    });
    
    return data.length > 0 ? data.join('、') : '基本面数据';
  }
}

export default WebScrapingService; 