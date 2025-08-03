import { MemoryManager } from './MemoryManager.js';
import { LLMClient } from './LLMClient.js';
import { ToolRegistry } from './ToolRegistry.js';
import { DecisionEngine } from './DecisionEngine.js';

/**
 * 自主智能体核心类
 * 支持CoT和ReAct决策方法，集成短期记忆和工具调用
 */
export class Agent {
  constructor(config = {}) {
    this.name = config.name || 'AutoAgent';
    this.memory = new MemoryManager(config.memory);
    this.llm = new LLMClient(config.llm);
    this.tools = new ToolRegistry();
    this.decisionEngine = new DecisionEngine(this.llm, this.tools);
    
    this.maxIterations = config.maxIterations || 10;
    this.thinkingMode = config.thinkingMode || 'react'; // 'cot' or 'react'
    
    this.conversationHistory = [];
    this.currentTask = null;
    
    // 协作相关属性
    this.collaborationEnabled = config.collaborationEnabled || false;
    this.agentManager = null;
    this.role = config.role || 'general';
    this.collaborationHistory = [];
    this.peerAgents = new Map();
  }

  /**
   * 处理用户输入并生成响应
   */
  async processInput(userInput, context = {}) {
    try {
      // 记录输入到记忆
      this.memory.add('conversation', {
        type: 'user_input',
        content: userInput,
        timestamp: new Date(),
        context
      });

      // 更新对话历史
      this.conversationHistory.push({
        role: 'user',
        content: userInput,
        timestamp: new Date()
      });

      // 设置当前任务
      this.currentTask = {
        input: userInput,
        context,
        startTime: new Date(),
        iterations: 0
      };

      // 根据思考模式选择决策方法
      let response;
      if (this.thinkingMode === 'cot') {
        response = await this.chainOfThought(userInput, context);
      } else {
        response = await this.reactMethod(userInput, context);
      }

      // 记录响应到记忆
      this.memory.add('conversation', {
        type: 'agent_response',
        content: response,
        timestamp: new Date(),
        task: this.currentTask
      });

      // 更新对话历史
      this.conversationHistory.push({
        role: 'assistant',
        content: response,
        timestamp: new Date()
      });

      return response;

    } catch (error) {
      console.error('Agent processing error:', error);
      return `抱歉，处理您的请求时出现了错误: ${error.message}`;
    }
  }

  /**
   * Chain of Thought (CoT) 决策方法
   */
  async chainOfThought(userInput, context) {
    const prompt = this.buildCoTPrompt(userInput, context);
    
    const response = await this.llm.generate(prompt, {
      temperature: 0.7,
      max_tokens: 1000
    });

    return response.content;
  }

  /**
   * ReAct (Reasoning + Acting) 决策方法
   */
  async reactMethod(userInput, context) {
    let currentThought = '';
    let finalAnswer = '';
    let iteration = 0;

    while (iteration < this.maxIterations) {
      iteration++;
      this.currentTask.iterations = iteration;

      // 构建ReAct提示
      const prompt = this.buildReActPrompt(userInput, context, currentThought, iteration);
      
      // 获取LLM响应
      const response = await this.llm.generate(prompt, {
        temperature: 0.3,
        max_tokens: 1500
      });

      const thought = response.content;

      // 解析思考过程
      const parsed = this.parseReActResponse(thought);
      if (parsed.action) {
        // 执行工具调用
        try {
          const toolResult = await this.tools.execute(parsed.action, parsed.args);
          currentThought += `\n思考: ${parsed.reasoning}\n行动: ${parsed.action}(${JSON.stringify(parsed.args)})\n观察: ${JSON.stringify(toolResult)}\n`;
        } catch (error) {
          currentThought += `\n思考: ${parsed.reasoning}\n行动: ${parsed.action}(${JSON.stringify(parsed.args)})\n观察: 错误 - ${error.message}\n`;
        }
      }

      console.log('currentThought', currentThought);

      if (parsed.finalAnswer) {
        finalAnswer = parsed.finalAnswer;
        break;
      }

      // 检查是否应该停止
      if (parsed.shouldStop) {
        finalAnswer = parsed.reasoning || '我无法完成这个任务。';
        break;
      }
    }

    // 记录思考过程到记忆
    this.memory.add('reasoning', {
      type: 'react_thought',
      task: this.currentTask,
      thoughts: currentThought,
      iterations: iteration,
      timestamp: new Date()
    });

    return finalAnswer || '我无法完成这个任务。';
  }

