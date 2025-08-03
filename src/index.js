import dotenv from 'dotenv';
import { Agent } from './core/Agent.js';
import { AgentManager } from './core/AgentManager.js';
import { MCPClient } from './mcp/MCPClient.js';
import { readFileSync } from 'fs';

// 加载环境变量
dotenv.config();

/**
 * 自主智能体应用主类
 */
class AutoAgentApp {
  constructor() {
    this.agent = null;
    this.agentManager = null;
    this.mcpClient = null;
    this.isRunning = false;
    this.collaborationEnabled = false;
  }

  /**
   * 初始化应用
   */
  async initialize() {
    try {
      console.log('🚀 初始化自主智能体...');

      // 创建智能体
      this.agent = new Agent({
        name: process.env.AGENT_NAME || 'AutoAgent',
        thinkingMode: 'react', // 或 'cot'
        maxIterations: 10,
        collaborationEnabled: true,
        role: 'general',
        memory: {
          ttl: parseInt(process.env.MEMORY_TTL) || 3600,
          maxSize: parseInt(process.env.MAX_MEMORY_SIZE) || 1000
        },
        llm: {
          apiKey: process.env.OPENAI_API_KEY,
          model: process.env.OPENAI_MODEL || 'gpt-4',
          baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
          temperature: 0.7,
          maxTokens: 1000
        }
      });

      // 创建Agent管理器
      this.agentManager = new AgentManager({
        maxAgents: 10,
        taskTimeout: 30000,
        communicationTimeout: 10000
      });

      // 注册主智能体到管理器
      this.agentManager.registerAgent(this.agent, 'general');

      // 启用智能体协作模式
      this.agent.enableCollaboration(this.agentManager);

          // 创建MCP客户端
    this.mcpClient = new MCPClient({
      serverUrl: process.env.MCP_SERVER_URL || 'https://mcp.amap.com/mcp',
      apiKey: process.env.MCP_API_KEY || 'df2d1657542aabd58302835c17737791'
    });

      // 注册智能体工具到MCP客户端
      this.registerAgentTools();

      // 连接到远程MCP服务器
      await this.mcpClient.connect();

      console.log('✅ 智能体初始化完成');
      return true;

    } catch (error) {
      console.error('❌ 初始化失败:', error);
      return false;
    }
  }

  /**
   * 注册智能体工具到MCP客户端
   */
  registerAgentTools() {
    const agentTools = this.agent.tools.listAvailable();
    
    // 将智能体工具注册为本地工具
    agentTools.forEach(tool => {
      this.mcpClient.localTools.set(tool.name, {
        name: tool.name,
        description: tool.description,
        inputSchema: {
          type: 'object',
          properties: tool.parameters || {},
          required: Object.keys(tool.parameters || {}).filter(key => 
            !tool.parameters[key].optional
          )
        },
        execute: async (args) => {
          return await this.agent.tools.execute(tool.name, args);
        }
      });
    });

    // 注册智能体状态资源
    this.mcpClient.localResources.set('file:///agent/status', {
      uri: 'file:///agent/status',
      name: 'Agent Status',
      description: 'Current agent status and statistics',
      mimeType: 'application/json',
      getContent: async () => {
        const status = this.agent.getStatus();
        const memoryStats = this.agent.memory.getStats();
        return JSON.stringify({
          ...status,
          memory: memoryStats,
          timestamp: new Date().toISOString()
        }, null, 2);
      }
    });

    // 注册智能体记忆资源
    this.mcpClient.localResources.set('file:///agent/memory', {
      uri: 'file:///agent/memory',
      name: 'Agent Memory',
      description: 'Current agent memory contents',
      mimeType: 'application/json',
      getContent: async () => {
        const memories = this.agent.memory.getAll();
        return JSON.stringify({
          memories: memories.slice(-10), // 最近10条记忆
          stats: this.agent.memory.getStats(),
          timestamp: new Date().toISOString()
        }, null, 2);
      }
    });
  }

  /**
   * 加载本地MCP包
   */
  async loadLocalMCPPackages() {
    try {
      console.log('🔍 正在发现本地MCP包...');
      
      const results = await this.mcpClient.loadLocalMCPPackages();
      
      const successCount = results.filter(r => r.success).length;
      const totalCount = results.length;
      
      console.log(`📦 自动加载了 ${successCount}/${totalCount} 个本地MCP包`);
      
      if (successCount > 0) {
        console.log('✅ 成功加载的包:');
        results.filter(r => r.success).forEach(result => {
          console.log(`  - ${result.packageName} (${result.loadedServices} 个服务)`);
        });
      }
      
      if (totalCount > successCount) {
        console.log('⚠️ 加载失败的包:');
        results.filter(r => !r.success).forEach(result => {
          console.log(`  - ${result.packageName}: ${result.error}`);
        });
      }
      
    } catch (error) {
      console.warn('⚠️ 加载本地MCP包时出现错误:', error.message);
    }
  }

