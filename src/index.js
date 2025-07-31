import dotenv from 'dotenv';
import { Agent } from './core/Agent.js';
import { MCPServer } from './mcp/MCPServer.js';
import { readFileSync } from 'fs';

// 加载环境变量
dotenv.config();

/**
 * 自主智能体应用主类
 */
class AutoAgentApp {
  constructor() {
    this.agent = null;
    this.mcpServer = null;
    this.isRunning = false;
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
        memory: {
          ttl: parseInt(process.env.MEMORY_TTL) || 3600,
          maxSize: parseInt(process.env.MAX_MEMORY_SIZE) || 1000
        },
        llm: {
          apiKey: process.env.OPENAI_API_KEY,
          model: process.env.OPENAI_MODEL || 'gpt-4',
          temperature: 0.7,
          maxTokens: 1000
        }
      });

      // 创建MCP服务器
      this.mcpServer = new MCPServer({
        host: process.env.MCP_SERVER_HOST || 'localhost',
        port: parseInt(process.env.MCP_SERVER_PORT) || 3001
      });

      // 注册智能体工具到MCP服务器
      this.registerAgentTools();

      console.log('✅ 智能体初始化完成');
      return true;

    } catch (error) {
      console.error('❌ 初始化失败:', error);
      return false;
    }
  }

  /**
   * 注册智能体工具到MCP服务器
   */
  registerAgentTools() {
    const agentTools = this.agent.tools.listAvailable();
    
    agentTools.forEach(tool => {
      this.mcpServer.registerTool(tool.name, {
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
    this.mcpServer.registerResource('file:///agent/status', {
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
    this.mcpServer.registerResource('file:///agent/memory', {
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
   * 启动应用
   */
  async start() {
    if (this.isRunning) {
      console.log('⚠️ 应用已在运行中');
      return;
    }

    try {
      console.log('🚀 启动自主智能体应用...');

      // 启动MCP服务器
      await this.mcpServer.start();
      console.log('✅ MCP服务器已启动');

      this.isRunning = true;
      console.log('🎉 自主智能体应用启动成功！');
      console.log(`📡 MCP服务器地址: ws://${this.mcpServer.host}:${this.mcpServer.port}`);
      console.log('🤖 智能体已准备就绪，等待指令...');

      // 显示智能体状态
      this.displayAgentStatus();

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

      // 停止MCP服务器
      if (this.mcpServer) {
        await this.mcpServer.stop();
        console.log('✅ MCP服务器已停止');
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
    const mcpStatus = this.mcpServer.getStatus();

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

    console.log('\n📡 MCP服务器状态:');
    console.log(`   地址: ws://${mcpStatus.host}:${mcpStatus.port}`);
    console.log(`   连接客户端: ${mcpStatus.connectedClients}`);
    console.log(`   注册工具: ${mcpStatus.registeredTools}`);
    console.log(`   注册资源: ${mcpStatus.registeredResources}`);
    console.log(`   运行状态: ${mcpStatus.isRunning ? '运行中' : '已停止'}`);
  }

  /**
   * 获取应用状态
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      agent: this.agent ? this.agent.getStatus() : null,
      mcpServer: this.mcpServer ? this.mcpServer.getStatus() : null,
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