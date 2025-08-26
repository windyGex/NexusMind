import logger from '../../utils/logger.js';
import { SearchAgent } from './agents/SearchAgentLLM.js';
import { RetrievalAgent } from './agents/RetrievalAgentLLM.js';
import { AnalysisAgent } from './agents/AnalysisAgentLLM.js';
import { ReportAgent } from './agents/ReportAgentLLM.js';

/**
 * 智能体能力定义
 */
const AGENT_CAPABILITIES = {
  searcher: {
    name: '网络搜索员',
    description: '负责网络搜索、信息收集和查询优化',
    capabilities: [
      'web_search',
      'query_optimization', 
      'search_strategy',
      'result_evaluation',
      'multi_source_collection'
    ],
    taskTypes: [
      'information_gathering',
      'market_research',
      'news_collection',
      'data_collection',
      'trend_monitoring'
    ],
    inputTypes: ['text_query', 'topic', 'keywords'],
    outputTypes: ['search_results', 'urls', 'content_snippets'],
    complexity: 'medium',
    reliability: 0.9
  },
  
  retriever: {
    name: '信息检索员',
    description: '负责信息提取、结构化和知识图谱构建',
    capabilities: [
      'content_extraction',
      'information_structuring',
      'knowledge_graph',
      'data_categorization',
      'relationship_mapping'
    ],
    taskTypes: [
      'information_extraction',
      'data_processing',
      'content_analysis',
      'knowledge_organization',
      'fact_verification'
    ],
    inputTypes: ['search_results', 'web_content', 'documents'],
    outputTypes: ['structured_data', 'knowledge_graph', 'extracted_facts'],
    complexity: 'high',
    reliability: 0.85
  },
  
  analyzer: {
    name: '数据分析员',
    description: '负责深度分析、洞察挖掘和预测建模',
    capabilities: [
      'statistical_analysis',
      'trend_analysis',
      'pattern_recognition',
      'predictive_modeling',
      'insight_generation'
    ],
    taskTypes: [
      'data_analysis',
      'trend_analysis',
      'market_analysis',
      'financial_analysis',
      'predictive_analysis',
      'swot_analysis'
    ],
    inputTypes: ['structured_data', 'time_series', 'categorical_data'],
    outputTypes: ['insights', 'predictions', 'analysis_reports', 'trends'],
    complexity: 'high',
    reliability: 0.88
  },
  
  reporter: {
    name: '报告撰写员',
    description: '负责报告生成、内容创作和质量优化',
    capabilities: [
      'report_writing',
      'content_creation',
      'structure_design',
      'quality_assessment',
      'format_optimization'
    ],
    taskTypes: [
      'report_generation',
      'content_creation',
      'documentation',
      'presentation_preparation',
      'executive_summary'
    ],
    inputTypes: ['analysis_results', 'insights', 'data_summaries'],
    outputTypes: ['reports', 'documents', 'presentations', 'summaries'],
    complexity: 'medium',
    reliability: 0.92
  }
};

/**
 * 多智能体管理器 - 智能选择版
 * 负责智能分析任务需求，自主选择最合适的智能体组合
 * 实现动态工作流编排和智能体协作优化
 */
export class MultiAgentManager {
  constructor(config = {}) {
    this.config = {
      maxConcurrentTasks: 3,
      timeout: 300000, // 5分钟超时
      retryAttempts: 2,
      qualityThreshold: 0.8,
      enableIntelligentSelection: true,
      enableParallelExecution: true,
      enableDynamicWorkflow: true,
      ...config
    };
    
    // 初始化子智能体 - 传递LLM实例
    this.agents = {
      searcher: new SearchAgent({ ...config.searchAgent, llmInstance: config.llm }),
      retriever: new RetrievalAgent({ ...config.retrievalAgent, llmInstance: config.llm }),
      analyzer: new AnalysisAgent({ ...config.analysisAgent, llmInstance: config.llm }),
      reporter: new ReportAgent({ ...config.reportAgent, llmInstance: config.llm })
    };
    
    // 智能体能力定义
    this.agentCapabilities = AGENT_CAPABILITIES;
    
    // 工作流状态
    this.currentWorkflow = null;
    this.workflowHistory = [];
    
    // 共享数据存储
    this.sharedMemory = {
      searchResults: [],
      retrievedData: [],
      analysisResults: [],
      reportSections: [],
      metadata: {}
    };
    
    // 回调函数
    this.onProgress = null;
    this.onStageComplete = null;
    this.onError = null;
  }

  /**
   * 智能任务分析和智能体选择
   */
  async analyzeTaskAndSelectAgents(query, context = {}) {
    logger.info('🧠 开始智能任务分析和智能体选择...');
    
    try {
      // 使用LLM进行任务分析
      const taskAnalysis = await this.performTaskAnalysis(query, context);
      
      // 基于分析结果选择智能体
      const selectedAgents = await this.selectOptimalAgents(taskAnalysis);
      
      // 生成执行计划
      const executionPlan = this.generateExecutionPlan(taskAnalysis, selectedAgents);
      
      logger.info('✅ 智能体选择完成:', {
        taskType: taskAnalysis.taskType,
        complexity: taskAnalysis.complexity,
        selectedAgents: selectedAgents.map(a => a.agentId),
        executionSteps: executionPlan.steps.length
      });
      
      return {
        taskAnalysis,
        selectedAgents,
        executionPlan
      };
      
    } catch (error) {
      logger.error('❌ 任务分析失败:', error);
      // 回退到默认智能体组合
      return this.getFallbackAgentSelection(query);
    }
  }

