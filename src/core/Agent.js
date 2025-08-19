import { MemoryManager } from './MemoryManager.js';
import { LLMClient } from './LLMClient.js';
import { ToolRegistry } from './ToolRegistry.js';
import { ToolSelector } from './ToolSelector.js';
import logger from '../../utils/logger.js';

/**
 * 自主智能体核心类
 * 支持ReAct决策方法，集成短期记忆和工具调用
 */
export class Agent {
  constructor(config = {}) {
    this.name = config.name || 'AutoAgent';
    this.memory = new MemoryManager(config.memory);
    this.llm = new LLMClient(config.llm);
    this.tools = new ToolRegistry();
    this.toolSelector = new ToolSelector(config.toolSelector);
    
    this.maxIterations = config.maxIterations || 10;
    this.thinkingMode = config.thinkingMode || 'react'; // 支持 'react' 和 'plan_solve' 模式
    this.planSolveConfig = config.planSolve || {
      maxPlanSteps: 8,
      enablePlanRefinement: true,
      detailedReasoning: true
    };
    
    this.conversationHistory = [];
    this.currentTask = null;
    this.currentPlan = null; // 用于存储Plan & Solve模式的计划
    
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
      
      // 根据思维模式选择处理方法
      let response;
      switch (this.thinkingMode) {
        case 'plan_solve':
          response = await this.planSolveMethod(userInput, context);
          break;
        case 'react':
        default:
          response = await this.reactMethod(userInput, context);
          break;
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
      logger.error('Agent processing error:', error);
      
      // 检查是否是被中止的错误
      if (error.message === '任务已被用户中止') {
        throw error; // 重新抛出中止错误
      }
      
      return `抱歉，处理您的请求时出现了错误: ${error.message}`;
    }
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

      logger.debug('ReAct prompt:', prompt);
      
      // 获取LLM响应
      const response = await this.llm.generate(prompt, {
        temperature: 0.3,
        max_tokens: 30000,
        conversationHistory: this.conversationHistory
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
          // 确保参数格式正确
          let toolArgs = parsed.args;
          if (toolArgs && typeof toolArgs === 'object') {
            // 如果args是对象，直接使用
            toolArgs = { ...toolArgs };
          } else if (toolArgs && typeof toolArgs === 'string') {
            // 如果args是字符串，尝试解析为JSON
            try {
              toolArgs = JSON.parse(toolArgs);
            } catch (error) {
              // 如果解析失败，将其作为query参数
              toolArgs = { query: toolArgs };
            }
          } else {
            // 如果没有args，使用空对象
            toolArgs = {};
          }
          
          logger.debug(`执行工具: ${parsed.action}, 参数:`, toolArgs);
          const actualToolId = this.mapToolName(parsed.action);
          const toolResult = await this.tools.execute(actualToolId, toolArgs);
          logger.debug('Tool execution result:', toolResult);
          currentThought += `\n思考: ${parsed.reasoning}\n行动: ${parsed.action}(${JSON.stringify(toolArgs)})\n观察: 工具执行结果-${JSON.stringify(toolResult)}\n`;
        } catch (error) {
          logger.error('Execute tool error:', error);
          
          // 检查是否是被中止的错误
          if (error.message === '任务已被用户中止') {
            throw error; // 重新抛出中止错误
          }
          
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
   * Plan & Solve 决策方法
   * 先制定详细计划，再按步骤执行
   */
  async planSolveMethod(userInput, context) {
    logger.info(`🧠 启动Plan & Solve模式处理: ${userInput}`);
    
    try {
      // 阶段1: 分析任务
      const taskAnalysis = await this.analyzeTask(userInput, context);
      logger.debug('任务分析完成:', taskAnalysis);

      // 阶段2: 制定计划
      const plan = await this.createPlan(userInput, context, taskAnalysis);
      this.currentPlan = plan;
      logger.debug('计划制定完成:', plan);

      // 阶段3: 执行计划
      const executionResult = await this.executePlan(plan, userInput, context);
      logger.debug('计划执行完成:', executionResult);

      // 阶段4: 评估结果
      const finalResult = await this.evaluateResult(userInput, executionResult, plan);
      logger.debug('结果评估完成:', finalResult);

      // 记录Plan & Solve思考过程到记忆
      this.memory.add('reasoning', {
        type: 'plan_solve_process',
        task: this.currentTask,
        analysis: taskAnalysis,
        plan: plan,
        execution: executionResult,
        evaluation: finalResult,
        timestamp: new Date()
      });

      return finalResult.finalAnswer || '我无法完成这个任务。';

    } catch (error) {
      logger.error('Plan & Solve处理错误:', error);
      
      // 检查是否是被中止的错误
      if (error.message === '任务已被用户中止') {
        throw error;
      }
      
      return `抱歉，在使用Plan & Solve模式处理您的请求时出现了错误: ${error.message}`;
    }
  }

  /**
   * 任务分析阶段
   */
  async analyzeTask(userInput, context) {
    const availableTools = this.tools.listAvailable();
    const memory = this.memory.getRelevant(userInput, 3);
    
    const analysisPrompt = `请分析以下任务并返回严格的JSON格式分析，不要包含任何其他内容。

任务: ${userInput}

可用相关工具:
${availableTools.map(tool => `- ${tool.name}: ${tool.description} 参数：${tool.parameters ? JSON.stringify(tool.parameters) : ''}`).join('\n')}

相关记忆:
${memory.map(m => `- ${m.content}`).join('\n')}

请严格按照以下JSON格式返回，不要添加任何解释或其他文本：
{
  "taskType": "query/calculation/search/navigation/weather/general",
  "complexity": "simple/medium/complex",
  "requiresTools": true,
  "multiStep": true,
  "coreRequirements": ["具体需求1", "具体需求2"],
  "suggestedTools": ["工具1", "工具2"],
  "estimatedSteps": 2,
  "challenges": ["挑战1"],
  "successCriteria": ["成功标准1"]
}`;

    const response = await this.llm.generate(analysisPrompt, {
      temperature: 0.1,
      max_tokens: 30000,
      conversationHistory: this.conversationHistory
    });

    // 尝试清理并解析JSON
    let cleanJson = response.content.trim();
    
    // 移除可能的markdown代码块标记
    cleanJson = cleanJson.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    
    // 移除前后的非JSON内容
    const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanJson = jsonMatch[0];
    }

    try {
      const analysis = JSON.parse(cleanJson);
      logger.debug('任务分析成功:', analysis);
      return analysis;
    } catch (error) {
      logger.warn('任务分析JSON解析失败，使用智能默认分析');
      
      // 创建更智能的默认分析
      const suggestedTools = this.selectToolsForTask(userInput, availableTools);
      
      return {
        taskType: this.detectTaskType(userInput),
        complexity: 'medium',
        requiresTools: suggestedTools.length > 0,
        multiStep: true,
        coreRequirements: [userInput],
        suggestedTools: suggestedTools.slice(0, 3),
        estimatedSteps: Math.min(suggestedTools.length + 1, 4),
        challenges: ['需要调用外部工具获取信息'],
        successCriteria: ['提供准确完整的回答']
      };
    }
  }

  /**
   * 计划制定阶段
   */
  async createPlan(userInput, context, taskAnalysis) {
    const availableTools = this.tools.listAvailable();
    const relevantTools = taskAnalysis.suggestedTools || this.selectToolsForTask(userInput, availableTools);
    
    const planPrompt = `基于任务分析制定详细执行计划，严格返回JSON格式，不要包含任何其他内容。

任务: ${userInput}
任务分析: ${JSON.stringify(taskAnalysis)}

相关工具详情:
${relevantTools.map(toolName => {
  const tool = availableTools.find(t => t.name === toolName);
  return tool ? `- ${tool.name}: ${tool.description} 参数：${tool.parameters ? JSON.stringify(tool.parameters) : ''}` : `- ${toolName}: 工具`;
}).join('\n')}

请严格按照以下JSON格式返回计划，不要添加任何解释：
{
  "strategy": "具体执行策略描述",
  "steps": [
    {
      "stepNumber": 1,
      "stepName": "步骤名称",
      "type": "tool_call",
      "description": "步骤描述",
      "tool": "具体工具名",
      "args": {"参数名": "参数值"},
      "expectedOutput": "预期输出",
      "dependencies": [],
      "fallbackOptions": ["备选方案"]
    }
  ],
  "expectedOutcome": "最终预期结果",
  "riskAssessment": ["风险评估"],
  "qualityChecks": ["质量检查项"]
}`;

    const response = await this.llm.generate(planPrompt, {
      temperature: 0.2,
      max_tokens: 30000,
      conversationHistory: this.conversationHistory
    });

    // 清理并解析JSON
    let cleanJson = response.content.trim();
    cleanJson = cleanJson.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    
    const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanJson = jsonMatch[0];
    }

    try {
      const plan = JSON.parse(cleanJson);
      logger.debug('计划制定成功:', plan);
      return plan;
    } catch (error) {
      logger.warn('计划制定JSON解析失败，创建智能默认计划');
      
      // 创建基于任务分析的智能默认计划
      return {
        strategy: `针对${taskAnalysis.taskType}任务的系统化解决方案`,
        steps: [],
        expectedOutcome: taskAnalysis.successCriteria[0] || "提供准确完整的回答",
        riskAssessment: taskAnalysis.challenges || ["工具调用可能失败"],
        qualityChecks: ["验证结果准确性", "确保信息完整性"]
      };
    }
  }

  /**
   * 计划执行阶段
   */
  async executePlan(plan, userInput, context) {
    const executionResults = [];
    const stepResults = new Map(); // 存储每步的结果，供后续步骤使用
    
    logger.info(`📋 开始执行计划，共 ${plan.steps.length} 个步骤`);

    for (const step of plan.steps) {
      try {
        logger.info(`🔄 执行步骤 ${step.stepNumber}: ${step.stepName}`);
        
        // 检查依赖
        const missingDeps = step.dependencies?.filter(dep => !stepResults.has(dep)) || [];
        if (missingDeps.length > 0) {
          throw new Error(`步骤 ${step.stepNumber} 的依赖步骤 ${missingDeps.join(', ')} 未完成`);
        }

        let stepResult;
        switch (step.type) {
          case 'tool_call':
            stepResult = await this.executeToolStep(step, stepResults);
            break;
          case 'reasoning':
            stepResult = await this.executeReasoningStep(step, stepResults, userInput, context);
            break;
          case 'synthesis':
            stepResult = await this.executeSynthesisStep(step, stepResults, userInput);
            break;
          default:
            throw new Error(`未知的步骤类型: ${step.type}`);
        }

        stepResults.set(step.stepNumber, stepResult);
        executionResults.push({
          step: step,
          result: stepResult,
          timestamp: new Date()
        });

        logger.info(`✅ 步骤 ${step.stepNumber} 执行完成`);

      } catch (error) {
        logger.error(`❌ 步骤 ${step.stepNumber} 执行失败:`, error);
        
        // 检查是否是被中止的错误
        if (error.message === '任务已被用户中止') {
          throw error;
        }

        // 尝试使用备选方案
        if (step.fallbackOptions && step.fallbackOptions.length > 0) {
          logger.info(`🔄 尝试备选方案: ${step.fallbackOptions[0]}`);
          stepResults.set(step.stepNumber, {
            success: false,
            error: error.message,
            fallback: step.fallbackOptions[0]
          });
        } else {
          // 没有备选方案，记录错误但继续执行
          stepResults.set(step.stepNumber, {
            success: false,
            error: error.message
          });
        }

        executionResults.push({
          step: step,
          result: stepResults.get(step.stepNumber),
          timestamp: new Date(),
          error: error.message
        });
      }
    }

    return {
      results: executionResults,
      stepResults: Object.fromEntries(stepResults),
      overallSuccess: executionResults.every(r => !r.error)
    };
  }

  /**
   * 执行工具调用步骤
   */
  async executeToolStep(step, previousResults) {
    try {
      // 处理工具参数，可能包含对前面步骤结果的引用
      let processedArgs = { ...step.args };
      
      // 简单的变量替换，支持 {step_N_result} 格式
      const argsStr = JSON.stringify(processedArgs);
      const processedArgsStr = argsStr.replace(/\{step_(\d+)_result\}/g, (match, stepNum) => {
        const stepResult = previousResults.get(parseInt(stepNum));
        return stepResult ? JSON.stringify(stepResult.content || stepResult) : match;
      });
      processedArgs = JSON.parse(processedArgsStr);

      logger.debug(`执行工具: ${step.tool}, 参数:`, processedArgs);
      const actualToolId = this.mapToolName(step.tool);
      const toolResult = await this.tools.execute(actualToolId, processedArgs);
      
      return {
        success: true,
        tool: step.tool,
        args: processedArgs,
        result: toolResult,
        content: typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult)
      };
    } catch (error) {
      logger.error(`工具执行失败: ${step.tool}`, error);
      throw error;
    }
  }

