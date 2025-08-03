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
    const availableTools = this.tools.listAvailable();
    const toolDescriptions = availableTools.map(tool => 
      `- ${tool.name}: ${tool.description}`
    ).join('\n');

    const prompt = `你是一个智能任务分析专家。请仔细分析以下任务，并提供详细的分析报告。

任务: ${task}
上下文: ${JSON.stringify(context, null, 2)}

可用工具:
${toolDescriptions}

请从以下角度进行分析：

1. **任务类型识别**
   - 任务的主要类型（计算、查询、推理、创作等）
   - 任务的复杂度级别（简单/中等/复杂）
   - 是否需要多步骤处理

2. **需求分析**
   - 用户的核心需求是什么
   - 需要哪些关键信息
   - 是否有隐含的需求

3. **工具匹配**
   - 哪些工具最适合处理此任务
   - 工具的使用顺序
   - 是否需要组合多个工具

4. **执行策略**
   - 最佳的执行路径
   - 可能的备选方案
   - 潜在的风险和挑战

5. **预期结果**
   - 用户期望得到什么样的结果
   - 如何验证结果的正确性

请提供结构化的分析报告：`;

    const response = await this.llm.generate(prompt, {
      temperature: 0.2,
      max_tokens: 800
    });

    return response.content;
  }

  /**
   * 创建执行计划
   */
  async createPlan(task, analysis, context) {
    // 获取所有可用工具（包括已注册的MCP工具）
    const allTools = this.tools.listAvailable();
    
    const toolDescriptions = allTools.map(tool => 
      `- ${tool.name}: ${tool.description}`
    ).join('\n');

    const prompt = `你是一个智能计划制定专家。基于任务分析和可用工具，制定详细的执行计划。

任务: ${task}
任务分析: ${analysis}
可用工具:
${toolDescriptions}

请制定一个详细的执行计划，包括：

1. **步骤分解**: 将任务分解为具体的执行步骤
2. **工具选择**: 为每个步骤选择合适的工具
3. **参数设计**: 为工具调用设计合适的参数
4. **推理过程**: 对于需要推理的步骤，提供详细的推理过程
5. **预期结果**: 每个步骤的预期输出
6. **错误处理**: 可能的错误情况和处理方案

请使用以下格式输出计划：

步骤1: [步骤名称]
类型: [tool/reasoning]
工具: [工具名称] (如果是工具调用)
参数: [JSON格式的参数] (如果是工具调用)
推理: [推理过程] (如果是推理步骤)
预期结果: [预期输出]

步骤2: [步骤名称]
...

请确保计划是：
- 具体且可执行的
- 逻辑清晰的
- 充分利用可用工具
- 考虑错误处理
- 最终能解决用户问题

执行计划：`;

    const response = await this.llm.generate(prompt, {
      temperature: 0.3,
      max_tokens: 1000
    });

    return response.content;
  }

  /**
   * 执行计划
   */
  async executePlan(plan, context) {
    const steps = this.parsePlan(plan);
    console.log('🔍 解析到的步骤:', steps);
    
    const results = [];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      console.log(`🔄 执行步骤 ${i + 1}:`, step);
      
      try {
        if (step.tool) {
          // 执行工具调用
          console.log(`🛠️  执行工具: ${step.tool}`, step.args);
          
          let toolResult;
          try {
            // 首先尝试执行本地工具
            toolResult = await this.tools.execute(step.tool, step.args || {});
          } catch (localError) {
            // 如果本地工具执行失败，尝试执行MCP工具
            if (context.mcpTools && context.mcpTools.some(t => t.name === step.tool)) {
              console.log(`🔄 尝试执行MCP工具: ${step.tool}`);
              if (context.executeMCPTool) {
                try {
                  toolResult = await context.executeMCPTool(step.tool, step.args || {});
                } catch (mcpError) {
                  toolResult = { error: `MCP工具执行失败: ${mcpError.message}` };
                }
              } else {
                toolResult = { error: `MCP工具 ${step.tool} 执行能力未配置` };
              }
            } else {
              throw localError;
            }
          }
          
          console.log(`✅ 工具执行结果:`, toolResult);
          results.push({
            step: i + 1,
            action: 'tool_execution',
            tool: step.tool,
            args: step.args,
            result: toolResult,
            success: !toolResult.error
          });
        } else if (step.reasoning) {
          // 执行推理
          console.log(`🧠 执行推理: ${step.reasoning}`);
          const reasoningResult = await this.performReasoning(step.reasoning, context, results);
          console.log(`✅ 推理结果:`, reasoningResult);
          results.push({
            step: i + 1,
            action: 'reasoning',
            reasoning: step.reasoning,
            result: reasoningResult,
            success: true
          });
        } else {
          console.log(`⚠️  步骤 ${i + 1} 没有工具或推理内容`);
        }
      } catch (error) {
        console.error(`❌ 步骤 ${i + 1} 执行失败:`, error);
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
    // 改进的计划解析逻辑
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
      } else if (trimmed.toLowerCase().includes('工具:') || trimmed.toLowerCase().includes('tool:')) {
        const toolMatch = trimmed.match(/[工具|tool]:\s*(.+)/i);
        if (toolMatch) {
          if (!currentStep) {
            currentStep = { description: '自动生成的步骤' };
          }
          const toolName = toolMatch[1].trim();
          // 清理工具名称，移除可能的JSON格式
          currentStep.tool = toolName.replace(/```json\s*\{[^}]*\}\s*```/g, '').trim();
        }
      } else if (trimmed.toLowerCase().includes('参数:') || trimmed.toLowerCase().includes('args:')) {
        const argsMatch = trimmed.match(/[参数|args]:\s*(.+)/i);
        if (argsMatch) {
          if (!currentStep) {
            currentStep = { description: '自动生成的步骤' };
          }
          try {
            // 尝试解析JSON格式的参数
            let argsText = argsMatch[1].trim();
            // 移除可能的markdown代码块格式
            argsText = argsText.replace(/```json\s*/, '').replace(/```\s*$/, '');
            currentStep.args = JSON.parse(argsText);
          } catch (e) {
            // 如果JSON解析失败，尝试提取简单的键值对
            const simpleMatch = argsText.match(/\{([^}]+)\}/);
            if (simpleMatch) {
              try {
                currentStep.args = JSON.parse(simpleMatch[0]);
              } catch (e2) {
                currentStep.args = argsMatch[1].trim();
              }
            } else {
              currentStep.args = argsMatch[1].trim();
            }
          }
        }
      } else if (trimmed.toLowerCase().includes('推理:') || trimmed.toLowerCase().includes('reasoning:')) {
        const reasoningMatch = trimmed.match(/[推理|reasoning]:\s*(.+)/i);
        if (reasoningMatch) {
          if (!currentStep) {
            currentStep = { description: '自动生成的步骤' };
          }
          currentStep.reasoning = reasoningMatch[1].trim();
        }
      } else if (currentStep && trimmed) {
        currentStep.description += ' ' + trimmed;
      }
    }

    if (currentStep) {
      steps.push(currentStep);
    }

    // 如果没有解析到任何步骤，尝试智能解析
    if (steps.length === 0) {
      return this.intelligentPlanParsing(plan);
    }

    return steps;
  }

  /**
   * 智能计划解析
   */
  intelligentPlanParsing(plan) {
    const steps = [];
    const availableTools = this.tools.listAvailable();
    const planLower = plan.toLowerCase();
    
    // 任务模式识别和工具映射
    const taskPatterns = [
      {
        patterns: ['计算', 'calculate', '数学', 'math', '算术', 'arithmetic'],
        tool: 'calculator',
        extractArgs: (text) => {
          const calcMatch = text.match(/(\d+\s*[\+\-\*\/]\s*\d+)/);
          return calcMatch ? { expression: calcMatch[1] } : null;
        },
        description: '执行数学计算'
      },
      {
        patterns: ['时间', 'time', '日期', 'date', '现在几点', 'what time'],
        tool: 'time_date',
        extractArgs: () => ({ format: 'full' }),
        description: '获取当前时间'
      },
      {
        patterns: ['搜索', 'search', '查找', 'find', '查询', 'query'],
        tool: 'web_search',
        extractArgs: (text) => {
          // 提取搜索关键词
          const searchMatch = text.match(/搜索\s*[：:]\s*(.+)/) || 
                             text.match(/查找\s*[：:]\s*(.+)/) ||
                             text.match(/查询\s*[：:]\s*(.+)/);
          return searchMatch ? { query: searchMatch[1] } : { query: text };
        },
        description: '执行网络搜索'
      },
      {
        patterns: ['文件', 'file', '读取', 'read', '写入', 'write'],
        tool: 'file_operations',
        extractArgs: (text) => {
          const fileMatch = text.match(/文件[：:]\s*(.+)/);
          return fileMatch ? { path: fileMatch[1] } : { path: './' };
        },
        description: '执行文件操作'
      },
      {
        patterns: ['记忆', 'memory', '历史', 'history', '回顾', 'recall'],
        tool: 'memory_search',
        extractArgs: (text) => ({ query: text }),
        description: '搜索记忆信息'
      }
    ];
    
    // 推理任务模式
    const reasoningPatterns = [
      {
        patterns: ['介绍', 'introduce', '自我介绍', 'self-introduction'],
        reasoning: '我是一个智能助手，可以帮助用户完成各种任务，包括计算、时间查询、文件操作等。我使用DecisionEngine进行智能决策，能够分析任务、制定计划并执行。我的主要功能包括：1. 数学计算 2. 时间查询 3. 文件操作 4. 网络搜索 5. 智能决策分析。我能够理解用户需求，制定执行计划，并调用相应的工具来完成任务。',
        description: '生成自我介绍'
      },
      {
        patterns: ['分析', 'analyze', '评估', 'evaluate', '复杂度', 'complexity'],
        reasoning: '基于任务特征和可用信息，进行深入分析，包括：1. 任务规模评估 2. 技术难度分析 3. 时间需求估算 4. 资源需求评估 5. 风险因素识别 6. 优化建议。',
        description: '执行任务分析'
      },
      {
        patterns: ['计划', 'plan', '制定', 'create', '学习计划', 'study plan'],
        reasoning: '基于用户需求和可用资源，制定详细的执行计划，包括：1. 目标设定 2. 时间安排 3. 方法选择 4. 进度跟踪 5. 风险评估。',
        description: '制定执行计划'
      },
      {
        patterns: ['建议', 'suggest', '推荐', 'recommend', '意见', 'advice'],
        reasoning: '基于用户需求和当前情况，提供专业的建议和推荐，包括：1. 需求分析 2. 方案设计 3. 实施建议 4. 注意事项 5. 后续跟进。',
        description: '提供专业建议'
      }
    ];
    
    // 检查工具任务
    for (const pattern of taskPatterns) {
      if (pattern.patterns.some(p => planLower.includes(p))) {
        const args = pattern.extractArgs(plan);
        if (args && availableTools.some(t => t.name === pattern.tool)) {
          steps.push({
            description: pattern.description,
            tool: pattern.tool,
            args: args
          });
        }
      }
    }
    
    // 检查推理任务
    for (const pattern of reasoningPatterns) {
      if (pattern.patterns.some(p => planLower.includes(p))) {
        steps.push({
          description: pattern.description,
          reasoning: pattern.reasoning
        });
      }
    }
    
    // 如果没有匹配到任何模式，尝试通用分析
    if (steps.length === 0) {
      steps.push({
        description: '分析任务需求',
        reasoning: `分析用户任务："${plan}"，识别关键需求、可用工具和最佳执行方案。`
      });
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
    // 首先尝试从执行结果中提取有用的信息
    let extractedResult = '';
    
    if (executionResult.steps && executionResult.steps.length > 0) {
      const successfulSteps = executionResult.steps.filter(step => step.success);
      
      for (const step of successfulSteps) {
        if (step.action === 'tool_execution' && step.result) {
          // 从工具执行结果中提取信息
          if (step.tool === 'calculator' && step.result.result) {
            extractedResult += `计算结果: ${step.result.result}\n`;
          } else if (step.tool === 'time_date' && step.result.datetime) {
            extractedResult += `当前时间: ${step.result.datetime}\n`;
          } else if (step.result) {
            extractedResult += `工具结果: ${JSON.stringify(step.result)}\n`;
          }
        } else if (step.action === 'reasoning' && step.result) {
          extractedResult += `推理结果: ${step.result}\n`;
        }
      }
    }
    
    // 如果有提取的结果，直接返回
    if (extractedResult.trim()) {
      return extractedResult.trim();
    }
    
    // 否则使用LLM评估
    const prompt = `你是一个智能结果评估专家。请全面评估执行结果的质量和完整性。

原始任务: ${originalTask}
执行结果: ${JSON.stringify(executionResult, null, 2)}

请从以下维度进行评估：

1. **完整性评估**
   - 是否完全解决了用户的核心需求
   - 是否遗漏了重要信息
   - 结果是否足够详细

2. **准确性评估**
   - 结果是否准确无误
   - 计算是否正确
   - 信息是否可靠

3. **质量评估**
   - 结果的清晰度和可读性
   - 格式是否合适
   - 是否易于理解

4. **实用性评估**
   - 结果是否对用户有实际价值
   - 是否提供了额外的有用信息
   - 是否超出了用户的期望

5. **改进建议**
   - 如果结果不完整，建议如何改进
   - 如果需要更多信息，建议获取什么
   - 如何优化用户体验

请提供：
- 总体评分（1-10分）
- 详细的评估报告
- 具体的改进建议
- 最终结论

评估报告：`;

    const response = await this.llm.generate(prompt, {
      temperature: 0.2,
      max_tokens: 800
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