  /**
   * 使用LLM进行任务分析
   */
  async performTaskAnalysis(query, context) {
    if (!this.agents.searcher.llm) {
      return this.fallbackTaskAnalysis(query);
    }

    const prompt = `作为智能任务分析专家，请分析以下用户查询，确定任务类型、复杂度和所需能力：

**用户查询**: "${query}"
**上下文信息**: ${JSON.stringify(context)}

**分析维度**：
1. 任务类型识别
2. 复杂度评估
3. 所需能力分析
4. 数据需求分析
5. 输出要求分析

请返回JSON格式的分析结果：
{
  "taskType": "information_gathering|data_analysis|report_generation|comprehensive_research",
  "complexity": "simple|moderate|complex|expert",
  "primaryObjective": "主要目标描述",
  "requiredCapabilities": ["所需能力列表"],
  "dataRequirements": {
    "inputTypes": ["需要的输入类型"],
    "outputTypes": ["期望的输出类型"],
    "dataVolume": "small|medium|large"
  },
  "subTasks": [
    {
      "task": "子任务描述",
      "priority": "high|medium|low",
      "estimatedEffort": "effort_estimate"
    }
  ],
  "constraints": ["约束条件"],
  "successCriteria": ["成功标准"]
}

只返回JSON，不要其他内容。`;

    try {
      const response = await this.agents.searcher.llm.generate(prompt, {
        temperature: 0.3,
        max_tokens: 1500,
        needSendToFrontend: false,
        streaming: false
      });

      const analysis = JSON.parse(response.content);
      
      // 验证和补充分析结果
      return this.validateAndEnhanceTaskAnalysis(analysis, query);
      
    } catch (error) {
      logger.warn('LLM任务分析失败，使用回退方法:', error);
      return this.fallbackTaskAnalysis(query);
    }
  }

  /**
   * 基于任务分析选择最优智能体组合
   */
  async selectOptimalAgents(taskAnalysis) {
    const selectedAgents = [];
    const requiredCapabilities = taskAnalysis.requiredCapabilities || [];
    
    // 为每个智能体计算匹配度
    const agentScores = {};
    
    for (const [agentId, agent] of Object.entries(this.agents)) {
      const capabilities = this.agentCapabilities[agentId];
      const score = this.calculateAgentMatchScore(capabilities, taskAnalysis);
      agentScores[agentId] = {
        agentId,
        agent,
        capabilities,
        score,
        matchReason: this.getMatchReason(capabilities, taskAnalysis)
      };
    }
    
    // 根据任务类型和复杂度选择智能体
    const selectedAgentIds = this.determineRequiredAgents(taskAnalysis, agentScores);
    
    // 构建选中的智能体列表
    for (const agentId of selectedAgentIds) {
      const agentInfo = agentScores[agentId];
      selectedAgents.push({
        agentId,
        agent: agentInfo.agent,
        capabilities: agentInfo.capabilities,
        score: agentInfo.score,
        matchReason: agentInfo.matchReason,
        executionOrder: this.getExecutionOrder(agentId, taskAnalysis)
      });
    }
    
    // 按执行顺序排序
    selectedAgents.sort((a, b) => a.executionOrder - b.executionOrder);
    
    return selectedAgents;
  }

  /**
   * 计算智能体匹配度
   */
  calculateAgentMatchScore(capabilities, taskAnalysis) {
    let score = 0;
    const requiredCapabilities = taskAnalysis.requiredCapabilities || [];
    
    // 能力匹配度
    const capabilityMatches = capabilities.capabilities.filter(cap => 
      requiredCapabilities.includes(cap)
    ).length;
    score += (capabilityMatches / requiredCapabilities.length) * 0.4;
    
    // 任务类型匹配度
    const taskTypeMatches = capabilities.taskTypes.filter(taskType => 
      taskAnalysis.taskType === taskType || 
      taskAnalysis.subTasks?.some(subTask => subTask.task.includes(taskType))
    ).length;
    score += (taskTypeMatches / capabilities.taskTypes.length) * 0.3;
    
    // 输入输出类型匹配度
    const inputOutputMatch = this.calculateInputOutputMatch(capabilities, taskAnalysis);
    score += inputOutputMatch * 0.2;
    
    // 复杂度匹配度
    const complexityMatch = this.calculateComplexityMatch(capabilities, taskAnalysis);
    score += complexityMatch * 0.1;
    
    return Math.min(score, 1.0);
  }

  /**
   * 计算输入输出匹配度
   */
  calculateInputOutputMatch(capabilities, taskAnalysis) {
    const dataReqs = taskAnalysis.dataRequirements || {};
    const inputMatch = capabilities.inputTypes.some(inputType => 
      dataReqs.inputTypes?.includes(inputType)
    ) ? 1 : 0;
    
    const outputMatch = capabilities.outputTypes.some(outputType => 
      dataReqs.outputTypes?.includes(outputType)
    ) ? 1 : 0;
    
    return (inputMatch + outputMatch) / 2;
  }

  /**
   * 计算复杂度匹配度
   */
  calculateComplexityMatch(capabilities, taskAnalysis) {
    const complexityMap = { simple: 1, moderate: 2, complex: 3, expert: 4 };
    const taskComplexity = complexityMap[taskAnalysis.complexity] || 2;
    const agentComplexity = complexityMap[capabilities.complexity] || 2;
    
    return 1 - Math.abs(taskComplexity - agentComplexity) / 4;
  }

