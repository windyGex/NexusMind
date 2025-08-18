import { Agent } from './Agent.js';
import { AgentManager } from './AgentManager.js';
import { MemoryManager } from './MemoryManager.js';
import { LLMClient } from './LLMClient.js';
import fs from 'fs';
import logger from '../../utils/logger.js';
/**
 * 通用智能体类
 * 具备规划、搜索、信息提取和综合分析能力
 */
export class UniversalAgent extends Agent {
  constructor(config = {}) {
    super({
      ...config,
      name: config.name || 'UniversalAgent',
      collaborationEnabled: true,
      role: 'coordinator'
    });

    this.agentManager = new AgentManager({
      maxAgents: 5,
      taskTimeout: 60000,
      communicationTimeout: 15000,
      retryAttempts: 3
    });

    this.specializedAgents = {
      planner: null,
      researcher: null,
      analyzer: null,
      reporter: null
    };

    this.workflowState = {
      currentPhase: 'idle',
      taskPlan: null,
      searchResults: [],
      analysisData: [],
      finalReport: null
    };

    // 异步初始化 specialized agents
    this.initializeSpecializedAgents().catch(error => {
      logger.error('初始化 specialized agents 失败:', error);
    });
  }

  /**
   * 初始化专门的Agent
   */
  async initializeSpecializedAgents() {
    // 规划Agent - 负责任务分解和规划
    this.specializedAgents.planner = new Agent({
      name: 'TaskPlanner',
      role: 'planner',
      maxIterations: 5,
      collaborationEnabled: true
    });

    // 研究Agent - 负责搜索和信息收集
    this.specializedAgents.researcher = new Agent({
      name: 'WebResearcher',
      role: 'researcher',
      maxIterations: 8,
      collaborationEnabled: true
    });

    // 分析Agent - 负责信息提取和分析
    this.specializedAgents.analyzer = new Agent({
      name: 'DataAnalyzer',
      role: 'analyzer',
      maxIterations: 6,
      collaborationEnabled: true
    });

    // 报告Agent - 负责生成最终报告
    this.specializedAgents.reporter = new Agent({
      name: 'ReportGenerator',
      role: 'reporter',
      maxIterations: 4,
      collaborationEnabled: true
    });

    // 注册所有Agent到管理器
    this.agentManager.registerAgent(this.specializedAgents.planner, 'planner');
    this.agentManager.registerAgent(this.specializedAgents.researcher, 'researcher');
    this.agentManager.registerAgent(this.specializedAgents.analyzer, 'analyzer');
    this.agentManager.registerAgent(this.specializedAgents.reporter, 'reporter');

    // 启用协作
    this.enableCollaboration(this.agentManager);
    Object.values(this.specializedAgents).forEach(agent => {
      agent.enableCollaboration(this.agentManager);
    });
  }

  /**
   * 确保 specialized agents 已初始化
   */
  async ensureSpecializedAgentsReady() {
    // 等待 specialized agents 初始化完成
    if (!this.specializedAgents.planner || !this.specializedAgents.researcher || 
        !this.specializedAgents.analyzer || !this.specializedAgents.reporter) {
      logger.info('等待 specialized agents 初始化完成...');
      
      const maxWaitTime = 10000; // 10秒超时
      const startTime = Date.now();
      
      await new Promise((resolve, reject) => {
        const checkReady = () => {
          if (this.specializedAgents.planner && this.specializedAgents.researcher && 
              this.specializedAgents.analyzer && this.specializedAgents.reporter) {
            logger.info('所有 specialized agents 已准备就绪');
            resolve();
          } else if (Date.now() - startTime > maxWaitTime) {
            reject(new Error('等待 specialized agents 初始化超时'));
          } else {
            setTimeout(checkReady, 100);
          }
        };
        checkReady();
      });
    }
  }

