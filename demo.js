import dotenv from 'dotenv';
import { Agent } from './src/core/Agent.js';
import { AgentManager } from './src/core/AgentManager.js';
import { MCPClient } from './src/mcp/MCPClient.js';

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

    // 创建MCP客户端
    console.log('📡 创建MCP客户端...');
    const mcpClient = new MCPClient({
      serverUrl: 'https://mcp.amap.com/mcp',
      apiKey: 'df2d1657542aabd58302835c17737791'
    });

    // 注册智能体工具到MCP客户端
    const tools = agent.tools.listAvailable();
    tools.forEach(tool => {
      mcpClient.localTools.set(tool.name, {
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

    console.log('✅ MCP客户端创建成功\n');

    // 连接到远程MCP服务器
    console.log('🔗 连接到远程MCP服务器...');
    await mcpClient.connect();
    console.log('✅ MCP客户端连接成功\n');

    // 显示智能体信息
    console.log('📊 智能体信息:');
    const status = agent.getStatus();
    console.log(`   名称: ${status.name}`);
    console.log(`   思考模式: ${status.thinkingMode}`);
    console.log(`   可用工具: ${status.availableTools}`);
    console.log(`   协作模式: ${agent.collaborationEnabled ? '启用' : '禁用'}`);
    console.log(`   角色: ${agent.role}`);
    console.log(`   MCP客户端: ${mcpClient.fullServerUrl}\n`);

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

    // 演示MCP功能
    console.log('🌐 演示MCP功能:');
    
    // 获取远程工具列表
    try {
      const toolsResult = await mcpClient.listTools();
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

    // 演示远程工具调用
    try {
      console.log('\n   🚗 演示远程工具调用 - 计算距离:');
      const distanceResult = await mcpClient.callTool('maps_distance', {
        origin: '北京天安门',
        destination: '上海外滩',
        type: '1'
      });
      if (distanceResult.success) {
        console.log(`   ✅ 距离计算结果: ${JSON.stringify(distanceResult.result, null, 2)}`);
      } else {
        console.log(`   ❌ 距离计算失败: ${distanceResult.error}`);
      }
    } catch (error) {
      console.log(`   ❌ 远程工具调用失败: ${error.message}`);
    }

    // 演示本地工具调用
    try {
      console.log('\n   🧮 演示本地工具调用 - 计算器:');
      const calcResult = await mcpClient.executeLocalTool('calculator', {
        expression: '25 * 16 + 8'
      });
      if (calcResult.success) {
        console.log(`   ✅ 本地计算器结果: ${calcResult.result.result}`);
      } else {
        console.log(`   ❌ 本地计算器失败: ${calcResult.error}`);
      }
    } catch (error) {
      console.log(`   ❌ 本地工具调用失败: ${error.message}`);
    }

    // 演示混合工具使用
    try {
      console.log('\n   🔄 演示混合工具使用:');
      const allTools = mcpClient.getAllTools();
      console.log(`   📊 总工具数: ${allTools.size}`);
      
      const remoteTools = Array.from(allTools.entries())
        .filter(([name, tool]) => tool.source === 'remote')
        .map(([name, tool]) => name);
      
      const localTools = Array.from(allTools.entries())
        .filter(([name, tool]) => tool.source === 'local')
        .map(([name, tool]) => name);
      
      console.log(`   🌐 远程工具: ${remoteTools.length} 个`);
      console.log(`   🏠 本地工具: ${localTools.length} 个`);
      console.log(`   🏠 本地工具列表: ${localTools.join(', ')}`);
    } catch (error) {
      console.log(`   ❌ 混合工具查询失败: ${error.message}`);
    }

    // 演示MCP客户端状态
    try {
      console.log('\n   📊 MCP客户端状态:');
      const mcpStatus = mcpClient.getStatus();
      console.log(`   🔗 服务器地址: ${mcpStatus.serverUrl}`);
      console.log(`   ✅ 连接状态: ${mcpStatus.isConnected ? '已连接' : '未连接'}`);
      console.log(`   🌐 远程工具: ${mcpStatus.remoteTools} 个`);
      console.log(`   🏠 本地工具: ${mcpStatus.localTools} 个`);
      console.log(`   📦 总工具数: ${mcpStatus.totalTools} 个`);
    } catch (error) {
      console.log(`   ❌ 状态查询失败: ${error.message}`);
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

    // 断开MCP客户端连接
    await mcpClient.disconnect();
    console.log('\n👋 演示程序结束');

  } catch (error) {
    console.error('❌ 演示失败:', error);
  }
}

// 运行演示
demo(); 