import { Agent } from '../src/core/Agent.js';
import { AgentManager } from '../src/core/AgentManager.js';
import { MemoryManager } from '../src/core/MemoryManager.js';
import { LLMClient } from '../src/core/LLMClient.js';
import { ToolRegistry } from '../src/core/ToolRegistry.js';
import { DecisionEngine } from '../src/core/DecisionEngine.js';

/**
 * 测试套件
 */
class TestSuite {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  /**
   * 添加测试
   */
  test(name, testFunction) {
    this.tests.push({ name, testFunction });
  }

  /**
   * 运行所有测试
   */
  async run() {
    console.log('🧪 开始运行测试套件...\n');

    for (const test of this.tests) {
      try {
        console.log(`📝 运行测试: ${test.name}`);
        await test.testFunction();
        console.log(`✅ 测试通过: ${test.name}\n`);
        this.passed++;
      } catch (error) {
        console.error(`❌ 测试失败: ${test.name}`);
        console.error(`   错误: ${error.message}\n`);
        this.failed++;
      }
    }

    this.printSummary();
  }

  /**
   * 打印测试总结
   */
  printSummary() {
    console.log('📊 测试总结:');
    console.log(`   总测试数: ${this.tests.length}`);
    console.log(`   通过: ${this.passed}`);
    console.log(`   失败: ${this.failed}`);
    console.log(`   成功率: ${((this.passed / this.tests.length) * 100).toFixed(1)}%`);
  }

  /**
   * 断言函数
   */
  assert(condition, message) {
    if (!condition) {
      throw new Error(message || '断言失败');
    }
  }

  assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(message || `期望 ${expected}，实际 ${actual}`);
    }
  }

  assertNotNull(value, message) {
    if (value === null || value === undefined) {
      throw new Error(message || '值不能为空');
    }
  }
}

/**
 * 运行测试
 */
