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

// 联网搜索和网页抓取工具定义
export const webScrapingTools = [
  {
    name: 'search_web_content',
    description: '通过搜索引擎搜索相关内容并抓取结果页面，用于联网获取最新信息',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '搜索关键词或问题'
        },
        maxResults: {
          type: 'number',
          description: '最大搜索结果数量，默认5',
          default: 5
        },
        language: {
          type: 'string',
          description: '搜索语言，默认中文',
          default: 'zh-CN'
        }
      },
      required: ['query']
    },
    execute: async (args) => {
      try {
        const service = await getWebScrapingService();
        // 使用百度搜索获取相关网页
        const searchUrl = `https://www.baidu.com/s?wd=${encodeURIComponent(args.query)}`;
        const searchResult = await service.scrapeWebPage(searchUrl, {
          waitForTimeout: 3000,
          extractText: true,
          extractLinks: true
        });
        
        // 提取搜索结果中的相关链接
        const links = searchResult.content?.links?.slice(0, args.maxResults || 5) || [];
        const results = [];
        
        // 抓取每个结果页面的内容
        for (const link of links) {
          try {
            if (link.href && link.href.startsWith('http')) {
              const pageResult = await service.scrapeWebPage(link.href, {
                waitForTimeout: 5000,
                extractText: true
              });
              
              results.push({
                title: link.text || pageResult.title,
                url: link.href,
                content: pageResult.content?.text?.mainText || '',
                timestamp: new Date().toISOString()
              });
            }
          } catch (error) {
            console.warn(`抓取页面失败 ${link.href}:`, error.message);
          }
        }
        
        return {
          success: true,
          data: {
            query: args.query,
            results,
            searchSource: 'web_search',
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
    name: 'scrape_webpage',
    description: '直接抓取指定网页的内容，提取文本、链接和图片信息',
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
  }
];

// 清理资源
export async function cleanupWebScrapingService() {
  if (webScrapingService) {
    await webScrapingService.close();
    webScrapingService = null;
  }
} 