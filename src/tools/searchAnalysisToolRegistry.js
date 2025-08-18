import SearchAnalysisTools from './searchAnalysisTools.js';

// 创建工具实例
const searchTools = new SearchAnalysisTools();

/**
 * 搜索分析工具注册表
 * 定义智能体可以调用的搜索和分析工具
 */
export const searchAnalysisTools = {
  /**
   * 网页内容抓取工具
   */
  web_scraper: {
    name: 'web_scraper',
    description: '抓取指定网页的内容，包括文本、标题、结构化数据等。适用于获取新闻、文章、数据等信息。',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: '要抓取的网页URL'
        },
        options: {
          type: 'object',
          description: '抓取选项',
          properties: {
            timeout: {
              type: 'number',
              description: '超时时间（毫秒）',
              default: 30000
            },
            waitForSelector: {
              type: 'string',
              description: '等待特定元素出现'
            }
          }
        }
      },
      required: ['url']
    },
    execute: async (args) => {
      try {
        const result = await searchTools.scrapeWebPage(args.url, args.options || {});
        return {
          success: true,
          result,
          message: `成功抓取网页: ${args.url}`
        };
      } catch (error) {
        return {
          success: false,
          error: error.message,
          message: `抓取失败: ${error.message}`
        };
      }
    }
  },

  /**
   * 搜索工具
   */
  web_search: {
    name: 'web_search',
    description: '在搜索引擎中搜索指定关键词，返回相关结果。支持Google、Bing等搜索引擎。',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '搜索关键词'
        },
        options: {
          type: 'object',
          description: '搜索选项',
          properties: {
            engine: {
              type: 'string',
              enum: ['google', 'bing', 'yahoo'],
              description: '搜索引擎',
              default: 'google'
            },
            maxResults: {
              type: 'number',
              description: '最大结果数量',
              default: 10
            },
            timeRange: {
              type: 'string',
              description: '时间范围（1d, 1w, 1m, 1y）',
              default: '1y'
            }
          }
        }
      },
      required: ['query']
    },
    execute: async (args) => {
      try {
        // 确保query参数存在且是字符串
        if (!args.query) {
          throw new Error('query参数是必需的');
        }
        
        if (typeof args.query !== 'string') {
          throw new Error('query参数必须是字符串类型');
        }

        const result = await searchTools.search(args.query, args.options || {});
        return {
          success: true,
          result,
          message: `搜索完成: ${args.query}`
        };
      } catch (error) {
        console.error('web_search工具执行错误:', error);
        return {
          success: false,
          error: error.message,
          message: `搜索失败: ${error.message}`
        };
      }
    }
  },

  /**
   * 投资数据搜索工具
   */
  investment_search: {
    name: 'investment_search',
    description: '专门搜索投资相关信息，包括股票分析、市场新闻、投资建议等。',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '搜索关键词（如股票代码、公司名称等）'
        },
        options: {
          type: 'object',
          description: '搜索选项',
          properties: {
            maxResults: {
              type: 'number',
              description: '最大结果数量',
              default: 20
            },
            timeRange: {
              type: 'string',
              description: '时间范围',
              default: '1m'
            }
          }
        }
      },
      required: ['query']
    },
    execute: async (args) => {
      try {
        const result = await searchTools.searchInvestmentData(args.query, args.options || {});
        return {
          success: true,
          result,
          message: `投资数据搜索完成: ${args.query}`
        };
      } catch (error) {
        return {
          success: false,
          error: error.message,
          message: `投资搜索失败: ${error.message}`
        };
      }
    }
  },

  /**
   * 股票数据分析工具
   */
  stock_analysis: {
    name: 'stock_analysis',
    description: '综合分析股票数据，包括搜索相关信息、抓取网页、分析内容并生成投资建议。',
    parameters: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: '股票代码（如AAPL、TSLA等）'
        },
        options: {
          type: 'object',
          description: '分析选项',
          properties: {
            maxResults: {
              type: 'number',
              description: '最大搜索结果数量',
              default: 10
            },
            includeScraping: {
              type: 'boolean',
              description: '是否抓取网页内容',
              default: true
            }
          }
        }
      },
      required: ['symbol']
    },
    execute: async (args) => {
      try {
        const result = await searchTools.analyzeStockData(args.symbol, args.options || {});
        return {
          success: true,
          result,
          message: `股票分析完成: ${args.symbol}`
        };
      } catch (error) {
        return {
          success: false,
          error: error.message,
          message: `股票分析失败: ${error.message}`
        };
      }
    }
  },

  /**
   * 内容分析工具
   */
  content_analyzer: {
    name: 'content_analyzer',
    description: '分析文本内容，提取关键词、主题、情感等信息。',
    parameters: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: '要分析的文本内容'
        },
        options: {
          type: 'object',
          description: '分析选项',
          properties: {
            summaryLength: {
              type: 'number',
              description: '摘要长度',
              default: 200
            }
          }
        }
      },
      required: ['content']
    },
    execute: async (args) => {
      try {
        const result = await searchTools.analyzeContent(args.content, args.options || {});
        return {
          success: true,
          result,
          message: '内容分析完成'
        };
      } catch (error) {
        return {
          success: false,
          error: error.message,
          message: `内容分析失败: ${error.message}`
        };
      }
    }
  },

  /**
   * 批量网页抓取工具
   */
  batch_scraper: {
    name: 'batch_scraper',
    description: '批量抓取多个网页，适用于需要收集大量信息的场景。',
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
            concurrency: {
              type: 'number',
              description: '并发数量',
              default: 3
            },
            timeout: {
              type: 'number',
              description: '超时时间（毫秒）',
              default: 30000
            }
          }
        }
      },
      required: ['urls']
    },
    execute: async (args) => {
      try {
        const result = await searchTools.scrapeMultiplePages(args.urls, args.options || {});
        return {
          success: true,
          result,
          message: `批量抓取完成，共处理 ${args.urls.length} 个URL`
        };
      } catch (error) {
        return {
          success: false,
          error: error.message,
          message: `批量抓取失败: ${error.message}`
        };
      }
    }
  },

  /**
   * 投资组合分析工具
   */
  portfolio_analysis: {
    name: 'portfolio_analysis',
    description: '分析投资组合，为多个股票生成综合分析报告和投资建议。',
    parameters: {
      type: 'object',
      properties: {
        symbols: {
          type: 'array',
          items: {
            type: 'string'
          },
          description: '股票代码列表'
        },
        options: {
          type: 'object',
          description: '分析选项',
          properties: {
            includeRecommendations: {
              type: 'boolean',
              description: '是否包含投资建议',
              default: true
            },
            riskLevel: {
              type: 'string',
              enum: ['conservative', 'moderate', 'aggressive'],
              description: '风险偏好',
              default: 'moderate'
            }
          }
        }
      },
      required: ['symbols']
    },
    execute: async (args) => {
      try {
        const analyses = [];
        const { symbols, options = {} } = args;

        // 分析每个股票
        for (const symbol of symbols) {
          const analysis = await searchTools.analyzeStockData(symbol, options);
          analyses.push(analysis);
        }

        // 生成投资组合建议
        const portfolioSummary = generatePortfolioSummary(analyses, options);

        return {
          success: true,
          result: {
            symbols,
            analyses,
            portfolioSummary,
            timestamp: new Date().toISOString()
          },
          message: `投资组合分析完成，共分析 ${symbols.length} 只股票`
        };
      } catch (error) {
        return {
          success: false,
          error: error.message,
          message: `投资组合分析失败: ${error.message}`
        };
      }
    }
  }
};

