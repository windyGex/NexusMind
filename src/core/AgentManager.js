import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

/**
 * Agent管理器
 * 管理多个智能体的协作、通信和任务分配
 */
export class AgentManager extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.agents = new Map();
    this.tasks = new Map();
    this.conversations = new Map();
    this.roles = new Map();
    
    this.config = {
      maxAgents: config.maxAgents || 10,
      taskTimeout: config.taskTimeout || 30000, // 30秒
      communicationTimeout: config.communicationTimeout || 10000, // 10秒
      retryAttempts: config.retryAttempts || 3,
      ...config
    };
    
    this.taskQueue = [];
    this.isProcessing = false;
  }

  /**
   * 注册Agent
   */
  registerAgent(agent, role = 'general') {
    if (this.agents.size >= this.config.maxAgents) {
      throw new Error(`已达到最大Agent数量限制: ${this.config.maxAgents}`);
    }

    const agentId = agent.name || `agent_${uuidv4()}`;
    
    const agentInfo = {
      id: agentId,
      agent,
      role,
      status: 'idle', // idle, busy, offline
      capabilities: this.extractCapabilities(agent),
      currentTask: null,
      taskHistory: [],
      communicationHistory: [],
      registeredAt: new Date(),
      lastActivity: new Date()
    };

    this.agents.set(agentId, agentInfo);
    
    // 初始化角色数组（如果不存在）
    if (!this.roles.has(role)) {
      this.roles.set(role, []);
    }
    this.roles.get(role).push(agentId);

    console.log(`Agent已注册: ${agentId} (角色: ${role})`);
    this.emit('agentRegistered', agentInfo);

    return agentId;
  }

  /**
   * 提取Agent能力
   */
  extractCapabilities(agent) {
    const capabilities = {
      tools: agent.tools ? agent.tools.listAvailable().map(t => t.name) : [],
      thinkingMode: agent.thinkingMode || 'cot',
      memorySize: agent.memory ? agent.memory.size() : 0,
      maxIterations: agent.maxIterations || 10
    };

    return capabilities;
  }

  /**
   * 注销Agent
   */
  unregisterAgent(agentId) {
    const agentInfo = this.agents.get(agentId);
    if (!agentInfo) {
      throw new Error(`Agent不存在: ${agentId}`);
    }

    // 清理相关数据
    this.agents.delete(agentId);
    
    // 从角色映射中移除
    const role = agentInfo.role;
    const roleAgents = this.roles.get(role);
    if (roleAgents) {
      const index = roleAgents.indexOf(agentId);
      if (index > -1) {
        roleAgents.splice(index, 1);
      }
      if (roleAgents.length === 0) {
        this.roles.delete(role);
      }
    }

    console.log(`Agent已注销: ${agentId}`);
    this.emit('agentUnregistered', agentInfo);

    return true;
  }

  /**
   * 创建协作任务
   */
  async createCollaborativeTask(taskDescription, options = {}) {
    const taskId = uuidv4();
    
    const task = {
      id: taskId,
      description: taskDescription,
      status: 'pending', // pending, in_progress, completed, failed
      assignedAgents: [],
      subtasks: [],
      dependencies: [],
      priority: options.priority || 'normal',
      deadline: options.deadline ? new Date(options.deadline) : null,
      createdAt: new Date(),
      startedAt: null,
      completedAt: null,
      result: null,
      error: null
    };

    this.tasks.set(taskId, task);
    this.taskQueue.push(taskId);

    console.log(`协作任务已创建: ${taskId}`);
    this.emit('taskCreated', task);

    return taskId;
  }

  /**
   * 分配任务给Agent
   */
  async assignTask(taskId, agentId, subtask = null) {
    const task = this.tasks.get(taskId);
    const agentInfo = this.agents.get(agentId);

    if (!task) {
      throw new Error(`任务不存在: ${taskId}`);
    }
    if (!agentInfo) {
      throw new Error(`Agent不存在: ${agentId}`);
    }
    if (agentInfo.status === 'busy') {
      throw new Error(`Agent正忙: ${agentId}`);
    }

    const assignment = {
      taskId,
      agentId,
      subtask,
      assignedAt: new Date(),
      status: 'assigned', // assigned, in_progress, completed, failed
      result: null,
      error: null
    };

    task.assignedAgents.push(assignment);
    agentInfo.currentTask = assignment;
    agentInfo.status = 'busy';
    agentInfo.lastActivity = new Date();

    console.log(`任务已分配: ${taskId} -> ${agentId}`);
    this.emit('taskAssigned', assignment);

    return assignment;
  }

  /**
   * 执行协作任务
   */
  async executeCollaborativeTask(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`任务不存在: ${taskId}`);
    }

    task.status = 'in_progress';
    task.startedAt = new Date();

    console.log(`开始执行协作任务: ${taskId}`);

    try {
      // 分析任务并分解为子任务
      const subtasks = await this.analyzeAndDecomposeTask(task);
      task.subtasks = subtasks;

      // 为每个子任务分配合适的Agent
      const assignments = await this.assignSubtasksToAgents(task, subtasks);

      // 执行子任务
      const results = await this.executeSubtasks(assignments);

      // 整合结果
      const finalResult = await this.integrateResults(task, results);

      task.status = 'completed';
      task.completedAt = new Date();
      task.result = finalResult;

      console.log(`协作任务完成: ${taskId}`);
      this.emit('taskCompleted', task);

      return finalResult;

    } catch (error) {
      task.status = 'failed';
      task.error = error.message;
      console.error(`协作任务失败: ${taskId}`, error);
      this.emit('taskFailed', task);
      throw error;
    }
  }

  /**
   * 分析和分解任务
   */
  async analyzeAndDecomposeTask(task) {
    // 这里可以使用LLM来分析任务并分解为子任务
    const subtasks = [
      {
        id: uuidv4(),
        description: `子任务1: ${task.description}`,
        type: 'analysis',
        priority: 'high',
        estimatedDuration: 5000
      },
      {
        id: uuidv4(),
        description: `子任务2: ${task.description}`,
        type: 'execution',
        priority: 'medium',
        estimatedDuration: 10000
      },
      {
        id: uuidv4(),
        description: `子任务3: ${task.description}`,
        type: 'integration',
        priority: 'low',
        estimatedDuration: 3000
      }
    ];

    return subtasks;
  }

  /**
   * 为子任务分配合适的Agent
   */
  async assignSubtasksToAgents(task, subtasks) {
    const assignments = [];
    const availableAgents = Array.from(this.agents.values())
      .filter(agent => agent.status === 'idle');

    for (let i = 0; i < subtasks.length; i++) {
      const subtask = subtasks[i];
      const agent = availableAgents[i % availableAgents.length];
      
      if (agent) {
        const assignment = await this.assignTask(task.id, agent.id, subtask);
        assignments.push(assignment);
      }
    }

    return assignments;
  }

  /**
   * 执行子任务
   */
  async executeSubtasks(assignments) {
    const results = [];
    const promises = assignments.map(async (assignment) => {
      try {
        const agentInfo = this.agents.get(assignment.agentId);
        const agent = agentInfo.agent;
        const subtask = assignment.subtask;

        assignment.status = 'in_progress';
        agentInfo.lastActivity = new Date();

        // 执行子任务
        const result = await agent.processInput(subtask.description, {
          taskType: subtask.type,
          priority: subtask.priority
        });

        assignment.status = 'completed';
        assignment.result = result;
        agentInfo.status = 'idle';
        agentInfo.currentTask = null;
        agentInfo.taskHistory.push(assignment);
        agentInfo.lastActivity = new Date();

        return { assignment, result };

      } catch (error) {
        assignment.status = 'failed';
        assignment.error = error.message;
        
        const agentInfo = this.agents.get(assignment.agentId);
        agentInfo.status = 'idle';
        agentInfo.currentTask = null;

        throw error;
      }
    });

    const completedResults = await Promise.allSettled(promises);
    
    completedResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        console.error(`子任务执行失败:`, result.reason);
      }
    });

    return results;
  }

  /**
   * 整合结果
   */
  async integrateResults(task, results) {
    // 这里可以实现结果整合逻辑
    const integratedResult = {
      taskId: task.id,
      originalDescription: task.description,
      subtaskResults: results.map(r => ({
        agentId: r.assignment.agentId,
        subtask: r.assignment.subtask,
        result: r.result
      })),
      summary: `协作任务完成，共执行了 ${results.length} 个子任务`,
      timestamp: new Date()
    };

    return integratedResult;
  }

  /**
   * Agent间通信
   */
  async sendMessage(fromAgentId, toAgentId, message, messageType = 'text') {
    const fromAgent = this.agents.get(fromAgentId);
    const toAgent = this.agents.get(toAgentId);

    if (!fromAgent || !toAgent) {
      throw new Error('发送方或接收方Agent不存在');
    }

    const messageObj = {
      id: uuidv4(),
      from: fromAgentId,
      to: toAgentId,
      content: message,
      type: messageType,
      timestamp: new Date(),
      status: 'sent'
    };

    // 记录通信历史
    fromAgent.communicationHistory.push(messageObj);
    toAgent.communicationHistory.push(messageObj);

    // 触发消息事件
    this.emit('messageSent', messageObj);

    // 如果接收方Agent支持消息处理，可以触发处理逻辑
    if (toAgent.agent.onMessage) {
      try {
        await toAgent.agent.onMessage(messageObj);
        messageObj.status = 'delivered';
      } catch (error) {
        messageObj.status = 'failed';
        messageObj.error = error.message;
      }
    }

    return messageObj;
  }

  /**
   * 广播消息给所有Agent
   */
  async broadcastMessage(fromAgentId, message, messageType = 'broadcast') {
    const fromAgent = this.agents.get(fromAgentId);
    if (!fromAgent) {
      throw new Error('发送方Agent不存在');
    }

    const messageObj = {
      id: uuidv4(),
      from: fromAgentId,
      to: 'all',
      content: message,
      type: messageType,
      timestamp: new Date(),
      status: 'broadcast'
    };

    // 记录到发送方历史
    fromAgent.communicationHistory.push(messageObj);

    // 广播给所有其他Agent
    const promises = Array.from(this.agents.values())
      .filter(agent => agent.id !== fromAgentId)
      .map(async (agent) => {
        agent.communicationHistory.push(messageObj);
        if (agent.agent.onMessage) {
          try {
            await agent.agent.onMessage(messageObj);
          } catch (error) {
            console.error(`广播消息处理失败: ${agent.id}`, error);
          }
        }
      });

    await Promise.allSettled(promises);
    this.emit('messageBroadcast', messageObj);

    return messageObj;
  }

  /**
   * 获取Agent状态
   */
  getAgentStatus(agentId) {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return null;
    }

    return {
      id: agent.id,
      role: agent.role,
      status: agent.status,
      currentTask: agent.currentTask,
      capabilities: agent.capabilities,
      lastActivity: agent.lastActivity,
      taskHistory: agent.taskHistory.length,
      communicationHistory: agent.communicationHistory.length
    };
  }

  /**
   * 获取所有Agent状态
   */
  getAllAgentStatus() {
    return Array.from(this.agents.keys()).map(id => this.getAgentStatus(id));
  }

  /**
   * 获取任务状态
   */
  getTaskStatus(taskId) {
    return this.tasks.get(taskId);
  }

  /**
   * 获取所有任务状态
   */
  getAllTaskStatus() {
    return Array.from(this.tasks.values());
  }

  /**
   * 获取管理器统计信息
   */
  getStats() {
    const agents = Array.from(this.agents.values());
    const tasks = Array.from(this.tasks.values());

    return {
      totalAgents: agents.length,
      activeAgents: agents.filter(a => a.status === 'idle').length,
      busyAgents: agents.filter(a => a.status === 'busy').length,
      totalTasks: tasks.length,
      pendingTasks: tasks.filter(t => t.status === 'pending').length,
      inProgressTasks: tasks.filter(t => t.status === 'in_progress').length,
      completedTasks: tasks.filter(t => t.status === 'completed').length,
      failedTasks: tasks.filter(t => t.status === 'failed').length,
      roles: Array.from(this.roles.keys()),
      queueLength: this.taskQueue.length
    };
  }

  /**
   * 清理完成的任务
   */
  cleanupCompletedTasks() {
    const completedTasks = Array.from(this.tasks.values())
      .filter(task => task.status === 'completed' || task.status === 'failed');

    completedTasks.forEach(task => {
      this.tasks.delete(task.id);
    });

    console.log(`清理了 ${completedTasks.length} 个已完成的任务`);
    return completedTasks.length;
  }

  /**
   * 重置管理器
   */
  reset() {
    this.agents.clear();
    this.tasks.clear();
    this.conversations.clear();
    this.roles.clear();
    this.taskQueue = [];
    this.isProcessing = false;
    
    console.log('Agent管理器已重置');
  }
} 