import axios from 'axios';
import { webScrapingToolRegistry } from './webScrapingToolRegistry.js';
import { searchAnalysisTools } from './searchAnalysisToolRegistry.js';

/**
 * 统一工具注册管理器
 * 集中管理所有工具的注册和导出
 */

// 基础工具定义
const baseTools = {
  web_search: {
    name: 'web_search',
    description: '使用 Serper API 搜索互联网上的最新信息，获取实时数据、新闻、技术文档、学术资料等。返回结构化的搜索结果，包括标题、摘要和链接。适用于需要最新信息或特定领域知识的查询。返回结果需要进一步通过网页抓取工具获得详细信息',
    category: 'information',
    parameters: {
      query: {
        type: 'string',
        description: '搜索查询关键词，可以是具体问题、主题或关键词组合。例如: "最新AI技术发展", "Python编程教程"'
      }
    },
    execute: async (args) => {
      const { query } = args;
        const SERPER_API_KEY = process.env.SERPER_API_KEY;
        
        if (!SERPER_API_KEY) {
          throw new Error('SERPER_API_KEY 环境变量未设置。请在 .env 文件中设置 SERPER_API_KEY。');
        }
        
        try {
          const response = await axios.post('https://google.serper.dev/search', {
            q: query,
            num: 5
          }, {
            headers: {
              'X-API-KEY': SERPER_API_KEY,
              'Content-Type': 'application/json'
            }
          });

          const data = response.data;
          
          // 提取搜索结果
          const results = [];
          if (data.organic && Array.isArray(data.organic)) {
            data.organic.forEach((result, index) => {
              results.push({
                title: result.title || `搜索结果 ${index + 1}`,
                snippet: result.snippet || '',
                link: result.link || '',
                position: index + 1
              });
            });
          }

          return {
            query,
            results,
            count: results.length,
            totalResults: data.searchInformation?.totalResults || 0,
            searchTime: data.searchInformation?.searchTime || 0
          };
        } catch (error) {
          console.error('Serper API 搜索错误:', error);
          if (error.response) {
            throw new Error(`Serper API 请求失败: ${error.response.status} ${error.response.statusText}`);
          } else if (error.request) {
            throw new Error('网络请求失败，请检查网络连接');
          } else {
            throw new Error(`搜索失败: ${error.message}`);
          }
        }
    }
  },

  time_date: {
    name: 'time_date',
    description: '获取当前时间和日期信息，支持多种格式输出。可以用于时间戳生成、日期计算、时区转换等场景。',
    category: 'utility',
    parameters: {
      format: {
        type: 'string',
        description: '时间格式选项：full(完整格式), date(仅日期), time(仅时间), timestamp(时间戳), iso(ISO格式)',
        optional: true,
        default: 'full'
      }
    },
    execute: async (args) => {
      const { format = 'full' } = args;
      const now = new Date();
      
      switch (format) {
        case 'full':
          return {
            datetime: now.toISOString(),
            date: now.toDateString(),
            time: now.toTimeString(),
            timestamp: now.getTime()
          };
        
        case 'date':
          return {
            date: now.toDateString(),
            year: now.getFullYear(),
            month: now.getMonth() + 1,
            day: now.getDate()
          };
        
        case 'time':
          return {
            time: now.toTimeString(),
            hours: now.getHours(),
            minutes: now.getMinutes(),
            seconds: now.getSeconds()
          };
        
        default:
          throw new Error(`不支持的时间格式: ${format}`);
      }
    }
  }
};

/**
 * 获取所有工具
 */
export function getAllTools() {
  // 合并所有工具
  return {
    ...baseTools,
    ...webScrapingToolRegistry,
    ...searchAnalysisTools
  };
}

/**
 * 按类别获取工具
 */
export function getToolsByCategory(category) {
  const allTools = getAllTools();
  const toolsInCategory = {};
  
  for (const [name, tool] of Object.entries(allTools)) {
    if (tool.category === category) {
      toolsInCategory[name] = tool;
    }
  }
  
  return toolsInCategory;
}

/**
 * 获取工具类别列表
 */
export function getToolCategories() {
  const allTools = getAllTools();
  const categories = new Set();
  
  for (const tool of Object.values(allTools)) {
    categories.add(tool.category || 'general');
  }
  
  return Array.from(categories);
}

/**
 * 根据名称获取工具
 */
export function getToolByName(name) {
  const allTools = getAllTools();
  return allTools[name];
}

export default {
  getAllTools,
  getToolsByCategory,
  getToolCategories,
  getToolByName
};