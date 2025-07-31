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
      description: '执行数学计算',
      category: 'utility',
      parameters: {
        expression: {
          type: 'string',
          description: '数学表达式，如 "2 + 3 * 4"'
        }
      },
      execute: this.calculator.bind(this)
    });

    this.registerTool('web_search', {
      name: 'web_search',
      description: '搜索网络信息',
      category: 'information',
      parameters: {
        query: {
          type: 'string',
          description: '搜索查询'
        }
      },
      execute: this.webSearch.bind(this)
    });

    this.registerTool('file_operations', {
      name: 'file_operations',
      description: '文件操作（读取、写入、删除）',
      category: 'system',
      parameters: {
        operation: {
          type: 'string',
          description: '操作类型：read, write, delete, list',
          enum: ['read', 'write', 'delete', 'list']
        },
        path: {
          type: 'string',
          description: '文件路径'
        },
        content: {
          type: 'string',
          description: '文件内容（写操作时使用）',
          optional: true
        }
      },
      execute: this.fileOperations.bind(this)
    });

    this.registerTool('time_date', {
      name: 'time_date',
      description: '获取当前时间和日期信息',
      category: 'utility',
      parameters: {
        format: {
          type: 'string',
          description: '时间格式',
          optional: true,
          default: 'full'
        }
      },
      execute: this.getTimeDate.bind(this)
    });

    this.registerTool('memory_search', {
      name: 'memory_search',
      description: '搜索智能体记忆',
      category: 'memory',
      parameters: {
        query: {
          type: 'string',
          description: '搜索查询'
        },
        limit: {
          type: 'number',
          description: '返回结果数量限制',
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
      throw new Error(`工具已存在: ${name}`);
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

    console.log(`工具已注册: ${name} (${category})`);
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
  async execute(toolName, args = {}) {
    const tool = this.getTool(toolName);
    if (!tool) {
      throw new Error(`工具不存在: ${toolName}`);
    }

    try {
      // 验证参数
      this.validateToolParameters(tool, args);

      // 执行工具
      const result = await tool.execute(args);
      return result;

    } catch (error) {
      console.error(`工具执行错误 ${toolName}:`, error);
      throw new Error(`工具执行失败: ${error.message}`);
    }
  }

  /**
   * 验证工具参数
   */
  validateToolParameters(tool, args) {
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

    console.log(`工具已删除: ${name}`);
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
   * 网络搜索工具（模拟）
   */
  async webSearch(args) {
    const { query } = args;
    // 这里应该集成真实的搜索API
    return {
      query,
      results: [
        `搜索结果1: 关于 "${query}" 的信息`,
        `搜索结果2: "${query}" 的相关内容`,
        `搜索结果3: "${query}" 的详细说明`
      ],
      count: 3
    };
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