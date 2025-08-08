import axios from 'axios';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

/**
 * 工具注册表
 * 管理智能体可用的工具，支持动态注册和调用
 */
export class ToolRegistry {
  constructor() {
    this.tools = new Map();
    this.categories = new Map();
    this.initializeDefaultTools();
  }

  /**
   * 初始化默认工具
   */
  initializeDefaultTools() {
    // 基础工具
    this.registerTool('calculator', {
      name: 'calculator',
      description: '执行复杂的数学计算，支持四则运算、幂运算、三角函数等。可以处理包含括号的复杂表达式，并返回精确的计算结果。',
      category: 'utility',
      parameters: {
        expression: {
          type: 'string',
          description: '数学表达式，支持 +, -, *, /, ^, (), sin, cos, tan, log, sqrt 等运算符和函数。例如: "2 + 3 * 4", "sin(45)", "sqrt(16)"'
        }
      },
      execute: this.calculator.bind(this)
    });

    this.registerTool('web_search', {
      name: 'web_search',
      description: '使用 Serper API 搜索互联网上的最新信息，获取实时数据、新闻、技术文档、学术资料等。返回结构化的搜索结果，包括标题、摘要和链接。适用于需要最新信息或特定领域知识的查询。',
      category: 'information',
      parameters: {
        query: {
          type: 'string',
          description: '搜索查询关键词，可以是具体问题、主题或关键词组合。例如: "最新AI技术发展", "Python编程教程"'
        }
      },
      execute: this.webSearch.bind(this)
    });

    this.registerTool('file_operations', {
      name: 'file_operations',
      description: '执行文件系统操作，包括读取文件内容、写入新文件、删除文件、列出目录内容等。支持文本文件的读写操作。',
      category: 'system',
      parameters: {
        operation: {
          type: 'string',
          description: '操作类型：read(读取文件), write(写入文件), delete(删除文件), list(列出目录)',
          enum: ['read', 'write', 'delete', 'list']
        },
        path: {
          type: 'string',
          description: '文件或目录的路径，支持相对路径和绝对路径。例如: "./data.txt", "/home/user/file.txt"'
        },
        content: {
          type: 'string',
          description: '要写入文件的内容（仅在write操作时使用）',
          optional: true
        }
      },
      execute: this.fileOperations.bind(this)
    });

    this.registerTool('time_date', {
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
      execute: this.getTimeDate.bind(this)
    });

    this.registerTool('memory_search', {
      name: 'memory_search',
      description: '搜索智能体的历史记忆，查找相关的对话记录、任务执行历史、学习经验等。支持语义搜索和关键词匹配。',
      category: 'memory',
      parameters: {
        query: {
          type: 'string',
          description: '搜索查询，可以是关键词、短语或完整问题。系统会进行语义匹配找到相关内容。'
        },
        limit: {
          type: 'number',
          description: '返回结果数量限制，默认为5条记录',
          optional: true,
          default: 5
        }
      },
      execute: this.searchMemory.bind(this)
    });
  }

  /**
   * 注册工具
   */
  registerTool(name, toolDefinition) {
    if (this.tools.has(name)) {
      return;
    }

    // 验证工具定义
    this.validateToolDefinition(toolDefinition);

    this.tools.set(name, toolDefinition);

    // 添加到分类
    const category = toolDefinition.category || 'general';
    if (!this.categories.has(category)) {
      this.categories.set(category, []);
    }
    this.categories.get(category).push(name);

    // console.log(`工具已注册: ${name} (${category})`);
  }

  /**
   * 验证工具定义
   */
  validateToolDefinition(toolDefinition) {
    const required = ['name', 'description', 'execute'];
    for (const field of required) {
      if (!toolDefinition[field]) {
        throw new Error(`工具定义缺少必需字段: ${field}`);
      }
    }

    if (typeof toolDefinition.execute !== 'function') {
      throw new Error('工具执行函数必须是函数类型');
    }
  }

  /**
   * 获取工具
   */
  getTool(name) {
    return this.tools.get(name);
  }

  /**
   * 执行工具
   */
  async execute(toolName, args) {
    const tool = this.getTool(toolName);
    if (!tool) {
      throw new Error(`工具不存在: ${toolName}`);
    }
    if (!args) {
      args = {};
    }
    try {
      // 验证参数
      this.validateToolParameters(tool, args);

      // 执行工具
      const result = await tool.execute(args);
      console.log('execute result', result);
      return result;

    } catch (error) {
      console.error(`工具执行错误 ${toolName}:`, error);
      throw new Error(`工具执行失败: ${error.message}`);
    }
  }