  /**
   * 确定需要的智能体
   */
  determineRequiredAgents(taskAnalysis, agentScores) {
    const taskType = taskAnalysis.taskType;
    const complexity = taskAnalysis.complexity;
    
    // 基于任务类型的智能体选择策略
    const selectionStrategies = {
      information_gathering: {
        required: ['searcher'],
        optional: ['retriever'],
        condition: complexity !== 'simple'
      },
      data_analysis: {
        required: ['analyzer'],
        optional: ['retriever'],
        condition: true
      },
      report_generation: {
        required: ['reporter'],
        optional: ['analyzer'],
        condition: complexity !== 'simple'
      },
      comprehensive_research: {
        required: ['searcher', 'retriever', 'analyzer', 'reporter'],
        optional: [],
        condition: true
      }
    };
    
    const strategy = selectionStrategies[taskType] || selectionStrategies.comprehensive_research;
    const selectedAgents = [...strategy.required];
    
    // 添加可选智能体（如果条件满足且匹配度高）
    if (strategy.condition && strategy.optional.length > 0) {
      for (const agentId of strategy.optional) {
        if (agentScores[agentId] && agentScores[agentId].score > 0.6) {
          selectedAgents.push(agentId);
        }
      }
    }
    
    // 对于复杂任务，确保有足够的智能体覆盖
    if (complexity === 'complex' || complexity === 'expert') {
      if (!selectedAgents.includes('analyzer') && agentScores.analyzer?.score > 0.5) {
        selectedAgents.push('analyzer');
      }
      if (!selectedAgents.includes('reporter') && agentScores.reporter?.score > 0.5) {
        selectedAgents.push('reporter');
      }
    }
    
    return [...new Set(selectedAgents)]; // 去重
  }

  /**
   * 获取智能体执行顺序
   */
  getExecutionOrder(agentId, taskAnalysis) {
    const orderMap = {
      searcher: 1,
      retriever: 2,
      analyzer: 3,
      reporter: 4
    };
    
    // 根据任务类型调整执行顺序
    if (taskAnalysis.taskType === 'data_analysis') {
      return agentId === 'analyzer' ? 1 : orderMap[agentId] || 5;
    }
    
    if (taskAnalysis.taskType === 'report_generation') {
      return agentId === 'reporter' ? 1 : orderMap[agentId] || 5;
    }
    
    return orderMap[agentId] || 5;
  }

  /**
   * 生成执行计划
   */
  generateExecutionPlan(taskAnalysis, selectedAgents) {
    const steps = [];
    let currentData = null;
    
    for (const agentInfo of selectedAgents) {
      const step = {
        agentId: agentInfo.agentId,
        agentName: agentInfo.capabilities.name,
        task: this.generateAgentTask(agentInfo, taskAnalysis, currentData),
        dependencies: this.getStepDependencies(agentInfo.agentId, selectedAgents),
        expectedOutput: agentInfo.capabilities.outputTypes[0],
        estimatedTime: this.estimateStepTime(agentInfo, taskAnalysis),
        canExecuteInParallel: this.canExecuteInParallel(agentInfo.agentId, selectedAgents)
      };
      
      steps.push(step);
      currentData = step.expectedOutput;
    }
    
    return {
      steps,
      totalEstimatedTime: steps.reduce((sum, step) => sum + step.estimatedTime, 0),
      canParallelize: steps.some(step => step.canExecuteInParallel),
      criticalPath: this.identifyCriticalPath(steps)
    };
  }

  /**
   * 生成智能体任务描述
   */
  generateAgentTask(agentInfo, taskAnalysis, previousData) {
    const taskTemplates = {
      searcher: `为"${taskAnalysis.primaryObjective}"执行网络搜索，收集相关信息`,
      retriever: `从${previousData ? '搜索结果' : '可用数据'}中提取和结构化关键信息`,
      analyzer: `分析${previousData ? '结构化数据' : '可用信息'}，生成洞察和预测`,
      reporter: `基于${previousData ? '分析结果' : '可用信息'}生成专业报告`
    };
    
    return taskTemplates[agentInfo.agentId] || `执行${agentInfo.capabilities.name}相关任务`;
  }

  /**
   * 获取步骤依赖关系
   */
  getStepDependencies(agentId, selectedAgents) {
    const dependencies = [];
    const orderMap = { searcher: 1, retriever: 2, analyzer: 3, reporter: 4 };
    const currentOrder = orderMap[agentId];
    
    for (const agent of selectedAgents) {
      const agentOrder = orderMap[agent.agentId];
      if (agentOrder < currentOrder) {
        dependencies.push(agent.agentId);
      }
    }
    
    return dependencies;
  }

  /**
   * 估算步骤执行时间
   */
  estimateStepTime(agentInfo, taskAnalysis) {
    const baseTimes = {
      searcher: 30000, // 30秒
      retriever: 45000, // 45秒
      analyzer: 60000, // 60秒
      reporter: 45000  // 45秒
    };
    
    const complexityMultiplier = {
      simple: 0.7,
      moderate: 1.0,
      complex: 1.5,
      expert: 2.0
    };
    
    const baseTime = baseTimes[agentInfo.agentId] || 30000;
    const multiplier = complexityMultiplier[taskAnalysis.complexity] || 1.0;
    
    return Math.round(baseTime * multiplier);
  }

  /**
   * 判断是否可以并行执行
   */
  canExecuteInParallel(agentId, selectedAgents) {
    // 只有检索员和分析员在特定条件下可以并行
    if (agentId === 'retriever' || agentId === 'analyzer') {
      const hasSearcher = selectedAgents.some(a => a.agentId === 'searcher');
      return hasSearcher; // 如果有搜索员，检索员和分析员可以并行
    }
    return false;
  }

  /**
   * 识别关键路径
   */
  identifyCriticalPath(steps) {
    return steps.filter(step => !step.canExecuteInParallel);
  }

