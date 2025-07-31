import dotenv from 'dotenv';
import { Agent } from '../src/core/Agent.js';
import { AgentManager } from '../src/core/AgentManager.js';

// 加载环境变量
dotenv.config();

/**
 * 多Agent协作示例
 */
async function multiAgentCollaborationExample() {
  console.log('🤝 多Agent协作示例');
  console.log('==================\n');

  try {
    // 1. 创建Agent管理器
    console.log('1️⃣ 创建Agent管理器...');
    const agentManager = new AgentManager({
      maxAgents: 5,
      taskTimeout: 30000,
      communicationTimeout: 10000
    });

    // 2. 创建不同角色的Agent
    console.log('2️⃣ 创建不同角色的Agent...\n');

    // 分析Agent - 负责任务分析和规划
    const analystAgent = new Agent({
      name: 'AnalystAgent',
      thinkingMode: 'cot',
      role: 'analyst',
      collaborationEnabled: true,
      llm: {
        apiKey: process.env.OPENAI_API_KEY || 'demo-key',
        model: process.env.OPENAI_MODEL || 'gpt-4',
        baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
      }
    });

    // 执行Agent - 负责具体任务执行
    const executorAgent = new Agent({
      name: 'ExecutorAgent',
      thinkingMode: 'react',
      role: 'executor',
      collaborationEnabled: true,
      llm: {
        apiKey: process.env.OPENAI_API_KEY || 'demo-key',
        model: process.env.OPENAI_MODEL || 'gpt-4',
        baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
      }
    });

    // 协调Agent - 负责协调和整合
    const coordinatorAgent = new Agent({
      name: 'CoordinatorAgent',
      thinkingMode: 'cot',
      role: 'coordinator',
      collaborationEnabled: true,
      llm: {
        apiKey: process.env.OPENAI_API_KEY || 'demo-key',
        model: process.env.OPENAI_MODEL || 'gpt-4',
        baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
      }
    });

    // 3. 注册Agent到管理器
    console.log('3️⃣ 注册Agent到管理器...');
    const analystId = agentManager.registerAgent(analystAgent, 'analyst');
    const executorId = agentManager.registerAgent(executorAgent, 'executor');
    const coordinatorId = agentManager.registerAgent(coordinatorAgent, 'coordinator');

    // 启用协作模式
    analystAgent.enableCollaboration(agentManager);
    executorAgent.enableCollaboration(agentManager);
    coordinatorAgent.enableCollaboration(agentManager);

    console.log(`✅ Agent已注册:`);
    console.log(`   - ${analystId} (分析员)`);
    console.log(`   - ${executorId} (执行者)`);
    console.log(`   - ${coordinatorId} (协调者)\n`);

    // 4. 设置事件监听
    console.log('4️⃣ 设置事件监听...');
    agentManager.on('agentRegistered', (agentInfo) => {
      console.log(`🤝 Agent注册: ${agentInfo.id} (${agentInfo.role})`);
    });

    agentManager.on('taskCreated', (task) => {
      console.log(`📋 任务创建: ${task.id}`);
    });

    agentManager.on('taskAssigned', (assignment) => {
      console.log(`📤 任务分配: ${assignment.taskId} -> ${assignment.agentId}`);
    });

    agentManager.on('taskCompleted', (task) => {
      console.log(`✅ 任务完成: ${task.id}`);
    });

    agentManager.on('messageSent', (message) => {
      console.log(`💬 消息: ${message.from} -> ${message.to}`);
    });

    // 5. 创建协作任务
    console.log('5️⃣ 创建协作任务...');
    const taskId = await agentManager.createCollaborativeTask(
      '分析当前市场趋势，制定营销策略，并生成执行计划',
      {
        priority: 'high',
        deadline: new Date(Date.now() + 60000) // 1分钟后
      }
    );

    console.log(`📋 协作任务已创建: ${taskId}\n`);

    // 6. 执行协作任务
    console.log('6️⃣ 执行协作任务...');
    const startTime = Date.now();
    
    try {
      const result = await agentManager.executeCollaborativeTask(taskId);
      const endTime = Date.now();
      
      console.log(`✅ 协作任务完成 (耗时: ${endTime - startTime}ms)`);
      console.log('📊 任务结果:');
      console.log(JSON.stringify(result, null, 2));
      
    } catch (error) {
      console.error(`❌ 协作任务失败: ${error.message}`);
    }

    // 7. 演示Agent间通信
    console.log('\n7️⃣ 演示Agent间通信...');
    
    // 分析Agent向执行Agent发送消息
    await analystAgent.sendMessage(executorId, '我已经完成了市场分析，需要你执行具体的营销活动', 'task_request');
    
    // 执行Agent向协调Agent报告进度
    await executorAgent.sendMessage(coordinatorId, '营销活动执行进度：50%', 'coordination');
    
    // 协调Agent广播消息
    await coordinatorAgent.broadcastMessage('项目进度更新：整体完成度70%', 'broadcast');

    // 8. 显示统计信息
    console.log('\n8️⃣ 显示统计信息...');
    const stats = agentManager.getStats();
    
    console.log('📊 Agent管理器统计:');
    console.log(`   总Agent数: ${stats.totalAgents}`);
    console.log(`   活跃Agent: ${stats.activeAgents}`);
    console.log(`   忙碌Agent: ${stats.busyAgents}`);
    console.log(`   总任务数: ${stats.totalTasks}`);
    console.log(`   已完成任务: ${stats.completedTasks}`);
    console.log(`   失败任务: ${stats.failedTasks}`);
    console.log(`   角色: ${stats.roles.join(', ')}`);

    // 显示各Agent的协作统计
    console.log('\n🤝 各Agent协作统计:');
    [analystAgent, executorAgent, coordinatorAgent].forEach(agent => {
      const collabStats = agent.getCollaborationStats();
      console.log(`   ${agent.name}:`);
      console.log(`     协作模式: ${collabStats.collaborationEnabled ? '启用' : '禁用'}`);
      console.log(`     角色: ${collabStats.role}`);
      console.log(`     协作历史: ${collabStats.collaborationHistoryLength}`);
      console.log(`     协作记忆: ${collabStats.collaborationMemories}`);
    });

    // 9. 清理
    console.log('\n9️⃣ 清理资源...');
    
    // 注销Agent
    agentManager.unregisterAgent(analystId);
    agentManager.unregisterAgent(executorId);
    agentManager.unregisterAgent(coordinatorId);
    
    // 清理完成的任务
    const cleanedCount = agentManager.cleanupCompletedTasks();
    console.log(`🧹 清理了 ${cleanedCount} 个已完成的任务`);

    console.log('\n🎉 多Agent协作示例完成！');

  } catch (error) {
    console.error('❌ 多Agent协作示例失败:', error);
  }
}