async function runTests() {
  const testSuite = new TestSuite();

  // 测试记忆管理器
  testSuite.test('MemoryManager - 基本功能', async () => {
    const memory = new MemoryManager();
    
    // 测试添加记忆
    const id1 = memory.add('conversation', { content: 'Hello world' });
    testSuite.assertNotNull(id1, '记忆ID不能为空');
    
    // 测试获取记忆
    const mem1 = memory.get(id1);
    testSuite.assertNotNull(mem1, '应该能获取到记忆');
    testSuite.assertEqual(mem1.data.content, 'Hello world', '记忆内容应该匹配');
    
    // 测试记忆大小
    testSuite.assertEqual(memory.size(), 1, '记忆大小应该是1');
    
    // 测试搜索记忆
    const results = memory.search('Hello');
    testSuite.assertEqual(results.length, 1, '应该找到1个相关记忆');
    
    // 测试清空记忆
    memory.clear();
    testSuite.assertEqual(memory.size(), 0, '清空后记忆大小应该是0');
  });

  // 测试工具注册表
  testSuite.test('ToolRegistry - 工具注册和执行', async () => {
    const tools = new ToolRegistry();
    
    // 测试默认工具
    const availableTools = tools.listAvailable();
    testSuite.assert(availableTools.length > 0, '应该有默认工具');
    
    // 测试计算器工具
    const result = await tools.execute('calculator', { expression: '2 + 3' });
    testSuite.assertEqual(result.result, 5, '2 + 3 应该等于 5');
    
    // 测试时间工具
    const timeResult = await tools.execute('time_date', { format: 'time' });
    testSuite.assertNotNull(timeResult.hours, '应该有小时信息');
    testSuite.assertNotNull(timeResult.minutes, '应该有分钟信息');
  });

  // 测试LLM客户端（需要API密钥）
  testSuite.test('LLMClient - 基本功能', async () => {
    const llm = new LLMClient({
      apiKey: process.env.OPENAI_API_KEY || 'test-key',
      model: 'gpt-4'
    });
    
    // 测试连接（如果API密钥无效，这个测试会失败）
    if (process.env.OPENAI_API_KEY) {
      const isConnected = await llm.testConnection();
      testSuite.assert(isConnected, 'LLM连接应该成功');
    } else {
      console.log('⚠️ 跳过LLM连接测试（缺少API密钥）');
    }
    
    // 测试配置
    const stats = llm.getUsageStats();
    testSuite.assertNotNull(stats.model, '应该有模型信息');
  });

  // 测试决策引擎
  testSuite.test('DecisionEngine - 决策流程', async () => {
    const llm = new LLMClient({
      apiKey: process.env.OPENAI_API_KEY || 'test-key',
      model: 'gpt-4'
    });
    const tools = new ToolRegistry();
    const engine = new DecisionEngine(llm, tools);
    
    // 测试决策统计
    const stats = engine.getStats();
    testSuite.assertEqual(stats.total, 0, '初始决策数应该是0');
    
    // 测试决策历史
    const history = engine.getDecisionHistory();
    testSuite.assertEqual(history.length, 0, '初始历史应该是空的');
  });

  // 测试智能体（集成测试）
  testSuite.test('Agent - 集成功能', async () => {
    const agent = new Agent({
      name: 'TestAgent',
      thinkingMode: 'react',
      llm: {
        apiKey: process.env.OPENAI_API_KEY || 'test-key',
        model: 'gpt-4',
        baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
      }
    });
    
    // 测试智能体状态
    const status = agent.getStatus();
    testSuite.assertEqual(status.name, 'TestAgent', '智能体名称应该匹配');
    testSuite.assertEqual(status.thinkingMode, 'react', '思考模式应该匹配');
    
    // 测试工具可用性
    const tools = agent.tools.listAvailable();
    testSuite.assert(tools.length > 0, '智能体应该有可用工具');
    
    // 测试记忆功能
    const memoryStats = agent.memory.getStats();
    testSuite.assertNotNull(memoryStats, '应该有记忆统计');
  });

  // 测试ReAct模式
  testSuite.test('Agent - ReAct模式', async () => {
    const agent = new Agent({
      name: 'ReactAgent',
      thinkingMode: 'react',
      maxIterations: 3,
      llm: {
        apiKey: process.env.OPENAI_API_KEY || 'test-key',
        model: 'gpt-4',
        baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
      }
    });
    
    testSuite.assertEqual(agent.thinkingMode, 'react', '思考模式应该是react');
    testSuite.assertEqual(agent.maxIterations, 3, '最大迭代次数应该是3');
  });

  // 测试记忆相关性搜索
  testSuite.test('MemoryManager - 相关性搜索', async () => {
    const memory = new MemoryManager();
    
    // 添加一些测试记忆
    memory.add('conversation', { content: '关于人工智能的讨论' });
    memory.add('conversation', { content: '天气很好，适合出门' });
    memory.add('reasoning', { content: '分析机器学习算法' });
    
    // 等待一下让记忆生效
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 测试相关性搜索
    const aiResults = memory.getRelevant('人工智能');
    testSuite.assert(aiResults.length > 0, '应该找到AI相关的记忆');
    
    const weatherResults = memory.getRelevant('天气');
    testSuite.assert(weatherResults.length > 0, '应该找到天气相关的记忆');
    
    const mlResults = memory.getRelevant('机器学习');
    testSuite.assert(mlResults.length > 0, '应该找到机器学习相关的记忆');
  });

  // 测试工具参数验证
  testSuite.test('ToolRegistry - 参数验证', async () => {
    const tools = new ToolRegistry();
    
    // 测试缺少必需参数
    try {
      await tools.execute('calculator', {});
      throw new Error('应该抛出参数错误');
    } catch (error) {
      testSuite.assert(error.message.includes('参数'), '应该有参数错误信息');
    }
    
    // 测试无效参数类型
    try {
      await tools.execute('calculator', { expression: 123 });
      throw new Error('应该抛出类型错误');
    } catch (error) {
      testSuite.assert(error.message.includes('类型'), '应该有类型错误信息');
    }
  });

  // 测试记忆导出导入
  testSuite.test('MemoryManager - 导出导入', async () => {
    const memory = new MemoryManager();
    
    // 添加测试数据
    memory.add('conversation', { content: '测试对话1' });
    memory.add('reasoning', { content: '测试推理1' });
    
    // 导出记忆
    const exported = memory.export();
    testSuite.assertEqual(exported.length, 2, '应该导出2条记忆');
    
    // 清空记忆
    memory.clear();
    testSuite.assertEqual(memory.size(), 0, '清空后大小应该是0');
    
    // 导入记忆
    memory.import(exported);
    testSuite.assertEqual(memory.size(), 2, '导入后大小应该是2');
  });

  // 测试AgentManager基本功能
  testSuite.test('AgentManager - 基本功能', async () => {
    const manager = new AgentManager();
    
    const agent1 = new Agent({ name: 'Agent1', llm: { apiKey: 'test-key' } });
    const agent2 = new Agent({ name: 'Agent2', llm: { apiKey: 'test-key' } });
    
    const id1 = manager.registerAgent(agent1, 'worker');
    const id2 = manager.registerAgent(agent2, 'coordinator');
    
    testSuite.assertEqual(manager.agents.size, 2, '应该注册2个Agent');
    testSuite.assertNotNull(manager.getAgentStatus(id1), '应该能获取Agent状态');
    testSuite.assertNotNull(manager.getAgentStatus(id2), '应该能获取Agent状态');
    
    manager.unregisterAgent(id1);
    testSuite.assertEqual(manager.agents.size, 1, '应该只剩1个Agent');
  });

  // 测试协作任务
  testSuite.test('AgentManager - 协作任务', async () => {
    const manager = new AgentManager();
    
    const agent = new Agent({ name: 'TestAgent', llm: { apiKey: 'test-key' } });
    const agentId = manager.registerAgent(agent, 'worker');
    
    const taskId = await manager.createCollaborativeTask('测试任务');
    testSuite.assert(manager.tasks.has(taskId), '应该创建任务');
    
    const task = manager.getTaskStatus(taskId);
    testSuite.assertEqual(task.status, 'pending', '任务状态应该是pending');
  });

  // 测试Agent协作功能
  testSuite.test('Agent - 协作功能', async () => {
    const manager = new AgentManager();
    
    const agent = new Agent({
      name: 'CollaborativeAgent',
      collaborationEnabled: true,
      llm: { apiKey: 'test-key' }
    });
    
    const agentId = manager.registerAgent(agent, 'worker');
    agent.enableCollaboration(manager);
    
    testSuite.assert(agent.collaborationEnabled === true, '协作模式应该启用');
    testSuite.assert(agent.agentManager === manager, '应该设置Agent管理器');
    
    const stats = agent.getCollaborationStats();
    testSuite.assert(stats.collaborationEnabled === true, '协作统计应该正确');
  });

  // 测试Agent间通信
  testSuite.test('AgentManager - Agent间通信', async () => {
    const manager = new AgentManager();
    
    const agent1 = new Agent({ name: 'Agent1', llm: { apiKey: 'test-key' } });
    const agent2 = new Agent({ name: 'Agent2', llm: { apiKey: 'test-key' } });
    
    const id1 = manager.registerAgent(agent1, 'sender');
    const id2 = manager.registerAgent(agent2, 'receiver');
    
    // 测试发送消息
    const message = await manager.sendMessage(id1, id2, '测试消息', 'text');
    testSuite.assertNotNull(message.id, '消息应该有ID');
    testSuite.assertEqual(message.from, id1, '发送方应该正确');
    testSuite.assertEqual(message.to, id2, '接收方应该正确');
    
    // 测试广播消息
    const broadcast = await manager.broadcastMessage(id1, '广播消息', 'broadcast');
    testSuite.assertEqual(broadcast.to, 'all', '广播目标应该是all');
  });

  // 测试任务分配和执行
  testSuite.test('AgentManager - 任务分配执行', async () => {
    const manager = new AgentManager();
    
    const agent = new Agent({ name: 'WorkerAgent', llm: { apiKey: 'test-key' } });
    const agentId = manager.registerAgent(agent, 'worker');
    
    const taskId = await manager.createCollaborativeTask('计算任务');
    const assignment = await manager.assignTask(taskId, agentId);
    
    testSuite.assertEqual(assignment.status, 'assigned', '任务状态应该是assigned');
    testSuite.assertEqual(assignment.agentId, agentId, 'Agent ID应该匹配');
    
    const agentStatus = manager.getAgentStatus(agentId);
    testSuite.assertEqual(agentStatus.status, 'busy', 'Agent状态应该是busy');
  });

  // 运行所有测试
  await testSuite.run();
}

// 如果直接运行此文件，则执行测试
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(error => {
    console.error('❌ 测试运行失败:', error);
    process.exit(1);
  });
}

export { TestSuite, runTests }; 