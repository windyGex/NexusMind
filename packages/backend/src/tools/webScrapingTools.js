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
    name: 'web_scraper',
    description: '抓取指定网页的内容，支持单个URL或多个URL。提取文本、链接和图片信息',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: '要抓取的网页URL'
        },
        urls: {
          type: 'array',
          items: {
            type: 'string'
          },
          description: '要抓取的网页URL列表'
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
        },
        concurrency: {
          type: 'number',
          description: '并发抓取数量（仅在抓取多个URL时有效）',
          default: 3
        }
      }
    },
    execute: async (args) => {
      try {
        const service = await getWebScrapingService();
        const { url, urls, concurrency = 3, ...options } = args;
        
        // 处理单个URL
        if (url) {
          const result = await service.scrapeWebPage(url, {
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
        }
        
        // 处理多个URLs
        if (urls && Array.isArray(urls) && urls.length > 0) {
          const results = [];
          
          // 控制并发数量
          const batchSize = Math.min(concurrency, urls.length);
          for (let i = 0; i < urls.length; i += batchSize) {
            const batch = urls.slice(i, i + batchSize);
            const batchPromises = batch.map(u => 
              service.scrapeWebPage(u, options || {})
                .then(result => ({
                  url: u,
                  success: true,
                  data: result
                }))
                .catch(error => ({
                  url: u,
                  success: false,
                  error: error.message
                }))
            );
            
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
          }
          
          return {
            success: true,
            data: {
              results,
              summary: {
                total: urls.length,
                successful: results.filter(r => r.success).length,
                failed: results.filter(r => !r.success).length
              }
            }
          };
        }
        
        // 如果没有提供url或urls参数
        throw new Error('必须提供url参数或urls参数');
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