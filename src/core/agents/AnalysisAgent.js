import logger from '../../../utils/logger.js';

/**
 * 数据分析员智能体
 * 专门负责对结构化数据进行深度分析、趋势识别、模式发现和洞察挖掘
 * 具备统计分析、时间序列分析、关联分析和预测建模能力
 */
export class AnalysisAgent {
  constructor(config = {}) {
    this.config = {
      minDataPoints: 3,
      confidenceThreshold: 0.7,
      correlationThreshold: 0.5,
      trendSensitivity: 0.1,
      enableAdvancedAnalysis: true,
      ...config
    };
    
    this.analysisHistory = [];
    this.modelCache = new Map();
  }

  /**
   * 执行数据分析任务
   */
  async execute(task) {
    logger.info('📊 数据分析员开始执行任务...');
    
    try {
      const {
        data,
        requirements = ['trend', 'summary'],
        topic,
        subTopics = []
      } = task;
      
      // 1. 数据预处理
      const processedData = await this.preprocessData(data);
      logger.debug(`数据预处理完成: ${processedData.length} 条记录`);
      
      // 2. 探索性分析
      const exploratoryAnalysis = await this.performExploratoryAnalysis(processedData);
      
      // 3. 主题分析
      const topicAnalysis = await this.performTopicAnalysis(processedData, topic, subTopics);
      
      // 4. 需求导向分析
      const requirementAnalysis = await this.performRequirementAnalysis(processedData, requirements);
      
      // 5. 洞察生成
      const insights = await this.generateInsights(
        exploratoryAnalysis,
        topicAnalysis,
        requirementAnalysis
      );
      
      // 6. 质量评估
      const qualityAssessment = this.assessAnalysisQuality(insights);
      
      // 7. 生成报告
      const analysisReport = this.generateAnalysisReport(insights, qualityAssessment);
      
      logger.success(`✅ 数据分析完成，生成 ${insights.length} 个洞察`);
      
      return {
        insights,
        analysis: {
          exploratory: exploratoryAnalysis,
          topic: topicAnalysis,
          requirement: requirementAnalysis
        },
        report: analysisReport,
        quality: qualityAssessment,
        metadata: {
          dataPoints: processedData.length,
          analysisTime: new Date(),
          methods: Object.keys(requirementAnalysis),
          confidence: qualityAssessment.overallConfidence
        }
      };
      
    } catch (error) {
      logger.error('❌ 数据分析失败:', error);
      throw new Error(`数据分析任务执行失败: ${error.message}`);
    }
  }

  /**
   * 数据预处理
   */
  async preprocessData(rawData) {
    return rawData.filter(record => record.confidence >= this.config.confidenceThreshold);
  }

  /**
   * 探索性数据分析
   */
  async performExploratoryAnalysis(data) {
    return {
      overview: this.generateDataOverview(data),
      distributions: this.analyzeDistributions(data),
      patterns: this.identifyPatterns(data)
    };
  }

  /**
   * 生成数据概览
   */
  generateDataOverview(data) {
    const categories = {};
    const sources = {};
    const timeRange = { min: null, max: null };
    
    data.forEach(record => {
      categories[record.category] = (categories[record.category] || 0) + 1;
      
      const domain = new URL(record.source.url).hostname;
      sources[domain] = (sources[domain] || 0) + 1;
      
      const date = new Date(record.source.publishDate);
      if (!timeRange.min || date < timeRange.min) timeRange.min = date;
      if (!timeRange.max || date > timeRange.max) timeRange.max = date;
    });
    
    return {
      totalRecords: data.length,
      categories,
      sources,
      timeRange,
      avgConfidence: data.reduce((sum, r) => sum + r.confidence, 0) / data.length
    };
  }

  /**
   * 分析分布
   */
  analyzeDistributions(data) {
    return {
      confidence: this.calculateDistribution(data.map(d => d.confidence)),
      categories: this.calculateCategoryDistribution(data)
    };
  }

