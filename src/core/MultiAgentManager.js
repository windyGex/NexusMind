import logger from '../../utils/logger.js';
import { SearchAgent } from './agents/SearchAgentLLM.js';
import { RetrievalAgent } from './agents/RetrievalAgentLLM.js';
import { AnalysisAgent } from './agents/AnalysisAgentLLM.js';
import { ReportAgent } from './agents/ReportAgentLLM.js';

/**
 * 多智能体管理器
 * 负责协调网络搜索员、信息检索员、数据分析员、报告撰写员四个子智能体
 * 自动生成高质量的结构化分析报告
 */
export class MultiAgentManager {
  constructor(config = {}) {
    this.config = {
      maxConcurrentTasks: 3,
      timeout: 300000, // 5分钟超时
      retryAttempts: 2,
      qualityThreshold: 0.8,
      ...config
    };
    
    // 初始化子智能体 - 传递LLM实例
    this.agents = {
      searcher: new SearchAgent({ ...config.searchAgent, llmInstance: config.llm }),
      retriever: new RetrievalAgent({ ...config.retrievalAgent, llmInstance: config.llm }),
      analyzer: new AnalysisAgent({ ...config.analysisAgent, llmInstance: config.llm }),
      reporter: new ReportAgent({ ...config.reportAgent, llmInstance: config.llm })
    };
    
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
   * 使用LLM智能检测用户查询是否需要多智能体协作
   */
  async shouldActivateMultiAgent(query, llm) {
    if (!llm) {
      // 如果没有LLM实例，回退到简化的规则判断
      return this.fallbackRuleBasedDetection(query);
    }

    try {
      const analysisPrompt = `你是一个智能任务分析专家。请分析以下用户查询，判断是否需要启动多智能体协作模式。

多智能体协作模式适用于以下情况：
1. **复杂分析任务**：需要多步骤、多维度深入分析的任务
2. **研究报告生成**：需要搜索、整理、分析、撰写完整报告的任务
3. **综合性调研**：涉及多个数据源和分析角度的任务
4. **专业领域分析**：财务分析、市场研究、行业调研、投资分析等
5. **对比分析**：需要收集多方信息进行对比的任务
6. **趋势预测**：需要历史数据分析和趋势判断的任务

**不适用情况**：
- 简单问答
- 基础信息查询
- 日常对话
- 单一工具就能解决的任务

用户查询: "${query}"

请返回JSON格式的分析结果：
{
  "shouldActivate": true/false,
  "confidence": 0.0-1.0,
  "reasoning": "详细说明判断理由",
  "taskComplexity": "simple/moderate/complex",
  "estimatedStages": ["可能涉及的阶段列表"],
  "keyRequirements": ["关键需求分析"]
}

只返回JSON，不要其他内容。`;

      const response = await llm.generate(analysisPrompt, {
        temperature: 0.3,
        max_tokens: 1000,
        needSendToFrontend: false,
        streaming: false
      });

      try {
        const analysis = JSON.parse(response.content);
        
        // 记录分析结果用于调试
        console.log('🤖 MultiAgent激活分析:', {
          query: query.substring(0, 50) + '...',
          shouldActivate: analysis.shouldActivate,
          confidence: analysis.confidence,
          complexity: analysis.taskComplexity,
          reasoning: analysis.reasoning
        });
        
        // 设置置信度阈值，避免误判
        const confidenceThreshold = 0.7;
        const finalDecision = analysis.shouldActivate && analysis.confidence >= confidenceThreshold;
        
        // 存储分析结果供后续使用
        this.lastAnalysis = {
          ...analysis,
          finalDecision,
          timestamp: new Date()
        };
        
        return finalDecision;
        
      } catch (parseError) {
        console.warn('MultiAgent分析结果JSON解析失败，使用默认判断:', parseError);
        // JSON解析失败时，检查响应中是否包含关键词
        const content = response.content.toLowerCase();
        return content.includes('"shouldactivate": true') || content.includes('shouldactivate":true');
      }
      
    } catch (error) {
      console.error('MultiAgent LLM分析失败，回退到规则判断:', error);
      return this.fallbackRuleBasedDetection(query);
    }
  }
  
  /**
   * 回退的基于规则的检测方法（当LLM不可用时使用）
   */
  fallbackRuleBasedDetection(query) {
    const complexTaskIndicators = [
      /分析报告|研究报告|调研报告|详细分析|深入分析|全面分析|综合分析/i,
      /市场分析|竞品分析|行业分析|数据分析|统计分析|趋势分析/i,
      /财报分析|财务分析|年报分析|季报分析|投资分析|股票分析|公司分析|企业分析/i,
      /评估报告|调查报告|总结报告|完整报告|详细报告|专业报告/i,
      /多维度|多角度|全方位|对比.*分析|研究.*并.*分析|分析.*并.*总结/i,
      /预测|趋势|前景|展望.*分析|未来.*分析/i
    ];
    
    const isComplex = complexTaskIndicators.some(pattern => pattern.test(query));
    
    console.log('📋 回退规则判断:', {
      query: query.substring(0, 50) + '...',
      shouldActivate: isComplex,
      method: 'rule-based'
    });
    
    return isComplex;
  }
  
  /**
   * 获取最近的分析结果
   */
  getLastAnalysis() {
    return this.lastAnalysis;
  }

  /**
   * 执行多智能体协作工作流
   */
  async executeWorkflow(query, context = {}) {
    const workflowId = this.generateWorkflowId();
    
    try {
      this.currentWorkflow = {
        id: workflowId,
        query,
        context,
        startTime: new Date(),
        status: 'running',
        stages: []
      };
      
      logger.info(`🚀 启动多智能体协作工作流: ${workflowId}`);
      this.notifyProgress('workflow_start', { workflowId, query });
      
      // 阶段1: 需求分析与任务分解
      const taskBreakdown = await this.analyzeAndBreakdownTask(query, context);
      this.notifyProgress('task_breakdown', taskBreakdown);
      
      // 阶段2: 网络搜索
      const searchResults = await this.executeSearchPhase(taskBreakdown);
      this.notifyProgress('search_complete', { resultsCount: searchResults.length });
      
      // 阶段3: 信息检索与整理
      const retrievedData = await this.executeRetrievalPhase(searchResults);
      this.notifyProgress('retrieval_complete', { dataCount: retrievedData.length });
      
      // 阶段4: 数据分析
      const analysisResults = await this.executeAnalysisPhase(retrievedData, taskBreakdown);
      this.notifyProgress('analysis_complete', { analysisCount: analysisResults.length });
      
      // 阶段5: 报告生成
      const finalReport = await this.executeReportPhase(analysisResults, taskBreakdown);
      this.notifyProgress('report_complete', { reportLength: finalReport.content.length });
      
      // 完成工作流
      this.currentWorkflow.status = 'completed';
      this.currentWorkflow.endTime = new Date();
      this.currentWorkflow.result = finalReport;
      
      this.workflowHistory.push(this.currentWorkflow);
      
      logger.success(`✅ 多智能体协作工作流完成: ${workflowId}`);
      return finalReport;
      
    } catch (error) {
      logger.error(`❌ 多智能体工作流失败: ${error.message}`);
      
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