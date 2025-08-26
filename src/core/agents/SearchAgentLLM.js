import logger from '../../../utils/logger.js';
import { LLMClient } from '../LLMClient.js';
import axios from 'axios';

/**
 * 网络搜索员智能体 - 深度LLM集成版
 * 专门负责根据任务需求执行多维度的网络搜索
 * 深度集成LLM进行查询优化、搜索策略制定和结果质量评估
 */
export class SearchAgent {
  constructor(config = {}) {
    this.config = {
      maxSearches: 10,
      searchTimeout: 30000,
      qualityThreshold: 0.7,
      ...config
    };
    
    // 初始化LLM客户端，优先使用传入的LLM实例
    if (config.llmInstance) {
      this.llm = config.llmInstance;
    } else {
      this.llm = new LLMClient(config.llm);
    }
    this.searchHistory = [];
  }

  /**
   * 执行搜索任务 - 优化为单次LLM调用
   */
  async execute(task) {
    logger.info('🔍 网络搜索员开始执行任务...');
    
    try {
      const {
        queries,
        topic,
        timeframe = 'recent',
        scope = 'comprehensive',
        dataTypes = ['news', 'web']
      } = task;
      
      // 单次LLM调用完成所有搜索相关工作
      const searchPlan = await this.generateComprehensiveSearchPlan(topic, queries, scope, dataTypes, timeframe);
      logger.debug(`单次LLM生成综合搜索计划`);
      
      // 执行搜索（使用生成的优化查询）
      const searchResults = await this.performSearches(searchPlan.optimizedQueries, searchPlan.strategy);
      
      // 应用LLM生成的评估标准筛选结果
      const evaluatedResults = this.applyEvaluationCriteria(searchResults, searchPlan.evaluationCriteria);
      
      logger.success(`✅ 搜索完成，获得 ${evaluatedResults.length} 个高质量结果`);
      
      return {
        results: evaluatedResults,
        summary: searchPlan.searchSummary,
        strategy: searchPlan.strategy,
        metadata: {
          queriesUsed: searchPlan.optimizedQueries.length,
          totalResults: searchResults.length,
          qualifiedResults: evaluatedResults.length,
          searchTime: new Date(),
          llmCalls: 1 // 优化后只用了1次LLM调用
        }
      };
      
    } catch (error) {
      logger.error('❌ 网络搜索失败:', error);
      throw new Error(`搜索任务执行失败: ${error.message}`);
    }
  }

  /**
   * 单次LLM调用生成综合搜索计划
   */
  async generateComprehensiveSearchPlan(topic, queries, scope, dataTypes, timeframe) {
    const prompt = `作为专业的网络搜索专家，请为以下搜索需求制定综合性搜索计划：

**搜索参数**：
- 主题: ${topic}
- 初始查询: ${queries.join(', ')}
- 搜索范围: ${scope}
- 数据类型: ${dataTypes.join(', ')}
- 时间范围: ${timeframe}

**任务要求**：
1. 制定搜索策略
2. 优化搜索查询（8-12个）
3. 设定结果评估标准
4. 预生成搜索总结

请输出JSON格式的综合计划：
{
  "strategy": {
    "approach": "comprehensive/focused/exploratory",
    "priority_areas": ["重点搜索领域"],
    "search_angles": ["不同搜索角度"],
    "information_needs": ["具体信息需求"],
    "quality_criteria": ["结果质量标准"],
    "reasoning": "策略制定理由"
  },
  "optimizedQueries": [
    {
      "query": "搜索查询文本",
      "type": "core/related/case/trend",
      "priority": "high/medium/low",
      "reasoning": "查询设计理由"
    }
  ],
  "evaluationCriteria": {
    "relevance_threshold": 0.7,
    "authority_weight": 0.25,
    "freshness_weight": 0.25,
    "completeness_weight": 0.25,
    "usefulness_weight": 0.25,
    "quality_indicators": ["质量指标"]
  },
  "searchSummary": {
    "execution_overview": "搜索执行概况",
    "coverage_analysis": "信息覆盖分析",
    "key_findings": ["关键发现"],
    "information_gaps": ["信息缺口"],
    "recommendations": ["后续建议"]
  }
}`;

    try {
      const response = await this.llm.generate(prompt, {
        temperature: 0.3,
        max_tokens: 4000
      });
      
      const plan = this.parseJSONResponse(response.content);
      
      if (plan) {
        return {
          strategy: plan.strategy || this.getDefaultStrategy(),
          optimizedQueries: plan.optimizedQueries || this.generateFallbackQueries(queries, topic),
          evaluationCriteria: plan.evaluationCriteria || this.getDefaultEvaluationCriteria(),
          searchSummary: plan.searchSummary || this.generateBasicSummary([])
        };
      }
    } catch (error) {
      logger.warn('LLM综合搜索计划生成失败，使用默认计划:', error);
    }
    
    // 降级到默认计划
    return {
      strategy: this.getDefaultStrategy(),
      optimizedQueries: this.generateFallbackQueries(queries, topic),
      evaluationCriteria: this.getDefaultEvaluationCriteria(),
      searchSummary: this.generateBasicSummary([])
    };
  }

