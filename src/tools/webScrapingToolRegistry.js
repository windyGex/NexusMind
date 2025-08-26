import WebScrapingTools from './webScrapingTools.js';

// 创建工具实例
const webScrapingTools = new WebScrapingTools();

/**
 * 网页抓取工具注册表
 * 定义智能体可以调用的网页抓取工具
 */
export const webScrapingToolRegistry = {
  /**
   * 网页内容抓取工具
   */
  web_scraper: {
    name: 'web_scraper',
    description: '抓取指定网页的内容，支持单个URL或多个URL。包括文本、标题、链接、图片和元数据。适用于获取新闻、文章、数据等信息。',
    category: 'web-scraping',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: '要抓取的网页URL，必须是完整的HTTP/HTTPS链接'
        },
        urls: {
          type: 'array',
          description: '要抓取的网页URL列表',
          items: {
            type: 'string'
          }
        },
        options: {
          type: 'object',
          description: '抓取选项',
          properties: {
            timeout: {
              type: 'number',
              description: '请求超时时间（毫秒）',
              default: 30000
            },
            extractText: {
              type: 'boolean',
              description: '是否提取文本内容',
              default: true
            },
            extractLinks: {
              type: 'boolean',
              description: '是否提取链接',
              default: false
            },
            extractImages: {
              type: 'boolean',
              description: '是否提取图片',
              default: false
            },
            extractMeta: {
              type: 'boolean',
              description: '是否提取元数据',
              default: true
            },
            concurrency: {
              type: 'number',
              description: '并发抓取数量（仅在抓取多个URL时有效）',
              default: 3
            }
          }
        }
      }
    },
    execute: async (args) => {
      try {
        const { url, urls, options = {} } = args;
        
        // 验证参数
        if (!url && (!urls || !Array.isArray(urls) || urls.length === 0)) {
          throw new Error('必须提供url参数或urls参数');
        }

        // 处理单个URL
        if (url) {
          // 验证URL格式
          if (!url.startsWith('http')) {
            throw new Error('URL必须是完整的HTTP/HTTPS链接');
          }

          const result = await webScrapingTools.scrapeWebPage(url, options);
          
          return {
            success: !result.error,
            data: result,
            message: result.error ? `抓取失败: ${result.error}` : `成功抓取网页: ${url}`
          };
        }
        
        // 处理多个URLs
        if (urls && Array.isArray(urls) && urls.length > 0) {
          // 验证URL格式
          for (const u of urls) {
            if (!u.startsWith('http')) {
              throw new Error(`无效的URL格式: ${u}`);
            }
          }

          const results = await webScrapingTools.scrapeMultiplePages(urls, options);
          
          const successCount = results.filter(r => !r.error).length;
          const failCount = results.length - successCount;
          
          return {
            success: true,
            data: {
              results,
              summary: {
                total: results.length,
                success: successCount,
                failed: failCount
              }
            },
            message: `批量抓取完成: 成功 ${successCount} 个，失败 ${failCount} 个`
          };
        }
      } catch (error) {
        return {
          success: false,
          error: error.message,
          message: `抓取失败: ${error.message}`
        };
      }
    }
  }
};

export default webScrapingToolRegistry;