  calculateDistribution(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const mean = sorted.reduce((a, b) => a + b, 0) / sorted.length;
    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      mean,
      median: sorted[Math.floor(sorted.length / 2)],
      std: this.calculateStandardDeviation(sorted, mean)
    };
  }

  calculateStandardDeviation(values, mean) {
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
  }

  calculateCategoryDistribution(data) {
    const distribution = {};
    data.forEach(record => {
      distribution[record.category] = (distribution[record.category] || 0) + 1;
    });
    return distribution;
  }

  /**
   * 识别模式
   */
  identifyPatterns(data) {
    const patterns = [];
    
    // 时间模式
    const timePatterns = this.identifyTimePatterns(data);
    patterns.push(...timePatterns);
    
    // 类别模式
    const categoryPatterns = this.identifyCategoryPatterns(data);
    patterns.push(...categoryPatterns);
    
    return patterns;
  }

  identifyTimePatterns(data) {
    const patterns = [];
    const timeData = data.filter(d => d.source.publishDate);
    
    if (timeData.length >= this.config.minDataPoints) {
      const recentData = timeData.filter(d => {
        const days = (new Date() - new Date(d.source.publishDate)) / (1000 * 60 * 60 * 24);
        return days <= 30;
      });
      
      if (recentData.length > timeData.length * 0.7) {
        patterns.push({
          type: 'temporal',
          pattern: 'recent_focus',
          description: '数据主要集中在最近一个月',
          confidence: 0.8
        });
      }
    }
    
    return patterns;
  }

  identifyCategoryPatterns(data) {
    const patterns = [];
    const categoryDist = this.calculateCategoryDistribution(data);
    const total = data.length;
    
    Object.entries(categoryDist).forEach(([category, count]) => {
      const percentage = count / total;
      if (percentage >= 0.5) {
        patterns.push({
          type: 'category',
          pattern: 'dominant_category',
          description: `${category}类信息占主导地位 (${(percentage * 100).toFixed(1)}%)`,
          confidence: 0.9
        });
      }
    });
    
    return patterns;
  }

  /**
   * 主题相关分析
   */
  async performTopicAnalysis(data, topic, subTopics) {
    return {
      topicRelevance: this.analyzeTopicRelevance(data, topic),
      keyEntities: this.extractKeyEntities(data, topic),
      insights: this.generateTopicInsights(data, topic)
    };
  }

  analyzeTopicRelevance(data, topic) {
    const relevanceScores = data.map(record => {
      const text = record.rawText.toLowerCase();
      const topicKeywords = topic.toLowerCase().split(/\s+/);
      
      let score = 0;
      topicKeywords.forEach(keyword => {
        const occurrences = (text.match(new RegExp(keyword, 'g')) || []).length;
        score += occurrences * 0.1;
      });
      
      return {
        recordId: record.id,
        relevanceScore: Math.min(score, 1.0),
        category: record.category
      };
    });
    
    return {
      scores: relevanceScores,
      avgRelevance: relevanceScores.reduce((sum, r) => sum + r.relevanceScore, 0) / relevanceScores.length
    };
  }

  extractKeyEntities(data, topic) {
    const allEntities = [];
    
    data.forEach(record => {
      if (record.entities) {
        Object.values(record.entities).forEach(entityList => {
          if (Array.isArray(entityList)) {
            allEntities.push(...entityList);
          }
        });
      }
    });
    
    // 统计实体频次
    const entityFreq = {};
    allEntities.forEach(entity => {
      const key = entity.text || entity.value;
      entityFreq[key] = (entityFreq[key] || 0) + 1;
    });
    
    return Object.entries(entityFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 20)
      .map(([entity, freq]) => ({ entity, frequency: freq }));
  }

  generateTopicInsights(data, topic) {
    const insights = [];
    
    const topicMentions = data.filter(record => 
      record.rawText.toLowerCase().includes(topic.toLowerCase())
    ).length;
    
    if (topicMentions > data.length * 0.8) {
      insights.push({
        type: 'topic_coverage',
        title: '主题覆盖度高',
        content: `${topicMentions}/${data.length} 条记录直接提及主题，覆盖度达到${((topicMentions/data.length)*100).toFixed(1)}%`,
        importance: 'high',
        confidence: 0.9
      });
    }
    
    return insights;
  }

  /**
   * 需求导向分析
   */
  async performRequirementAnalysis(data, requirements) {
    const analysis = {};
    
    for (const requirement of requirements) {
      switch (requirement) {
        case 'trend':
          analysis.trend = this.analyzeTrends(data);
          break;
        case 'summary':
          analysis.summary = this.generateSummaryAnalysis(data);
          break;
        case 'comparison':
          analysis.comparison = this.performComparison(data);
          break;
        case 'swot':
          analysis.swot = this.performSWOTAnalysis(data);
          break;
      }
    }
    
    return analysis;
  }

  analyzeTrends(data) {
    const trends = {
      overall: 'stable',
      confidence: 0.5,
      direction: 'neutral',
      details: []
    };
    
    const sortedData = data
      .filter(d => d.source.publishDate)
      .sort((a, b) => new Date(a.source.publishDate) - new Date(b.source.publishDate));
    
    if (sortedData.length < this.config.minDataPoints) {
      trends.confidence = 0.1;
      trends.details.push('数据点不足，无法进行可靠的趋势分析');
      return trends;
    }
    
    // 简化的趋势分析
    const timeSpan = sortedData.length;
    const recentData = sortedData.slice(-Math.floor(timeSpan/2));
    const earlierData = sortedData.slice(0, Math.floor(timeSpan/2));
    
    const recentAvg = recentData.reduce((sum, r) => sum + r.confidence, 0) / recentData.length;
    const earlierAvg = earlierData.reduce((sum, r) => sum + r.confidence, 0) / earlierData.length;
    
    if (recentAvg > earlierAvg + this.config.trendSensitivity) {
      trends.overall = 'increasing';
      trends.direction = 'upward';
    } else if (recentAvg < earlierAvg - this.config.trendSensitivity) {
      trends.overall = 'decreasing';
      trends.direction = 'downward';
    }
    
    trends.confidence = 0.7;
    
    return trends;
  }

  generateSummaryAnalysis(data) {
    const categories = this.calculateCategoryDistribution(data);
    const dominantCategory = Object.entries(categories)
      .sort(([,a], [,b]) => b - a)[0];
    
    return {
      totalRecords: data.length,
      dominantCategory: dominantCategory[0],
      categoryPercentage: ((dominantCategory[1] / data.length) * 100).toFixed(1),
      avgConfidence: (data.reduce((sum, r) => sum + r.confidence, 0) / data.length).toFixed(2),
      timeSpan: this.calculateTimeSpan(data),
      keyInsights: [`${dominantCategory[0]}类信息占主导地位`, '数据质量整体良好']
    };
  }

  performComparison(data) {
    const categories = [...new Set(data.map(d => d.category))];
    const comparisons = [];
    
    for (let i = 0; i < categories.length; i++) {
      for (let j = i + 1; j < categories.length; j++) {
        const cat1Data = data.filter(d => d.category === categories[i]);
        const cat2Data = data.filter(d => d.category === categories[j]);
        
        comparisons.push({
          category1: categories[i],
          category2: categories[j],
          count1: cat1Data.length,
          count2: cat2Data.length,
          avgConfidence1: cat1Data.reduce((sum, r) => sum + r.confidence, 0) / cat1Data.length,
          avgConfidence2: cat2Data.reduce((sum, r) => sum + r.confidence, 0) / cat2Data.length
        });
      }
    }
    
    return comparisons;
  }

  performSWOTAnalysis(data) {
    const swot = {
      strengths: [],
      weaknesses: [],
      opportunities: [],
      threats: []
    };
    
    data.forEach(record => {
      const text = record.rawText.toLowerCase();
      
      if (/优势|强项|领先/.test(text)) {
        swot.strengths.push({
          text: this.extractRelevantSentence(text, /优势|强项|领先/),
          source: record.source.title
        });
      }
      
      if (/劣势|弱点|不足/.test(text)) {
        swot.weaknesses.push({
          text: this.extractRelevantSentence(text, /劣势|弱点|不足/),
          source: record.source.title
        });
      }
      
      if (/机会|机遇|前景/.test(text)) {
        swot.opportunities.push({
          text: this.extractRelevantSentence(text, /机会|机遇|前景/),
          source: record.source.title
        });
      }
      
      if (/威胁|风险|挑战/.test(text)) {
        swot.threats.push({
          text: this.extractRelevantSentence(text, /威胁|风险|挑战/),
          source: record.source.title
        });
      }
    });
    
    return swot;
  }

  extractRelevantSentence(text, pattern) {
    const sentences = text.split(/[。！？]/);
    const matchingSentence = sentences.find(s => pattern.test(s));
    return matchingSentence ? matchingSentence.trim().substring(0, 100) : '';
  }

  calculateTimeSpan(data) {
    const dates = data
      .map(d => new Date(d.source.publishDate))
      .filter(d => !isNaN(d));
    
    if (dates.length === 0) return '未知';
    
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    const days = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24));
    
    return `${days}天`;
  }

  /**
   * 生成洞察
   */
  async generateInsights(exploratoryAnalysis, topicAnalysis, requirementAnalysis) {
    const insights = [];
    
    // 数据质量洞察
    if (exploratoryAnalysis.overview.avgConfidence >= 0.8) {
      insights.push({
        type: 'data_quality',
        title: '数据质量优秀',
        content: `数据平均置信度达到${(exploratoryAnalysis.overview.avgConfidence * 100).toFixed(1)}%`,
        importance: 'medium',
        confidence: 0.9,
        category: 'quality'
      });
    }
    
    // 主题洞察
    insights.push(...topicAnalysis.insights);
    
    // 趋势洞察
    if (requirementAnalysis.trend && requirementAnalysis.trend.overall !== 'stable') {
      insights.push({
        type: 'trend',
        title: `检测到${requirementAnalysis.trend.direction === 'upward' ? '上升' : '下降'}趋势`,
        content: `数据显示${requirementAnalysis.trend.overall}趋势，置信度${(requirementAnalysis.trend.confidence * 100).toFixed(1)}%`,
        importance: 'high',
        confidence: requirementAnalysis.trend.confidence,
        category: 'trend'
      });
    }
    
    return this.rankAndFilterInsights(insights);
  }

  rankAndFilterInsights(insights) {
    const importanceWeight = { high: 3, medium: 2, low: 1 };
    
    return insights
      .filter(insight => insight.confidence >= this.config.confidenceThreshold)
      .sort((a, b) => {
        const scoreA = importanceWeight[a.importance] * a.confidence;
        const scoreB = importanceWeight[b.importance] * b.confidence;
        return scoreB - scoreA;
      });
  }

  /**
   * 评估分析质量
   */
  assessAnalysisQuality(insights) {
    const quality = {
      overallConfidence: 0,
      insightQuality: 'good',
      recommendations: []
    };
    
    if (insights.length > 0) {
      quality.overallConfidence = insights.reduce((sum, i) => sum + i.confidence, 0) / insights.length;
    }
    
    const highQualityInsights = insights.filter(i => i.confidence >= 0.8).length;
    
    if (insights.length === 0) {
      quality.insightQuality = 'poor';
      quality.recommendations.push('数据不足，建议收集更多数据');
    } else if (highQualityInsights / insights.length >= 0.7) {
      quality.insightQuality = 'excellent';
    }
    
    return quality;
  }

  /**
   * 生成分析报告
   */
  generateAnalysisReport(insights, quality) {
    return {
      executive: {
        keyInsights: insights.slice(0, 5),
        overallAssessment: this.generateOverallAssessment(insights),
        confidence: quality.overallConfidence
      },
      detailed: {
        insightsByCategory: this.groupInsightsByCategory(insights),
        qualityMetrics: quality
      }
    };
  }

  generateOverallAssessment(insights) {
    if (insights.length === 0) {
      return '数据不足，无法生成可靠的评估';
    }
    
    const avgConfidence = insights.reduce((sum, i) => sum + i.confidence, 0) / insights.length;
    
    if (avgConfidence >= 0.8) {
      return '分析结果具有较高的可信度，发现了重要洞察';
    } else if (avgConfidence >= 0.6) {
      return '分析结果基本可信，提供了有用的信息';
    } else {
      return '分析结果置信度有限，建议谨慎使用';
    }
  }

  groupInsightsByCategory(insights) {
    const grouped = {};
    insights.forEach(insight => {
      const category = insight.category || 'general';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(insight);
    });
    return grouped;
  }
}