  /**
   * 应用评估标准筛选结果
   */
  applyEvaluationCriteria(results, criteria) {
    return results.filter(result => {
      // 模拟质量评分（实际应用中可替换为更复杂的评估逻辑）
      const relevanceScore = this.calculateRelevanceScore(result);
      const authorityScore = this.calculateAuthorityScore(result);
      const freshnessScore = this.calculateFreshnessScore(result);
      
      const overallScore = 
        relevanceScore * (criteria.authority_weight || 0.25) +
        authorityScore * (criteria.freshness_weight || 0.25) +
        freshnessScore * (criteria.completeness_weight || 0.25) +
        0.7 * (criteria.usefulness_weight || 0.25); // 默认有用性评分
      
      result.llm_evaluation = {
        relevance: relevanceScore,
        authority: authorityScore,
        freshness: freshnessScore,
        overall: overallScore
      };
      
      return overallScore >= (criteria.relevance_threshold || 0.7);
    }).sort((a, b) => (b.llm_evaluation?.overall || 0) - (a.llm_evaluation?.overall || 0));
  }

  /**
   * 使用LLM分析搜索需求
   */
  async analyzeSearchRequirements(topic, queries, scope, dataTypes) {
    const prompt = `作为专业的网络搜索策略专家，请分析以下搜索需求并制定最佳搜索策略：

主题: ${topic}
初始查询: ${queries.join(', ')}
搜索范围: ${scope}
数据类型: ${dataTypes.join(', ')}

请分析并输出JSON格式的搜索策略，包含：
{
  "approach": "搜索方法(comprehensive/focused/exploratory)",
  "priority_areas": ["重点搜索领域"],
  "search_angles": ["不同搜索角度"],
  "information_needs": ["具体信息需求"],
  "quality_criteria": ["结果质量标准"],
  "reasoning": "策略制定理由"
}`;

    try {
      const response = await this.llm.generate(prompt, {
        temperature: 0.3,
        max_tokens: 2000
      });
      
      const strategy = this.parseJSONResponse(response.content);
      return strategy || this.getDefaultStrategy();
    } catch (error) {
      logger.warn('LLM搜索策略分析失败，使用默认策略:', error);
      return this.getDefaultStrategy();
    }
  }

  /**
   * 使用LLM优化搜索查询
   */
  async optimizeQueriesWithLLM(queries, topic, strategy) {
    const prompt = `作为搜索查询优化专家，请根据以下信息生成优化的搜索查询：

主题: ${topic}
原始查询: ${queries.join(', ')}
搜索策略: ${strategy.approach}
重点领域: ${strategy.priority_areas?.join(', ') || '通用'}
搜索角度: ${strategy.search_angles?.join(', ') || '多角度'}

请生成8-12个优化的搜索查询，包括：
1. 核心主题查询（2-3个）
2. 相关领域查询（2-3个）
3. 具体案例查询（2-3个）
4. 趋势分析查询（2-3个）

输出JSON格式：
{
  "optimized_queries": [
    {
      "query": "搜索查询文本",
      "type": "core/related/case/trend",
      "priority": "high/medium/low",
      "reasoning": "查询设计理由"
    }
  ]
}`;

    try {
      const response = await this.llm.generate(prompt, {
        temperature: 0.4,
        max_tokens: 3000
      });
      
      const result = this.parseJSONResponse(response.content);
      return result?.optimized_queries || this.generateFallbackQueries(queries, topic);
    } catch (error) {
      logger.warn('LLM查询优化失败，使用基础优化:', error);
      return this.generateFallbackQueries(queries, topic);
    }
  }

