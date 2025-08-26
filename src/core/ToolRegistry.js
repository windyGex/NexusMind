import axios from 'axios';
import dotenv from 'dotenv';
import { getAllTools } from '../tools/toolRegistryManager.js';

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
    // 从工具注册管理器获取所有工具
    const allTools = getAllTools();
    
    // 注册所有工具
    for (const [name, toolDefinition] of Object.entries(allTools)) {
      this.registerTool(name, toolDefinition);
    }
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

    // 处理JSON Schema格式的参数定义
    const properties = tool.parameters.properties || tool.parameters;
    const required = tool.parameters.required || [];

    for (const [paramName, paramDef] of Object.entries(properties)) {
      // 跳过JSON Schema元数据字段
      if (['type', 'properties', 'required', 'description'].includes(paramName)) {
        continue;
      }

      if (required.includes(paramName) && !(paramName in args)) {
        throw new Error(`缺少必需参数: ${paramName}`);
      }

      if (paramName in args) {
        const value = args[paramName];
        
        // 类型检查
        if (paramDef.type) {
          let isValidType = false;
          
          if (paramDef.type === 'array') {
            isValidType = Array.isArray(value);
          } else if (paramDef.type === 'object') {
            isValidType = typeof value === 'object' && value !== null && !Array.isArray(value);
          } else {
            isValidType = typeof value === paramDef.type;
          }
          
          if (!isValidType) {
            throw new Error(`参数类型错误: ${paramName} 期望 ${paramDef.type}, 实际 ${Array.isArray(value) ? 'array' : typeof value}`);
          }
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
  }
} 