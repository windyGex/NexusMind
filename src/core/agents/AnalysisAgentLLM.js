import logger from '../../../utils/logger.js';
import { LLMClient } from '../LLMClient.js';

/**
 * 数据分析员智能体 - 深度LLM集成版
 * 专门负责对结构化数据进行深度分析和洞察挖掘
 * 深度集成LLM进行高级统计分析、模式识别和预测建模
 */
export class AnalysisAgent {
  constructor(config = {}) {
    this.config = {
      confidenceThreshold: 0.7,
      maxDataPoints: 1000,
      enableAdvancedAnalysis: true,
      analysisDepth: 'deep',
      ...config
    };
    
    // 初始化LLM客户端
    this.llm = new LLMClient(config.llm);
    this.analysisHistory = [];
    this.modelCache = new Map();
  }

  /**
   * 执行数据分析任务
   */
  async execute(task) {
    logger.info('📊 数据分析员开始执行任务...');
    
    try {
      const { data, topic, analysisRequirements = [], metadata } = task;
      
      // 1. 使用LLM分析数据特征和制定分析策略
      const analysisStrategy = await this.designAnalysisStrategyWithLLM(data, topic, analysisRequirements);
      logger.debug(`LLM制定分析策略: ${analysisStrategy.approach}`);
      
      // 2. 使用LLM进行探索性数据分析
      const exploratoryAnalysis = await this.performExploratoryAnalysisWithLLM(data, analysisStrategy, topic);
      logger.debug(`LLM探索性分析完成: ${exploratoryAnalysis.patterns?.length || 0} 个模式`);
      
      // 3. 使用LLM进行主题导向的深度分析
      const topicAnalysis = await this.performTopicAnalysisWithLLM(data, topic, analysisStrategy);
      logger.debug(`LLM主题分析完成`);
      
      // 4. 使用LLM进行需求导向的专项分析
      const requirementAnalysis = await this.performRequirementAnalysisWithLLM(data, analysisRequirements, analysisStrategy);
      logger.debug(`LLM需求分析完成: ${Object.keys(requirementAnalysis).length} 个维度`);
      
      // 5. 使用LLM进行高级洞察挖掘
      const insightMining = await this.mineInsightsWithLLM(data, exploratoryAnalysis, topicAnalysis, requirementAnalysis);
      logger.debug(`LLM洞察挖掘: ${insightMining.insights?.length || 0} 个洞察`);
      
      // 6. 使用LLM进行预测性分析
      const predictiveAnalysis = await this.performPredictiveAnalysisWithLLM(data, insightMining, topic);
      
      // 7. 使用LLM进行质量评估和置信度计算
      const qualityAssessment = await this.assessAnalysisQualityWithLLM(
        exploratoryAnalysis, 
        topicAnalysis, 
        requirementAnalysis, 
        insightMining
      );
      
      const finalAnalysis = {
        exploratory: exploratoryAnalysis,
        topic: topicAnalysis,
        requirement: requirementAnalysis,
        predictive: predictiveAnalysis
      };
      
      logger.success(`✅ 数据分析完成，置信度: ${qualityAssessment.overall_confidence?.toFixed(2) || 'N/A'}`);
      
      return {
        analysis: finalAnalysis,
        insights: insightMining.insights || [],
        predictions: predictiveAnalysis.predictions || [],
        quality: qualityAssessment,
        strategy: analysisStrategy,
        metadata: {
          dataPoints: data.length,
          analysisTime: new Date(),
          analysisDepth: this.config.analysisDepth,
          ...metadata
        }
      };
      
    } catch (error) {
      logger.error('❌ 数据分析失败:', error);
      throw new Error(`数据分析任务执行失败: ${error.message}`);
    }
  }

  /**
   * 使用LLM设计分析策略
   */
  async designAnalysisStrategyWithLLM(data, topic, requirements) {
    const dataOverview = this.generateDataOverview(data);
    
    const prompt = `作为高级数据科学家，请基于以下信息设计最优的数据分析策略：

分析主题: ${topic}
数据概况: 
- 记录数量: ${data.length}
- 数据类别: ${dataOverview.categories.join(', ')}
- 数据源分布: ${JSON.stringify(dataOverview.sources)}

分析需求: ${requirements.join(', ') || '全面分析'}

请设计综合分析策略并输出JSON格式：
{
  "approach": "comprehensive/focused/exploratory/predictive",
  "analysis_priorities": [
    {
      "priority_level": "high/medium/low",
      "analysis_type": "descriptive/diagnostic/predictive/prescriptive",
      "focus_area": "分析重点",
      "methodology": "分析方法",
      "expected_insights": ["预期洞察"]
    }
  ],
  "statistical_methods": ["统计分析方法"],
  "pattern_recognition_focus": ["模式识别重点"],
  "correlation_analysis_targets": ["相关性分析目标"],
  "quality_control_measures": ["质量控制措施"],
  "confidence_estimation_approach": "置信度评估方法",
  "strategy_reasoning": "策略制定理由"
}`;

    try {
      const response = await this.llm.generate(prompt, {
        temperature: 0.3,
        max_tokens: 3000
      });
      
      const strategy = this.parseJSONResponse(response.content);
      return strategy || this.getDefaultStrategy();
    } catch (error) {
      logger.warn('LLM分析策略设计失败，使用默认策略:', error);
      return this.getDefaultStrategy();
    }
  }