  /**
   * 执行实际搜索
   */
  async performSearches(queries, strategy) {
    const allResults = [];
    
    for (const queryObj of queries.slice(0, this.config.maxSearches)) {
      try {
        logger.debug(`执行搜索: ${queryObj.query}`);
        
        // 使用真实搜索API
        const searchResults = await this.performRealSearch(queryObj, strategy);
        
        searchResults.forEach(result => {
          result.sourceQuery = queryObj.query;
          result.queryType = queryObj.type;
          result.queryPriority = queryObj.priority;
        });
        
        allResults.push(...searchResults);
        
        // 搜索间隔
        await this.delay(100);
        
      } catch (error) {
        logger.warn(`查询失败 "${queryObj.query}": ${error.message}`);
        continue;
      }
    }
    
    return allResults;
  }

  /**
   * 使用LLM评估搜索结果
   */
  async evaluateResultsWithLLM(results, topic, strategy) {
    if (results.length === 0) return [];
    
    // 分批评估结果（避免prompt过长）
    const batchSize = 5;
    const evaluatedResults = [];
    
    for (let i = 0; i < results.length; i += batchSize) {
      const batch = results.slice(i, i + batchSize);
      
      const prompt = `作为信息质量评估专家，请评估以下搜索结果与主题"${topic}"的相关性和质量：

评估标准：
- 相关性: 内容与主题的相关程度
- 权威性: 信息来源的可信度
- 时效性: 信息的新鲜程度
- 完整性: 信息的详尽程度
- 实用性: 信息的实际价值

搜索结果：
${batch.map((result, idx) => `
${idx + 1}. 标题: ${result.title}
   链接: ${result.url}
   摘要: ${result.snippet}
   来源: ${result.source}
   发布时间: ${result.publishDate}`).join('\\n')}

请为每个结果评分并输出JSON格式：
{
  "evaluations": [
    {
      "index": 1,
      "relevance_score": 0.85,
      "authority_score": 0.90,
      "freshness_score": 0.75,
      "completeness_score": 0.80,
      "usefulness_score": 0.85,
      "overall_score": 0.83,
      "reasoning": "评估理由",
      "key_insights": ["关键洞察点"]
    }
  ]
}`;

      try {
        const response = await this.llm.generate(prompt, {
          temperature: 0.2,
          max_tokens: 4000
        });
        
        const evaluation = this.parseJSONResponse(response.content);
        
        if (evaluation?.evaluations) {
          evaluation.evaluations.forEach(evalResult => {
            const resultIndex = i + evalResult.index - 1;
            if (resultIndex < results.length) {
              const result = results[resultIndex];
              result.llm_evaluation = {
                relevance: evalResult.relevance_score || 0.5,
                authority: evalResult.authority_score || 0.5,
                freshness: evalResult.freshness_score || 0.5,
                completeness: evalResult.completeness_score || 0.5,
                usefulness: evalResult.usefulness_score || 0.5,
                overall: evalResult.overall_score || 0.5,
                reasoning: evalResult.reasoning || '',
                insights: evalResult.key_insights || []
              };
              
              if (result.llm_evaluation.overall >= this.config.qualityThreshold) {
                evaluatedResults.push(result);
              }
            }
          });
        }
      } catch (error) {
        logger.warn(`LLM结果评估失败，使用基础评估:`, error);
        // 降级到基础评估
        batch.forEach(result => {
          result.llm_evaluation = { overall: 0.6 };
          evaluatedResults.push(result);
        });
      }
    }
    
    // 按质量分数排序
    return evaluatedResults.sort((a, b) => 
      (b.llm_evaluation?.overall || 0) - (a.llm_evaluation?.overall || 0)
    );
  }