  /**
   * 执行推理步骤
   */
  async executeReasoningStep(step, previousResults, userInput, context) {
    // 构建推理上下文
    const reasoningContext = {
      originalTask: userInput,
      stepDescription: step.description,
      reasoning: step.reasoning,
      previousResults: Object.fromEntries(previousResults)
    };

    const reasoningPrompt = `你是一个智能推理专家。请基于以下信息进行深入的逻辑推理。

原始任务: ${userInput}
推理任务: ${step.reasoning}
上下文: ${JSON.stringify(context, null, 2)}
之前的执行结果: ${JSON.stringify(reasoningContext.previousResults, null, 2)}

请进行详细的推理，并提供：
1. 推理过程
2. 关键洞察
3. 结论
4. 置信度 (1-10)

以JSON格式返回：
{
  "reasoning": "详细的推理过程",
  "insights": ["关键洞察1", "关键洞察2"],
  "conclusion": "推理结论",
  "confidence": 8,
  "supporting_evidence": ["支持证据1", "支持证据2"]
}

只返回JSON，不要添加其他内容。`;

    const response = await this.llm.generate(reasoningPrompt, {
      temperature: 0.4,
      max_tokens: 30000,
      conversationHistory: this.conversationHistory
    });

    try {
      const reasoningResult = JSON.parse(response.content);
      return {
        success: true,
        type: 'reasoning',
        content: reasoningResult.conclusion,
        details: reasoningResult
      };
    } catch (error) {
      logger.warn('推理结果JSON解析失败，使用原始响应');
      return {
        success: true,
        type: 'reasoning',
        content: response.content,
        details: { reasoning: response.content }
      };
    }
  }

