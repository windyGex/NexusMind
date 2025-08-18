import { UniversalAgentTools } from './universalAgentTools.js';
import logger from '../../utils/logger.js';

/**
 * 通用智能体工具注册器
 * 定义和注册所有通用智能体相关的工具
 */
export class UniversalAgentToolRegistry {
  constructor() {
    this.tools = new UniversalAgentTools();
  }

  /**
   * 获取所有工具定义
   */
  getToolDefinitions() {
    return [
      {
        name: 'intelligent_search',
        description: '智能搜索工具，支持多搜索引擎和结果优化',
        category: 'search',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: '搜索查询词'
            },
            options: {
              type: 'object',
              description: '搜索选项',
              properties: {
                numResults: {
                  type: 'number',
                  description: '结果数量限制'
                },
                language: {
                  type: 'string',
                  description: '搜索语言'
                },
                engine: {
                  type: 'string',
                  description: '搜索引擎',
                  enum: ['google', 'bing', 'yahoo']
                }
              }
            }
          },
          required: ['query']
        },
        execute: async (args) => {
          return await this.tools.intelligentSearch(args.query, args.options || {});
        }
      },
      {
        name: 'scrape_web_content',
        description: '网页内容抓取工具，支持结构化数据提取',
        category: 'scraping',
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
                  description: '超时时间（毫秒）'
                },
                waitForSelector: {
                  type: 'string',
                  description: '等待选择器'
                }
              }
            }
          },
          required: ['url']
        },
        execute: async (args) => {
          return await this.tools.scrapeWebContent(args.url, args.options || {});
        }
      },
      {
        name: 'batch_scrape_websites',
        description: '批量网页抓取工具，支持并发处理多个URL',
        category: 'scraping',
        parameters: {
          type: 'object',
          properties: {
            urls: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: '要抓取的URL列表'
            },
            options: {
              type: 'object',
              description: '抓取选项',
              properties: {
                maxConcurrent: {
                  type: 'number',
                  description: '最大并发数'
                },
                timeout: {
                  type: 'number',
                  description: '超时时间（毫秒）'
                }
              }
            }
          },
          required: ['urls']
        },
        execute: async (args) => {
          return await this.tools.batchScrapeWebsites(args.urls, args.options || {});
        }
      },
      {
        name: 'analyze_content',
        description: '内容分析工具，提供文本分析、情感分析等功能',
        category: 'analysis',
        parameters: {
          type: 'object',
          properties: {
            content: {
              type: 'object',
              description: '要分析的内容对象',
              properties: {
                text: {
                  type: 'string',
                  description: '文本内容'
                },
                title: {
                  type: 'string',
                  description: '标题'
                },
                headings: {
                  type: 'array',
                  description: '标题结构'
                },
                links: {
                  type: 'array',
                  description: '链接列表'
                }
              }
            },
            options: {
              type: 'object',
              description: '分析选项'
            }
          },
          required: ['content']
        },
        execute: async (args) => {
          try {
            // 确保content参数存在且格式正确
            if (!args.content) {
              throw new Error('content参数是必需的');
            }

            // 如果content是字符串，转换为对象格式
            let contentObj = args.content;
            if (typeof args.content === 'string') {
              contentObj = { text: args.content };
            }

            const result = await this.tools.analyzeContent(contentObj, args.options || {});
            return {
              success: true,
              result,
              message: '内容分析完成'
            };
          } catch (error) {
            console.error('内容分析工具执行错误:', error);
            return {
              success: false,
              error: error.message,
              message: `内容分析失败: ${error.message}`
            };
          }
        }
      },
      {
        name: 'extract_information',
        description: '信息提取工具，支持事实、统计数据、日期等结构化信息提取',
        category: 'extraction',
        parameters: {
          type: 'object',
          properties: {
            content: {
              type: 'object',
              description: '要提取信息的内容'
            },
            extractionRules: {
              type: 'object',
              description: '提取规则',
              properties: {
                extractFacts: {
                  type: 'boolean',
                  description: '是否提取事实'
                },
                extractStatistics: {
                  type: 'boolean',
                  description: '是否提取统计数据'
                },
                extractDates: {
                  type: 'boolean',
                  description: '是否提取日期'
                },
                extractNames: {
                  type: 'boolean',
                  description: '是否提取人名'
                },
                extractOrganizations: {
                  type: 'boolean',
                  description: '是否提取组织'
                },
                extractLocations: {
                  type: 'boolean',
                  description: '是否提取地点'
                },
                customPatterns: {
                  type: 'object',
                  description: '自定义提取模式'
                }
              }
            }
          },
          required: ['content']
        },
        execute: async (args) => {
          return await this.tools.extractInformation(args.content, args.extractionRules || {});
        }
      },
      {
        name: 'generate_analysis_report',
        description: '分析报告生成工具，生成结构化的Markdown格式报告',
        category: 'reporting',
        parameters: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              description: '分析数据'
            },
            options: {
              type: 'object',
              description: '报告选项',
              properties: {
                analysisType: {
                  type: 'string',
                  description: '分析类型',
                  enum: ['comprehensive', 'summary', 'detailed']
                },
                format: {
                  type: 'string',
                  description: '报告格式',
                  enum: ['markdown', 'html', 'json']
                }
              }
            }
          },
          required: ['data']
        },
        execute: async (args) => {
          return await this.tools.generateAnalysisReport(args.data, args.options || {});
        }
      },
      {
        name: 'plan_research_task',
        description: '研究任务规划工具，根据用户需求制定详细的研究计划',
        category: 'planning',
        parameters: {
          type: 'object',
          properties: {
            userRequest: {
              type: 'string',
              description: '用户请求'
            },
            context: {
              type: 'object',
              description: '上下文信息'
            }
          },
          required: ['userRequest']
        },
        execute: async (args) => {
          // 这里可以调用LLM来生成研究计划
          const planningPrompt = `
你是一个专业的研究规划专家。请根据用户的需求制定详细的研究计划。

用户需求: ${args.userRequest}
上下文信息: ${JSON.stringify(args.context || {}, null, 2)}

请制定一个包含以下内容的详细计划:
1. 研究目标
2. 需要搜索的关键词和主题
3. 信息收集策略
4. 分析重点和方法
5. 预期输出格式

请以JSON格式返回计划。
`;

          // 这里需要调用LLM，暂时返回一个示例计划
          return {
            taskObjective: `分析${args.userRequest}相关信息`,
            searchKeywords: ['关键词1', '关键词2'],
            searchTopics: ['主题1', '主题2'],
            informationStrategy: '多源信息收集和交叉验证',
            analysisFocus: ['重点1', '重点2'],
            reportStructure: {
              sections: ['执行摘要', '研究方法', '主要发现', '详细分析', '结论和建议'],
              keyPoints: ['要点1', '要点2']
            },
            estimatedSteps: 5
          };
        }
      },
      {
        name: 'synthesize_information',
        description: '信息综合工具，将多个信息源的数据进行整合和分析',
        category: 'synthesis',
        parameters: {
          type: 'object',
          properties: {
            sources: {
              type: 'array',
              description: '信息源列表'
            },
            focus: {
              type: 'string',
              description: '分析重点'
            },
            synthesisType: {
              type: 'string',
              description: '综合类型',
              enum: ['comparative', 'integrative', 'analytical']
            }
          },
          required: ['sources']
        },
        execute: async (args) => {
          // 信息综合逻辑
          const synthesis = {
            totalSources: args.sources.length,
            synthesisType: args.synthesisType || 'integrative',
            focus: args.focus,
            keyInsights: [],
            patterns: [],
            contradictions: [],
            gaps: [],
            recommendations: [],
            timestamp: new Date()
          };

          // 分析信息源
          args.sources.forEach((source, index) => {
            if (source.analysis) {
              synthesis.keyInsights.push(...source.analysis.keyTopics || []);
            }
          });

          // 去重和排序
          synthesis.keyInsights = [...new Set(synthesis.keyInsights)].slice(0, 10);

          return synthesis;
        }
      },
      {
        name: 'intelligent_search_and_analyze',
        description: '智能搜索、抓取和分析工具，自动执行完整的搜索-抓取-分析流程',
        category: 'comprehensive',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: '搜索查询词'
            },
            options: {
              type: 'object',
              description: '搜索和分析选项',
              properties: {
                maxResults: {
                  type: 'number',
                  description: '最大搜索结果数量',
                  default: 1
                },
                scrapePages: {
                  type: 'boolean',
                  description: '是否抓取网页内容',
                  default: true
                },
                analyzeContent: {
                  type: 'boolean',
                  description: '是否分析内容',
                  default: true
                }
              }
            }
          },
          required: ['query']
        },
        execute: async (args) => {
          try {
            const { query, options = {} } = args;
            const {
              maxResults = 1,
              scrapePages = true,
              analyzeContent = true
            } = options;

            console.log(`开始智能搜索和分析: ${query}`);

            // 1. 执行搜索
            const searchResult = await this.tools.intelligentSearch(query, { numResults: maxResults });
            
            if (!searchResult.results || searchResult.results.length === 0) {
              return {
                success: false,
                error: '搜索未返回结果',
                message: `搜索"${query}"未找到相关结果`
              };
            }

            const comprehensiveResult = {
              query,
              searchResults: searchResult.results,
              scrapedContent: [],
              analysis: [],
              summary: {
                totalResults: searchResult.results.length,
                scrapedPages: 0,
                analyzedPages: 0
              }
            };

            // 2. 抓取网页内容
            if (scrapePages) {
              console.log(`开始抓取 ${Math.min(maxResults, searchResult.results.length)} 个网页`);
              
              for (let i = 0; i < Math.min(maxResults, searchResult.results.length); i++) {
                const result = searchResult.results[i];
                try {
                  console.log(`抓取网页 ${i + 1}: ${result.url}`);
                  const scrapedContent = await this.tools.scrapeWebContent(result.url, {
                    timeout: 10000, // 减少超时时间
                    waitForSelector: 'body'
                  });
                  
                  // 只保存关键信息，避免存储完整的HTML内容
                  comprehensiveResult.scrapedContent.push({
                    originalResult: result,
                    scrapedData: {
                      url: scrapedContent.url,
                      title: scrapedContent.title,
                      text: scrapedContent.text ? scrapedContent.text.substring(0, 1000) + '...' : '',
                      metaDescription: scrapedContent.metaDescription,
                      headings: scrapedContent.headings?.slice(0, 5) || [],
                      wordCount: scrapedContent.text ? scrapedContent.text.split(/\s+/).length : 0
                    }
                  });
                  comprehensiveResult.summary.scrapedPages++;

                  // 3. 分析内容
                  if (analyzeContent && scrapedContent.text) {
                    console.log(`分析网页内容 ${i + 1}`);
                    const contentAnalysis = await this.tools.analyzeContent(scrapedContent, {
                      extractKeyTopics: true,
                      analyzeSentiment: true
                    });
                    
                    // 只保存关键分析结果，避免存储过多数据
                    comprehensiveResult.analysis.push({
                      url: result.url,
                      analysis: {
                        keyTopics: contentAnalysis.keyTopics?.slice(0, 5) || [],
                        sentiment: contentAnalysis.sentiment || 'neutral',
                        wordCount: contentAnalysis.wordCount || 0,
                        contentType: contentAnalysis.contentType || 'unknown',
                        readability: contentAnalysis.readability || 'unknown'
                      }
                    });
                    comprehensiveResult.summary.analyzedPages++;
                  }
                } catch (error) {
                  console.error(`抓取/分析网页失败: ${result.url}`, error.message);
                  comprehensiveResult.scrapedContent.push({
                    originalResult: result,
                    error: error.message
                  });
                }
              }
            }

            return {
              success: true,
              result: comprehensiveResult,
              message: `智能搜索和分析完成: ${query}`
            };

          } catch (error) {
            console.error('智能搜索和分析工具执行错误:', error);
            return {
              success: false,
              error: error.message,
              message: `智能搜索和分析失败: ${error.message}`
            };
          }
        }
      }
    ];
  }

  /**
   * 注册工具到智能体
   */
  async registerToolsToAgent(agent) {
    try {
      const toolDefinitions = this.getToolDefinitions();
      
      console.log(`注册 ${toolDefinitions.length} 个工具到智能体`);
      
      for (const toolDef of toolDefinitions) {
        try {
          // 确保工具定义有效
          if (!toolDef.name || !toolDef.execute) {
            console.warn(`跳过无效工具定义: ${toolDef.name || 'unnamed'}`);
            continue;
          }
          
          // 注册工具到智能体的工具注册表
          if (agent.tools && typeof agent.tools.registerTool === 'function') {
            agent.tools.registerTool(toolDef.name, toolDef);
            console.log(`✅ 成功注册工具: ${toolDef.name}`);
          } else {
            console.warn(`智能体没有工具注册表或registerTool方法`);
          }
        } catch (error) {
          console.error(`注册工具失败 ${toolDef.name}:`, error.message);
        }
      }
      
      console.log('工具注册完成');
      
    } catch (error) {
      console.error('注册工具到智能体失败:', error);
      throw error;
    }
  }

  /**
   * 获取工具统计信息
   */
  getToolStats() {
    const toolDefinitions = this.getToolDefinitions();
    const categories = {};
    
    toolDefinitions.forEach(tool => {
      if (!categories[tool.category]) {
        categories[tool.category] = 0;
      }
      categories[tool.category]++;
    });

    return {
      totalTools: toolDefinitions.length,
      categories,
      toolNames: toolDefinitions.map(t => t.name)
    };
  }

  /**
   * 清理资源
   */
  async cleanup() {
    await this.tools.closeBrowser();
  }
} 