/**
 * 角色专业化示例
 */
async function specializedRolesExample() {
  console.log('\n🎭 角色专业化示例');
  console.log('==================\n');

  try {
    const agentManager = new AgentManager();

    // 创建专业化的Agent
    const agents = [
      {
        name: 'ResearchAgent',
        role: 'researcher',
        description: '负责数据收集和研究',
        thinkingMode: 'cot'
      },
      {
        name: 'CreativeAgent',
        role: 'creative',
        description: '负责创意和设计',
        thinkingMode: 'cot'
      },
      {
        name: 'TechnicalAgent',
        role: 'technical',
        description: '负责技术实现',
        thinkingMode: 'react'
      },
      {
        name: 'QualityAgent',
        role: 'quality',
        description: '负责质量检查',
        thinkingMode: 'cot'
      }
    ];

    console.log('创建专业化Agent...');
    const registeredAgents = [];

    for (const agentConfig of agents) {
      const agent = new Agent({
        name: agentConfig.name,
        thinkingMode: agentConfig.thinkingMode,
        role: agentConfig.role,
        collaborationEnabled: true,
        llm: {
          apiKey: process.env.OPENAI_API_KEY || 'demo-key',
          model: process.env.OPENAI_MODEL || 'gpt-4',
          baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
        }
      });

      const agentId = agentManager.registerAgent(agent, agentConfig.role);
      agent.enableCollaboration(agentManager);
      
      registeredAgents.push({ id: agentId, agent, config: agentConfig });
      console.log(`✅ ${agentConfig.name} (${agentConfig.role}): ${agentConfig.description}`);
    }

    // 创建需要多角色协作的任务
    const taskId = await agentManager.createCollaborativeTask(
      '开发一个创新的移动应用，包括市场研究、创意设计、技术实现和质量保证',
      { priority: 'high' }
    );

    console.log(`\n📋 创建复杂协作任务: ${taskId}`);
    
    // 执行任务
    try {
      const result = await agentManager.executeCollaborativeTask(taskId);
      console.log('✅ 专业化协作任务完成');
      console.log('📊 结果摘要:', result.summary);
    } catch (error) {
      console.error('❌ 任务执行失败:', error.message);
    }

    // 清理
    registeredAgents.forEach(({ id }) => {
      agentManager.unregisterAgent(id);
    });

    console.log('\n🎉 角色专业化示例完成！');

  } catch (error) {
    console.error('❌ 角色专业化示例失败:', error);
  }
}