  /**
   * 执行智能工作流
   */
  async executeIntelligentWorkflow(query, context = {}) {
    const workflowId = this.generateWorkflowId();
    
    try {
      this.currentWorkflow = {
        id: workflowId,
        query,
        context,
        startTime: new Date(),
        status: 'analyzing',
        stages: []
      };
      
      logger.info(`🚀 启动智能多智能体工作流: ${workflowId}`);
      this.notifyProgress('workflow_start', { workflowId, query });
      
      // 阶段1: 智能任务分析和智能体选择
      const { taskAnalysis, selectedAgents, executionPlan } = await this.analyzeTaskAndSelectAgents(query, context);
      
      this.currentWorkflow.status = 'running';
      this.currentWorkflow.taskAnalysis = taskAnalysis;
      this.currentWorkflow.selectedAgents = selectedAgents;
      this.currentWorkflow.executionPlan = executionPlan;
      
      this.notifyProgress('agent_selection', { 
        selectedAgents: selectedAgents.map(a => ({ id: a.agentId, name: a.capabilities.name, score: a.score })),
        executionPlan 
      });
      
      // 阶段2: 执行智能体工作流
      const result = await this.executeAgentWorkflow(selectedAgents, executionPlan, taskAnalysis);
      
      // 完成工作流
      this.currentWorkflow.status = 'completed';
      this.currentWorkflow.endTime = new Date();
      this.currentWorkflow.result = result;
      
      this.workflowHistory.push(this.currentWorkflow);
      
      logger.success(`✅ 智能多智能体工作流完成: ${workflowId}`);
      return result;
      
    } catch (error) {
      logger.error(`❌ 智能工作流失败: ${error.message}`);
      
      if (this.currentWorkflow) {
        this.currentWorkflow.status = 'failed';
        this.currentWorkflow.error = error.message;
        this.currentWorkflow.endTime = new Date();
      }
      
      this.notifyError(error);
      throw error;
    } finally {
      this.currentWorkflow = null;
      this.clearSharedMemory();
    }
  }

  /**
   * 执行智能体工作流
   */
  async executeAgentWorkflow(selectedAgents, executionPlan, taskAnalysis) {
    const results = {};
    const parallelTasks = [];
    const sequentialTasks = [];
    
    // 分离并行和顺序任务
    for (const step of executionPlan.steps) {
      if (step.canExecuteInParallel) {
        parallelTasks.push(step);
      } else {
        sequentialTasks.push(step);
      }
    }
    
    // 执行顺序任务
    for (const step of sequentialTasks) {
      const stepResult = await this.executeAgentStep(step, taskAnalysis, results);
      results[step.agentId] = stepResult;
    }
    
    // 执行并行任务
    if (parallelTasks.length > 0) {
      const parallelResults = await Promise.all(
        parallelTasks.map(step => this.executeAgentStep(step, taskAnalysis, results))
      );
      
      parallelTasks.forEach((step, index) => {
        results[step.agentId] = parallelResults[index];
      });
    }
    
    // 组装最终结果
    return this.assembleFinalResult(results, taskAnalysis);
  }

  /**
   * 执行单个智能体步骤
   */
  async executeAgentStep(step, taskAnalysis, previousResults) {
    const agentInfo = this.currentWorkflow.selectedAgents.find(a => a.agentId === step.agentId);
    
    this.addStage(step.agentId, 'running', { agentName: agentInfo.capabilities.name });
    
    try {
      // 通知智能体开始执行
      this.notifyAgentProgress(step.agentId, 'start', {
        agentName: agentInfo.capabilities.name,
        task: step.task,
        matchScore: agentInfo.score,
        matchReason: agentInfo.matchReason
      });
      
      // 准备输入数据
      const inputData = this.prepareAgentInput(step, previousResults, taskAnalysis);
      
      // 执行智能体任务
      const result = await agentInfo.agent.execute(inputData);
      
      // 通知智能体执行完成
      this.notifyAgentProgress(step.agentId, 'completed', {
        agentName: agentInfo.capabilities.name,
        task: step.task,
        results: this.summarizeAgentResults(result, step.agentId)
      });
      
      this.completeStage(step.agentId, { result });
      
      return result;
      
    } catch (error) {
      this.notifyAgentProgress(step.agentId, 'failed', {
        agentName: agentInfo.capabilities.name,
        task: step.task,
        error: error.message
      });
      
      this.failStage(step.agentId, error.message);
      throw error;
    }
  }

  /**
   * 准备智能体输入数据
   */
  prepareAgentInput(step, previousResults, taskAnalysis) {
    const baseInput = {
      topic: taskAnalysis.primaryObjective,
      complexity: taskAnalysis.complexity,
      requirements: taskAnalysis.requiredCapabilities
    };
    
    // 根据智能体类型添加特定输入
    switch (step.agentId) {
      case 'searcher':
        return {
          ...baseInput,
          queries: this.generateSearchQueries(taskAnalysis),
          timeframe: taskAnalysis.timeframe || 'recent',
          scope: taskAnalysis.complexity === 'simple' ? 'focused' : 'comprehensive'
        };
        
      case 'retriever':
        return {
          ...baseInput,
          searchResults: previousResults.searcher?.results || [],
          requiredDataTypes: taskAnalysis.dataRequirements?.inputTypes || []
        };
        
      case 'analyzer':
        return {
          ...baseInput,
          data: previousResults.retriever?.data || previousResults.searcher?.results || [],
          analysisRequirements: taskAnalysis.subTasks?.map(st => st.task) || []
        };
        
      case 'reporter':
        return {
          ...baseInput,
          analysisResults: previousResults.analyzer || previousResults.retriever || previousResults.searcher,
          structure: this.planReportStructure(taskAnalysis),
          originalQuery: this.currentWorkflow.query
        };
        
      default:
        return baseInput;
    }
  }