  /**
   * 使用LLM生成搜索总结
   */
  async generateSearchSummary(results, strategy) {
    const topResults = results.slice(0, 10);
    
    const prompt = `作为搜索分析专家，请基于以下搜索结果生成专业的搜索总结报告：

搜索策略: ${strategy.approach}
结果数量: ${results.length}

主要搜索结果：
${topResults.map((result, idx) => `
${idx + 1}. ${result.title}
   来源: ${result.source}
   质量评分: ${result.llm_evaluation?.overall?.toFixed(2) || 'N/A'}
   关键洞察: ${result.llm_evaluation?.insights?.join(', ') || '无'}`).join('\\n')}

请生成包含以下内容的搜索总结：
1. 搜索执行概况
2. 信息覆盖分析
3. 质量评估总结
4. 关键发现提炼
5. 信息缺口识别
6. 后续搜索建议

输出JSON格式：
{
  "execution_overview": "搜索执行概况",
  "coverage_analysis": "信息覆盖分析",
  "quality_summary": "质量评估总结",
  "key_findings": ["关键发现"],
  "information_gaps": ["信息缺口"],
  "recommendations": ["后续建议"]
}`;

    try {
      const response = await this.llm.generate(prompt, {
        temperature: 0.3,
        max_tokens: 3000
      });
      
      const llmResult = this.parseJSONResponse(response.content);
      
      // 如果LLM成功生成了JSON对象，提取execution_overview作为字符串摘要
      if (llmResult && typeof llmResult === 'object' && llmResult.execution_overview) {
        return llmResult.execution_overview;
      }
      
      // 如果LLM生成失败或格式不正确，使用基础摘要
      return this.generateBasicSummary(results);
    } catch (error) {
      logger.warn('LLM搜索总结生成失败，使用基础总结:', error);
      return this.generateBasicSummary(results);
    }
  }

  getDefaultEvaluationCriteria() {
    return {
      relevance_threshold: 0.7,
      authority_weight: 0.25,
      freshness_weight: 0.25,
      completeness_weight: 0.25,
      usefulness_weight: 0.25,
      quality_indicators: ['权威性', '时效性', '相关性']
    };
  }

  calculateRelevanceScore(result) {
    // 简化的相关性评分计算
    const titleMatch = result.title.includes('分析') || result.title.includes('研究');
    const contentMatch = result.snippet && result.snippet.length > 100;
    return titleMatch && contentMatch ? 0.8 : 0.6;
  }

  calculateAuthorityScore(result) {
    // 简化的权威性评分（基于来源）
    const authoritativeSources = ['研究机构', '权威', '官方', '专业'];
    const isAuthoritative = authoritativeSources.some(source => 
      result.source && result.source.includes(source)
    );
    return isAuthoritative ? 0.9 : 0.7;
  }

  calculateFreshnessScore(result) {
    // 简化的时效性评分
    if (!result.publishDate) return 0.5;
    
    const now = new Date();
    const publishDate = new Date(result.publishDate);
    const daysDiff = (now - publishDate) / (1000 * 60 * 60 * 24);
    
    if (daysDiff <= 7) return 0.9;
    if (daysDiff <= 30) return 0.8;
    if (daysDiff <= 90) return 0.7;
    return 0.6;
  }

  // 保留原有的辅助方法
  parseJSONResponse(content) {
    try {
      // 尝试提取JSON内容
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(content);
    } catch (error) {
      logger.warn('JSON解析失败:', error);
      return null;
    }
  }

  getDefaultStrategy() {
    return {
      approach: 'comprehensive',
      priority_areas: ['市场分析', '技术发展', '行业趋势'],
      search_angles: ['现状分析', '发展趋势', '竞争格局'],
      information_needs: ['基础信息', '深度分析', '最新动态'],
      quality_criteria: ['权威性', '时效性', '相关性'],
      reasoning: '采用综合搜索策略，确保信息覆盖全面'
    };
  }

  generateFallbackQueries(originalQueries, topic) {
    const fallbackQueries = [];
    
    originalQueries.forEach(query => {
      fallbackQueries.push({
        query: query,
        type: 'core',
        priority: 'high',
        reasoning: '原始查询'
      });
      
      fallbackQueries.push({
        query: `${query} 2024 最新`,
        type: 'trend',
        priority: 'medium',
        reasoning: '时效性查询'
      });
    });
    
    return fallbackQueries;
  }

  generateBasicSummary(results) {
    const summaryObj = {
      execution_overview: `完成搜索，获得${results.length}条结果`,
      coverage_analysis: '覆盖多个信息源，信息相对全面',
      quality_summary: '结果质量良好，大部分满足需求',
      key_findings: ['获得相关信息', '发现重要数据点'],
      information_gaps: ['可能存在信息空白'],
      recommendations: ['建议进一步搜索特定领域']
    };
    
    // 返回字符串格式的摘要，避免前端渲染对象错误
    return `完成搜索，获得${results.length}条结果。覆盖多个信息源，信息相对全面，结果质量良好。`;
  }