  /**
   * 执行综合步骤
   */
  async executeSynthesisStep(step, previousResults, userInput) {
    const synthesisPrompt = `你是一个智能信息综合专家。请综合之前所有步骤的结果，为用户提供完整的答案。

原始任务: ${userInput}
综合任务: ${step.description}

之前步骤的结果:
${Array.from(previousResults.entries()).map(([stepNum, result]) => 
  `步骤 ${stepNum}: ${result.content || JSON.stringify(result)}`
).join('\n')}

请综合这些信息，提供一个完整、准确、有用的最终答案。

答案应该：
1. 直接回答用户的问题
2. 整合所有相关信息
3. 清晰易懂
4. 提供额外的有价值信息

最终答案：`;

    const response = await this.llm.generate(synthesisPrompt, {
      temperature: 0.3,
      max_tokens: 30000,
      conversationHistory: this.conversationHistory
    });

    return {
      success: true,
      type: 'synthesis',
      content: response.content,
      details: { 
        synthesized_from: Array.from(previousResults.keys()),
        synthesis_approach: step.description
      }
    };
  }

  /**
   * 结果评估阶段
   */
  async evaluateResult(userInput, executionResult, plan) {
    // 找到最终的答案（通常是最后一个成功的步骤结果或综合步骤的结果）
    let finalAnswer = '';
    const successfulResults = executionResult.results.filter(r => !r.error);
    
    if (successfulResults.length > 0) {
      // 优先选择综合类型的结果
      const synthesisResult = successfulResults.find(r => r.result.type === 'synthesis');
      if (synthesisResult) {
        finalAnswer = synthesisResult.result.content;
      } else {
        // 否则选择最后一个成功的结果
        const lastResult = successfulResults[successfulResults.length - 1];
        finalAnswer = lastResult.result.content || JSON.stringify(lastResult.result);
      }
    }

    // 如果没有成功的结果，尝试从部分结果中构建答案
    if (!finalAnswer && executionResult.results.length > 0) {
      const partialResults = executionResult.results
        .filter(r => r.result && r.result.content)
        .map(r => r.result.content)
        .join('\n');
      
      if (partialResults) {
        finalAnswer = `基于部分执行结果，我为您提供以下信息：\n${partialResults}`;
      }
    }

    // 评估结果质量
    const evaluation = await this.assessResultQuality(userInput, finalAnswer, executionResult, plan);

    return {
      finalAnswer: finalAnswer || '抱歉，我无法完成这个任务。',
      evaluation: evaluation,
      executionSummary: {
        totalSteps: plan.steps.length,
        successfulSteps: successfulResults.length,
        failedSteps: executionResult.results.length - successfulResults.length,
        overallSuccess: executionResult.overallSuccess
      }
    };
  }