  /**
   * 启动应用
   */
  async start() {
    if (this.isRunning) {
      console.log('⚠️ 应用已在运行中');
      return;
    }

    try {
      console.log('🚀 启动自主智能体应用...');

      // MCP客户端已在初始化时连接
      console.log('✅ MCP客户端已连接');

      this.isRunning = true;
      console.log('🎉 自主智能体应用启动成功！');
      console.log(`📡 MCP客户端已连接到: ${this.mcpClient.fullServerUrl}`);
      console.log('🤖 智能体已准备就绪，等待指令...');

      // 显示智能体状态
      this.displayAgentStatus();

      // 设置协作事件监听
      this.setupCollaborationEvents();

    } catch (error) {
      console.error('❌ 启动失败:', error);
      throw error;
    }
  }

  /**
   * 停止应用
   */
  async stop() {
    if (!this.isRunning) {
      console.log('⚠️ 应用未在运行');
      return;
    }

    try {
      console.log('🛑 正在停止应用...');

      // 断开MCP客户端连接
      if (this.mcpClient) {
        await this.mcpClient.disconnect();
        console.log('✅ MCP客户端已断开连接');
      }

      this.isRunning = false;
      console.log('👋 应用已停止');

    } catch (error) {
      console.error('❌ 停止失败:', error);
      throw error;
    }
  }

  /**
   * 处理用户输入
   */
  async processInput(input, context = {}) {
    if (!this.agent) {
      throw new Error('智能体未初始化');
    }

    console.log(`🤖 处理用户输入: ${input}`);
    const startTime = Date.now();

    try {
      const response = await this.agent.processInput(input, context);
      const endTime = Date.now();
      
      console.log(`✅ 响应生成完成 (${endTime - startTime}ms)`);
      return response;

    } catch (error) {
      console.error('❌ 处理输入失败:', error);
      throw error;
    }
  }

  /**
   * 显示智能体状态
   */
  displayAgentStatus() {
    const status = this.agent.getStatus();
    const memoryStats = this.agent.memory.getStats();
    const mcpStatus = this.mcpClient.getStatus();
    const collaborationStats = this.getCollaborationStats();

    console.log('\n📊 智能体状态:');
    console.log(`   名称: ${status.name}`);
    console.log(`   思考模式: ${status.thinkingMode}`);
    console.log(`   记忆大小: ${status.memorySize}`);
    console.log(`   对话历史: ${status.conversationHistoryLength}`);
    console.log(`   可用工具: ${status.availableTools}`);

    console.log('\n🧠 记忆统计:');
    console.log(`   总记忆数: ${memoryStats.total}`);
    console.log(`   对话记忆: ${memoryStats.byType.conversation || 0}`);
    console.log(`   推理记忆: ${memoryStats.byType.reasoning || 0}`);
    console.log(`   任务记忆: ${memoryStats.byType.task || 0}`);
    console.log(`   协作记忆: ${memoryStats.byType.collaboration || 0}`);

    if (collaborationStats) {
      console.log('\n🤝 协作状态:');
      console.log(`   总Agent数: ${collaborationStats.manager.totalAgents}`);
      console.log(`   活跃Agent: ${collaborationStats.manager.activeAgents}`);
      console.log(`   忙碌Agent: ${collaborationStats.manager.busyAgents}`);
      console.log(`   总任务数: ${collaborationStats.manager.totalTasks}`);
      console.log(`   待处理任务: ${collaborationStats.manager.pendingTasks}`);
      console.log(`   进行中任务: ${collaborationStats.manager.inProgressTasks}`);
      console.log(`   已完成任务: ${collaborationStats.manager.completedTasks}`);
      console.log(`   失败任务: ${collaborationStats.manager.failedTasks}`);
      console.log(`   角色: ${collaborationStats.manager.roles.join(', ')}`);
      
      if (collaborationStats.agent) {
        console.log(`   协作模式: ${collaborationStats.agent.collaborationEnabled ? '启用' : '禁用'}`);
        console.log(`   当前角色: ${collaborationStats.agent.role}`);
        console.log(`   协作历史: ${collaborationStats.agent.collaborationHistoryLength}`);
        console.log(`   协作记忆: ${collaborationStats.agent.collaborationMemories}`);
      }
    }

    console.log('\n📡 MCP客户端状态:');
    console.log(`   服务器地址: ${mcpStatus.serverUrl}`);
    console.log(`   连接状态: ${mcpStatus.isConnected ? '已连接' : '未连接'}`);
    console.log(`   远程工具: ${mcpStatus.remoteTools}`);
    console.log(`   远程资源: ${mcpStatus.remoteResources}`);
    console.log(`   本地工具: ${mcpStatus.localTools}`);
    console.log(`   本地资源: ${mcpStatus.localResources}`);
    console.log(`   总工具数: ${mcpStatus.totalTools}`);
    console.log(`   总资源数: ${mcpStatus.totalResources}`);
  }