  /**
   * 组装最终结果
   */
  assembleFinalResult(results, taskAnalysis) {
    // 根据任务类型组装不同的结果格式
    switch (taskAnalysis.taskType) {
      case 'information_gathering':
        return {
          type: 'information_gathering',
          content: results.searcher || results.retriever,
          summary: this.generateSummary(results, taskAnalysis),
          metadata: {
            taskType: taskAnalysis.taskType,
            complexity: taskAnalysis.complexity,
            agentsUsed: Object.keys(results)
          }
        };
        
      case 'data_analysis':
        return {
          type: 'data_analysis',
          content: results.analyzer,
          summary: this.generateSummary(results, taskAnalysis),
          metadata: {
            taskType: taskAnalysis.taskType,
            complexity: taskAnalysis.complexity,
            agentsUsed: Object.keys(results)
          }
        };
        
      case 'report_generation':
        return {
          type: 'report_generation',
          content: results.reporter,
          summary: this.generateSummary(results, taskAnalysis),
          metadata: {
            taskType: taskAnalysis.taskType,
            complexity: taskAnalysis.complexity,
            agentsUsed: Object.keys(results)
          }
        };
        
      case 'comprehensive_research':
      default:
        return {
          type: 'comprehensive_research',
          content: results.reporter || results.analyzer || results.retriever || results.searcher,
          summary: this.generateSummary(results, taskAnalysis),
          metadata: {
            taskType: taskAnalysis.taskType,
            complexity: taskAnalysis.complexity,
            agentsUsed: Object.keys(results)
          }
        };
    }
  }

  /**
   * 生成结果摘要
   */
  generateSummary(results, taskAnalysis) {
    const agentNames = {
      searcher: '网络搜索员',
      retriever: '信息检索员', 
      analyzer: '数据分析员',
      reporter: '报告撰写员'
    };
    
    const usedAgents = Object.keys(results).map(id => agentNames[id]).join('、');
    
    return `通过${usedAgents}的协作，完成了${taskAnalysis.primaryObjective}任务。`;
  }

  // 回退方法
  fallbackTaskAnalysis(query) {
    return {
      taskType: 'comprehensive_research',
      complexity: 'moderate',
      primaryObjective: query,
      requiredCapabilities: ['web_search', 'content_extraction', 'data_analysis', 'report_writing'],
      dataRequirements: {
        inputTypes: ['text_query'],
        outputTypes: ['reports'],
        dataVolume: 'medium'
      },
      subTasks: [
        { task: '信息收集', priority: 'high', estimatedEffort: 'medium' },
        { task: '数据分析', priority: 'high', estimatedEffort: 'medium' },
        { task: '报告生成', priority: 'high', estimatedEffort: 'medium' }
      ]
    };
  }

  getFallbackAgentSelection(query) {
    return {
      taskAnalysis: this.fallbackTaskAnalysis(query),
      selectedAgents: [
        { agentId: 'searcher', agent: this.agents.searcher, capabilities: this.agentCapabilities.searcher, score: 0.8, executionOrder: 1 },
        { agentId: 'retriever', agent: this.agents.retriever, capabilities: this.agentCapabilities.retriever, score: 0.8, executionOrder: 2 },
        { agentId: 'analyzer', agent: this.agents.analyzer, capabilities: this.agentCapabilities.analyzer, score: 0.8, executionOrder: 3 },
        { agentId: 'reporter', agent: this.agents.reporter, capabilities: this.agentCapabilities.reporter, score: 0.8, executionOrder: 4 }
      ],
      executionPlan: {
        steps: [
          { agentId: 'searcher', agentName: '网络搜索员', task: '执行网络搜索', dependencies: [], estimatedTime: 30000 },
          { agentId: 'retriever', agentName: '信息检索员', task: '提取和结构化信息', dependencies: ['searcher'], estimatedTime: 45000 },
          { agentId: 'analyzer', agentName: '数据分析员', task: '分析数据并生成洞察', dependencies: ['retriever'], estimatedTime: 60000 },
          { agentId: 'reporter', agentName: '报告撰写员', task: '生成专业报告', dependencies: ['analyzer'], estimatedTime: 45000 }
        ],
        totalEstimatedTime: 180000,
        canParallelize: false
      }
    };
  }

  validateAndEnhanceTaskAnalysis(analysis, query) {
    // 验证必需字段
    const requiredFields = ['taskType', 'complexity', 'primaryObjective'];
    for (const field of requiredFields) {
      if (!analysis[field]) {
        analysis[field] = this.getDefaultValue(field, query);
      }
    }
    
    // 增强分析结果
    analysis.timeframe = analysis.timeframe || 'recent';
    analysis.scope = analysis.scope || 'comprehensive';
    
    return analysis;
  }

  getDefaultValue(field, query) {
    const defaults = {
      taskType: 'comprehensive_research',
      complexity: 'moderate',
      primaryObjective: query
    };
    return defaults[field] || '';
  }

  getMatchReason(capabilities, taskAnalysis) {
    const matches = capabilities.capabilities.filter(cap => 
      taskAnalysis.requiredCapabilities?.includes(cap)
    );
    return `匹配能力: ${matches.join(', ')}`;
  }

  summarizeAgentResults(result, agentId) {
    const summaries = {
      searcher: { resultsCount: result.results?.length || 0, queriesUsed: result.metadata?.queriesUsed || 0 },
      retriever: { dataCount: result.data?.length || 0, extractedDocs: result.metadata?.extractedDocs || 0 },
      analyzer: { insightsCount: result.insights?.length || 0, predictionsCount: result.predictions?.length || 0 },
      reporter: { reportSections: result.sections?.length || 0, wordCount: result.metadata?.totalWordCount || 0 }
    };
    return summaries[agentId] || { status: 'completed' };
  }

  // 保持向后兼容的方法
  async shouldActivateMultiAgent(query, llm) {
    const { taskAnalysis } = await this.analyzeTaskAndSelectAgents(query);
    return taskAnalysis.complexity !== 'simple';
  }

  async executeWorkflow(query, context = {}) {
    return this.executeIntelligentWorkflow(query, context);
  }

  /**
   * 需求分析与任务分解
   */
  async analyzeAndBreakdownTask(query, context) {
    logger.info('📋 开始需求分析与任务分解...');
    
    const breakdown = {
      mainTopic: this.extractMainTopic(query),
      subTopics: this.extractSubTopics(query),
      requiredDataTypes: this.identifyDataTypes(query),
      analysisRequirements: this.identifyAnalysisRequirements(query),
      reportStructure: this.planReportStructure(query),
      searchQueries: this.generateSearchQueries(query),
      timeframe: this.extractTimeframe(query) || 'recent',
      scope: this.extractScope(query) || 'comprehensive'
    };
    
    this.sharedMemory.metadata.taskBreakdown = breakdown;
    
    logger.debug('任务分解结果:', breakdown);
    return breakdown;
  }