  /**
   * 处理用户请求的主入口
   */
  async processUniversalRequest(userInput, context = {}) {
    // 确保 specialized agents 已准备就绪
    await this.ensureSpecializedAgentsReady();
    try {
      this.workflowState.currentPhase = 'planning';
      
      // 1. 任务规划阶段
      const plan = await this.planTask(userInput, context);
      this.workflowState.taskPlan = plan;

      // 2. 搜索阶段
      this.workflowState.currentPhase = 'searching';
      const searchResults = await this.executeSearch(plan);
      this.workflowState.searchResults = searchResults;

      // 3. 信息提取和分析阶段
      this.workflowState.currentPhase = 'analyzing';
      const analysisData = await this.analyzeInformation(searchResults, plan);
      this.workflowState.analysisData = analysisData;

      // 4. 报告生成阶段
      this.workflowState.currentPhase = 'reporting';
      const finalReport = await this.generateReport(analysisData, plan, userInput);
      this.workflowState.finalReport = finalReport;

      this.workflowState.currentPhase = 'completed';

      return {
        success: true,
        report: finalReport,
        workflow: this.workflowState
      };

    } catch (error) {
      logger.error('UniversalAgent处理错误:', error);
      this.workflowState.currentPhase = 'error';
      
      // 提供更详细的错误信息
      const errorMessage = error.message || '未知错误';
      logger.error('错误详情:', {
        message: errorMessage,
        stack: error.stack,
        workflowState: this.workflowState
      });
      
      return {
        success: false,
        error: errorMessage,
        workflow: this.workflowState
      };
    }
  }