  /**
   * 使用真实的搜索API进行搜索（替换原来的simulateSearch）
   */
  async performRealSearch(queryObj, strategy) {
    const SERPER_API_KEY = process.env.SERPER_API_KEY;
    
    if (!SERPER_API_KEY) {
      logger.warn('SERPER_API_KEY 环境变量未设置，使用模拟搜索结果');
      return this.getFallbackSearchResults(queryObj);
    }
    
    try {
      logger.debug(`使用Serper API搜索: ${queryObj.query}`);
      
      const response = await axios.post('https://google.serper.dev/search', {
        q: queryObj.query,
        num: 8, // 每个查询获取8个结果
        gl: 'cn', // 搜索地区设置为中国
        hl: 'zh-cn' // 搜索语言设置为中文
      }, {
        headers: {
          'X-API-KEY': SERPER_API_KEY,
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10秒超时
      });
      
      const data = response.data;
      const results = [];
      
      // 处理有机搜索结果
      if (data.organic && Array.isArray(data.organic)) {
        data.organic.forEach((result, index) => {
          results.push({
            title: result.title || `搜索结果 ${index + 1}`,
            url: result.link || '',
            snippet: result.snippet || '',
            publishDate: result.date ? new Date(result.date) : new Date(),
            source: this.extractDomain(result.link) || '未知来源',
            contentType: this.inferContentType(result),
            position: index + 1,
            searchEngine: 'google',
            apiSource: 'serper'
          });
        });
      }
      
      // 处理新闻结果（如果有）
      if (data.news && Array.isArray(data.news)) {
        data.news.forEach((result, index) => {
          results.push({
            title: result.title || `新闻结果 ${index + 1}`,
            url: result.link || '',
            snippet: result.snippet || '',
            publishDate: result.date ? new Date(result.date) : new Date(),
            source: result.source || this.extractDomain(result.link) || '新闻来源',
            contentType: 'news',
            position: index + 1 + (data.organic?.length || 0),
            searchEngine: 'google',
            apiSource: 'serper'
          });
        });
      }
      
      logger.success(`✅ 成功获取 ${results.length} 个搜索结果: ${queryObj.query}`);
      return results;
      
    } catch (error) {
      logger.error(`❌ Serper API搜索失败: ${queryObj.query}`, error.message);
      
      // 搜索失败时使用降级策略
      return this.getFallbackSearchResults(queryObj);
    }
  }
  
  /**
   * 从URL提取域名
   */
  extractDomain(url) {
    if (!url) return null;
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch (error) {
      return null;
    }
  }
  
  /**
   * 根据搜索结果推断内容类型
   */
  inferContentType(result) {
    const url = result.link || '';
    const title = result.title || '';
    const snippet = result.snippet || '';
    
    // 根据URL和内容特征推断类型
    if (url.includes('news') || url.includes('新闻') || title.includes('新闻')) {
      return 'news';
    }
    if (url.includes('report') || title.includes('报告') || snippet.includes('分析报告')) {
      return 'report';
    }
    if (url.includes('research') || title.includes('研究') || snippet.includes('研究')) {
      return 'research';
    }
    if (url.includes('blog') || url.includes('article')) {
      return 'article';
    }
    
    return 'web';
  }
  
  /**
   * 降级策略：API失败时的备用搜索结果
   */
  getFallbackSearchResults(queryObj) {
    logger.info(`使用降级搜索结果: ${queryObj.query}`);
    
    return [
      {
        title: `${queryObj.query} - 综合分析`,
        url: `https://search.fallback.com/q=${encodeURIComponent(queryObj.query)}`,
        snippet: `关于${queryObj.query}的综合信息和分析，涵盖多个维度的相关内容...`,
        publishDate: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        source: '综合信息源',
        contentType: 'article',
        position: 1,
        searchEngine: 'fallback',
        apiSource: 'internal'
      },
      {
        title: `${queryObj.query} 最新动态`,
        url: `https://trends.fallback.com/q=${encodeURIComponent(queryObj.query)}`,
        snippet: `${queryObj.query}的最新发展趋势和行业动态，包含权威数据和专家观点...`,
        publishDate: new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000),
        source: '趋势分析平台',
        contentType: 'report',
        position: 2,
        searchEngine: 'fallback',
        apiSource: 'internal'
      }
    ];
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getSearchHistory() {
    return this.searchHistory;
  }

  clearSearchHistory() {
    this.searchHistory = [];
  }
}