  /**
   * 获取应用状态
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      agent: this.agent ? this.agent.getStatus() : null,
      mcpClient: this.mcpClient ? this.mcpClient.getStatus() : null,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 重置智能体
   */
  resetAgent() {
    if (this.agent) {
      this.agent.reset();
      console.log('🔄 智能体已重置');
    }
  }

  /**
   * 设置协作事件监听
   */
  setupCollaborationEvents() {
    if (!this.agentManager) return;

    this.agentManager.on('agentRegistered', (agentInfo) => {
      console.log(`🤝 新Agent已注册: ${agentInfo.id} (${agentInfo.role})`);
    });

    this.agentManager.on('agentUnregistered', (agentInfo) => {
      console.log(`👋 Agent已注销: ${agentInfo.id}`);
    });

    this.agentManager.on('taskCreated', (task) => {
      console.log(`📋 协作任务已创建: ${task.id}`);
    });

    this.agentManager.on('taskAssigned', (assignment) => {
      console.log(`📤 任务已分配: ${assignment.taskId} -> ${assignment.agentId}`);
    });

    this.agentManager.on('taskCompleted', (task) => {
      console.log(`✅ 协作任务完成: ${task.id}`);
    });

    this.agentManager.on('taskFailed', (task) => {
      console.log(`❌ 协作任务失败: ${task.id}`);
    });

    this.agentManager.on('messageSent', (message) => {
      console.log(`💬 消息已发送: ${message.from} -> ${message.to}`);
    });

    this.agentManager.on('messageBroadcast', (message) => {
      console.log(`📢 广播消息: ${message.from} -> all`);
    });
  }

  /**
   * 创建协作任务
   */
  async createCollaborativeTask(description, options = {}) {
    if (!this.agentManager) {
      throw new Error('Agent管理器未初始化');
    }

    const taskId = await this.agentManager.createCollaborativeTask(description, options);
    console.log(`📋 协作任务已创建: ${taskId}`);
    return taskId;
  }

  /**
   * 执行协作任务
   */
  async executeCollaborativeTask(taskId) {
    if (!this.agentManager) {
      throw new Error('Agent管理器未初始化');
    }

    console.log(`🚀 开始执行协作任务: ${taskId}`);
    const result = await this.agentManager.executeCollaborativeTask(taskId);
    return result;
  }

  /**
   * 注册新的Agent
   */
  async registerNewAgent(agentConfig, role = 'general') {
    if (!this.agentManager) {
      throw new Error('Agent管理器未初始化');
    }

    const newAgent = new Agent({
      ...agentConfig,
      collaborationEnabled: true
    });

    const agentId = this.agentManager.registerAgent(newAgent, role);
    newAgent.enableCollaboration(this.agentManager);

    console.log(`🤝 新Agent已注册: ${agentId} (${role})`);
    return { agentId, agent: newAgent };
  }

  /**
   * 获取协作统计信息
   */
  getCollaborationStats() {
    if (!this.agentManager) {
      return null;
    }

    return {
      manager: this.agentManager.getStats(),
      agent: this.agent ? this.agent.getCollaborationStats() : null
    };
  }

  /**
   * 发送消息给其他Agent
   */
  async sendMessage(toAgentId, content, messageType = 'text') {
    if (!this.agent) {
      throw new Error('智能体未初始化');
    }

    return await this.agent.sendMessage(toAgentId, content, messageType);
  }

  /**
   * 广播消息给所有Agent
   */
  async broadcastMessage(content, messageType = 'broadcast') {
    if (!this.agent) {
      throw new Error('智能体未初始化');
    }

    return await this.agent.broadcastMessage(content, messageType);
  }
}

// 创建应用实例
const app = new AutoAgentApp();

// 处理进程信号
process.on('SIGINT', async () => {
  console.log('\n🛑 收到停止信号，正在关闭应用...');
  await app.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 收到终止信号，正在关闭应用...');
  await app.stop();
  process.exit(0);
});

// 导出应用实例
export default app;

// 如果直接运行此文件，则启动应用
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    try {
      const initialized = await app.initialize();
      if (initialized) {
        await app.start();
        
        // 示例：处理一些测试输入
        console.log('\n🧪 运行测试示例...');
        
        const testInputs = [
          '你好，请介绍一下你自己',
          '计算 15 * 23 + 7',
          '现在是什么时间？',
          '搜索关于人工智能的信息'
        ];

        for (const input of testInputs) {
          console.log(`\n📝 测试输入: ${input}`);
          try {
            const response = await app.processInput(input);
            console.log(`🤖 智能体响应: ${response}`);
          } catch (error) {
            console.error(`❌ 处理失败: ${error.message}`);
          }
          
          // 等待一下再处理下一个
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log('\n✅ 测试完成');
        app.displayAgentStatus();
        
      } else {
        console.error('❌ 初始化失败，无法启动应用');
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ 应用启动失败:', error);
      process.exit(1);
    }
  })();
} 