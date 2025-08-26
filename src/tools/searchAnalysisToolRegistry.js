import SearchAnalysisTools from './searchAnalysisTools.js';

// 创建工具实例
const searchTools = new SearchAnalysisTools();

/**
 * 搜索分析工具注册表
 * 定义智能体可以调用的搜索和分析工具
 */
export const searchAnalysisTools = {
  /**
   * 麦肯锡风格报告编写工具
   */
  mckinsey_report_writer: {
    name: 'mckinsey_report_writer',
    description: '基于抓取的内容生成麦肯锡风格的详细分析报告。报告包含执行摘要、问题陈述、关键发现、详细分析、建议、实施计划和结论等部分，采用专业的商业分析格式。',
    parameters: {
      type: 'object',
      properties: {
        scrapedContent: {
          type: 'array',
          description: '抓取的网页内容数组，每个元素应包含url、title和text字段',
          items: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: '网页URL'
              },
              title: {
                type: 'string',
                description: '网页标题'
              },
              text: {
                type: 'string',
                description: '网页文本内容'
              }
            },
            required: ['url', 'title', 'text']
          }
        },
        options: {
          type: 'object',
          description: '报告生成选项',
          properties: {
            title: {
              type: 'string',
              description: '报告标题'
            },
            format: {
              type: 'string',
              enum: ['executive', 'detailed'],
              description: '报告格式：executive(执行摘要)或detailed(详细报告)',
              default: 'detailed'
            }
          }
        }
      },
      required: ['scrapedContent']
    },
    execute: async (args) => {
      try {
        const { scrapedContent, options = {} } = args;
        
        // 验证参数
        if (!Array.isArray(scrapedContent) || scrapedContent.length === 0) {
          throw new Error('scrapedContent参数必须是非空数组');
        }

        // 生成报告
        const report = await searchTools.generateMckinseyStyleReport(scrapedContent, options);
        
        return {
          success: true,
          result: report,
          message: '麦肯锡风格报告生成完成'
        };
      } catch (error) {
        console.error('mckinsey_report_writer工具执行错误:', error);
        return {
          success: false,
          error: error.message,
          message: `报告生成失败: ${error.message}`
        };
      }
    }
  }
};

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