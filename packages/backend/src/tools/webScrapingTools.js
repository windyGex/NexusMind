import WebScrapingService from '../services/webScrapingService.js';

// 创建全局的WebScrapingService实例
let webScrapingService = null;

// 初始化WebScrapingService
async function getWebScrapingService() {
  if (!webScrapingService) {
    webScrapingService = new WebScrapingService();
    await webScrapingService.initialize();
  }
  return webScrapingService;
}

// 网页抓取工具定义
export const webScrapingTools = [
  {
    name: 'scrape_webpage',
    description: '抓取指定网页的内容，提取文本、链接和图片信息',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: '要抓取的网页URL'
        },
        waitForSelector: {
          type: 'string',
          description: '等待特定CSS选择器出现（可选）'
        },
        waitForTimeout: {
          type: 'number',
          description: '等待时间（毫秒），默认5000'
        },
        extractText: {
          type: 'boolean',
          description: '是否提取文本内容，默认true'
        },
        extractLinks: {
          type: 'boolean',
          description: '是否提取链接，默认false'
        },
        extractImages: {
          type: 'boolean',
          description: '是否提取图片，默认false'
        }
      },
      required: ['url']
    },
    execute: async (args) => {
      try {
        const service = await getWebScrapingService();
        const result = await service.scrapeWebPage(args.url, {
          waitForSelector: args.waitForSelector,
          waitForTimeout: args.waitForTimeout || 5000,
          extractText: args.extractText !== false,
          extractLinks: args.extractLinks || false,
          extractImages: args.extractImages || false
        });
        
        return {
          success: true,
          data: result
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    }
  },
  
  {
    name: 'analyze_stock_investment',
    description: '分析股票投资相关内容，提供综合建议和仓位配比',
    parameters: {
      type: 'object',
      properties: {
        urls: {
          type: 'array',
          items: {
            type: 'string'
          },
          description: '要分析的网页URL列表'
        },
        analysisType: {
          type: 'string',
          enum: ['comprehensive', 'technical', 'fundamental', 'basic'],
          description: '分析类型：comprehensive(综合)、technical(技术)、fundamental(基本面)、basic(基础)',
          default: 'comprehensive'
        }
      },
      required: ['urls']
    },
    execute: async (args) => {
      try {
        const service = await getWebScrapingService();
        const results = await service.analyzeStockInvestment(args.urls, args.analysisType);
        
        // 生成综合建议
        const comprehensiveAdvice = generateComprehensiveAdvice(results);
        
        return {
          success: true,
          data: {
            analysisResults: results,
            comprehensiveAdvice,
            timestamp: new Date().toISOString()
          }
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    }
  },
  
  {
    name: 'scrape_multiple_pages',
    description: '批量抓取多个网页，用于综合分析',
    parameters: {
      type: 'object',
      properties: {
        urls: {
          type: 'array',
          items: {
            type: 'string'
          },
          description: '要抓取的网页URL列表'
        },
        options: {
          type: 'object',
          description: '抓取选项',
          properties: {
            waitForTimeout: {
              type: 'number',
              description: '等待时间（毫秒）'
            },
            extractText: {
              type: 'boolean',
              description: '是否提取文本'
            },
            extractLinks: {
              type: 'boolean',
              description: '是否提取链接'
            }
          }
        }
      },
      required: ['urls']
    },
    execute: async (args) => {
      try {
        const service = await getWebScrapingService();
        const results = [];
        
        for (const url of args.urls) {
          try {
            const result = await service.scrapeWebPage(url, args.options || {});
            results.push({
              url,
              success: true,
              data: result
            });
          } catch (error) {
            results.push({
              url,
              success: false,
              error: error.message
            });
          }
        }
        
        return {
          success: true,
          data: {
            results,
            summary: {
              total: args.urls.length,
              successful: results.filter(r => r.success).length,
              failed: results.filter(r => !r.success).length
            }
          }
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    }
  },
  
  {
    name: 'generate_investment_report',
    description: '基于抓取的数据生成投资分析报告',
    parameters: {
      type: 'object',
      properties: {
        scrapedData: {
          type: 'array',
          description: '抓取的数据数组'
        },
        reportType: {
          type: 'string',
          enum: ['summary', 'detailed', 'executive'],
          description: '报告类型',
          default: 'summary'
        },
        includeRecommendations: {
          type: 'boolean',
          description: '是否包含投资建议',
          default: true
        }
      },
      required: ['scrapedData']
    },
    execute: async (args) => {
      try {
        const report = generateInvestmentReport(args.scrapedData, args.reportType, args.includeRecommendations);
        
        return {
          success: true,
          data: report
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    }
  }
];

// 生成综合投资建议
function generateComprehensiveAdvice(results) {
  const validResults = results.filter(r => r.analysis && !r.error);
  
  if (validResults.length === 0) {
    return {
      overallSentiment: 'neutral',
      riskLevel: 'medium',
      recommendations: ['数据不足，建议谨慎操作'],
      positionAllocation: {
        conservative: 30,
        moderate: 40,
        aggressive: 30
      }
    };
  }
  
  // 分析整体情绪
  const sentiments = validResults.map(r => r.analysis.sentiment);
  const positiveCount = sentiments.filter(s => s === 'positive').length;
  const negativeCount = sentiments.filter(s => s === 'negative').length;
  
  let overallSentiment = 'neutral';
  if (positiveCount > negativeCount) {
    overallSentiment = 'positive';
  } else if (negativeCount > positiveCount) {
    overallSentiment = 'negative';
  }
  
  // 分析风险水平
  const riskLevels = validResults.map(r => r.analysis.riskLevel);
  const highRiskCount = riskLevels.filter(r => r === 'high').length;
  const lowRiskCount = riskLevels.filter(r => r === 'low').length;
  
  let overallRiskLevel = 'medium';
  if (highRiskCount > lowRiskCount) {
    overallRiskLevel = 'high';
  } else if (lowRiskCount > highRiskCount) {
    overallRiskLevel = 'low';
  }
  
  // 生成仓位配比建议
  const positionAllocation = generatePositionAllocation(overallSentiment, overallRiskLevel);
  
  // 汇总建议
  const allRecommendations = validResults.flatMap(r => r.analysis.recommendations || []);
  const uniqueRecommendations = [...new Set(allRecommendations)];
  
  return {
    overallSentiment,
    riskLevel: overallRiskLevel,
    recommendations: uniqueRecommendations,
    positionAllocation,
    dataSourceCount: validResults.length,
    confidence: Math.min(validResults.length * 20, 100) // 基于数据源数量的置信度
  };
}

// 生成仓位配比
function generatePositionAllocation(sentiment, riskLevel) {
  let allocation = {
    conservative: 30,
    moderate: 40,
    aggressive: 30
  };
  
  // 根据情绪调整
  if (sentiment === 'positive') {
    allocation.aggressive += 10;
    allocation.conservative -= 10;
  } else if (sentiment === 'negative') {
    allocation.conservative += 15;
    allocation.aggressive -= 15;
  }
  
  // 根据风险调整
  if (riskLevel === 'high') {
    allocation.conservative += 20;
    allocation.aggressive -= 20;
  } else if (riskLevel === 'low') {
    allocation.aggressive += 15;
    allocation.conservative -= 15;
  }
  
  // 确保总和为100
  const total = allocation.conservative + allocation.moderate + allocation.aggressive;
  if (total !== 100) {
    const diff = 100 - total;
    allocation.moderate += diff;
  }
  
  return allocation;
}

// 生成投资分析报告
function generateInvestmentReport(scrapedData, reportType = 'summary', includeRecommendations = true) {
  const report = {
    type: reportType,
    timestamp: new Date().toISOString(),
    summary: '',
    keyFindings: [],
    recommendations: [],
    riskAssessment: '',
    dataSources: []
  };
  
  // 分析数据源
  const validData = scrapedData.filter(d => d.success && d.data);
  report.dataSources = validData.map(d => ({
    url: d.url,
    title: d.data.title,
    timestamp: d.data.timestamp
  }));
  
  // 提取关键信息
  const allText = validData.map(d => d.data.content?.text?.mainText || '').join(' ');
  const keyTopics = extractKeyTopics(allText);
  const sentiment = analyzeOverallSentiment(allText);
  
  // 生成报告内容
  switch (reportType) {
    case 'summary':
      report.summary = `基于${validData.length}个数据源的分析，主要涉及${keyTopics.join('、')}。整体情绪倾向：${sentiment}`;
      report.keyFindings = extractKeyFindings(allText, 3);
      break;
      
    case 'detailed':
      report.summary = `详细分析报告：基于${validData.length}个数据源的深度分析，涵盖${keyTopics.join('、')}等多个维度。`;
      report.keyFindings = extractKeyFindings(allText, 5);
      report.riskAssessment = assessOverallRisk(allText);
      break;
      
    case 'executive':
      report.summary = `执行摘要：${validData.length}个数据源的综合分析显示，当前市场${sentiment}，重点关注${keyTopics.slice(0, 3).join('、')}。`;
      report.keyFindings = extractKeyFindings(allText, 2);
      break;
  }
  
  // 添加建议
  if (includeRecommendations) {
    report.recommendations = generateReportRecommendations(sentiment, keyTopics);
  }
  
  return report;
}

// 提取关键主题
function extractKeyTopics(text) {
  const topics = [];
  const commonTopics = [
    '股票', '投资', '市场', '经济', '政策', '技术', '基本面',
    '上涨', '下跌', '突破', '支撑', '阻力', '趋势', '反弹'
  ];
  
  commonTopics.forEach(topic => {
    if (text.includes(topic) && !topics.includes(topic)) {
      topics.push(topic);
    }
  });
  
  return topics;
}

// 分析整体情绪
function analyzeOverallSentiment(text) {
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
  
  if (positiveCount > negativeCount) return '积极';
  if (negativeCount > positiveCount) return '消极';
  return '中性';
}

// 提取关键发现
function extractKeyFindings(text, maxCount = 3) {
  const findings = [];
  const patterns = [
    { pattern: /([^。]*上涨[^。]*)/g, label: '上涨趋势' },
    { pattern: /([^。]*下跌[^。]*)/g, label: '下跌趋势' },
    { pattern: /([^。]*突破[^。]*)/g, label: '突破信号' },
    { pattern: /([^。]*支撑[^。]*)/g, label: '支撑位' },
    { pattern: /([^。]*阻力[^。]*)/g, label: '阻力位' }
  ];
  
  patterns.forEach(({ pattern, label }) => {
    const matches = text.match(pattern);
    if (matches && findings.length < maxCount) {
      findings.push(`${label}：${matches[0].trim()}`);
    }
  });
  
  return findings;
}

// 评估整体风险
function assessOverallRisk(text) {
  const highRiskWords = ['高风险', '暴跌', '崩盘', '危机', '违约'];
  const lowRiskWords = ['稳定', '安全', '保守', '稳健'];
  
  for (const word of highRiskWords) {
    if (text.includes(word)) return '高风险';
  }
  
  for (const word of lowRiskWords) {
    if (text.includes(word)) return '低风险';
  }
  
  return '中等风险';
}

// 生成报告建议
function generateReportRecommendations(sentiment, topics) {
  const recommendations = [];
  
  if (sentiment === '积极') {
    recommendations.push('市场情绪积极，可考虑适度加仓');
  } else if (sentiment === '消极') {
    recommendations.push('市场情绪谨慎，建议控制仓位');
  } else {
    recommendations.push('市场情绪中性，建议观望为主');
  }
  
  if (topics.includes('技术')) {
    recommendations.push('关注技术面指标变化');
  }
  
  if (topics.includes('基本面')) {
    recommendations.push('重点关注基本面数据');
  }
  
  return recommendations;
}

// 清理资源
export async function cleanupWebScrapingService() {
  if (webScrapingService) {
    await webScrapingService.close();
    webScrapingService = null;
  }
} 