/**
 * 生成投资组合摘要
 */
function generatePortfolioSummary(analyses, options) {
  const summary = {
    totalStocks: analyses.length,
    overallSentiment: 'neutral',
    riskAssessment: 'medium',
    recommendations: [],
    allocation: {},
    keyInsights: []
  };

  // 计算整体情感
  const sentiments = analyses.map(a => a.summary?.sentiment || 'neutral');
  const positiveCount = sentiments.filter(s => s === 'positive').length;
  const negativeCount = sentiments.filter(s => s === 'negative').length;

  if (positiveCount > negativeCount) {
    summary.overallSentiment = 'positive';
  } else if (negativeCount > positiveCount) {
    summary.overallSentiment = 'negative';
  }

  // 根据风险偏好生成建议
  const { riskLevel = 'moderate' } = options;
  
  if (riskLevel === 'conservative') {
    summary.recommendations.push('建议配置60%蓝筹股，30%债券，10%现金');
    summary.riskAssessment = 'low';
  } else if (riskLevel === 'moderate') {
    summary.recommendations.push('建议配置40%成长股，40%蓝筹股，20%其他资产');
    summary.riskAssessment = 'medium';
  } else {
    summary.recommendations.push('建议配置60%成长股，30%蓝筹股，10%现金');
    summary.riskAssessment = 'high';
  }

  // 生成关键洞察
  analyses.forEach(analysis => {
    if (analysis.summary?.keyPoints) {
      summary.keyInsights.push(...analysis.summary.keyPoints.slice(0, 3));
    }
  });

  // 去重关键洞察
  summary.keyInsights = [...new Set(summary.keyInsights)];

  return summary;
}

/**
 * 获取所有搜索分析工具
 */
export function getSearchAnalysisTools() {
  return Object.values(searchAnalysisTools);
}

/**
 * 根据名称获取工具
 */
export function getSearchAnalysisTool(name) {
  return searchAnalysisTools[name];
}

/**
 * 清理资源
 */
export async function cleanupSearchTools() {
  await searchTools.closeBrowser();
}

export default searchAnalysisTools; 