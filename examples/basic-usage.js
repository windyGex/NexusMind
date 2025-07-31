import dotenv from 'dotenv';
import { Agent } from '../src/core/Agent.js';
import { MCPServer } from '../src/mcp/MCPServer.js';

// 加载环境变量
dotenv.config();

/**
 * 基本使用示例
 */
async function basicUsageExample() {
  console.log('🚀 开始基本使用示例...\n');

  try {
    // 1. 创建智能体
    console.log('1️⃣ 创建智能体...');
    const agent = new Agent({
      name: 'DemoAgent',
      thinkingMode: 'react', // 使用ReAct模式
      maxIterations: 5,
      memory: {
        ttl: 1800, // 30分钟
        maxSize: 500
      },
      llm: {
        apiKey: process.env.OPENAI_API_KEY,
        model: process.env.OPENAI_MODEL || 'gpt-4',
        temperature: 0.7
      }
    });

    console.log('✅ 智能体创建成功\n');

    // 2. 创建MCP服务器
    console.log('2️⃣ 创建MCP服务器...');
    const mcpServer = new MCPServer({
      host: 'localhost',
      port: 3001
    });

    // 注册智能体工具到MCP服务器
    const agentTools = agent.tools.listAvailable();
    agentTools.forEach(tool => {
      mcpServer.registerTool(tool.name, {
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
          return await agent.tools.execute(tool.name, args);
        }
      });
    });

    console.log('✅ MCP服务器创建成功\n');

    // 3. 启动MCP服务器
    console.log('3️⃣ 启动MCP服务器...');
    await mcpServer.start();
    console.log('✅ MCP服务器启动成功\n');

    // 4. 测试智能体功能
    console.log('4️⃣ 测试智能体功能...\n');

    const testCases = [
      {
        input: '你好，请介绍一下你自己',
        description: '基础对话测试'
      },
      {
        input: '计算 25 * 16 + 8',
        description: '数学计算测试'
      },
      {
        input: '现在是什么时间？',
        description: '时间查询测试'
      },
      {
        input: '搜索关于机器学习的信息',
        description: '信息搜索测试'
      },
      {
        input: '请帮我分析一下今天的天气情况',
        description: '复杂任务测试'
      }
    ];

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      console.log(`📝 测试 ${i + 1}: ${testCase.description}`);
      console.log(`   输入: ${testCase.input}`);
      
      try {
        const startTime = Date.now();
        const response = await agent.processInput(testCase.input);
        const endTime = Date.now();
        
        console.log(`   响应: ${response}`);
        console.log(`   耗时: ${endTime - startTime}ms`);
        console.log(`   状态: ✅ 成功\n`);
      } catch (error) {
        console.log(`   状态: ❌ 失败 - ${error.message}\n`);
      }

      // 等待一下再处理下一个
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // 5. 显示智能体状态
    console.log('5️⃣ 显示智能体状态...\n');
    
    const status = agent.getStatus();
    const memoryStats = agent.memory.getStats();
    const mcpStatus = mcpServer.getStatus();

    console.log('📊 智能体状态:');
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

    // 6. 测试记忆功能
    console.log('\n6️⃣ 测试记忆功能...\n');

    // 搜索相关记忆
    const searchResults = agent.memory.search('计算');
    console.log(`🔍 搜索"计算"相关记忆: ${searchResults.length} 条结果`);
    searchResults.forEach((result, index) => {
      console.log(`   ${index + 1}. ${result.data.content}`);
    });

    // 7. 测试工具功能
    console.log('\n7️⃣ 测试工具功能...\n');

    const tools = agent.tools.listAvailable();
    console.log('🛠️ 可用工具:');
    tools.forEach(tool => {
      console.log(`   - ${tool.name}: ${tool.description}`);
    });

    // 测试计算器工具
    try {
      const calcResult = await agent.tools.execute('calculator', { expression: '10 + 20 * 2' });
      console.log(`\n🧮 计算器测试: 10 + 20 * 2 = ${calcResult.result}`);
    } catch (error) {
      console.log(`❌ 计算器测试失败: ${error.message}`);
    }

    // 8. 清理和停止
    console.log('\n8️⃣ 清理和停止...\n');

    // 停止MCP服务器
    await mcpServer.stop();
    console.log('✅ MCP服务器已停止');

    // 重置智能体
    agent.reset();
    console.log('✅ 智能体已重置');

    console.log('\n🎉 基本使用示例完成！');

  } catch (error) {
    console.error('❌ 示例运行失败:', error);
  }
}

/**
 * CoT模式示例
 */
async function cotModeExample() {
  console.log('\n🧠 CoT模式示例...\n');

  try {
    const agent = new Agent({
      name: 'CoTAgent',
      thinkingMode: 'cot',
      llm: {
        apiKey: process.env.OPENAI_API_KEY,
        model: process.env.OPENAI_MODEL || 'gpt-4'
      }
    });

    const response = await agent.processInput('请解释一下什么是人工智能，并分析其发展趋势');
    console.log('🤖 CoT模式响应:');
    console.log(response);

  } catch (error) {
    console.error('❌ CoT示例失败:', error);
  }
}

/**
 * 自定义工具示例
 */
async function customToolExample() {
  console.log('\n🔧 自定义工具示例...\n');

  try {
    const agent = new Agent({
      name: 'CustomToolAgent',
      thinkingMode: 'react',
      llm: {
        apiKey: process.env.OPENAI_API_KEY,
        model: process.env.OPENAI_MODEL || 'gpt-4'
      }
    });

    // 注册自定义工具
    agent.tools.registerTool('weather_check', {
      name: 'weather_check',
      description: '检查指定城市的天气情况',
      category: 'information',
      parameters: {
        city: {
          type: 'string',
          description: '城市名称'
        }
      },
      execute: async (args) => {
        const { city } = args;
        // 模拟天气查询
        return {
          city,
          temperature: '22°C',
          condition: '晴天',
          humidity: '65%',
          wind: '微风',
          timestamp: new Date().toISOString()
        };
      }
    });

    console.log('✅ 自定义工具已注册');

    const response = await agent.processInput('请检查北京的天气情况');
    console.log('🤖 自定义工具响应:');
    console.log(response);

  } catch (error) {
    console.error('❌ 自定义工具示例失败:', error);
  }
}

// 运行示例
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    await basicUsageExample();
    await cotModeExample();
    await customToolExample();
  })();
}

export { basicUsageExample, cotModeExample, customToolExample }; 