  /**
   * 构建CoT提示
   */
  buildCoTPrompt(userInput, context) {
    const memory = this.memory.getRelevant(userInput, 5);
    
    return `你是一个智能助手。请仔细思考用户的问题，然后给出详细的回答。

相关记忆:
${memory.map(m => `- ${m.content}`).join('\n')}

当前上下文:
${JSON.stringify(context, null, 2)}

用户问题: ${userInput}

请按照以下格式回答:
思考: [你的推理过程]
回答: [你的最终答案]`;
  }

  /**
   * 构建ReAct提示
   */
  buildReActPrompt(userInput, context, currentThought, iteration) {
    const memory = this.memory.getRelevant(userInput, 3);
    const availableTools = this.tools.listAvailable();
    
    return `你是一个智能助手，可以使用工具来完成任务。

相关记忆:
${memory.map(m => `- ${m.content}`).join('\n')}

可用工具:
${availableTools.map(tool => `- ${tool.name}: ${tool.description}`).join('\n')}

当前上下文:
${JSON.stringify(context, null, 2)}

用户问题: ${userInput}

${currentThought ? `之前的思考过程:\n${currentThought}\n` : ''}

请按照以下格式回答:
思考: [你的推理过程]
行动: [工具名称] 或 无
参数: [工具参数，JSON格式] 或 无
最终答案: [如果任务完成，给出最终答案] 或 无
是否停止: [true/false]

注意:
- 如果任务完成，请给出最终答案并设置是否停止为true
- 如果需要使用工具，请指定行动和参数
- 如果无法完成任务，请说明原因并设置是否停止为true`;
  }

  /**
   * 解析ReAct响应
   */
  parseReActResponse(response) {
    const lines = response.split('\n');
    let reasoning = '';
    let action = null;
    let args = null;
    let finalAnswer = null;
    let shouldStop = false;

    for (const line of lines) {
      if (line.startsWith('思考:')) {
        reasoning = line.replace('思考:', '').trim();
      } else if (line.startsWith('行动:')) {
        const actionText = line.replace('行动:', '').trim();
        action = actionText === '无' ? null : actionText;
      } else if (line.startsWith('参数:')) {
        const argsText = line.replace('参数:', '').trim();
        if (argsText !== '无') {
          try {
            args = JSON.parse(argsText);
          } catch (e) {
            args = argsText;
          }
        }
      } else if (line.startsWith('最终答案:')) {
        const answerText = line.replace('最终答案:', '').trim();
        finalAnswer = answerText === '无' ? null : answerText;
      } else if (line.startsWith('是否停止:')) {
        shouldStop = line.replace('是否停止:', '').trim().toLowerCase() === 'true';
      }
    }

    return {
      reasoning,
      action,
      args,
      finalAnswer,
      shouldStop
    };
  }

  /**
   * 获取智能体状态
   */
  getStatus() {
    return {
      name: this.name,
      thinkingMode: this.thinkingMode,
      memorySize: this.memory.size(),
      conversationHistoryLength: this.conversationHistory.length,
      currentTask: this.currentTask,
      availableTools: this.tools.listAvailable().length
    };
  }

  /**
   * 重置智能体状态
   */
  reset() {
    this.conversationHistory = [];
    this.currentTask = null;
    this.memory.clear();
    this.collaborationHistory = [];
    this.peerAgents.clear();
  }