  /**
   * 执行搜索阶段
   */
  async executeSearchPhase(taskBreakdown) {
    logger.info('🔍 开始网络搜索阶段...');
    
    this.addStage('search', 'running');
    
    try {
      // 通知搜索智能体开始执行
      this.notifyAgentProgress('search', 'start', {
        agentName: '网络搜索员',
        task: '分析搜索需求并制定搜索策略',
        queries: taskBreakdown.searchQueries,
        expectedResults: `预计搜索 ${taskBreakdown.searchQueries.length} 个查询`
      });
      
      // 通知搜索智能体正在分析需求
      this.notifyAgentProgress('search', 'analyzing', {
        agentName: '网络搜索员',
        task: '正在分析搜索需求...',
        details: `主题: ${taskBreakdown.mainTopic}, 范围: ${taskBreakdown.scope}`
      });
      
      const searchResponse = await this.agents.searcher.execute({
        queries: taskBreakdown.searchQueries,
        topic: taskBreakdown.mainTopic,
        timeframe: taskBreakdown.timeframe,
        scope: taskBreakdown.scope,
        dataTypes: taskBreakdown.requiredDataTypes
      });
      
      // 获取实际的搜索结果数组
      const searchResults = searchResponse.results || [];
      
      // 通知搜索智能体执行完成
      this.notifyAgentProgress('search', 'completed', {
        agentName: '网络搜索员',
        task: '搜索任务执行完成',
        results: {
          totalQueries: taskBreakdown.searchQueries.length,
          foundResults: searchResults.length,
          llmCalls: searchResponse.metadata?.llmCalls || 1,
          searchStrategy: searchResponse.strategy,
          qualityResults: searchResults.filter(r => r.llm_evaluation?.overall >= 0.7).length
        },
        summary: searchResponse.summary
      });
      
      this.sharedMemory.searchResults = searchResponse; // 存储完整响应
      this.completeStage('search', { resultsCount: searchResults.length });
      
      return searchResults; // 返回结果数组供下一阶段使用
      
    } catch (error) {
      // 通知搜索智能体执行失败
      this.notifyAgentProgress('search', 'failed', {
        agentName: '网络搜索员',
        task: '搜索任务执行失败',
        error: error.message
      });
      this.failStage('search', error.message);
      throw error;
    }
  }

  /**
   * 执行检索阶段
   */
  async executeRetrievalPhase(searchResults) {
    logger.info('📚 开始信息检索阶段...');
    
    this.addStage('retrieval', 'running');
    
    try {
      // 通知检索智能体开始执行
      this.notifyAgentProgress('retrieval', 'start', {
        agentName: '信息检索员',
        task: '分析搜索结果并制定检索策略',
        inputData: `${searchResults.length} 条搜索结果`,
        expectedOutput: '结构化信息数据'
      });
      
      // 通知检索智能体正在分析内容
      this.notifyAgentProgress('retrieval', 'analyzing', {
        agentName: '信息检索员',
        task: '正在分析和提取关键信息...',
        details: '正在对搜索结果进行内容分析和信息提取'
      });
      
      const retrievalResponse = await this.agents.retriever.execute({
        searchResults,
        requiredDataTypes: this.sharedMemory.metadata.taskBreakdown.requiredDataTypes,
        topic: this.sharedMemory.metadata.taskBreakdown.mainTopic,
        subTopics: this.sharedMemory.metadata.taskBreakdown.subTopics
      });
      
      // 获取实际的结构化数据数组
      const retrievedData = retrievalResponse.data || [];
      
      // 通知检索智能体执行完成
      this.notifyAgentProgress('retrieval', 'completed', {
        agentName: '信息检索员',
        task: '信息检索任务执行完成',
        results: {
          inputResults: searchResults.length,
          extractedData: retrievedData.length,
          llmCalls: retrievalResponse.metadata?.llmCalls || 1,
          dataTypes: retrievalResponse.metadata?.extractedTypes || [],
          knowledgeGraph: retrievalResponse.knowledgeGraph ? '已构建' : '未构建'
        },
        summary: `成功从 ${searchResults.length} 条搜索结果中提取了 ${retrievedData.length} 条结构化数据`
      });
      
      this.sharedMemory.retrievedData = retrievalResponse; // 存储完整响应
      this.completeStage('retrieval', { dataCount: retrievedData.length });
      
      return retrievedData; // 返回数据数组供下一阶段使用
      
    } catch (error) {
      // 通知检索智能体执行失败
      this.notifyAgentProgress('retrieval', 'failed', {
        agentName: '信息检索员',
        task: '信息检索任务执行失败',
        error: error.message
      });
      this.failStage('retrieval', error.message);
      throw error;
    }
  }