  /**
   * 任务规划阶段
   */
  async planTask(userInput, context) {
    const planningPrompt = `
你是一个专业的任务规划专家。请根据用户的需求制定详细的工作计划。

用户需求: ${userInput}
上下文信息: ${JSON.stringify(context, null, 2)}

请制定一个包含以下内容的详细计划:
1. 任务目标分析
2. 需要搜索的关键词和主题
3. 信息收集策略
4. 分析重点和方法
5. 报告结构建议

请以JSON格式返回计划:
{
  "taskObjective": "任务目标描述",
  "searchKeywords": ["关键词1", "关键词2", ...],
  "searchTopics": ["主题1", "主题2", ...],
  "informationStrategy": "信息收集策略描述",
  "analysisFocus": ["分析重点1", "分析重点2", ...],
  "reportStructure": {
    "sections": ["章节1", "章节2", ...],
    "keyPoints": ["要点1", "要点2", ...]
  },
  "estimatedSteps": 3
}
`;

    // 直接使用llm.generate，避免通过processInput方法
    const response = await this.specializedAgents.planner.llm.generate(planningPrompt);
    
    try {
      // 清理响应内容，移除可能的Markdown代码块标记
      let cleanedContent = response.content;
      
      // 移除Markdown代码块标记
      cleanedContent = cleanedContent.replace(/```json\s*/g, '');
      cleanedContent = cleanedContent.replace(/```\s*$/g, '');
      
      // 尝试解析JSON
      const plan = JSON.parse(cleanedContent);
      
      // 验证计划对象的基本结构
      if (!plan || typeof plan !== 'object') {
        throw new Error('计划对象无效');
      }
      
      // 确保必要字段存在
      if (!plan.searchKeywords) plan.searchKeywords = [];
      if (!plan.searchTopics) plan.searchTopics = [];
      if (!plan.analysisFocus) plan.analysisFocus = [];
      
      logger.debug('plan计划', plan);
      return plan;
    } catch (error) {
      logger.error('JSON解析失败，尝试备用解析方法:', error);
      // 如果JSON解析失败，尝试提取JSON部分
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const plan = JSON.parse(jsonMatch[0]);
          if (!plan || typeof plan !== 'object') {
            throw new Error('提取的计划对象无效');
          }
          logger.debug('plan计划', plan);
          return plan;
        } catch (secondError) {
          logger.error('备用解析也失败:', secondError);
        }
      }
      throw new Error('无法解析任务计划');
    }
  }

  /**
   * 执行搜索阶段
   */
  async executeSearch(plan) {
    const searchTasks = [];
    
    // 确保 plan 对象存在且包含必要的属性
    if (!plan || typeof plan !== 'object') {
      throw new Error('任务计划无效');
    }
    
    // 为每个关键词和主题创建搜索任务
    const searchKeywords = Array.isArray(plan.searchKeywords) ? plan.searchKeywords : [];
    const searchTopics = Array.isArray(plan.searchTopics) ? plan.searchTopics : [];
    
    for (const keyword of searchKeywords) {
      searchTasks.push({
        type: 'keyword_search',
        query: keyword,
        priority: 'high'
      });
    }

    for (const topic of searchTopics) {
      searchTasks.push({
        type: 'topic_search',
        query: topic,
        priority: 'medium'
      });
    }

    const searchResults = [];
    
    for (const task of searchTasks) {
      try {
        console.log(`开始执行搜索任务: ${task.query}`);
        
        // 直接调用工具，避免通过processInput方法
        const toolResult = await this.tools.execute('intelligent_search_and_analyze', {
          query: task.query,
          options: {
            maxResults: 5,
            scrapePages: true,
            analyzeContent: true
          }
        });
        
        console.log(`搜索任务完成: ${task.query}`, toolResult);
       
        searchResults.push({
          task,
          result: toolResult,
          timestamp: new Date()
        });
      } catch (error) {
        console.error(`搜索任务执行失败: ${task.query}`, error);
        searchResults.push({
          task,
          result: {
            error: error.message,
            message: `搜索任务执行失败: ${error.message}`
          },
          timestamp: new Date()
        });
      }
    }
    
    // 保存搜索结果到文件
    try {
      const fs = await import('fs');
      fs.writeFileSync('search_result.json', JSON.stringify(searchResults, null, 2));
    } catch (error) {
      console.error('保存搜索结果失败:', error);
    }
    
    return searchResults;
  }

  /**
   * 信息分析阶段
   */
  async analyzeInformation(searchResults, plan) {
    // 确保 plan 对象存在且包含必要的属性
    if (!plan || typeof plan !== 'object') {
      throw new Error('任务计划无效');
    }
    
    const analysisFocus = Array.isArray(plan.analysisFocus) ? plan.analysisFocus : [];
    
    // 提取所有搜索结果中的有效数据
    const validResults = searchResults.filter(result => 
      result.result && 
      !result.result.error && 
      typeof result.result === 'object'
    );

    if (validResults.length === 0) {
      return {
        analysis: {
          error: '没有有效的搜索结果可供分析',
          message: '所有搜索任务都失败了，无法进行分析'
        },
        searchResults: searchResults,
        analysisFocus: analysisFocus,
        timestamp: new Date()
      };
    }

    // 优化搜索结果内容，提取关键信息避免token超限
    const optimizedResults = validResults.map((result, index) => {
      const resultData = result.result;
      let optimizedContent = {
        task: result.task.query,
        type: result.task.type,
        summary: ''
      };

      // 如果是智能搜索和分析结果
      if (resultData.result && resultData.result.searchResults) {
        const searchResults = resultData.result.searchResults;
        optimizedContent.summary = `找到 ${searchResults.length} 个搜索结果`;
        
        // 提取前3个搜索结果的关键信息
        if (searchResults.length > 0) {
          optimizedContent.topResults = searchResults.slice(0, 3).map(sr => ({
            title: sr.title || '无标题',
            url: sr.url,
            snippet: sr.snippet ? sr.snippet.substring(0, 200) + '...' : '无摘要'
          }));
        }

        // 如果有抓取的内容分析，提取关键信息
        if (resultData.result.analysis && resultData.result.analysis.length > 0) {
          optimizedContent.contentAnalysis = resultData.result.analysis.slice(0, 2).map(analysis => ({
            url: analysis.url,
            keyTopics: analysis.analysis?.keyTopics?.slice(0, 5) || [],
            sentiment: analysis.analysis?.sentiment || 'neutral',
            wordCount: analysis.analysis?.wordCount || 0
          }));
        }
      } else if (resultData.results) {
        // 如果是普通搜索结果
        optimizedContent.summary = `找到 ${resultData.results.length} 个搜索结果`;
        if (resultData.results.length > 0) {
          optimizedContent.topResults = resultData.results.slice(0, 3).map(sr => ({
            title: sr.title || '无标题',
            url: sr.url,
            snippet: sr.snippet ? sr.snippet.substring(0, 200) + '...' : '无摘要'
          }));
        }
      } else {
        // 其他类型的结果
        optimizedContent.summary = '搜索结果格式未知';
      }

      return optimizedContent;
    });

    const analysisPrompt = `
你是一个专业的数据分析师。请分析以下搜索结果并提取关键信息:

搜索结果数量: ${validResults.length}
分析重点: ${JSON.stringify(analysisFocus, null, 2)}

搜索结果摘要:
${optimizedResults.map((result, index) => `
任务 ${index + 1}: ${result.task}
结果类型: ${result.type}
结果摘要: ${result.summary}
${result.topResults ? `前3个结果:
${result.topResults.map((tr, i) => `  ${i+1}. ${tr.title} (${tr.url})
    摘要: ${tr.snippet}`).join('\n')}` : ''}
${result.contentAnalysis ? `内容分析:
${result.contentAnalysis.map((ca, i) => `  ${i+1}. ${ca.url}
    关键词: ${JSON.stringify(ca.keyTopics)}
    情感: ${ca.sentiment}
    字数: ${ca.wordCount}`).join('\n')}` : ''}
`).join('\n')}

请进行以下分析:
1. 信息提取和整理 - 从所有搜索结果中提取关键信息
2. 关键数据识别 - 识别重要的数据点、统计信息、趋势等
3. 相关性分析 - 分析不同搜索结果之间的关联性
4. 可信度评估 - 评估信息来源的可信度
5. 综合结论 - 基于所有信息得出综合结论

请以结构化的JSON格式返回分析结果，包含以下字段：
- summary: 总体摘要
- keyFindings: 关键发现
- dataPoints: 重要数据点
- trends: 发现的趋势
- credibility: 可信度评估
- conclusions: 结论
- recommendations: 建议

请确保分析结果详细、准确且有用。
`;

    try {
      // 直接使用llm.generate，避免通过processInput方法
      console.log(`analysisPrompt ${analysisPrompt.length}`, analysisPrompt);
      const analysisResult = await this.specializedAgents.analyzer.llm.generate(analysisPrompt);
      
      return {
        analysis: analysisResult,
        searchResults: searchResults,
        analysisFocus: analysisFocus,
        validResultsCount: validResults.length,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('信息分析失败:', error);
      return {
        analysis: {
          error: error.message,
          message: '信息分析过程中发生错误'
        },
        searchResults: searchResults,
        analysisFocus: analysisFocus,
        timestamp: new Date()
      };
    }
  }

  /**
   * 生成最终报告
   */
  async generateReport(analysisData, plan, originalRequest) {
    // 确保 plan 对象存在
    if (!plan || typeof plan !== 'object') {
      throw new Error('任务计划无效');
    }
    
    // 检查分析数据是否有效
    if (!analysisData || !analysisData.analysis) {
      return {
        error: '分析数据无效',
        message: '无法生成报告，分析数据缺失或无效'
      };
    }

    const reportPrompt = `
你是一个专业的报告撰写专家。请根据以下信息生成一份详细的Markdown格式报告:

原始需求: ${originalRequest}
任务计划: ${JSON.stringify(plan, null, 2)}
分析数据: ${JSON.stringify(analysisData, null, 2)}

请生成一份结构化的报告，包含以下部分：

# 研究报告

## 执行摘要
- 研究目的和目标
- 主要发现
- 关键结论

## 研究方法
- 搜索策略
- 数据收集方法
- 分析框架

## 主要发现
- 关键信息点
- 重要数据
- 趋势分析

## 详细分析
- 信息整合
- 相关性分析
- 可信度评估

## 结论与建议
- 综合结论
- 行动建议
- 后续研究方向

## 参考资料
- 信息来源
- 数据来源

请确保报告：
1. 结构清晰，逻辑连贯
2. 内容详实，数据准确
3. 语言专业，表达清晰
4. 格式规范，易于阅读
5. 包含所有重要信息

请直接返回完整的Markdown格式报告，不要包含其他说明文字。
`;

    try {
      // 直接使用llm.generate，避免通过processInput方法
      const reportResult = await this.specializedAgents.reporter.llm.generate(reportPrompt);
      
      return {
        success: true,
        report: reportResult.content,
        metadata: {
          originalRequest,
          plan,
          analysisData,
          generatedAt: new Date(),
          reportLength: typeof reportResult.content === 'string' ? reportResult.content.length : 0
        }
      };
    } catch (error) {
      console.error('报告生成失败:', error);
      return {
        success: false,
        error: error.message,
        message: '报告生成过程中发生错误',
        metadata: {
          originalRequest,
          plan,
          analysisData,
          generatedAt: new Date()
        }
      };
    }
  }

  /**
   * 获取工作流状态
   */
  getWorkflowStatus() {
    return {
      currentPhase: this.workflowState.currentPhase,
      progress: this.calculateProgress(),
      agents: this.agentManager.getAllAgentStatus(),
      stats: this.agentManager.getStats()
    };
  }

  /**
   * 计算进度
   */
  calculateProgress() {
    const phases = ['planning', 'searching', 'analyzing', 'reporting', 'completed'];
    const currentIndex = phases.indexOf(this.workflowState.currentPhase);
    return currentIndex >= 0 ? (currentIndex / (phases.length - 1)) * 100 : 0;
  }

  /**
   * 重置工作流
   */
  resetWorkflow() {
    this.workflowState = {
      currentPhase: 'idle',
      taskPlan: null,
      searchResults: [],
      analysisData: [],
      finalReport: null
    };
  }
} 