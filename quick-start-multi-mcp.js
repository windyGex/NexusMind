#!/usr/bin/env node

import dotenv from 'dotenv';
import { Agent } from './src/core/Agent.js';
import { MCPServerManager } from './src/mcp/MCPServerManager.js';

// 加载环境变量
dotenv.config();

/**
 * 多MCP服务器快速开始示例
 */
async function quickStart() {
  console.log('🚀 多MCP服务器快速开始...\n');

  try {
    // 创建智能体
    const agent = new Agent({
      name: 'QuickStartAgent',
      thinkingMode: 'react',
      toolSelector: {
        maxToolsPerTask: 2
      },
      llm: {
        apiKey: process.env.OPENAI_API_KEY,
        model: process.env.OPENAI_MODEL || 'gpt-4',
        baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
      }
    });

    // 创建MCP服务器管理器
    const mcpManager = new MCPServerManager({
      maxConnections: 3,
      connectionTimeout: 15000,
      retryAttempts: 2
    });

    // 设置MCP服务器管理器到智能体
    agent.setMCPServerManager(mcpManager);

    console.log('📡 连接MCP服务器...');

    // 添加MCP服务器（这里使用示例配置）
    const servers = {
      'amap': {
        name: '高德地图',
        serverUrl: process.env.AMAP_SERVER_URL || 'https://mcp.amap.com/mcp',
        apiKey: process.env.AMAP_API_KEY || 'df2d1657542aabd58302835c17737791'
      }
    };

    for (const [serverId, config] of Object.entries(servers)) {
      try {
        await mcpManager.addServer(serverId, config);
        console.log(`✅ ${config.name} 连接成功`);
      } catch (error) {
        console.log(`⚠️ ${config.name} 连接失败: ${error.message}`);
      }
    }

    if (process.env.OPENAI_API_KEY) {
      console.log('\n💬 演示智能体对话:');
      
      // 等待MCP工具加载完成
      // await agent.updateMCPTools();
      
      const testInputs = [
        '杭州天气',
      ];

      for (const input of testInputs) {
        console.log(`\n📝 用户: ${input}`);
        try {
          const startTime = Date.now();
          const response = await agent.processInput(input);
          const endTime = Date.now();
          console.log(`🤖 智能体: ${response}`);
          console.log(`⏱️  耗时: ${endTime - startTime}ms`);
        } catch (error) {
          console.log(`❌ 处理失败: ${error.message}`);
        }
      }
      
      // 显示MCP工具统计
      console.log('\n📊 MCP工具统计:');
      const toolStats = agent.getMCPToolStats();
      if (toolStats) {
        console.log(`   服务器状态: ${JSON.stringify(toolStats.serverStats, null, 2)}`);
      }
    } else {
      console.log('\n💬 智能体对话演示（需要API密钥）:');
      console.log('   请设置 OPENAI_API_KEY 环境变量来启用对话功能');
    }

  } catch (error) {
    console.error('❌ 启动失败:', error);
    process.exit(1);
  }
}

// 运行快速开始
if (import.meta.url === `file://${process.argv[1]}`) {
  quickStart().catch(console.error);
}

export { quickStart }; 