  /**
   * 启用协作模式
   */
  enableCollaboration(agentManager) {
    this.collaborationEnabled = true;
    this.agentManager = agentManager;
    console.log(`Agent ${this.name} 已启用协作模式`);
  }

  /**
   * 禁用协作模式
   */
  disableCollaboration() {
    this.collaborationEnabled = false;
    this.agentManager = null;
    console.log(`Agent ${this.name} 已禁用协作模式`);
  }

  /**
   * 处理来自其他Agent的消息
   */
  async onMessage(message) {
    if (!this.collaborationEnabled) {
      return;
    }

    this.collaborationHistory.push({
      ...message,
      receivedAt: new Date()
    });

    // 根据消息类型处理
    switch (message.type) {
      case 'task_request':
        await this.handleTaskRequest(message);
        break;
      case 'data_share':
        await this.handleDataShare(message);
        break;
      case 'coordination':
        await this.handleCoordination(message);
        break;
      case 'broadcast':
        await this.handleBroadcast(message);
        break;
      default:
        console.log(`Agent ${this.name} 收到消息: ${message.content}`);
    }
  }

  /**
   * 处理任务请求
   */
  async handleTaskRequest(message) {
    const { content, from } = message;
    
    // 记录到记忆
    this.memory.add('collaboration', {
      type: 'task_request',
      from,
      content,
      timestamp: new Date()
    });

    // 如果当前Agent空闲，可以接受任务
    if (!this.currentTask) {
      const response = await this.processInput(content, {
        context: 'task_request',
        from: from
      });

      // 发送响应
      if (this.agentManager) {
        await this.agentManager.sendMessage(this.name, from, response, 'task_response');
      }
    }
  }

  /**
   * 处理数据共享
   */
  async handleDataShare(message) {
    const { content, from } = message;
    
    // 将共享的数据添加到记忆
    this.memory.add('collaboration', {
      type: 'data_share',
      from,
      content,
      timestamp: new Date()
    });

    console.log(`Agent ${this.name} 收到来自 ${from} 的数据共享`);
  }

  /**
   * 处理协调消息
   */
  async handleCoordination(message) {
    const { content, from } = message;
    
    // 记录协调信息
    this.memory.add('collaboration', {
      type: 'coordination',
      from,
      content,
      timestamp: new Date()
    });

    console.log(`Agent ${this.name} 收到来自 ${from} 的协调消息`);
  }

  /**
   * 处理广播消息
   */
  async handleBroadcast(message) {
    const { content, from } = message;
    
    // 记录广播消息
    this.memory.add('collaboration', {
      type: 'broadcast',
      from,
      content,
      timestamp: new Date()
    });

    console.log(`Agent ${this.name} 收到来自 ${from} 的广播: ${content}`);
  }

  /**
   * 向其他Agent发送消息
   */
  async sendMessage(toAgentId, content, messageType = 'text') {
    if (!this.collaborationEnabled || !this.agentManager) {
      throw new Error('协作模式未启用');
    }

    return await this.agentManager.sendMessage(this.name, toAgentId, content, messageType);
  }

  /**
   * 广播消息给所有Agent
   */
  async broadcastMessage(content, messageType = 'broadcast') {
    if (!this.collaborationEnabled || !this.agentManager) {
      throw new Error('协作模式未启用');
    }

    return await this.agentManager.broadcastMessage(this.name, content, messageType);
  }

  /**
   * 请求其他Agent协助
   */
  async requestAssistance(toAgentId, request) {
    return await this.sendMessage(toAgentId, request, 'task_request');
  }

  /**
   * 共享数据给其他Agent
   */
  async shareData(toAgentId, data) {
    return await this.sendMessage(toAgentId, data, 'data_share');
  }

  /**
   * 获取协作统计信息
   */
  getCollaborationStats() {
    return {
      collaborationEnabled: this.collaborationEnabled,
      role: this.role,
      collaborationHistoryLength: this.collaborationHistory.length,
      peerAgentsCount: this.peerAgents.size,
      collaborationMemories: this.memory.getByType('collaboration').length
    };
  }
} 