import dotenv from 'dotenv';
import { Agent } from './src/core/Agent.js';
import { AgentManager } from './src/core/AgentManager.js';
import { MCPServer } from './src/mcp/MCPServer.js';

// 加载环境变量
dotenv.config();

/**
 * 简单的智能体演示
 */
async function demo() {
  console.log('🤖 AutoAgent 演示程序');
  console.log('=====================\n');

  try {
    // 检查API密钥
    if (!process.env.OPENAI_API_KEY) {
      console.log('⚠️  未设置 OPENAI_API_KEY，将使用模拟模式');
      console.log('   请在 .env 文件中设置您的 OpenAI API 密钥\n');
    }

    // 创建智能体
    console.log('🚀 创建智能体...');
    const agent = new Agent({
      name: 'DemoAgent',
      thinkingMode: 'react',
      maxIterations: 3,
      collaborationEnabled: true,
      role: 'general',
      memory: {
        ttl: 1800,
        maxSize: 100
      },
      llm: {
        apiKey: process.env.OPENAI_API_KEY || 'demo-key',
        model: process.env.OPENAI_MODEL || 'gpt-4',
        baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
        temperature: 0.7
      }
    });

    // 创建Agent管理器
    console.log('🤝 创建Agent管理器...');
    const agentManager = new AgentManager({
      maxAgents: 5,
      taskTimeout: 30000
    });

    // 注册智能体到管理器
    const agentId = agentManager.registerAgent(agent, 'general');
    agent.enableCollaboration(agentManager);

    console.log('✅ 智能体和Agent管理器创建成功\n');

    // 创建MCP服务器
    console.log('📡 创建MCP服务器...');
    const mcpServer = new MCPServer({
      host: 'localhost',
      port: 3001
    });

    // 注册工具到MCP服务器
    const tools = agent.tools.listAvailable();
    tools.forEach(tool => {
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

    // 启动MCP服务器
    console.log('🚀 启动MCP服务器...');
    await mcpServer.start();
    console.log('✅ MCP服务器启动成功\n');

    // 显示智能体信息
    console.log('📊 智能体信息:');
    const status = agent.getStatus();
    console.log(`   名称: ${status.name}`);
    console.log(`   思考模式: ${status.thinkingMode}`);
    console.log(`   可用工具: ${status.availableTools}`);
    console.log(`   协作模式: ${agent.collaborationEnabled ? '启用' : '禁用'}`);
    console.log(`   角色: ${agent.role}`);
    console.log(`   MCP服务器: ws://${mcpServer.host}:${mcpServer.port}\n`);

    // 显示协作统计
    const collabStats = agent.getCollaborationStats();
    console.log('🤝 协作统计:');
    console.log(`   协作模式: ${collabStats.collaborationEnabled ? '启用' : '禁用'}`);
    console.log(`   角色: ${collabStats.role}`);
    console.log(`   协作历史: ${collabStats.collaborationHistoryLength}`);
    console.log(`   协作记忆: ${collabStats.collaborationMemories}\n`);

    // 演示工具功能
    console.log('🛠️  演示工具功能:');
    
    // 计算器演示
    try {
      const calcResult = await agent.tools.execute('calculator', { expression: '15 * 23 + 7' });
      console.log(`   🧮 计算器: 15 * 23 + 7 = ${calcResult.result}`);
    } catch (error) {
      console.log(`   ❌ 计算器失败: ${error.message}`);
    }

    // 时间演示
    try {
      const timeResult = await agent.tools.execute('time_date', { format: 'full' });
      console.log(`   🕐 时间: ${timeResult.datetime}`);
    } catch (error) {
      console.log(`   ❌ 时间查询失败: ${error.message}`);
    }

    console.log('');

    // 演示协作功能
    console.log('🤝 演示协作功能:');
    
    // 创建协作任务
    try {
      const taskId = await agentManager.createCollaborativeTask('演示协作任务：分析当前时间并生成报告');
      console.log(`   📋 创建协作任务: ${taskId}`);
      
      // 获取任务状态
      const taskStatus = agentManager.getTaskStatus(taskId);
      console.log(`   📊 任务状态: ${taskStatus.status}`);
      
    } catch (error) {
      console.log(`   ❌ 协作任务创建失败: ${error.message}`);
    }

    // 演示智能体对话（如果有API密钥）
    if (process.env.OPENAI_API_KEY) {
      console.log('\n💬 演示智能体对话:');
      
      const testInputs = [
        '你好，请介绍一下你自己',
        '计算 25 * 16 + 8',
        '现在是什么时间？'
      ];

      for (const input of testInputs) {
        console.log(`\n📝 用户: ${input}`);
        try {
          const response = await agent.processInput(input);
          console.log(`🤖 智能体: ${response}`);
        } catch (error) {
          console.log(`❌ 处理失败: ${error.message}`);
        }
      }
    } else {
      console.log('\n💬 智能体对话演示（需要API密钥）:');
      console.log('   请设置 OPENAI_API_KEY 环境变量来启用对话功能');
    }

    console.log('\n🎉 演示完成！');
    console.log('\n📚 更多信息:');
    console.log('   - 查看 README.md 了解详细使用方法');
    console.log('   - 运行 npm test 执行测试');
    console.log('   - 查看 examples/ 目录获取更多示例');

    // 停止服务器
    await mcpServer.stop();
    console.log('\n👋 演示程序结束');

  } catch (error) {
    console.error('❌ 演示失败:', error);
  }
}

// 运行演示
demo(); 