  /**
   * 执行分析阶段
   */
  async executeAnalysisPhase(retrievedData, taskBreakdown) {
    logger.info('📊 开始数据分析阶段...');
    
    this.addStage('analysis', 'running');
    
    try {
      // 通知分析智能体开始执行
      this.notifyAgentProgress('analysis', 'start', {
        agentName: '数据分析员',
        task: '分析结构化数据并生成洞察',
        inputData: `${retrievedData.length} 条结构化数据`,
        analysisTypes: taskBreakdown.analysisRequirements
      });
      
      // 通知分析智能体正在分析
      this.notifyAgentProgress('analysis', 'analyzing', {
        agentName: '数据分析员',
        task: '正在进行深度数据分析...',
        details: `分析类型: ${taskBreakdown.analysisRequirements.join(', ')}`
      });
      
      const analysisResponse = await this.agents.analyzer.execute({
        data: retrievedData,
        requirements: taskBreakdown.analysisRequirements,
        topic: taskBreakdown.mainTopic,
        subTopics: taskBreakdown.subTopics,
        reportStructure: taskBreakdown.reportStructure
      });
      
      this.sharedMemory.analysisResults = analysisResponse; // 存储完整分析结果
      
      // 计算分析结果数量（基于洞察和预测数量）
      const analysisCount = (analysisResponse.insights?.length || 0) + (analysisResponse.predictions?.length || 0);
      
      // 通知分析智能体执行完成
      this.notifyAgentProgress('analysis', 'completed', {
        agentName: '数据分析员',
        task: '数据分析任务执行完成',
        results: {
          inputData: retrievedData.length,
          generatedInsights: analysisResponse.insights?.length || 0,
          predictions: analysisResponse.predictions?.length || 0,
          llmCalls: analysisResponse.metadata?.llmCalls || 1,
          qualityScore: analysisResponse.quality?.overall_confidence || 0.8,
          analysisTypes: Object.keys(analysisResponse.analysis || {})
        },
        summary: `成功生成 ${analysisResponse.insights?.length || 0} 个洞察和 ${analysisResponse.predictions?.length || 0} 个预测`
      });
      
      this.completeStage('analysis', { analysisCount });
      
      return analysisResponse; // 返回完整分析结果供下一阶段使用
      
    } catch (error) {
      // 通知分析智能体执行失败
      this.notifyAgentProgress('analysis', 'failed', {
        agentName: '数据分析员',
        task: '数据分析任务执行失败',
        error: error.message
      });
      this.failStage('analysis', error.message);
      throw error;
    }
  }

  /**
   * 执行报告生成阶段
   */
  async executeReportPhase(analysisResults, taskBreakdown) {
    logger.info('📝 开始报告生成阶段...');
    
    this.addStage('report', 'running');
    
    try {
      // 通知报告智能体开始执行
      this.notifyAgentProgress('report', 'start', {
        agentName: '报告撰写员',
        task: '将分析结果转化为专业报告',
        inputData: {
          insights: analysisResults.insights?.length || 0,
          predictions: analysisResults.predictions?.length || 0,
          analysisTypes: Object.keys(analysisResults.analysis || {})
        },
        reportStructure: taskBreakdown.reportStructure
      });
      
      // 通知报告智能体正在生成
      this.notifyAgentProgress('report', 'generating', {
        agentName: '报告撰写员',
        task: '正在生成专业分析报告...',
        details: `预计生成 ${taskBreakdown.reportStructure.sections?.length || 4} 个章节`
      });
      
      const report = await this.agents.reporter.execute({
        analysisResults,
        structure: taskBreakdown.reportStructure,
        topic: taskBreakdown.mainTopic,
        metadata: this.sharedMemory.metadata,
        originalQuery: this.currentWorkflow.query
      });
      
      // 计算报告章节数量
      const reportSections = report.sections?.length || 0;
      
      // 通知报告智能体执行完成
      this.notifyAgentProgress('report', 'completed', {
        agentName: '报告撰写员',
        task: '报告生成任务执行完成',
        results: {
          reportTitle: report.title,
          totalSections: reportSections,
          totalWordCount: report.metadata?.totalWordCount || 0,
          llmCalls: report.metadata?.llmCalls || 1,
          qualityScore: report.qualityAssessment?.overall_score || 0.85,
          executiveSummary: report.executiveSummary ? '已生成' : '未生成'
        },
        summary: `成功生成了包含 ${reportSections} 个章节的专业分析报告`
      });
      
      this.completeStage('report', { reportSections });
      
      return report;
      
    } catch (error) {
      // 通知报告智能体执行失败
      this.notifyAgentProgress('report', 'failed', {
        agentName: '报告撰写员',
        task: '报告生成任务执行失败',
        error: error.message
      });
      this.failStage('report', error.message);
      throw error;
    }
  }

