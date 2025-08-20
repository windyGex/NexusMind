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
    description: '抓取指定网页的内容，包括文本、标题、链接、图片和元数据。适用于获取新闻、文章、数据等信息。',
    category: 'web-scraping',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: '要抓取的网页URL，必须是完整的HTTP/HTTPS链接'
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
            customSelectors: {
              type: 'object',
              description: '自定义CSS选择器，用于提取特定内容'
            }
          }
        }
      },
      required: ['url']
    },
    execute: async (args) => {
      try {
        const { url, options = {} } = args;
        
        // 验证URL格式
        if (!url || !url.startsWith('http')) {
          throw new Error('URL必须是完整的HTTP/HTTPS链接');
        }

        const result = await webScrapingTools.scrapeWebPage(url, options);
        
        return {
          success: !result.error,
          data: result,
          message: result.error ? `抓取失败: ${result.error}` : `成功抓取网页: ${url}`
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
   * 批量网页抓取工具
   */
  batch_web_scraper: {
    name: 'batch_web_scraper',
    description: '批量抓取多个网页的内容，支持并发控制。适用于需要从多个来源获取信息的场景。',
    category: 'web-scraping',
    parameters: {
      type: 'object',
      properties: {
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
            concurrency: {
              type: 'number',
              description: '并发抓取数量',
              default: 3
            },
            timeout: {
              type: 'number',
              description: '每个请求的超时时间（毫秒）',
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
            }
          }
        }
      },
      required: ['urls']
    },
    execute: async (args) => {
      try {
        const { urls, options = {} } = args;
        
        // 验证URL列表
        if (!Array.isArray(urls) || urls.length === 0) {
          throw new Error('URLs必须是非空数组');
        }

        // 验证URL格式
        for (const url of urls) {
          if (!url || !url.startsWith('http')) {
            throw new Error(`无效的URL格式: ${url}`);
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
   * 精确内容提取工具
   */
  precise_content_extractor: {
    name: 'precise_content_extractor',
    description: '使用自定义CSS选择器精确提取网页中的特定内容。适用于需要提取特定元素或结构化数据的场景。',
    category: 'web-scraping',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: '要抓取的网页URL'
        },
        selectors: {
          type: 'object',
          description: 'CSS选择器映射，键为提取内容的名称，值为CSS选择器'
        },
        options: {
          type: 'object',
          description: '抓取选项',
          properties: {
            timeout: {
              type: 'number',
              description: '请求超时时间（毫秒）',
              default: 30000
            }
          }
        }
      },
      required: ['url', 'selectors']
    },
    execute: async (args) => {
      try {
        const { url, selectors, options = {} } = args;
        
        // 验证URL格式
        if (!url || !url.startsWith('http')) {
          throw new Error('URL必须是完整的HTTP/HTTPS链接');
        }

        // 验证选择器
        if (!selectors || typeof selectors !== 'object') {
          throw new Error('selectors必须是对象类型');
        }

        const result = await webScrapingTools.scrapeWithCheerio(url, {
          ...options,
          selectors
        });
        
        return {
          success: !result.error,
          data: result,
          message: result.error ? `提取失败: ${result.error}` : `成功提取内容: ${url}`
        };
      } catch (error) {
        return {
          success: false,
          error: error.message,
          message: `精确提取失败: ${error.message}`
        };
      }
    }
  },

  /**
   * 网页内容分析工具
   */
  web_content_analyzer: {
    name: 'web_content_analyzer',
    description: '分析网页内容，提取关键信息如标题、摘要、关键词、链接统计等。适用于内容分析和信息提取。',
    category: 'web-scraping',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: '要分析的网页URL'
        },
        analysisType: {
          type: 'string',
          description: '分析类型',
          enum: ['basic', 'detailed', 'seo'],
          default: 'basic'
        }
      },
      required: ['url']
    },
    execute: async (args) => {
      try {
        const { url, analysisType = 'basic' } = args;
        
        // 验证URL格式
        if (!url || !url.startsWith('http')) {
          throw new Error('URL必须是完整的HTTP/HTTPS链接');
        }

        // 抓取网页内容
        const scrapedData = await webScrapingTools.scrapeWebPage(url, {
          extractText: true,
          extractLinks: true,
          extractImages: true,
          extractMeta: true
        });

        if (scrapedData.error) {
          throw new Error(scrapedData.error);
        }

        // 分析内容
        const analysis = {
          url,
          timestamp: new Date().toISOString(),
          basic: {
            title: scrapedData.title,
            titleLength: scrapedData.title?.length || 0,
            hasMainContent: !!scrapedData.content?.text?.mainText,
            mainTextLength: scrapedData.content?.text?.mainText?.length || 0,
            paragraphCount: scrapedData.content?.text?.paragraphs?.length || 0,
            headingCount: scrapedData.content?.text?.headings?.length || 0,
            linkCount: scrapedData.content?.links?.length || 0,
            imageCount: scrapedData.content?.images?.length || 0
          }
        };

        // 详细分析
        if (analysisType === 'detailed' || analysisType === 'seo') {
          analysis.detailed = {
            metaDescription: scrapedData.metadata?.description || '',
            metaKeywords: scrapedData.metadata?.keywords || '',
            ogTitle: scrapedData.metadata?.og?.['og:title'] || '',
            ogDescription: scrapedData.metadata?.og?.['og:description'] || '',
            twitterTitle: scrapedData.metadata?.twitter?.['twitter:title'] || '',
            twitterDescription: scrapedData.metadata?.twitter?.['twitter:description'] || '',
            language: scrapedData.metadata?.language || '',
            charset: scrapedData.metadata?.charset || '',
            viewport: scrapedData.metadata?.viewport || ''
          };
        }

        // SEO分析
        if (analysisType === 'seo') {
          analysis.seo = {
            titleOptimal: analysis.basic.titleLength >= 30 && analysis.basic.titleLength <= 60,
            hasMetaDescription: !!analysis.detailed.metaDescription,
            metaDescriptionLength: analysis.detailed.metaDescription?.length || 0,
            metaDescriptionOptimal: analysis.detailed.metaDescriptionLength >= 120 && analysis.detailed.metaDescriptionLength <= 160,
            hasOgTags: !!(analysis.detailed.ogTitle || analysis.detailed.ogDescription),
            hasTwitterTags: !!(analysis.detailed.twitterTitle || analysis.detailed.twitterDescription),
            hasStructuredData: scrapedData.content?.text?.headings?.some(h => h.level === 'h1') || false,
            internalLinks: scrapedData.content?.links?.filter(link => link.href.includes(url.split('/')[2]))?.length || 0,
            externalLinks: scrapedData.content?.links?.filter(link => !link.href.includes(url.split('/')[2]))?.length || 0
          };
        }

        return {
          success: true,
          data: analysis,
          message: `成功分析网页内容: ${url}`
        };
      } catch (error) {
        return {
          success: false,
          error: error.message,
          message: `内容分析失败: ${error.message}`
        };
      }
    }
  }
};

export default webScrapingToolRegistry;
