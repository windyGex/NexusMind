import { MCPClient } from './MCPClient.js';

/**
 * MCP服务器管理器
 * 负责管理多个MCP服务器连接，提供统一的工具访问接口
 */
export class MCPServerManager {
  constructor(config = {}) {
    this.servers = new Map();
    this.toolRegistry = new Map();
    this.serverCapabilities = new Map();
    this.connectionStatus = new Map();
    this.config = {
      maxConnections: config.maxConnections || 10,
      connectionTimeout: config.connectionTimeout || 30000,
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 1000,
      ...config
    };
    
    this.eventListeners = new Map();
  }

  /**
   * 添加MCP服务器
   */
  async addServer(serverId, serverConfig) {
    try {
      console.log(`🔗 添加MCP服务器: ${serverId}`);
      
      const client = new MCPClient(serverConfig);
      
      // 存储服务器信息
      this.servers.set(serverId, {
        client,
        config: serverConfig,
        status: 'connecting',
        lastConnected: null,
        errorCount: 0
      });

      // 尝试连接
      await this.connectServer(serverId);
      
      // 加载服务器能力
      await this.loadServerCapabilities(serverId);
      
      // 注册工具
      await this.registerServerTools(serverId);
      
      return true;
    } catch (error) {
      console.error(`❌ 添加服务器失败 ${serverId}:`, error);
      return false;
    }
  }

  /**
   * 连接指定服务器
   */
  async connectServer(serverId) {
    const server = this.servers.get(serverId);
    if (!server) {
      throw new Error(`服务器 ${serverId} 不存在`);
    }

    try {
      await server.client.connect();
      server.status = 'connected';
      server.lastConnected = new Date();
      server.errorCount = 0;
      
      this.connectionStatus.set(serverId, 'connected');
      console.log(`✅ 服务器 ${serverId} 连接成功`);
      
      this.emit('serverConnected', { serverId, timestamp: new Date() });
      
    } catch (error) {
      server.status = 'failed';
      server.errorCount++;
      this.connectionStatus.set(serverId, 'failed');
      
      console.error(`❌ 服务器 ${serverId} 连接失败:`, error);
      this.emit('serverError', { serverId, error, timestamp: new Date() });
      
      throw error;
    }
  }

  /**
   * 加载服务器能力
   */
  async loadServerCapabilities(serverId) {
    const server = this.servers.get(serverId);
    if (!server || server.status !== 'connected') {
      return;
    }

    try {
      const capabilities = await server.client.loadServerCapabilities();
      this.serverCapabilities.set(serverId, capabilities);
      console.log(`📋 服务器 ${serverId} 能力加载完成`);
    } catch (error) {
      console.error(`❌ 加载服务器 ${serverId} 能力失败:`, error);
    }
  }

  /**
   * 注册服务器工具
   */
  async registerServerTools(serverId) {
    const server = this.servers.get(serverId);
    if (!server || server.status !== 'connected') {
      return;
    }

    try {
      const response = await server.client.listTools();
      
      if (response.success && response.tools) {
        response.tools.forEach(tool => {
          const toolId = `${serverId}:${tool.name}`;
          this.toolRegistry.set(toolId, {
            ...tool,
            serverId,
            serverName: server.config.name || serverId,
            available: true
          });
        });
        
        console.log(`🔧 服务器 ${serverId} 注册了 ${response.tools.length} 个工具`);
      } else {
        console.warn(`⚠️ 服务器 ${serverId} 工具列表获取失败:`, response.error);
      }
    } catch (error) {
      console.error(`❌ 注册服务器 ${serverId} 工具失败:`, error);
    }
  }

  /**
   * 获取所有可用工具
   */
  getAllTools() {
    const tools = [];
    for (const [toolId, tool] of this.toolRegistry) {
      if (tool.available) {
        tools.push({
          id: toolId,
          ...tool
        });
      }
    }
    return tools;
  }

  /**
   * 根据任务描述智能选择工具
   */
  async selectToolsForTask(taskDescription, context = {}) {
    const availableTools = this.getAllTools();
    const selectedTools = [];

    // 简单的关键词匹配（可以扩展为更智能的选择算法）
    const taskKeywords = taskDescription.toLowerCase().split(' ');
    
    for (const tool of availableTools) {
      const toolKeywords = [
        tool.name.toLowerCase(),
        tool.description.toLowerCase(),
        ...(tool.tags || [])
      ].join(' ');

      // 计算匹配度
      let matchScore = 0;
      for (const keyword of taskKeywords) {
        if (toolKeywords.includes(keyword)) {
          matchScore++;
        }
      }

      // 如果匹配度超过阈值，选择该工具
      if (matchScore > 0) {
        selectedTools.push({
          tool,
          matchScore,
          priority: this.calculateToolPriority(tool, context)
        });
      }
    }

    // 按优先级和匹配度排序
    selectedTools.sort((a, b) => {
      const priorityDiff = b.priority - a.priority;
      if (priorityDiff !== 0) return priorityDiff;
      return b.matchScore - a.matchScore;
    });

    return selectedTools.slice(0, 5); // 返回前5个最相关的工具
  }