  /**
   * 评估结果质量
   */
  async assessResultQuality(userInput, finalAnswer, executionResult, plan) {
    const evaluationPrompt = `你是一个智能质量评估专家。请评估执行结果的质量。

原始任务: ${userInput}
最终答案: ${finalAnswer}
执行摘要: 
- 总步骤数: ${plan.steps.length}
- 成功步骤: ${executionResult.results.filter(r => !r.error).length}
- 失败步骤: ${executionResult.results.filter(r => r.error).length}

请从以下维度评估结果质量，并返回JSON格式：
{
  "completeness": {"score": 8, "comment": "完整性评价"},
  "accuracy": {"score": 9, "comment": "准确性评价"},
  "usefulness": {"score": 7, "comment": "实用性评价"},
  "clarity": {"score": 8, "comment": "清晰度评价"},
  "overall": {"score": 8, "comment": "总体评价"},
  "strengths": ["优点1", "优点2"],
  "improvements": ["改进建议1", "改进建议2"]
}

评分范围：1-10分，只返回JSON，不要添加其他内容。`;

    try {
      const response = await this.llm.generate(evaluationPrompt, {
        temperature: 0.2,
        max_tokens: 30000,
        conversationHistory: this.conversationHistory
      });

      return JSON.parse(response.content);
    } catch (error) {
      logger.warn('结果评估失败，使用默认评估');
      return {
        completeness: { score: 7, comment: "基础评估" },
        accuracy: { score: 7, comment: "基础评估" },
        usefulness: { score: 7, comment: "基础评估" },
        clarity: { score: 7, comment: "基础评估" },
        overall: { score: 7, comment: "任务已完成" },
        strengths: ["提供了回答"],
        improvements: ["可进一步优化"]
      };
    }
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
${availableTools.map(tool => `- ${tool.name}: ${tool.description} 参数：${tool.parameters ? JSON.stringify(tool.parameters) : ''}`).join('\n')}

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
5. **结果评估**: 观察当前结果是否满足用户需求，如果满足，给出最终答案，如果不满足，继续迭代
6. **下一步决策**: 决定是否需要继续迭代或给出最终答案

请直接返回合法的JSON格式的响应，不要带注释，包含以下字段：

{
  "reasoning": "详细的推理过程，包括问题分析、策略制定、工具选择理由等",
  "action": "工具名称 或 null",
  "args": "工具参数，JSON对象格式 或 null",
  "finalAnswer": "如果任务完成，给出完整、准确的最终答案 或 null，输出markdown格式, 尽量充分的展示完整的内容，比如图片或者表格等",
  "shouldStop": 如果任务完成返回true, 否则返回false
}

重要提示：
- 优先考虑用户的核心需求
- 工具参数必须是有效的JSON对象格式
- 最终答案应该完整、准确、有用
- 如果无法完成任务，请说明原因
- 避免无限循环，合理使用迭代次数
- 注意：MCP工具的名称格式为 "服务器ID:工具名称"，例如 "amap:maps_weather"
- 请只返回JSON格式，不要包含其他内容`;
  }

  /**
   * 解析ReAct响应
   */
  async parseReActResponse(response) {
    // console.log('response=============', response);
    
    try {
      // 直接尝试解析JSON响应
      let parsedResult;
      try {
        // 清理响应内容，提取JSON部分
        const cleanedResponse = response.trim();
        parsedResult = JSON.parse(cleanedResponse);
      } catch (parseError) {
        logger.warn('JSON解析失败，使用备用解析方法:', parseError);
        // 备用解析方法：尝试提取JSON部分
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            parsedResult = JSON.parse(jsonMatch[0]);
          } catch (secondError) {
            logger.error('备用解析也失败:', secondError);
          }
        }
      }

      logger.debug('Parsed response:', parsedResult);
      return parsedResult || { error: '无法解析响应' };

    } catch (error) {
      logger.error('解析失败，使用备用解析方法:', error);
      return { error: '解析失败' };
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
      currentPlan: this.currentPlan,
      availableTools: allTools.total,
      localTools: allTools.local.length,
      mcpTools: allTools.mcp.length,
      planSolveConfig: this.planSolveConfig
    };
  }



  /**
   * 重置对话上下文
   */
  resetConversation() {
    this.conversationHistory = [];
    this.currentTask = null;
    this.currentPlan = null;
    
    // 清空对话相关的记忆
    if (this.memory) {
      this.memory.clear('conversation');
    }
    
    logger.info('对话上下文已重置');
    return true;
  }

  /**
   * 设置思维模式
   */
  setThinkingMode(mode) {
    if (!['react', 'plan_solve'].includes(mode)) {
      throw new Error(`不支持的思维模式: ${mode}。支持的模式: react, plan_solve`);
    }
    
    const oldMode = this.thinkingMode;
    this.thinkingMode = mode;
    
    logger.info(`思维模式已从 ${oldMode} 切换到 ${mode}`);
    
    // 记录模式切换到记忆
    this.memory.add('system', {
      type: 'thinking_mode_change',
      from: oldMode,
      to: mode,
      timestamp: new Date()
    });
    
    return {
      oldMode: oldMode,
      newMode: mode,
      timestamp: new Date()
    };
  }

  /**
   * 获取支持的思维模式
   */
  getSupportedThinkingModes() {
    return [
      {
        mode: 'react',
        name: 'ReAct模式',
        description: '推理-行动循环，适合需要多步骤交互和工具调用的复杂任务',
        characteristics: ['迭代式处理', '实时调整', '工具驱动', '响应式决策']
      },
      {
        mode: 'plan_solve',
        name: 'Plan & Solve模式',  
        description: '先制定详细计划再执行，适合需要系统性分析和结构化处理的任务',
        characteristics: ['全局规划', '结构化执行', '质量评估', '系统性思考']
      }
    ];
  }

  /**
   * 为任务选择合适的工具
   */
  selectToolsForTask(userInput, availableTools) {
    const input = userInput.toLowerCase();
    const selected = [];
    
    // 天气查询
    if (input.includes('天气') || input.includes('weather')) {
      const weatherTool = availableTools.find(t => t.name.includes('weather'));
      if (weatherTool) selected.push(weatherTool.name);
    }
    
    // 路线导航
    if (input.includes('路线') || input.includes('导航') || input.includes('怎么去')) {
      const directionTool = availableTools.find(t => t.name.includes('direction'));
      if (directionTool) selected.push(directionTool.name);
    }
    
    // 搜索功能
    if (input.includes('搜索') || input.includes('查') || input.includes('找')) {
      const searchTool = availableTools.find(t => t.name.includes('search') || t.name.includes('web'));
      if (searchTool) selected.push(searchTool.name);
    }
    
    return selected;
  }

  /**
   * 检测任务类型
   */
  detectTaskType(userInput) {
    const input = userInput.toLowerCase();
    
    if (input.includes('天气')) return 'weather';
    if (input.includes('路线') || input.includes('导航')) return 'navigation';
    if (input.includes('搜索') || input.includes('查')) return 'search';
    if (input.includes('地址') || input.includes('位置')) return 'location';
    
    return 'query';
  }
  /**
   * 为工具生成参数
   */
  generateToolArgs(userInput, tool) {
    // 基于工具类型和用户输入生成合理的参数
    if (tool.name.includes('weather')) {
      // 提取城市名
      const cityMatch = userInput.match(/([\u4e00-\u9fa5]+)/);
      return { city: cityMatch ? cityMatch[1] : '杭州' };
    }
    
    if (tool.name.includes('search')) {
      return { query: userInput };
    }
    
    if (tool.name.includes('direction')) {
      return { destination: userInput };
    }
    
    return {};
  }

  /**
   * 重置智能体状态
   */
  reset() {
    this.conversationHistory = [];
    this.currentTask = null;
    this.currentPlan = null;
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
    logger.info(`Agent ${this.name} 已启用协作模式`);
  }

  /**
   * 禁用协作模式
   */
  disableCollaboration() {
    this.collaborationEnabled = false;
    this.agentManager = null;
    logger.info(`Agent ${this.name} 已禁用协作模式`);
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
        logger.info(`Agent ${this.name} 收到消息: ${message.content}`);
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

    logger.info(`Agent ${this.name} 收到来自 ${from} 的数据共享`);
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

    logger.info(`Agent ${this.name} 收到来自 ${from} 的协调消息`);
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

    logger.info(`Agent ${this.name} 收到来自 ${from} 的广播: ${content}`);
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
    logger.info('🔗 MCP服务器管理器已设置');
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
      logger.info(`📋 更新了 ${this.availableMCPTools.length} 个MCP工具`);
      
      // 将MCP工具注册到本地工具注册表
      await this.registerMCPToolsToLocal();
    } catch (error) {
      logger.error('❌ 更新MCP工具失败:', error);
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
        // 生成工具ID
        const toolId = `${mcpTool.serverId}:${mcpTool.name}`;
        
        // 检查工具是否已经注册
        const existingTool = this.tools.getTool(toolId);
        if (existingTool) {
          // 如果工具已存在，先删除再重新注册
          this.tools.unregisterTool(toolId);
        }

        // 注册MCP工具到本地工具注册表
        this.tools.registerTool(toolId, {
          name: toolId, // 使用完整的工具ID作为名称
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
            originalName: mcpTool.name, // 保存原始名称
            type: 'mcp'
          }
        });

        registeredCount++;
        // logger.success(`已注册MCP工具: ${mcpTool.name}`);
      } catch (error) {
        logger.error(`❌ 注册MCP工具失败 ${mcpTool.name}:`, error);
      }
    }

    logger.success(`📋 成功注册了 ${registeredCount} 个MCP工具到本地工具注册表`);
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
   * 将显示名称映射到实际工具ID
   */
  mapToolName(displayName) {
    // 首先尝试直接获取工具（可能是本地工具或完整ID）
    if (this.tools.getTool(displayName)) {
      return displayName;
    }
    
    // 检查是否需要添加服务器前缀
    const allTools = this.tools.listAvailable();
    
    for (const tool of allTools) {
      const toolInfo = this.tools.getTool(tool.name);
      
      if (toolInfo && toolInfo.mcpMetadata && toolInfo.mcpMetadata.originalName === displayName) {
        return tool.name; // 返回实际的工具ID
      }
    }
    
    // 如果没找到映射，返回原名称
    return displayName;
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
      
      // 检查是否是MCP工具（优先通过mcpMetadata判断）
      if (toolInfo && toolInfo.mcpMetadata) {
        // 这是已注册的MCP工具（通过mcpMetadata识别）
        const displayName = toolInfo.mcpMetadata.originalName || tool.name;
        categorizedTools.mcp.push({
          ...tool,
          name: displayName, // 使用原始名称显示给用户
          actualToolId: tool.name, // 保存实际的工具ID用于调用
          type: 'mcp',
          serverId: toolInfo.mcpMetadata.serverId,
          serverName: toolInfo.mcpMetadata.serverName
        });
      } else if (tool.name.includes('maps_') || tool.name.includes('amap:')) {
        // 备用识别方法（向后兼容）
        let serverId = 'amap';
        let toolName = tool.name;
        
        if (tool.name.includes('amap:')) {
          const parts = tool.name.split(':');
          serverId = parts[0];
          toolName = parts[1];
        }
        
        categorizedTools.mcp.push({
          ...tool,
          name: toolName, // 显示简化的名称
          actualToolId: tool.name, // 保存实际的工具ID
          type: 'mcp',
          serverId: serverId,
          serverName: serverId
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