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
    
    // 初始化子智能体 - 深度LLM集成版本
    this.agents = {
      searcher: new SearchAgent({ ...config.searchAgent, llm: config.llm }),
      retriever: new RetrievalAgent({ ...config.retrievalAgent, llm: config.llm }),
      analyzer: new AnalysisAgent({ ...config.analysisAgent, llm: config.llm }),
      reporter: new ReportAgent({ ...config.reportAgent, llm: config.llm })
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
   * 检测用户查询是否需要多智能体协作
   */
  shouldActivateMultiAgent(query) {
    const reportTriggers = [
      /分析报告|研究报告|调研报告|详细分析/i,
      /深入分析|全面分析|综合分析/i,
      /市场分析|竞品分析|行业分析/i,
      /数据分析|统计分析|趋势分析/i,
      /评估报告|调查报告|总结报告/i,
      /完整报告|详细报告|专业报告/i,
      /多维度|多角度|全方位/i,
      /研究.*并.*分析|分析.*并.*总结/i
    ];
    
    return reportTriggers.some(pattern => pattern.test(query));
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
      const searchResults = await this.agents.searcher.execute({
        queries: taskBreakdown.searchQueries,
        topic: taskBreakdown.mainTopic,
        timeframe: taskBreakdown.timeframe,
        scope: taskBreakdown.scope,
        dataTypes: taskBreakdown.requiredDataTypes
      });
      
      this.sharedMemory.searchResults = searchResults;
      this.completeStage('search', { resultsCount: searchResults.length });
      
      return searchResults;
      
    } catch (error) {
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
      const retrievedData = await this.agents.retriever.execute({
        searchResults,
        requiredDataTypes: this.sharedMemory.metadata.taskBreakdown.requiredDataTypes,
        topic: this.sharedMemory.metadata.taskBreakdown.mainTopic,
        subTopics: this.sharedMemory.metadata.taskBreakdown.subTopics
      });
      
      this.sharedMemory.retrievedData = retrievedData;
      this.completeStage('retrieval', { dataCount: retrievedData.length });
      
      return retrievedData;
      
    } catch (error) {
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
      const analysisResults = await this.agents.analyzer.execute({
        data: retrievedData,
        requirements: taskBreakdown.analysisRequirements,
        topic: taskBreakdown.mainTopic,
        subTopics: taskBreakdown.subTopics,
        reportStructure: taskBreakdown.reportStructure
      });
      
      this.sharedMemory.analysisResults = analysisResults;
      this.completeStage('analysis', { analysisCount: analysisResults.length });
      
      return analysisResults;
      
    } catch (error) {
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
      const report = await this.agents.reporter.execute({
        analysisResults,
        structure: taskBreakdown.reportStructure,
        topic: taskBreakdown.mainTopic,
        metadata: this.sharedMemory.metadata,
        originalQuery: this.currentWorkflow.query
      });
      
      this.completeStage('report', { reportSections: report.sections.length });
      
      return report;
      
    } catch (error) {
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