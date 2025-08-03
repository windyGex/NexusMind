import dotenv from 'dotenv';
import { Agent } from './src/core/Agent.js';
import { AgentManager } from './src/core/AgentManager.js';
import { MCPClient } from './src/mcp/MCPClient.js';

// 加载环境变量
dotenv.config();

/**
 * 智能体演示配置
 */
const DEMO_CONFIG = {
  agent: {
    name: process.env.AGENT_NAME || 'DemoAgent',
    thinkingMode: 'decision',
    maxIterations: 3,
    collaborationEnabled: true,
    role: 'general',
    memory: {
      ttl: parseInt(process.env.MEMORY_TTL) || 1800,
      maxSize: parseInt(process.env.MAX_MEMORY_SIZE) || 100
    },
    llm: {
      apiKey: process.env.OPENAI_API_KEY || 'demo-key',
      model: process.env.OPENAI_MODEL || 'gpt-4',
      baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
      temperature: 0.7
    }
  },
  agentManager: {
    maxAgents: 5,
    taskTimeout: 30000
  },
  mcp: {
    serverUrl: 'https://mcp.amap.com/mcp',
    apiKey: 'df2d1657542aabd58302835c17737791'
  }
};

/**
 * 演示任务配置
 */
const DEMO_TASKS = [
  {
    name: '基础对话',
    input: '你好，请介绍一下你自己',
    description: '测试智能体的基本对话能力'
  },
  {
    name: '数学计算',
    input: '请计算 25 * 16 + 8 的结果',
    description: '测试智能体的计算工具使用'
  },
  {
    name: '时间查询',
    input: '现在是什么时间？',
    description: '测试智能体的时间工具使用'
  },
  {
    name: '复杂推理',
    input: '如果我有3个苹果，给了小明2个，然后又买了5个，现在我有多少个苹果？',
    description: '测试智能体的推理能力'
  }
];

/**
 * 智能体演示类
 */
class AgentDemo {
  constructor() {
    this.agent = null;
    this.agentManager = null;
    this.mcpClient = null;
    this.demoResults = [];
  }

  /**
   * 初始化演示环境
   */
  async initialize() {
    console.log('🤖 AutoAgent 演示程序');
    console.log('=====================\n');

    try {
      // 检查API密钥
      this.checkAPIKey();
      
      // 创建智能体
      await this.createAgent();
      
      // 创建Agent管理器
      await this.createAgentManager();
      
      // 创建MCP客户端
      await this.createMCPClient();
      
      // 显示系统信息
      this.displaySystemInfo();
      
      return true;
    } catch (error) {
      console.error('❌ 初始化失败:', error.message);
      return false;
    }
  }

  /**
   * 检查API密钥
   */
  checkAPIKey() {
    if (!process.env.OPENAI_API_KEY) {
      console.log('⚠️  未设置 OPENAI_API_KEY，将使用模拟模式');
      console.log('   请在 .env 文件中设置您的 OpenAI API 密钥\n');
    } else {
      console.log('✅ API密钥已配置\n');
    }
  }

  /**
   * 创建智能体
   */
  async createAgent() {
    console.log('🚀 创建智能体...');
    this.agent = new Agent(DEMO_CONFIG.agent);
    console.log('✅ 智能体创建成功\n');
  }

  /**
   * 创建Agent管理器
   */
  async createAgentManager() {
    console.log('🤝 创建Agent管理器...');
    this.agentManager = new AgentManager(DEMO_CONFIG.agentManager);
    
    // 注册智能体到管理器
    const agentId = this.agentManager.registerAgent(this.agent, 'general');
    this.agent.enableCollaboration(this.agentManager);
    
    console.log('✅ Agent管理器创建成功\n');
  }

  /**
   * 创建MCP客户端
   */
  async createMCPClient() {
    console.log('📡 创建MCP客户端...');
    this.mcpClient = new MCPClient(DEMO_CONFIG.mcp);

    // 注册智能体工具到MCP客户端
    this.registerLocalTools();
    
    // 连接到远程MCP服务器
    await this.connectToMCPServer();
    
    console.log('✅ MCP客户端创建成功\n');
  }

