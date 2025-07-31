/**
 * 决策引擎
 * 协调LLM推理和工具调用，实现智能决策
 */
export class DecisionEngine {
  constructor(llmClient, toolRegistry) {
    this.llm = llmClient;
    this.tools = toolRegistry;
    this.decisionHistory = [];
  }

  /**
   * 执行决策过程
   */
  async makeDecision(task, context = {}) {
    const decisionId = this.generateDecisionId();
    const decision = {
      id: decisionId,
      task,
      context,
      startTime: new Date(),
      steps: [],
      finalDecision: null,
      status: 'running'
    };

    this.decisionHistory.push(decision);

    try {
      // 分析任务
      const analysis = await this.analyzeTask(task, context);
      decision.steps.push({
        type: 'analysis',
        content: analysis,
        timestamp: new Date()
      });

      // 制定计划
      const plan = await this.createPlan(task, analysis, context);
      decision.steps.push({
        type: 'planning',
        content: plan,
        timestamp: new Date()
      });

      // 执行计划
      const result = await this.executePlan(plan, context);
      decision.steps.push({
        type: 'execution',
        content: result,
        timestamp: new Date()
      });

      // 评估结果
      const evaluation = await this.evaluateResult(result, task);
      decision.steps.push({
        type: 'evaluation',
        content: evaluation,
        timestamp: new Date()
      });

      decision.finalDecision = evaluation;
      decision.status = 'completed';
      decision.endTime = new Date();

      return decision;

    } catch (error) {
      decision.status = 'failed';
      decision.error = error.message;
      decision.endTime = new Date();
      
      console.error('Decision failed:', error);
      throw error;
    }
  }

  /**
   * 分析任务
   */
  async analyzeTask(task, context) {
    const prompt = `请分析以下任务，识别关键信息和要求：

任务: ${task}
上下文: ${JSON.stringify(context, null, 2)}

请提供：
1. 任务类型和复杂度
2. 所需的关键信息
3. 可能需要的工具
4. 潜在挑战

分析结果:`;

    const response = await this.llm.generate(prompt, {
      temperature: 0.3,
      max_tokens: 500
    });

    return response.content;
  }

  /**
   * 创建执行计划
   */
  async createPlan(task, analysis, context) {
    const availableTools = this.tools.listAvailable();
    
    const prompt = `基于任务分析和可用工具，制定详细的执行计划：

任务: ${task}
分析: ${analysis}
可用工具: ${availableTools.map(t => `${t.name}: ${t.description}`).join('\n')}

请制定一个详细的执行计划，包括：
1. 执行步骤
2. 每个步骤需要的工具
3. 预期结果
4. 备选方案

执行计划:`;

    const response = await this.llm.generate(prompt, {
      temperature: 0.4,
      max_tokens: 800
    });

    return response.content;
  }

  /**
   * 执行计划
   */
  async executePlan(plan, context) {
    const steps = this.parsePlan(plan);
    const results = [];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      
      try {
        if (step.tool) {
          // 执行工具调用
          const toolResult = await this.tools.execute(step.tool, step.args || {});
          results.push({
            step: i + 1,
            action: 'tool_execution',
            tool: step.tool,
            args: step.args,
            result: toolResult,
            success: true
          });
        } else if (step.reasoning) {
          // 执行推理
          const reasoningResult = await this.performReasoning(step.reasoning, context, results);
          results.push({
            step: i + 1,
            action: 'reasoning',
            reasoning: step.reasoning,
            result: reasoningResult,
            success: true
          });
        }
      } catch (error) {
        results.push({
          step: i + 1,
          action: step.tool ? 'tool_execution' : 'reasoning',
          tool: step.tool,
          error: error.message,
          success: false
        });
      }
    }

    return {
      plan,
      steps: results,
      summary: this.summarizeExecution(results)
    };
  }

  /**
   * 解析计划
   */
  parsePlan(plan) {
    // 简单的计划解析，实际应用中可能需要更复杂的解析逻辑
    const lines = plan.split('\n');
    const steps = [];
    let currentStep = null;

    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.match(/^\d+\./)) {
        // 新步骤
        if (currentStep) {
          steps.push(currentStep);
        }
        currentStep = { description: trimmed };
      } else if (trimmed.startsWith('工具:')) {
        currentStep.tool = trimmed.replace('工具:', '').trim();
      } else if (trimmed.startsWith('参数:')) {
        try {
          currentStep.args = JSON.parse(trimmed.replace('参数:', '').trim());
        } catch (e) {
          currentStep.args = trimmed.replace('参数:', '').trim();
        }
      } else if (trimmed.startsWith('推理:')) {
        currentStep.reasoning = trimmed.replace('推理:', '').trim();
      } else if (currentStep && trimmed) {
        currentStep.description += ' ' + trimmed;
      }
    }

    if (currentStep) {
      steps.push(currentStep);
    }

    return steps;
  }

  /**
   * 执行推理
   */
  async performReasoning(reasoning, context, previousResults) {
    const prompt = `基于以下信息进行推理：

推理要求: ${reasoning}
上下文: ${JSON.stringify(context, null, 2)}
之前的执行结果: ${JSON.stringify(previousResults, null, 2)}

请提供详细的推理过程和结论：

推理过程:`;

    const response = await this.llm.generate(prompt, {
      temperature: 0.5,
      max_tokens: 600
    });

    return response.content;
  }

  /**
   * 评估结果
   */
  async evaluateResult(executionResult, originalTask) {
    const prompt = `请评估执行结果是否满足原始任务要求：

原始任务: ${originalTask}
执行结果: ${JSON.stringify(executionResult, null, 2)}

请评估：
1. 任务完成度
2. 结果质量
3. 是否需要进一步行动
4. 最终结论

评估结果:`;

    const response = await this.llm.generate(prompt, {
      temperature: 0.3,
      max_tokens: 500
    });

    return response.content;
  }

  /**
   * 总结执行过程
   */
  summarizeExecution(results) {
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    return {
      totalSteps: results.length,
      successfulSteps: successful,
      failedSteps: failed,
      successRate: results.length > 0 ? (successful / results.length) * 100 : 0,
      summary: `执行了 ${results.length} 个步骤，成功 ${successful} 个，失败 ${failed} 个`
    };
  }

  /**
   * 获取决策历史
   */
  getDecisionHistory(limit = 10) {
    return this.decisionHistory
      .sort((a, b) => b.startTime - a.startTime)
      .slice(0, limit);
  }

  /**
   * 获取特定决策
   */
  getDecision(decisionId) {
    return this.decisionHistory.find(d => d.id === decisionId);
  }

  /**
   * 生成决策ID
   */
  generateDecisionId() {
    return `decision_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 清理决策历史
   */
  clearHistory() {
    this.decisionHistory = [];
  }

  /**
   * 获取决策统计
   */
  getStats() {
    const total = this.decisionHistory.length;
    const completed = this.decisionHistory.filter(d => d.status === 'completed').length;
    const failed = this.decisionHistory.filter(d => d.status === 'failed').length;
    const running = this.decisionHistory.filter(d => d.status === 'running').length;

    return {
      total,
      completed,
      failed,
      running,
      successRate: total > 0 ? (completed / total) * 100 : 0
    };
  }
} 