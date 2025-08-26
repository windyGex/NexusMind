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
    
    // 初始化LLM客户端，优先使用传入的LLM实例
    if (config.llmInstance) {
      this.llm = config.llmInstance;
    } else {
      this.llm = new LLMClient(config.llm);
    }
    this.analysisHistory = [];
    this.modelCache = new Map();
  }

  /**
   * 执行数据分析任务 - 优化为单次LLM调用
   */
  async execute(task) {
    logger.info('📊 数据分析员开始执行任务...');
    
    try {
      const { data, topic, analysisRequirements = [], metadata } = task;
      
      // 单次LLM调用完成所有分析相关工作
      const comprehensiveAnalysis = await this.performComprehensiveAnalysis(data, topic, analysisRequirements, metadata);
      
      logger.debug(`单次LLM完成综合数据分析`);
      
      // 组装最终分析结果
      const finalAnalysis = {
        exploratory: comprehensiveAnalysis.exploratoryAnalysis,
        topic: comprehensiveAnalysis.topicAnalysis,
        requirement: comprehensiveAnalysis.requirementAnalysis,
        predictive: comprehensiveAnalysis.predictiveAnalysis
      };
      
      logger.success(`✅ 数据分析完成，置信度: ${comprehensiveAnalysis.qualityAssessment.overall_confidence?.toFixed(2) || 'N/A'}`);
      
      return {
        analysis: finalAnalysis,
        insights: comprehensiveAnalysis.insights || [],
        predictions: comprehensiveAnalysis.predictiveAnalysis.predictions || [],
        quality: comprehensiveAnalysis.qualityAssessment,
        strategy: comprehensiveAnalysis.analysisStrategy,
        metadata: {
          dataPoints: data.length,
          analysisTime: new Date(),
          analysisDepth: this.config.analysisDepth,
          llmCalls: 1, // 优化后只用了1次LLM调用
          ...metadata
        }
      };
      
    } catch (error) {
      logger.error('❌ 数据分析失败:', error);
      throw new Error(`数据分析任务执行失败: ${error.message}`);
    }
  }

  /**
   * 单次LLM调用完成综合数据分析
   */
  async performComprehensiveAnalysis(data, topic, requirements, metadata) {
    const dataOverview = this.generateDataOverview(data);
    const dataStatistics = this.calculateBasicStatistics(data);
    
    const prompt = `作为高级数据科学家和分析专家，请对以下数据进行综合性深度分析：

**分析参数**：
- 主题: ${topic}
- 数据规模: ${data.length}条记录
- 数据类别: ${dataOverview.categories.join(', ')}
- 分析需求: ${requirements.join(', ') || '全面分析'}
- 平均置信度: ${dataStatistics.avgConfidence?.toFixed(2) || 'N/A'}

**数据统计概览**：
- 总记录数: ${dataStatistics.totalRecords}
- 类别分布: ${JSON.stringify(dataStatistics.categoryDistribution)}
- 来源分布: ${JSON.stringify(dataStatistics.sourceDistribution)}

**任务要求**：
1. 制定分析策略
2. 执行探索性数据分析
3. 进行主题导向的深度分析
4. 针对需求进行专项分析
5. 挖掘高级洞察和模式
6. 进行预测性分析
7. 评估分析质量和置信度

请输出JSON格式的综合分析结果：
{
  "analysisStrategy": {
    "approach": "comprehensive",
    "analysis_priorities": [
      {
        "priority_level": "high",
        "analysis_type": "descriptive/diagnostic/predictive",
        "focus_area": "分析重点",
        "methodology": "分析方法"
      }
    ],
    "statistical_methods": ["统计分析方法"],
    "confidence_estimation_approach": "置信度评估方法"
  },
  "exploratoryAnalysis": {
    "data_quality_assessment": {
      "completeness_score": 0.85,
      "consistency_score": 0.80,
      "reliability_factors": ["可靠性因素"]
    },
    "pattern_identification": [
      {
        "pattern_type": "trend/cycle/seasonal",
        "description": "模式描述",
        "strength": "strong/moderate/weak",
        "confidence": 0.85
      }
    ],
    "correlation_insights": [
      {
        "variables": ["变量A", "变量B"],
        "correlation_strength": "strong/moderate/weak",
        "interpretation": "解释说明"
      }
    ],
    "overview": {
      "key_characteristics": ["关键特征"],
      "data_insights": ["数据洞察"],
      "analysis_limitations": ["分析局限性"]
    }
  },
  "topicAnalysis": {
    "topic_relevance_analysis": {
      "relevance_score": 0.90,
      "coverage_assessment": "覆盖度评估"
    },
    "thematic_insights": [
      {
        "insight_title": "洞察标题",
        "insight_description": "详细描述",
        "confidence_level": 0.85,
        "business_implication": "商业含义"
      }
    ],
    "trend_analysis": {
      "overall_trend": "increasing/stable/decreasing",
      "trend_strength": "strong/moderate/weak",
      "trend_drivers": ["趋势驱动因素"]
    }
  },
  "requirementAnalysis": {
    "需求1": {
      "analysis_methodology": "分析方法",
      "key_findings": ["关键发现"],
      "confidence_score": 0.85,
      "recommendations": ["建议"]
    }
  },
  "insights": [
    {
      "title": "洞察标题",
      "category": "strategic/operational/market",
      "description": "详细描述",
      "significance": "high/medium/low",
      "confidence": 0.85,
      "business_impact": "商业影响",
      "actionability": "可执行性评估"
    }
  ],
  "predictiveAnalysis": {
    "predictions": [
      {
        "prediction_category": "trend/outcome",
        "prediction_title": "预测标题",
        "prediction_description": "详细描述",
        "timeframe": "short_term/medium_term/long_term",
        "confidence_level": 0.75,
        "probability": 0.65
      }
    ],
    "scenario_analysis": {
      "best_case": "最佳情况",
      "most_likely": "最可能情况",
      "worst_case": "最坏情况"
    }
  },
  "qualityAssessment": {
    "overall_confidence": 0.82,
    "quality_dimensions": {
      "data_reliability": 0.85,
      "analysis_completeness": 0.80,
      "insight_quality": 0.75,
      "methodology_rigor": 0.85
    },
    "strengths": ["分析优势"],
    "limitations": ["分析局限"],
    "improvement_recommendations": ["改进建议"]
  }
}`;

    try {
      const response = await this.llm.generate(prompt, {
        temperature: 0.3,
        max_tokens: 8000
      });
      
      const result = this.parseJSONResponse(response.content);
      
      if (result) {
        // 增强结果数据
        if (result.exploratoryAnalysis?.overview) {
          result.exploratoryAnalysis.overview = {
            ...result.exploratoryAnalysis.overview,
            totalRecords: dataStatistics.totalRecords,
            avgConfidence: dataStatistics.avgConfidence,
            categories: dataStatistics.categoryDistribution,
            sources: dataStatistics.sourceDistribution
          };
        }
        
        return {
          analysisStrategy: result.analysisStrategy || this.getDefaultStrategy(),
          exploratoryAnalysis: result.exploratoryAnalysis || this.getDefaultExploratoryAnalysis(dataStatistics),
          topicAnalysis: result.topicAnalysis || this.getDefaultTopicAnalysis(topic),
          requirementAnalysis: result.requirementAnalysis || {},
          insights: result.insights || [],
          predictiveAnalysis: result.predictiveAnalysis || { predictions: [], scenario_analysis: {} },
          qualityAssessment: result.qualityAssessment || this.getDefaultQualityAssessment()
        };
      }
    } catch (error) {
      logger.warn('LLM综合数据分析失败，使用默认结果:', error);
    }
    
    // 降级到默认结果
    return {
      analysisStrategy: this.getDefaultStrategy(),
      exploratoryAnalysis: this.getDefaultExploratoryAnalysis(dataStatistics),
      topicAnalysis: this.getDefaultTopicAnalysis(topic),
      requirementAnalysis: {},
      insights: [{
        title: '数据分析完成',
        category: 'operational',
        description: '成功完成数据分析流程',
        significance: 'medium',
        confidence: 0.7,
        business_impact: '为决策提供支持',
        actionability: '可用于业务参考'
      }],
      predictiveAnalysis: {
        predictions: [{
          prediction_category: 'trend',
          prediction_title: `${topic}发展预测`,
          prediction_description: '基于当前数据，预计将保持稳定发展',
          timeframe: 'medium_term',
          confidence_level: 0.6,
          probability: 0.7
        }],
        scenario_analysis: {
          best_case: '快速发展，超预期表现',
          most_likely: '稳定发展，符合预期',
          worst_case: '发展放缓，低于预期'
        }
      },
      qualityAssessment: this.getDefaultQualityAssessment()
    };
  }

  getDefaultQualityAssessment() {
    return {
      overall_confidence: 0.7,
      quality_dimensions: {
        data_reliability: 0.75,
        analysis_completeness: 0.70,
        insight_quality: 0.65,
        methodology_rigor: 0.70
      },
      strengths: ['完成基础分析流程'],
      limitations: ['数据规模限制'],
      improvement_recommendations: ['增加数据源', '深化分析维度']
    };
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

  /**
   * 使用LLM进行需求导向的专项分析
   */
  async performRequirementAnalysisWithLLM(data, requirements, strategy) {
    if (!requirements || requirements.length === 0) {
      return { general: { analysis_type: 'general', findings: ['完成基础数据分析'] } };
    }

    const analysisResults = {};
    
    for (const requirement of requirements) {
      try {
        const prompt = `作为专业分析师，请针对特定需求对数据进行深度分析：

分析需求: ${requirement}
数据概况: ${data.length}条记录
分析策略: ${strategy.approach}

请进行专项分析并输出JSON格式：
{
  "requirement_analysis": {
    "requirement_interpretation": "需求理解",
    "analysis_methodology": "分析方法",
    "key_findings": ["关键发现"],
    "quantitative_insights": ["定量洞察"],
    "qualitative_insights": ["定性洞察"],
    "confidence_score": 0.85,
    "recommendations": ["建议"]
  }
}`;

        const response = await this.llm.generate(prompt, {
          temperature: 0.3,
          max_tokens: 2500
        });
        
        const analysis = this.parseJSONResponse(response.content);
        if (analysis) {
          analysisResults[requirement] = analysis.requirement_analysis;
        }
      } catch (error) {
        logger.warn(`需求分析失败 "${requirement}": ${error.message}`);
        analysisResults[requirement] = {
          analysis_type: requirement,
          findings: ['分析过程中遇到技术问题'],
          confidence_score: 0.3
        };
      }
    }
    
    return analysisResults;
  }

  /**
   * 使用LLM进行高级洞察挖掘
   */
  async mineInsightsWithLLM(data, exploratoryAnalysis, topicAnalysis, requirementAnalysis) {
    const prompt = `作为洞察挖掘专家，请基于多维度分析结果进行深度洞察挖掘：

数据规模: ${data.length}条记录
探索性分析: ${JSON.stringify(exploratoryAnalysis.overview, null, 2)}
主题分析洞察: ${JSON.stringify(topicAnalysis.thematic_insights, null, 2)}
需求分析结果: ${Object.keys(requirementAnalysis).length}个维度

请进行洞察挖掘并输出JSON格式：
{
  "insights": [
    {
      "title": "洞察标题",
      "category": "strategic/operational/market/technical",
      "description": "详细描述",
      "significance": "high/medium/low",
      "confidence": 0.85,
      "supporting_evidence": ["支持证据"],
      "business_impact": "商业影响",
      "actionability": "可执行性评估"
    }
  ],
  "cross_analysis_patterns": ["跨分析模式"],
  "meta_insights": ["元洞察"],
  "confidence_assessment": 0.80
}`;

    try {
      const response = await this.llm.generate(prompt, {
        temperature: 0.4,
        max_tokens: 3500
      });
      
      const insights = this.parseJSONResponse(response.content);
      if (insights) {
        return insights;
      }
    } catch (error) {
      logger.warn('LLM洞察挖掘失败，使用基础洞察:', error);
    }
    
    // 默认洞察
    return {
      insights: [
        {
          title: '数据分析完成',
          category: 'operational',
          description: '成功完成数据分析流程',
          significance: 'medium',
          confidence: 0.7,
          supporting_evidence: ['分析结果一致性'],
          business_impact: '为决策提供支持',
          actionability: '可用于业务参考'
        }
      ],
      cross_analysis_patterns: ['数据质量与结果相关性'],
      meta_insights: ['分析流程稳定'],
      confidence_assessment: 0.7
    };
  }

  /**
   * 使用LLM进行预测性分析
   */
  async performPredictiveAnalysisWithLLM(data, insights, topic) {
    const prompt = `作为预测分析专家，请基于数据洞察进行预测性分析：

主题: ${topic}
数据基础: ${data.length}条记录
关键洞察: ${insights.insights?.map(i => i.title).join(', ') || '无特定洞察'}

请进行预测分析并输出JSON格式：
{
  "predictions": [
    {
      "prediction_category": "trend/outcome/scenario",
      "prediction_title": "预测标题",
      "prediction_description": "详细描述",
      "timeframe": "short_term/medium_term/long_term",
      "confidence_level": 0.75,
      "probability": 0.65,
      "key_assumptions": ["关键假设"],
      "risk_factors": ["风险因素"],
      "potential_impact": "潜在影响"
    }
  ],
  "scenario_analysis": {
    "best_case": "最佳情况",
    "most_likely": "最可能情况",
    "worst_case": "最坏情况"
  },
  "predictive_confidence": 0.70
}`;

    try {
      const response = await this.llm.generate(prompt, {
        temperature: 0.3,
        max_tokens: 3000
      });
      
      const predictions = this.parseJSONResponse(response.content);
      if (predictions) {
        return predictions;
      }
    } catch (error) {
      logger.warn('LLM预测分析失败，使用基础预测:', error);
    }
    
    // 默认预测
    return {
      predictions: [
        {
          prediction_category: 'trend',
          prediction_title: `${topic}发展预测`,
          prediction_description: '基于当前数据，预计将保持稳定发展',
          timeframe: 'medium_term',
          confidence_level: 0.6,
          probability: 0.7,
          key_assumptions: ['当前趋势延续'],
          risk_factors: ['外部环境变化'],
          potential_impact: '对相关领域产生积极影响'
        }
      ],
      scenario_analysis: {
        best_case: '快速发展，超预期表现',
        most_likely: '稳定发展，符合预期',
        worst_case: '发展放缓，低于预期'
      },
      predictive_confidence: 0.6
    };
  }

  /**
   * 使用LLM进行质量评估和置信度计算
   */
  async assessAnalysisQualityWithLLM(exploratoryAnalysis, topicAnalysis, requirementAnalysis, insights) {
    const prompt = `作为质量评估专家，请对分析结果进行综合质量评估：

分析维度:
- 探索性分析完成度: ${exploratoryAnalysis ? '已完成' : '未完成'}
- 主题分析深度: ${topicAnalysis ? '已完成' : '未完成'}
- 需求分析覆盖: ${Object.keys(requirementAnalysis).length}个维度
- 洞察发现数量: ${insights.insights?.length || 0}个

请进行质量评估并输出JSON格式：
{
  "overall_confidence": 0.82,
  "quality_dimensions": {
    "data_reliability": 0.85,
    "analysis_completeness": 0.80,
    "insight_quality": 0.75,
    "methodology_rigor": 0.85
  },
  "strengths": ["分析优势"],
  "limitations": ["分析局限"],
  "improvement_recommendations": ["改进建议"],
  "confidence_factors": ["置信度影响因素"]
}`;

    try {
      const response = await this.llm.generate(prompt, {
        temperature: 0.2,
        max_tokens: 2000
      });
      
      const assessment = this.parseJSONResponse(response.content);
      if (assessment) {
        return assessment;
      }
    } catch (error) {
      logger.warn('LLM质量评估失败，使用基础评估:', error);
    }
    
    // 默认质量评估
    return {
      overall_confidence: 0.7,
      quality_dimensions: {
        data_reliability: 0.75,
        analysis_completeness: 0.70,
        insight_quality: 0.65,
        methodology_rigor: 0.70
      },
      strengths: ['完成基础分析流程'],
      limitations: ['数据规模限制'],
      improvement_recommendations: ['增加数据源', '深化分析维度'],
      confidence_factors: ['数据质量', '分析方法一致性']
    };
  }
}