  /**
   * 注册本地工具到MCP客户端
   */
  registerLocalTools() {
    const tools = this.agent.tools.listAvailable();
    tools.forEach(tool => {
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
  }

  /**
   * 连接到MCP服务器
   */
  async connectToMCPServer() {
    try {
      await this.mcpClient.connect();
      console.log('✅ MCP客户端连接成功');
    } catch (error) {
      console.log('⚠️  MCP连接失败，继续使用本地工具');
    }
  }

  /**
   * 显示系统信息
   */
  displaySystemInfo() {
    console.log('📊 系统信息:');
    const status = this.agent.getStatus();
    console.log(`   智能体名称: ${status.name}`);
    console.log(`   思考模式: ${status.thinkingMode}`);
    console.log(`   可用工具: ${status.availableTools}`);
    console.log(`   协作模式: ${this.agent.collaborationEnabled ? '启用' : '禁用'}`);
    console.log(`   角色: ${this.agent.role}`);
    
    if (this.mcpClient) {
      console.log(`   MCP客户端: ${this.mcpClient.fullServerUrl}`);
    }
    
    // 显示决策引擎统计
    if (status.decisionStats) {
      console.log(`   🧠 决策引擎统计:`);
      console.log(`      总决策数: ${status.decisionStats.total}`);
      console.log(`      成功决策: ${status.decisionStats.completed}`);
      console.log(`      失败决策: ${status.decisionStats.failed}`);
      console.log(`      成功率: ${status.decisionStats.successRate.toFixed(1)}%`);
    }
    console.log('');
  }

  /**
   * 运行演示任务
   */
  async runDemoTasks() {
    console.log('🛠️  运行演示任务:\n');
    
    for (const task of DEMO_TASKS) {
      await this.runDemoTask(task);
    }
  }

  /**
   * 运行单个演示任务
   */
  async runDemoTask(task) {
    console.log(`📝 任务: ${task.name}`);
    console.log(`   描述: ${task.description}`);
    console.log(`   输入: ${task.input}`);
    
    try {
      const startTime = Date.now();
      const response = await this.agent.processInput(task.input);
      const endTime = Date.now();
      
      console.log(`🤖 响应: ${response}`);
      console.log(`⏱️  耗时: ${endTime - startTime}ms`);
      
      this.demoResults.push({
        task: task.name,
        input: task.input,
        response: response,
        duration: endTime - startTime,
        success: true
      });
      
    } catch (error) {
      console.log(`❌ 失败: ${error.message}`);
      this.demoResults.push({
        task: task.name,
        input: task.input,
        error: error.message,
        success: false
      });
    }
    
    console.log('');
  }

  /**
   * 演示工具功能
   */
  async demonstrateTools() {
    console.log('🛠️  演示工具功能:');
    
    const toolTests = [
      {
        name: '计算器',
        tool: 'calculator',
        args: { expression: '15 * 23 + 7' },
        description: '测试数学计算能力'
      },
      {
        name: '时间查询',
        tool: 'time_date',
        args: { format: 'full' },
        description: '测试时间查询能力'
      }
    ];

    for (const test of toolTests) {
      await this.testTool(test);
    }
    
    console.log('');
  }

  /**
   * 测试工具
   */
  async testTool(test) {
    console.log(`   🧪 测试 ${test.name}: ${test.description}`);
    
    try {
      const result = await this.agent.tools.execute(test.tool, test.args);
      console.log(`   ✅ ${test.name} 成功: ${JSON.stringify(result)}`);
    } catch (error) {
      console.log(`   ❌ ${test.name} 失败: ${error.message}`);
    }
  }

  /**
   * 演示MCP功能
   */
  async demonstrateMCP() {
    console.log('🌐 演示MCP功能:');
    
    if (!this.mcpClient) {
      console.log('   ⚠️  MCP客户端未连接，跳过MCP演示');
      return;
    }

    try {
      // 获取远程工具列表
      const toolsResult = await this.mcpClient.listTools();
      if (toolsResult.success) {
        console.log(`   📦 发现 ${toolsResult.tools.length} 个远程工具`);
        console.log('   🗺️  前5个地图工具:');
        toolsResult.tools.slice(0, 5).forEach(tool => {
          console.log(`      - ${tool.name}: ${tool.description}`);
        });
      } else {
        console.log(`   ❌ 获取工具列表失败: ${toolsResult.error}`);
      }
    } catch (error) {
      console.log(`   ❌ MCP工具查询失败: ${error.message}`);
    }
    
    console.log('');
  }

  /**
   * 演示协作功能
   */
  async demonstrateCollaboration() {
    console.log('🤝 演示协作功能:');
    
    try {
      const taskId = await this.agentManager.createCollaborativeTask('演示协作任务：分析当前时间并生成报告');
      console.log(`   📋 创建协作任务: ${taskId}`);
      
      const taskStatus = this.agentManager.getTaskStatus(taskId);
      console.log(`   📊 任务状态: ${taskStatus.status}`);
      
    } catch (error) {
      console.log(`   ❌ 协作任务创建失败: ${error.message}`);
    }
    
    console.log('');
  }

  /**
   * 显示演示结果
   */
  displayResults() {
    console.log('📊 演示结果总结:');
    console.log(`   总任务数: ${this.demoResults.length}`);
    console.log(`   成功任务: ${this.demoResults.filter(r => r.success).length}`);
    console.log(`   失败任务: ${this.demoResults.filter(r => !r.success).length}`);
    
    if (this.demoResults.length > 0) {
      const avgDuration = this.demoResults
        .filter(r => r.success && r.duration)
        .reduce((sum, r) => sum + r.duration, 0) / 
        this.demoResults.filter(r => r.success && r.duration).length;
      
      console.log(`   平均响应时间: ${avgDuration.toFixed(0)}ms`);
    }
    
    console.log('');
  }

  /**
   * 显示决策历史
   */
  displayDecisionHistory() {
    console.log('🧠 决策历史:');
    const decisionHistory = this.agent.getDecisionHistory(3);
    
    if (decisionHistory.length > 0) {
      decisionHistory.forEach((decision, index) => {
        console.log(`   ${index + 1}. 决策ID: ${decision.id}`);
        console.log(`      状态: ${decision.status}`);
        console.log(`      任务: ${decision.task.substring(0, 50)}...`);
        console.log(`      步骤数: ${decision.steps.length}`);
        if (decision.endTime) {
          const duration = decision.endTime - decision.startTime;
          console.log(`      耗时: ${duration}ms`);
        }
        console.log('');
      });
    } else {
      console.log('   暂无决策历史');
    }
  }

  /**
   * 清理资源
   */
  async cleanup() {
    console.log('🧹 清理资源...');
    
    if (this.mcpClient) {
      try {
        await this.mcpClient.disconnect();
        console.log('✅ MCP客户端已断开连接');
      } catch (error) {
        console.log('⚠️  MCP断开连接失败:', error.message);
      }
    }
    
    console.log('✅ 清理完成');
  }

  /**
   * 运行完整演示
   */
  async run() {
    try {
      // 初始化
      const initialized = await this.initialize();
      if (!initialized) {
        return;
      }

      // 运行演示任务
      await this.runDemoTasks();
      
      // 演示工具功能
      await this.demonstrateTools();
      
      // 演示MCP功能
      await this.demonstrateMCP();
      
      // 演示协作功能
      await this.demonstrateCollaboration();
      
      // 显示结果
      this.displayResults();
      
      // 显示决策历史
      this.displayDecisionHistory();
      
      console.log('🎉 演示完成！');
      console.log('\n📚 更多信息:');
      console.log('   - 查看 README.md 了解详细使用方法');
      console.log('   - 运行 npm test 执行测试');
      console.log('   - 查看 examples/ 目录获取更多示例');

    } catch (error) {
      console.error('❌ 演示失败:', error);
    } finally {
      await this.cleanup();
      console.log('\n👋 演示程序结束');
    }
  }
}

/**
 * 运行演示
 */
async function main() {
  const demo = new AgentDemo();
  await demo.run();
}

// 运行演示
main(); 