/**
 * 动态任务分配示例
 */
async function dynamicTaskAssignmentExample() {
  console.log('\n⚡ 动态任务分配示例');
  console.log('==================\n');

  try {
    const agentManager = new AgentManager();

    // 创建多个通用Agent
    const agents = [];
    for (let i = 1; i <= 3; i++) {
      const agent = new Agent({
        name: `WorkerAgent${i}`,
        thinkingMode: 'react',
        role: 'worker',
        collaborationEnabled: true,
        llm: {
          apiKey: process.env.OPENAI_API_KEY || 'demo-key',
          model: process.env.OPENAI_MODEL || 'gpt-4',
          baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
        }
      });

      const agentId = agentManager.registerAgent(agent, 'worker');
      agent.enableCollaboration(agentManager);
      agents.push({ id: agentId, agent });
    }

    console.log(`✅ 创建了 ${agents.length} 个工作Agent`);

    // 创建多个任务
    const tasks = [
      '处理客户订单查询',
      '生成销售报告',
      '分析用户反馈',
      '更新产品信息',
      '检查系统状态'
    ];

    console.log('\n📋 创建多个任务...');
    const taskIds = [];
    
    for (const task of tasks) {
      const taskId = await agentManager.createCollaborativeTask(task, { priority: 'normal' });
      taskIds.push(taskId);
      console.log(`   - ${taskId}: ${task}`);
    }

    // 并行执行任务
    console.log('\n🚀 并行执行任务...');
    const startTime = Date.now();
    
    const promises = taskIds.map(async (taskId) => {
      try {
        const result = await agentManager.executeCollaborativeTask(taskId);
        return { taskId, success: true, result };
      } catch (error) {
        return { taskId, success: false, error: error.message };
      }
    });

    const results = await Promise.allSettled(promises);
    const endTime = Date.now();

    console.log(`\n⏱️ 任务执行完成 (耗时: ${endTime - startTime}ms)`);
    
    let successCount = 0;
    let failureCount = 0;
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const taskResult = result.value;
        if (taskResult.success) {
          successCount++;
          console.log(`✅ ${taskResult.taskId}: 成功`);
        } else {
          failureCount++;
          console.log(`❌ ${taskResult.taskId}: 失败 - ${taskResult.error}`);
        }
      } else {
        failureCount++;
        console.log(`❌ 任务执行异常: ${result.reason}`);
      }
    });

    console.log(`\n📊 执行统计: 成功 ${successCount} 个，失败 ${failureCount} 个`);

    // 清理
    agents.forEach(({ id }) => {
      agentManager.unregisterAgent(id);
    });

    console.log('\n🎉 动态任务分配示例完成！');

  } catch (error) {
    console.error('❌ 动态任务分配示例失败:', error);
  }
}

// 运行示例
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    await multiAgentCollaborationExample();
    await specializedRolesExample();
    await dynamicTaskAssignmentExample();
  })();
}

export { 
  multiAgentCollaborationExample, 
  specializedRolesExample, 
  dynamicTaskAssignmentExample 
}; 