  /**
   * 提取主题
   */
  extractMainTopic(query) {
    // 简单的主题提取逻辑，可以后续优化为LLM提取
    const topicPatterns = [
      /分析(.+?)的/,
      /研究(.+?)的/,
      /(.+?)分析/,
      /(.+?)报告/,
      /(.+?)调研/
    ];
    
    for (const pattern of topicPatterns) {
      const match = query.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    
    // 如果没有匹配到特定模式，返回去除停用词后的关键词
    return query.replace(/请|帮我|给我|分析|研究|报告|调研/g, '').trim();
  }

  /**
   * 提取子主题
   */
  extractSubTopics(query) {
    const subTopics = [];
    
    // 检测常见的分析维度
    const dimensions = {
      '市场': /市场|销售|竞争|份额/,
      '技术': /技术|产品|功能|创新/,
      '财务': /财务|收入|成本|利润|估值/,
      '用户': /用户|客户|体验|需求/,
      '趋势': /趋势|发展|前景|预测/,
      '风险': /风险|挑战|问题|威胁/
    };
    
    for (const [topic, pattern] of Object.entries(dimensions)) {
      if (pattern.test(query)) {
        subTopics.push(topic);
      }
    }
    
    return subTopics.length > 0 ? subTopics : ['概况', '分析', '总结'];
  }

  /**
   * 识别数据类型需求
   */
  identifyDataTypes(query) {
    const dataTypes = [];
    
    const typePatterns = {
      'news': /新闻|资讯|报道/,
      'financial': /财务|财报|股价|市值/,
      'market': /市场|行业|竞争/,
      'research': /研究|论文|报告/,
      'social': /社交|舆论|评价/,
      'statistics': /数据|统计|指标/
    };
    
    for (const [type, pattern] of Object.entries(typePatterns)) {
      if (pattern.test(query)) {
        dataTypes.push(type);
      }
    }
    
    return dataTypes.length > 0 ? dataTypes : ['news', 'research', 'market'];
  }

  /**
   * 识别分析需求
   */
  identifyAnalysisRequirements(query) {
    const requirements = [];
    
    const analysisPatterns = {
      'trend': /趋势|变化|发展/,
      'comparison': /对比|比较|差异/,
      'swot': /优势|劣势|机会|威胁|SWOT/,
      'forecast': /预测|展望|前景/,
      'impact': /影响|效果|作用/
    };
    
    for (const [req, pattern] of Object.entries(analysisPatterns)) {
      if (pattern.test(query)) {
        requirements.push(req);
      }
    }
    
    return requirements.length > 0 ? requirements : ['trend', 'summary'];
  }

  /**
   * 规划报告结构
   */
  planReportStructure(query) {
    // 基础报告结构
    const structure = {
      title: '分析报告',
      sections: [
        { id: 'executive_summary', title: '执行摘要', required: true },
        { id: 'background', title: '背景介绍', required: true },
        { id: 'methodology', title: '研究方法', required: false },
        { id: 'findings', title: '主要发现', required: true },
        { id: 'analysis', title: '深度分析', required: true },
        { id: 'conclusion', title: '结论建议', required: true }
      ]
    };
    
    // 根据查询内容调整结构
    if (/市场|竞争/.test(query)) {
      structure.sections.splice(4, 0, 
        { id: 'market_overview', title: '市场概况', required: true },
        { id: 'competitive_landscape', title: '竞争格局', required: true }
      );
    }
    
    if (/财务|业绩/.test(query)) {
      structure.sections.splice(4, 0,
        { id: 'financial_analysis', title: '财务分析', required: true }
      );
    }
    
    return structure;
  }

  /**
   * 生成搜索查询
   */
  generateSearchQueries(query) {
    const mainTopic = this.extractMainTopic(query);
    const subTopics = this.extractSubTopics(query);
    
    const queries = [
      mainTopic,
      `${mainTopic} 分析`,
      `${mainTopic} 研究报告`,
      `${mainTopic} 市场分析`,
      `${mainTopic} 发展趋势`
    ];
    
    // 添加子主题相关查询
    subTopics.forEach(subTopic => {
      queries.push(`${mainTopic} ${subTopic}`);
    });
    
    return [...new Set(queries)]; // 去重
  }

  /**
   * 提取时间范围
   */
  extractTimeframe(query) {
    const timePatterns = {
      'recent': /最近|近期|当前/,
      '2024': /2024年?/,
      '2023': /2023年?/,
      'yearly': /年度|全年/,
      'quarterly': /季度|季报/,
      'monthly': /月度|月报/
    };
    
    for (const [timeframe, pattern] of Object.entries(timePatterns)) {
      if (pattern.test(query)) {
        return timeframe;
      }
    }
    
    return null;
  }

  /**
   * 提取范围
   */
  extractScope(query) {
    if (/全面|详细|深入|完整/.test(query)) {
      return 'comprehensive';
    } else if (/简要|概要|简单/.test(query)) {
      return 'brief';
    }
    return null;
  }

  // 工作流管理辅助方法
  generateWorkflowId() {
    return `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  addStage(stageName, status, data = {}) {
    const stage = {
      name: stageName,
      status,
      startTime: new Date(),
      data
    };
    
    if (this.currentWorkflow) {
      this.currentWorkflow.stages.push(stage);
    }
    
    return stage;
  }

  completeStage(stageName, result = {}) {
    if (this.currentWorkflow) {
      const stage = this.currentWorkflow.stages.find(s => s.name === stageName && s.status === 'running');
      if (stage) {
        stage.status = 'completed';
        stage.endTime = new Date();
        stage.result = result;
      }
    }
    
    this.notifyStageComplete(stageName, result);
  }

  failStage(stageName, error) {
    if (this.currentWorkflow) {
      const stage = this.currentWorkflow.stages.find(s => s.name === stageName && s.status === 'running');
      if (stage) {
        stage.status = 'failed';
        stage.endTime = new Date();
        stage.error = error;
      }
    }
  }

  clearSharedMemory() {
    this.sharedMemory = {
      searchResults: [],
      retrievedData: [],
      analysisResults: [],
      reportSections: [],
      metadata: {}
    };
  }

  // 通知方法
  notifyProgress(type, data) {
    if (this.onProgress) {
      this.onProgress({ type, data, timestamp: new Date() });
    }
  }
  
  /**
   * 通知智能体执行进度
   */
  notifyAgentProgress(stage, status, details) {
    if (this.onProgress) {
      this.onProgress({ 
        type: 'agent_progress', 
        data: {
          stage,
          status, // start, analyzing, completed, failed
          agentName: details.agentName,
          task: details.task,
          details: details.details,
          results: details.results,
          summary: details.summary,
          error: details.error,
          timestamp: new Date()
        },
        timestamp: new Date() 
      });
    }
  }

  notifyStageComplete(stageName, result) {
    if (this.onStageComplete) {
      this.onStageComplete({ stageName, result, timestamp: new Date() });
    }
  }

  notifyError(error) {
    if (this.onError) {
      this.onError({ error, timestamp: new Date() });
    }
  }

  // 获取工作流状态
  getWorkflowStatus() {
    return this.currentWorkflow ? {
      id: this.currentWorkflow.id,
      status: this.currentWorkflow.status,
      stages: this.currentWorkflow.stages,
      progress: this.calculateProgress()
    } : null;
  }

  calculateProgress() {
    if (!this.currentWorkflow || !this.currentWorkflow.stages) {
      return 0;
    }
    
    const totalStages = 5; // search, retrieval, analysis, report
    const completedStages = this.currentWorkflow.stages.filter(s => s.status === 'completed').length;
    
    return Math.round((completedStages / totalStages) * 100);
  }
}