  /**
   * 计算工具优先级
   */
  calculateToolPriority(tool, context) {
    let priority = 0;
    
    // 服务器连接状态影响优先级
    const server = this.servers.get(tool.serverId);
    if (server && server.status === 'connected') {
      priority += 10;
    }
    
    // 错误次数影响优先级
    if (server && server.errorCount > 0) {
      priority -= server.errorCount * 2;
    }
    
    // 根据上下文调整优先级
    if (context.preferredServers && context.preferredServers.includes(tool.serverId)) {
      priority += 5;
    }
    
    return priority;
  }

  /**
   * 执行工具调用
   */
  async executeTool(toolId, args = {}) {
    const tool = this.toolRegistry.get(toolId);
    if (!tool) {
      throw new Error(`工具 ${toolId} 不存在`);
    }

    const server = this.servers.get(tool.serverId);
    if (!server || server.status !== 'connected') {
      throw new Error(`服务器 ${tool.serverId} 未连接`);
    }

    try {
      const result = await server.client.callTool(tool.name, args);
      return {
        success: true,
        result,
        toolId,
        serverId: tool.serverId,
        timestamp: new Date()
      };
    } catch (error) {
      console.error(`❌ 执行工具 ${toolId} 失败:`, error);
      return {
        success: false,
        error: error.message,
        toolId,
        serverId: tool.serverId,
        timestamp: new Date()
      };
    }
  }

  /**
   * 批量执行工具
   */
  async executeTools(toolIds, argsMap = {}) {
    const results = [];
    
    for (const toolId of toolIds) {
      const args = argsMap[toolId] || {};
      const result = await this.executeTool(toolId, args);
      results.push(result);
    }
    
    return results;
  }

  /**
   * 获取服务器状态
   */
  getServerStatus(serverId = null) {
    if (serverId) {
      const server = this.servers.get(serverId);
      return server ? {
        id: serverId,
        status: server.status,
        lastConnected: server.lastConnected,
        errorCount: server.errorCount,
        config: server.config
      } : null;
    }

    const status = {};
    for (const [id, server] of this.servers) {
      status[id] = {
        status: server.status,
        lastConnected: server.lastConnected,
        errorCount: server.errorCount
      };
    }
    return status;
  }

  /**
   * 重新连接所有服务器
   */
  async reconnectAll() {
    console.log('🔄 重新连接所有MCP服务器...');
    
    for (const [serverId, server] of this.servers) {
      if (server.status !== 'connected') {
        try {
          await this.connectServer(serverId);
          await this.loadServerCapabilities(serverId);
          await this.registerServerTools(serverId);
        } catch (error) {
          console.error(`❌ 重新连接服务器 ${serverId} 失败:`, error);
        }
      }
    }
  }

  /**
   * 移除服务器
   */
  async removeServer(serverId) {
    const server = this.servers.get(serverId);
    if (!server) {
      return false;
    }

    try {
      await server.client.disconnect();
      
      // 移除相关工具
      for (const [toolId, tool] of this.toolRegistry) {
        if (tool.serverId === serverId) {
          this.toolRegistry.delete(toolId);
        }
      }
      
      this.servers.delete(serverId);
      this.serverCapabilities.delete(serverId);
      this.connectionStatus.delete(serverId);
      
      console.log(`🗑️ 服务器 ${serverId} 已移除`);
      return true;
    } catch (error) {
      console.error(`❌ 移除服务器 ${serverId} 失败:`, error);
      return false;
    }
  }

  /**
   * 事件监听
   */
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  /**
   * 移除事件监听
   */
  off(event, callback) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * 触发事件
   */
  emit(event, data) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`事件监听器错误 ${event}:`, error);
        }
      });
    }
  }

  /**
   * 获取统计信息
   */
  getStats() {
    const connectedServers = Array.from(this.servers.values())
      .filter(server => server.status === 'connected').length;
    
    const totalTools = this.toolRegistry.size;
    const availableTools = Array.from(this.toolRegistry.values())
      .filter(tool => tool.available).length;

    return {
      totalServers: this.servers.size,
      connectedServers,
      totalTools,
      availableTools,
      servers: this.getServerStatus()
    };
  }
} 