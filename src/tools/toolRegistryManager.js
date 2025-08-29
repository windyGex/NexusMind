import axios from 'axios';
import { webScrapingToolRegistry } from './webScrapingToolRegistry.js';
import { searchAnalysisTools } from './searchAnalysisToolRegistry.js';
import { fileOperationToolRegistry } from './fileOperationToolRegistry.js';
import { codeExecutionToolRegistry } from './codeExecutionToolRegistry.js';
import allTools from './index.js';

/**
 * 统一工具注册管理器
 * 负责管理和注册所有工具
 */

class ToolRegistryManager {
  constructor() {
    this.tools = new Map();
    this.categories = new Set();
    this.initializeTools();
  }
  
  /**
   * 初始化所有工具
   */
  initializeTools() {
    // 注册所有工具
    for (const [name, tool] of Object.entries(allTools)) {
      this.registerTool(name, tool);
    }
  }
  
  /**
   * 注册工具
   * @param {string} name - 工具名称
   * @param {object} tool - 工具定义
   */
  registerTool(name, tool) {
    this.tools.set(name, {
      name,
      ...tool
    });
    
    // 记录工具类别
    if (tool.category) {
      this.categories.add(tool.category);
    }
  }
  
  /**
   * 获取工具
   * @param {string} name - 工具名称
   * @returns {object|null} 工具定义或null
   */
  getTool(name) {
    return this.tools.get(name) || null;
  }
  
  /**
   * 获取所有工具
   * @returns {Map} 所有工具的Map
   */
  getAllTools() {
    return this.tools;
  }
  
  /**
   * 根据类别获取工具
   * @param {string} category - 工具类别
   * @returns {array} 指定类别的工具列表
   */
  getToolsByCategory(category) {
    return Array.from(this.tools.values()).filter(tool => tool.category === category);
  }
  
  /**
   * 获取所有工具类别
   * @returns {Set} 所有工具类别的Set
   */
  getAllCategories() {
    return this.categories;
  }
  
  /**
   * 执行工具
   * @param {string} name - 工具名称
   * @param {object} args - 工具参数
   * @returns {Promise<object>} 工具执行结果
   */
  async executeTool(name, args) {
    const tool = this.getTool(name);
    
    if (!tool) {
      throw new Error(`工具 "${name}" 未找到`);
    }
    
    if (!tool.execute) {
      throw new Error(`工具 "${name}" 没有实现execute方法`);
    }
    
    try {
      // 执行工具
      const result = await tool.execute(args);
      return result;
    } catch (error) {
      throw new Error(`执行工具 "${name}" 失败: ${error.message}`);
    }
  }
}

// 导出默认实例
export default new ToolRegistryManager();

/**
 * 基础工具定义
 */
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
    ...searchAnalysisTools,
    ...fileOperationToolRegistry,
    ...codeExecutionToolRegistry
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