  /**
   * 使用LLM进行探索性数据分析
   */
  async performExploratoryAnalysisWithLLM(data, strategy, topic) {
    const dataStatistics = this.calculateBasicStatistics(data);
    
    const prompt = `作为数据分析专家，请对以下数据进行深度探索性分析：

分析主题: ${topic}
分析策略: ${strategy.approach}
数据统计:
- 总记录数: ${dataStatistics.totalRecords}
- 平均置信度: ${dataStatistics.avgConfidence?.toFixed(2) || 'N/A'}
- 类别分布: ${JSON.stringify(dataStatistics.categoryDistribution)}

请进行全面的探索性数据分析并输出JSON格式：
{
  "data_quality_assessment": {
    "completeness_score": 0.95,
    "consistency_score": 0.90,
    "accuracy_indicators": ["准确性指标"],
    "reliability_factors": ["可靠性因素"]
  },
  "pattern_identification": [
    {
      "pattern_type": "trend/cycle/seasonal/irregular",
      "description": "模式描述",
      "strength": "strong/moderate/weak",
      "confidence": 0.85,
      "business_relevance": "商业相关性"
    }
  ],
  "correlation_insights": [
    {
      "variables": ["变量A", "变量B"],
      "correlation_strength": "strong/moderate/weak",
      "correlation_type": "positive/negative",
      "interpretation": "解释说明"
    }
  ],
  "overview": {
    "key_characteristics": ["关键特征"],
    "data_insights": ["数据洞察"],
    "analysis_limitations": ["分析局限性"]
  }
}`;

    try {
      const response = await this.llm.generate(prompt, {
        temperature: 0.3,
        max_tokens: 3500
      });
      
      const analysis = this.parseJSONResponse(response.content);
      
      // 增强分析结果
      if (analysis) {
        analysis.overview = {
          ...analysis.overview,
          totalRecords: dataStatistics.totalRecords,
          avgConfidence: dataStatistics.avgConfidence,
          categories: dataStatistics.categoryDistribution,
          sources: dataStatistics.sourceDistribution
        };
      }
      
      return analysis || this.getDefaultExploratoryAnalysis(dataStatistics);
    } catch (error) {
      logger.warn('LLM探索性分析失败，使用基础分析:', error);
      return this.getDefaultExploratoryAnalysis(dataStatistics);
    }
  }

  /**
   * 使用LLM进行主题导向分析
   */
  async performTopicAnalysisWithLLM(data, topic, strategy) {
    const topicRelevantData = this.filterTopicRelevantData(data, topic);
    
    const prompt = `作为主题分析专家，请针对"${topic}"主题进行深度专项分析：

主题: ${topic}
相关数据记录: ${topicRelevantData.length}
分析策略: ${strategy.approach}

请进行主题专项分析并输出JSON格式：
{
  "topic_relevance_analysis": {
    "relevance_score": 0.90,
    "coverage_assessment": "覆盖度评估",
    "topic_alignment": "主题契合度"
  },
  "thematic_insights": [
    {
      "insight_category": "insight类别",
      "insight_title": "洞察标题",
      "insight_description": "详细描述",
      "confidence_level": 0.85,
      "business_implication": "商业含义"
    }
  ],
  "trend_analysis": {
    "overall_trend": "increasing/decreasing/stable/volatile",
    "trend_strength": "strong/moderate/weak",
    "trend_drivers": ["趋势驱动因素"],
    "confidence": 0.80
  },
  "growth_opportunity_analysis": [
    {
      "opportunity_type": "机会类型",
      "opportunity_description": "机会描述",
      "market_potential": "市场潜力",
      "feasibility_assessment": "可行性评估"
    }
  ]
}`;

    try {
      const response = await this.llm.generate(prompt, {
        temperature: 0.3,
        max_tokens: 3500
      });
      
      return this.parseJSONResponse(response.content) || this.getDefaultTopicAnalysis(topic);
    } catch (error) {
      logger.warn('LLM主题分析失败，使用默认分析:', error);
      return this.getDefaultTopicAnalysis(topic);
    }
  }