  /**
   * 验证工具参数
   */
  validateToolParameters(tool, args = {}) {
    if (!tool.parameters) {
      return; // 没有参数定义，跳过验证
    }

    for (const [paramName, paramDef] of Object.entries(tool.parameters)) {
      if (!paramDef.optional && !(paramName in args)) {
        throw new Error(`缺少必需参数: ${paramName}`);
      }

      if (paramName in args) {
        const value = args[paramName];
        
        // 类型检查
        if (paramDef.type && typeof value !== paramDef.type) {
          throw new Error(`参数类型错误: ${paramName} 期望 ${paramDef.type}, 实际 ${typeof value}`);
        }

        // 枚举值检查
        if (paramDef.enum && !paramDef.enum.includes(value)) {
          throw new Error(`参数值无效: ${paramName} 必须是 ${paramDef.enum.join(', ')} 之一`);
        }
      }
    }
  }

  /**
   * 列出可用工具
   */
  listAvailable() {
    return Array.from(this.tools.values()).map(tool => ({
      name: tool.name,
      description: tool.description,
      category: tool.category || 'general',
      parameters: tool.parameters || {}
    }));
  }

  /**
   * 按分类获取工具
   */
  getToolsByCategory(category) {
    const toolNames = this.categories.get(category) || [];
    return toolNames.map(name => this.getTool(name));
  }

  /**
   * 获取所有分类
   */
  getCategories() {
    return Array.from(this.categories.keys());
  }

  /**
   * 删除工具
   */
  unregisterTool(name) {
    const tool = this.getTool(name);
    if (!tool) {
      throw new Error(`工具不存在: ${name}`);
    }

    this.tools.delete(name);

    // 从分类中移除
    const category = tool.category || 'general';
    const categoryTools = this.categories.get(category);
    if (categoryTools) {
      const index = categoryTools.indexOf(name);
      if (index > -1) {
        categoryTools.splice(index, 1);
      }
      if (categoryTools.length === 0) {
        this.categories.delete(category);
      }
    }

    // console.log(`工具已删除: ${name}`);
  }

  // 默认工具实现

  /**
   * 计算器工具
   */
  async calculator(args) {
    const { expression } = args;
    try {
      // 安全评估数学表达式
      const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, '');
      const result = eval(sanitized);
      return {
        expression,
        result,
        type: 'number'
      };
    } catch (error) {
      throw new Error(`计算错误: ${error.message}`);
    }
  }

  /**
   * 网络搜索工具 - 使用 Serper API
   */
  async webSearch(args) {
    const { query } = args;
    const SERPER_API_KEY = process.env.SERPER_API_KEY;
    
    if (!SERPER_API_KEY) {
      throw new Error('SERPER_API_KEY 环境变量未设置。请在 .env 文件中设置 SERPER_API_KEY。');
    }
    
    try {
      const response = await axios.post('https://google.serper.dev/search', {
        q: query,
        num: 10
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

  /**
   * 文件操作工具
   */
  async fileOperations(args) {
    const { operation, path, content } = args;
    
    // 这里应该实现真实的文件操作
    switch (operation) {
      case 'read':
        return {
          operation: 'read',
          path,
          content: `文件 ${path} 的内容`,
          exists: true
        };
      
      case 'write':
        return {
          operation: 'write',
          path,
          success: true,
          message: `文件 ${path} 写入成功`
        };
      
      case 'delete':
        return {
          operation: 'delete',
          path,
          success: true,
          message: `文件 ${path} 删除成功`
        };
      
      case 'list':
        return {
          operation: 'list',
          path,
          files: ['file1.txt', 'file2.js', 'folder1/']
        };
      
      default:
        throw new Error(`不支持的操作: ${operation}`);
    }
  }

  /**
   * 时间日期工具
   */
  async getTimeDate(args) {
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

  /**
   * 记忆搜索工具
   */
  async searchMemory(args) {
    const { query, limit = 5 } = args;
    
    // 这里应该调用智能体的记忆管理器
    return {
      query,
      results: [
        `记忆1: 关于 "${query}" 的对话`,
        `记忆2: "${query}" 相关的思考过程`,
        `记忆3: "${query}" 的任务记录`
      ],
      count: 3,
      limit
    };
  }
} 