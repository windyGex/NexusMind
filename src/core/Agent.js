import { MemoryManager } from './MemoryManager.js';
import { LLMClient } from './LLMClient.js';
import { ToolRegistry } from './ToolRegistry.js';
import { DecisionEngine } from './DecisionEngine.js';
import { ToolSelector } from './ToolSelector.js';

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
    this.toolSelector = new ToolSelector(config.toolSelector);
    
    this.maxIterations = config.maxIterations || 10;
    this.thinkingMode = config.thinkingMode || 'decision'; // 'cot', 'react', or 'decision'
    
    this.conversationHistory = [];
    this.currentTask = null;
    
    // MCP相关属性
    this.mcpServerManager = null;
    this.availableMCPTools = [];
    
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

      // 更新MCP工具列表
      await this.updateMCPTools();
      
      // 根据思考模式选择决策方法
      let response;
      if (this.thinkingMode === 'cot') {
        response = await this.chainOfThought(userInput, context);
      } else if (this.thinkingMode === 'react') {
        response = await this.reactMethod(userInput, context);
      } else {
        // 使用DecisionEngine进行智能决策
        response = await this.decisionBasedMethod(userInput, context);
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
   * 基于DecisionEngine的智能决策方法
   */
  async decisionBasedMethod(userInput, context) {
    try {
      console.log('🧠 使用DecisionEngine进行智能决策...');
      
      // 使用DecisionEngine进行决策
      const decision = await this.decisionEngine.makeDecision(userInput, {
        ...context,
        availableTools: this.tools.listAvailable(),
        memory: this.memory.getRelevant(userInput, 5),
        conversationHistory: this.conversationHistory.slice(-5),
        // 传递MCP工具执行能力
        executeMCPTool: this.executeMCPTool.bind(this)
      });

      // 从决策结果中提取最终答案
      let finalResponse = '';
      
      if (decision.finalDecision) {
        // 如果有最终决策，使用它
        finalResponse = decision.finalDecision;
      } else if (decision.steps && decision.steps.length > 0) {
        // 从执行步骤中提取结果
        const executionStep = decision.steps.find(step => step.type === 'execution');
        if (executionStep && executionStep.content) {
          const executionResult = executionStep.content;
          if (typeof executionResult === 'object' && executionResult.summary) {
            finalResponse = executionResult.summary.summary;
          } else if (typeof executionResult === 'string') {
            finalResponse = executionResult;
          }
        }
      }

      // 如果没有明确的最终答案，从评估步骤中提取
      if (!finalResponse) {
        const evaluationStep = decision.steps.find(step => step.type === 'evaluation');
        if (evaluationStep && evaluationStep.content) {
          finalResponse = evaluationStep.content;
        }
      }

      // 如果还是没有答案，使用默认响应
      if (!finalResponse) {
        finalResponse = '我已经分析了您的问题，但无法提供明确的答案。';
      }

      // 记录决策过程到记忆
      this.memory.add('reasoning', {
        type: 'decision_engine',
        task: this.currentTask,
        decision: decision,
        timestamp: new Date()
      });

      console.log('✅ DecisionEngine决策完成');
      return finalResponse;

    } catch (error) {
      console.error('DecisionEngine决策失败:', error);
      // 降级到ReAct方法
      return await this.reactMethod(userInput, context);
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
      const parsed = await this.parseReActResponse(thought);
      if (parsed.finalAnswer) { 
        finalAnswer = parsed.finalAnswer;
        break;
      }
      if (parsed.shouldStop) {
        break;
      }
      if (parsed.action) {
        // 执行工具调用
        try {
          const toolResult = await this.tools.execute(parsed.action, parsed.args);
          currentThought += `\n思考: ${parsed.reasoning}\n行动: ${parsed.action}(${JSON.stringify(parsed.args)})\n观察: ${JSON.stringify(toolResult)}\n`;
        } catch (error) {
          console.error('execute tool error', error);
          currentThought += `\n思考: ${parsed.reasoning}\n行动: ${parsed.action}(${JSON.stringify(parsed.args)})\n观察: 错误 - ${error.message}\n`;
        }
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
    const availableTools = this.tools.listAvailable();
    
    return `你是一个智能助手，具备强大的推理能力和丰富的知识。请仔细分析用户的问题，并给出详细、准确的回答。

你的能力包括：
- 数学计算和逻辑推理
- 时间查询和日期处理
- 文件操作和系统管理
- 网络搜索和信息获取
- 智能决策和问题解决

相关记忆:
${memory.map(m => `- ${m.content}`).join('\n')}

可用工具:
${availableTools.map(tool => `- ${tool.name}: ${tool.description}`).join('\n')}

当前上下文:
${JSON.stringify(context, null, 2)}

用户问题: ${userInput}

请按照以下步骤进行回答：

1. **问题分析**: 仔细理解用户的问题，识别核心需求
2. **信息收集**: 从记忆和上下文中收集相关信息
3. **推理过程**: 进行逻辑推理，考虑各种可能性
4. **工具选择**: 如果需要，选择合适的工具来辅助回答
5. **答案构建**: 基于推理和工具结果，构建完整答案
6. **质量检查**: 确保答案准确、完整、有用

请按照以下格式回答:
思考: [详细的推理过程，包括问题分析、信息收集、逻辑推理等]
回答: [清晰、准确、有用的最终答案]`;
  }

  /**
   * 构建ReAct提示
   */
  buildReActPrompt(userInput, context, currentThought, iteration) {
    const memory = this.memory.getRelevant(userInput, 3);
    const availableTools = this.tools.listAvailable();

    return `你是一个智能助手，具备强大的推理和行动能力。你可以使用工具来完成任务，并能够进行多步骤的推理。

你的核心能力：
- 深度推理：分析问题本质，制定解决方案
- 工具使用：选择合适的工具，正确传递参数
- 结果整合：将工具结果与推理结合，形成完整答案
- 错误处理：识别问题，调整策略，确保任务完成

相关记忆:
${memory.map(m => `- ${m.content}`).join('\n')}

可用工具:
${availableTools.map(tool => `- ${tool.name}: ${tool.description}`).join('\n')}

当前上下文:
${JSON.stringify(context, null, 2)}

用户问题: ${userInput}

${currentThought ? `之前的思考过程:\n${currentThought}\n` : ''}

当前迭代: ${iteration}/${this.maxIterations}

请按照以下步骤进行：

1. **问题分析**: 理解用户需求，识别任务类型
2. **策略制定**: 确定是否需要使用工具，选择最佳方案
3. **工具选择**: 如果需要工具，选择最合适的工具
4. **参数设计**: 为工具调用设计正确的参数
5. **结果评估**: 评估当前结果是否满足用户需求
6. **下一步决策**: 决定是否需要继续迭代或给出最终答案

请按照以下格式回答:
思考: [详细的推理过程，包括问题分析、策略制定、工具选择理由等]
行动: [工具名称] 或 无
参数: [工具参数，JSON格式] 或 无
最终答案: [如果任务完成，给出完整、准确的最终答案] 或 无
是否停止: [true/false]

重要提示：
- 优先考虑用户的核心需求
- 工具参数必须是有效的JSON格式
- 最终答案应该完整、准确、有用
- 如果无法完成任务，请说明原因
- 避免无限循环，合理使用迭代次数
- 注意：MCP工具的名称格式为 "服务器ID:工具名称"，例如 "amap:maps_weather"`;
  }

  /**
   * 解析ReAct响应
   */
  async parseReActResponse(response) {
    console.log('response', response);
    
    // 使用大模型来提取结构化信息
    const prompt = `请从以下ReAct响应中提取结构化信息。请仔细分析响应内容，并按照指定格式输出。

响应内容:
${response}

请提取以下信息并以JSON格式返回：

1. reasoning: 思考过程（字符串）
2. action: 要执行的工具名称，如果没有则为null（字符串或null）
3. args: 工具参数，JSON对象格式，如果没有则为null（对象或null）
4. finalAnswer: 最终答案，如果没有则为null（字符串或null）
5. shouldStop: 是否应该停止迭代（布尔值）

** 示例返回 **

{
  "reasoning": "思考过程",
  "action": "工具名称",
  "args": "工具参数",
  "finalAnswer": "最终答案",
  "shouldStop": true
}

注意事项：
- 如果响应中没有明确提到工具调用，action和args应该为null
- 如果响应中提到"无"、"没有"等表示不执行工具的词，action应该为null
- args必须是有效的JSON对象格式
- shouldStop为true表示应该停止当前迭代
- finalAnswer只有在任务完成时才提供

请只返回JSON格式的结果，不要包含其他内容。`;

    try {
      const llmResponse = await this.llm.generate(prompt, {
        temperature: 0.1,
        max_tokens: 8000,
      });

      console.log('llmResponse', llmResponse);

      // 尝试解析JSON响应
      let parsedResult;
      try {
        // 提取JSON部分
        parsedResult = JSON.parse(llmResponse.content);
      } catch (parseError) {
        console.error('JSON解析失败，使用备用解析方法:', parseError);
        // 备用解析方法
        return this.fallbackParseReActResponse(response);
      }

      console.log('parsed', parsedResult);
      return parsedResult;

    } catch (error) {
      console.error('LLM解析失败，使用备用解析方法:', error);
      return this.fallbackParseReActResponse(response);
    }
  }

  /**
   * 将MCP工具的inputSchema转换为ToolRegistry期望的parameters格式
   */
  convertMCPInputSchemaToParameters(inputSchema) {
    if (!inputSchema || !inputSchema.properties) {
      return {};
    }

    const parameters = {};
    
    for (const [paramName, paramDef] of Object.entries(inputSchema.properties)) {
      parameters[paramName] = {
        type: paramDef.type || 'string',
        description: paramDef.description || `参数: ${paramName}`,
        optional: !inputSchema.required || !inputSchema.required.includes(paramName)
      };

      // 如果有枚举值，添加枚举
      if (paramDef.enum) {
        parameters[paramName].enum = paramDef.enum;
      }
    }

    return parameters;
  }

  /**
   * 备用解析方法（原有的基于行的解析）
   */
  fallbackParseReActResponse(response) {
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
    const allTools = this.getAllAvailableTools();
    return {
      name: this.name,
      thinkingMode: this.thinkingMode,
      memorySize: this.memory.size(),
      conversationHistoryLength: this.conversationHistory.length,
      currentTask: this.currentTask,
      availableTools: allTools.total,
      localTools: allTools.local.length,
      mcpTools: allTools.mcp.length,
      decisionStats: this.decisionEngine.getStats()
    };
  }

  /**
   * 获取决策历史
   */
  getDecisionHistory(limit = 5) {
    return this.decisionEngine.getDecisionHistory(limit);
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
    this.decisionEngine.clearHistory();
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

  /**
   * 设置MCP服务器管理器
   */
  setMCPServerManager(serverManager) {
    this.mcpServerManager = serverManager;
    console.log('🔗 MCP服务器管理器已设置');
  }

  /**
   * 更新MCP工具列表
   */
  async updateMCPTools() {
    if (!this.mcpServerManager) {
      return;
    }

    try {
      this.availableMCPTools = this.mcpServerManager.getAllTools();
      console.log(`📋 更新了 ${this.availableMCPTools.length} 个MCP工具`);
      
      // 将MCP工具注册到本地工具注册表
      await this.registerMCPToolsToLocal();
    } catch (error) {
      console.error('❌ 更新MCP工具失败:', error);
    }
  }

  /**
   * 将MCP工具注册到本地工具注册表
   */
  async registerMCPToolsToLocal() {
    if (!this.availableMCPTools || this.availableMCPTools.length === 0) {
      return;
    }

    let registeredCount = 0;
    for (const mcpTool of this.availableMCPTools) {
      try {
        // 检查工具是否已经注册
        const existingTool = this.tools.getTool(mcpTool.name);
        if (existingTool) {
          // 如果工具已存在，先删除再重新注册
          this.tools.unregisterTool(mcpTool.name);
        }

        // 注册MCP工具到本地工具注册表
        const toolId = `${mcpTool.serverId}:${mcpTool.name}`;
        this.tools.registerTool(toolId, {
          name: mcpTool.name,
          description: mcpTool.description || `MCP工具: ${mcpTool.name}`,
          category: 'mcp',
          parameters: this.convertMCPInputSchemaToParameters(mcpTool.inputSchema),
          execute: async (args) => {
            // 调用MCP工具执行器
            return await this.executeMCPTool(toolId, args);
          },
          // 添加MCP相关元数据
          mcpMetadata: {
            serverId: mcpTool.serverId,
            serverName: mcpTool.serverName,
            toolId: toolId,
            type: 'mcp'
          }
        });

        registeredCount++;
        console.log(`✅ 已注册MCP工具: ${mcpTool.name}`);
      } catch (error) {
        console.error(`❌ 注册MCP工具失败 ${mcpTool.name}:`, error);
      }
    }

    console.log(`📋 成功注册了 ${registeredCount} 个MCP工具到本地工具注册表`);
  }

  /**
   * 智能选择MCP工具
   */
  async selectMCPTools(taskDescription, context = {}) {
    if (!this.mcpServerManager || this.availableMCPTools.length === 0) {
      return [];
    }

    try {
      const selectedTools = await this.toolSelector.selectTools(
        taskDescription,
        this.availableMCPTools,
        {
          ...context,
          llm: this.llm
        }
      );

      console.log(`🎯 为任务选择了 ${selectedTools.length} 个MCP工具`);
      return selectedTools;
    } catch (error) {
      console.error('❌ 选择MCP工具失败:', error);
      return [];
    }
  }

  /**
   * 执行MCP工具
   */
  async executeMCPTool(toolId, args = {}) {
    if (!this.mcpServerManager) {
      throw new Error('MCP服务器管理器未设置');
    }

    const startTime = Date.now();
    try {
      const result = await this.mcpServerManager.executeTool(toolId, args);
      
      // 记录工具使用结果
      this.toolSelector.recordToolUsage(toolId, result.success, Date.now() - startTime);
      
      return result;
    } catch (error) {
      this.toolSelector.recordToolUsage(toolId, false, Date.now() - startTime);
      throw error;
    }
  }

  /**
   * 获取MCP工具统计
   */
  getMCPToolStats() {
    if (!this.mcpServerManager) {
      return null;
    }

    const allTools = this.getAllAvailableTools();
    return {
      serverStats: this.mcpServerManager.getStats(),
      toolUsageStats: this.toolSelector.getToolUsageStats(),
      taskPatternStats: this.toolSelector.getTaskPatternStats(),
      registeredMCPTools: allTools.mcp.length,
      totalMCPTools: this.availableMCPTools.length,
      registrationStatus: allTools.mcp.length === this.availableMCPTools.length ? 'complete' : 'partial'
    };
  }

  /**
   * 检查MCP工具注册状态
   */
  getMCPToolRegistrationStatus() {
    if (!this.mcpServerManager) {
      return {
        status: 'no_server',
        message: 'MCP服务器管理器未设置'
      };
    }

    const allTools = this.getAllAvailableTools();
    const registeredCount = allTools.mcp.length;
    const totalCount = this.availableMCPTools.length;

    if (totalCount === 0) {
      return {
        status: 'no_tools',
        message: '没有可用的MCP工具'
      };
    }

    if (registeredCount === totalCount) {
      return {
        status: 'complete',
        message: `所有MCP工具已注册 (${registeredCount}/${totalCount})`,
        registered: registeredCount,
        total: totalCount
      };
    } else {
      return {
        status: 'partial',
        message: `部分MCP工具已注册 (${registeredCount}/${totalCount})`,
        registered: registeredCount,
        total: totalCount
      };
    }
  }

  /**
   * 获取所有可用工具（包括本地工具和MCP工具）
   */
  getAllAvailableTools() {
    // 获取本地工具注册表中的所有工具（包括已注册的MCP工具）
    const allTools = this.tools.listAvailable();
    
    // 按类型分类
    const categorizedTools = {
      local: [],
      mcp: []
    };

    allTools.forEach(tool => {
      const toolInfo = this.tools.getTool(tool.name);
      if (toolInfo && toolInfo.mcpMetadata) {
        // 这是已注册的MCP工具
        categorizedTools.mcp.push({
          ...tool,
          type: 'mcp',
          serverId: toolInfo.mcpMetadata.serverId,
          serverName: toolInfo.mcpMetadata.serverName
        });
      } else {
        // 这是本地工具
        categorizedTools.local.push({
          ...tool,
          type: 'local'
        });
      }
    });

    return {
      all: allTools,
      local: categorizedTools.local,
      mcp: categorizedTools.mcp,
      total: allTools.length
    };
  }
} 