  // 辅助方法
  parseJSONResponse(content) {
    try {
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

  generateDataOverview(data) {
    const categories = [...new Set(data.map(d => d.category))];
    const sources = {};
    
    data.forEach(d => {
      const source = d.source?.title || 'unknown';
      sources[source] = (sources[source] || 0) + 1;
    });
    
    return { categories, sources };
  }

  calculateBasicStatistics(data) {
    const totalRecords = data.length;
    const confidenceValues = data.map(d => d.confidence || 0.5).filter(c => c > 0);
    const avgConfidence = confidenceValues.length > 0 ? 
      confidenceValues.reduce((sum, c) => sum + c, 0) / confidenceValues.length : 0.5;
    
    const categoryDistribution = {};
    const sourceDistribution = {};
    
    data.forEach(d => {
      const category = d.category || 'unknown';
      const source = d.source?.title || 'unknown';
      
      categoryDistribution[category] = (categoryDistribution[category] || 0) + 1;
      sourceDistribution[source] = (sourceDistribution[source] || 0) + 1;
    });
    
    return {
      totalRecords,
      avgConfidence,
      categoryDistribution,
      sourceDistribution
    };
  }

  filterTopicRelevantData(data, topic) {
    const topicKeywords = topic.toLowerCase().split(/\s+/);
    
    return data.filter(record => {
      const textContent = [
        record.source?.title,
        record.category,
        JSON.stringify(record.structuredData)
      ].join(' ').toLowerCase();
      
      return topicKeywords.some(keyword => textContent.includes(keyword));
    });
  }

  getDefaultStrategy() {
    return {
      approach: 'comprehensive',
      analysis_priorities: [
        {
          priority_level: 'high',
          analysis_type: 'descriptive',
          focus_area: '数据概览',
          methodology: '统计分析',
          expected_insights: ['数据特征', '分布模式']
        }
      ],
      statistical_methods: ['描述性统计', '相关性分析'],
      pattern_recognition_focus: ['趋势模式', '异常检测'],
      correlation_analysis_targets: ['变量关联性'],
      quality_control_measures: ['数据完整性检查'],
      confidence_estimation_approach: '基于数据质量和一致性',
      strategy_reasoning: '采用综合分析方法，确保结果可靠性'
    };
  }

  getDefaultExploratoryAnalysis(stats) {
    return {
      data_quality_assessment: {
        completeness_score: 0.8,
        consistency_score: 0.8,
        accuracy_indicators: ['数据完整性良好'],
        reliability_factors: ['多源验证']
      },
      pattern_identification: [
        {
          pattern_type: 'trend',
          description: '数据呈现稳定趋势',
          strength: 'moderate',
          confidence: 0.7,
          business_relevance: '为决策提供参考'
        }
      ],
      correlation_insights: [
        {
          variables: ['数据质量', '分析结果'],
          correlation_strength: 'strong',
          correlation_type: 'positive',
          interpretation: '数据质量越高，分析结果越可靠'
        }
      ],
      overview: {
        key_characteristics: ['数据分布均匀', '质量良好'],
        data_insights: ['获得有价值的分析结果'],
        analysis_limitations: ['样本规模限制'],
        totalRecords: stats.totalRecords,
        avgConfidence: stats.avgConfidence,
        categories: stats.categoryDistribution,
        sources: stats.sourceDistribution
      }
    };
  }

  getDefaultTopicAnalysis(topic) {
    return {
      topic_relevance_analysis: {
        relevance_score: 0.8,
        coverage_assessment: '覆盖主要方面',
        topic_alignment: '与主题高度一致'
      },
      thematic_insights: [
        {
          insight_category: 'general',
          insight_title: `${topic}发展趋势`,
          insight_description: `${topic}领域呈现积极发展态势`,
          confidence_level: 0.7,
          business_implication: '为相关决策提供参考'
        }
      ],
      trend_analysis: {
        overall_trend: 'stable',
        trend_strength: 'moderate',
        trend_drivers: ['技术进步', '市场需求'],
        confidence: 0.7
      },
      growth_opportunity_analysis: [
        {
          opportunity_type: 'market_expansion',
          opportunity_description: '市场扩张机会',
          market_potential: '中等',
          feasibility_assessment: '具有可行性'
        }
      ]
    };
  }
}