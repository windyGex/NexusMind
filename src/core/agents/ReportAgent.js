import logger from '../../../utils/logger.js';
import { ReportRenderer } from '../../utils/ReportRenderer.js';

/**
 * 报告撰写员智能体
 * 专门负责将分析洞察转化为专业的结构化报告
 */
export class ReportAgent {
  constructor(config = {}) {
    this.config = {
      maxSectionLength: 2000,
      minSectionLength: 200,
      reportStyle: 'professional',
      language: 'zh-cn',
      outputFormat: 'markdown',
      ...config
    };
    
    this.reportTemplates = new Map();
    this.renderer = new ReportRenderer({
      outputFormat: this.config.outputFormat,
      includeMetadata: true,
      includeTableOfContents: true
    });
    
    this.initializeTemplates();
  }

  /**
   * 初始化报告模板
   */
  initializeTemplates() {
    this.reportTemplates.set('comprehensive', {
      name: '综合分析报告',
      sections: [
        { id: 'title', title: '报告标题', required: true, order: 1 },
        { id: 'executive_summary', title: '执行摘要', required: true, order: 2 },
        { id: 'background', title: '背景介绍', required: true, order: 3 },
        { id: 'key_findings', title: '主要发现', required: true, order: 4 },
        { id: 'detailed_analysis', title: '详细分析', required: true, order: 5 },
        { id: 'recommendations', title: '建议与对策', required: true, order: 6 },
        { id: 'conclusion', title: '结论', required: true, order: 7 }
      ]
    });

    this.reportTemplates.set('market_research', {
      name: '市场研究报告',
      sections: [
        { id: 'title', title: '报告标题', required: true, order: 1 },
        { id: 'executive_summary', title: '执行摘要', required: true, order: 2 },
        { id: 'market_overview', title: '市场概况', required: true, order: 3 },
        { id: 'competitive_analysis', title: '竞争分析', required: true, order: 4 },
        { id: 'trends_forecast', title: '趋势预测', required: true, order: 5 },
        { id: 'recommendations', title: '战略建议', required: true, order: 6 }
      ]
    });
  }

  /**
   * 执行报告生成任务
   */
  async execute(task) {
    logger.info('📝 报告撰写员开始执行任务...');
    
    try {
      const { analysisResults, topic, metadata, originalQuery } = task;
      
      // 1. 选择报告模板
      const template = this.selectTemplate(originalQuery);
      
      // 2. 生成报告标题
      const reportTitle = this.generateReportTitle(topic, originalQuery);
      
      // 3. 生成报告章节
      const sections = await this.generateReportSections(template, analysisResults, topic, metadata);
      
      // 4. 组装和渲染最终报告
      const reportData = this.assembleFinalReport(reportTitle, sections, metadata);
      const renderedReport = this.renderer.render(reportData, this.config.outputFormat);
      
      // 5. 生成最终报告对象
      const finalReport = {
        ...reportData,
        content: renderedReport,
        renderedFormats: {
          [this.config.outputFormat]: renderedReport
        }
      };
      
      logger.success(`✅ 报告生成完成，共 ${sections.length} 个章节`);
      
      return finalReport;
      
    } catch (error) {
      logger.error('❌ 报告生成失败:', error);
      throw new Error(`报告生成任务执行失败: ${error.message}`);
    }
  }

  /**
   * 选择报告模板
   */
  selectTemplate(query) {
    if (/市场|行业|竞争/.test(query)) {
      return this.reportTemplates.get('market_research');
    }
    return this.reportTemplates.get('comprehensive');
  }

  /**
   * 生成报告标题
   */
  generateReportTitle(topic, query) {
    if (/市场.*分析|行业.*分析/.test(query)) {
      return `${topic}市场分析报告`;
    } else if (/研究|调研/.test(query)) {
      return `${topic}研究报告`;
    } else if (/评估|评价/.test(query)) {
      return `${topic}评估报告`;
    }
    return `${topic}分析报告`;
  }

  /**
   * 生成报告章节
   */
  async generateReportSections(template, analysisResults, topic, metadata) {
    const sections = [];
    
    for (const sectionConfig of template.sections) {
      try {
        let content = '';
        
        switch (sectionConfig.id) {
          case 'title':
            content = this.generateReportTitle(topic, '');
            break;
          case 'executive_summary':
            content = await this.generateExecutiveSummary(analysisResults, topic);
            break;
          case 'background':
            content = await this.generateBackground(topic, metadata);
            break;
          case 'key_findings':
            content = await this.generateKeyFindings(analysisResults, topic);
            break;
          case 'detailed_analysis':
            content = await this.generateDetailedAnalysis(analysisResults, topic);
            break;
          case 'market_overview':
            content = await this.generateMarketOverview(analysisResults, topic);
            break;
          case 'competitive_analysis':
            content = await this.generateCompetitiveAnalysis(analysisResults, topic);
            break;
          case 'trends_forecast':
            content = await this.generateTrendsForecast(analysisResults, topic);
            break;
          case 'recommendations':
            content = await this.generateRecommendations(analysisResults, topic);
            break;
          case 'conclusion':
            content = await this.generateConclusion(analysisResults, topic);
            break;
          default:
            content = await this.generateGenericSection(sectionConfig, analysisResults, topic);
        }
        
        sections.push({
          id: sectionConfig.id,
          title: sectionConfig.title,
          content,
          order: sectionConfig.order
        });
        
      } catch (error) {
        logger.warn(`章节生成失败 ${sectionConfig.title}: ${error.message}`);
      }
    }
    
    return sections.sort((a, b) => a.order - b.order);
  }

  /**
   * 生成执行摘要
   */
  async generateExecutiveSummary(analysisResults, topic) {
    const insights = analysisResults.insights || [];
    const topInsights = insights.slice(0, 3);
    
    let summary = `## 执行摘要\n\n`;
    summary += `本报告对"${topic}"进行了全面分析。`;
    summary += `基于多维度数据分析，我们发现了以下关键洞察：\n\n`;
    
    topInsights.forEach((insight, index) => {
      summary += `${index + 1}. **${insight.title}**: ${insight.content}\n\n`;
    });
    
    if (analysisResults.quality?.overallConfidence) {
      const confidence = (analysisResults.quality.overallConfidence * 100).toFixed(0);
      summary += `本次分析的整体置信度为${confidence}%，`;
      summary += confidence >= 80 ? '结果具有较高的可信度。' : '建议结合更多数据进行验证。';
    }
    
    return summary;
  }

  /**
   * 生成背景介绍
   */
  async generateBackground(topic, metadata) {
    let background = `## 背景介绍\n\n`;
    background += `${topic}作为当前关注的重要领域，其发展态势对相关行业具有重要影响。`;
    background += `为深入了解其现状和趋势，我们开展了本次专项分析。\n\n`;
    
    background += `### 研究目的\n\n`;
    background += `本研究旨在通过系统性的数据收集和分析，为决策者提供客观、准确的参考信息，`;
    background += `帮助深入理解${topic}的现状特征和发展趋势。\n\n`;
    
    if (metadata?.dataPoints) {
      background += `### 研究范围\n\n`;
      background += `本次分析共收集${metadata.dataPoints}个数据点，`;
      background += `通过多源数据整合，确保了分析结果的全面性和准确性。`;
    }
    
    return background;
  }

  /**
   * 生成主要发现
   */
  async generateKeyFindings(analysisResults, topic) {
    const insights = analysisResults.insights || [];
    
    let findings = `## 主要发现\n\n`;
    findings += `通过深入分析，我们在${topic}领域发现了以下重要洞察：\n\n`;
    
    const categories = this.groupInsightsByCategory(insights);
    
    Object.entries(categories).forEach(([category, categoryInsights]) => {
      findings += `### ${this.getCategoryTitle(category)}\n\n`;
      
      categoryInsights.forEach((insight, index) => {
        findings += `**${index + 1}. ${insight.title}**\n\n`;
        findings += `${insight.content}`;
        
        if (insight.confidence) {
          const confidence = (insight.confidence * 100).toFixed(0);
          findings += ` （置信度：${confidence}%）`;
        }
        findings += `\n\n`;
      });
    });
    
    return findings;
  }

  /**
   * 生成详细分析
   */
  async generateDetailedAnalysis(analysisResults, topic) {
    let analysis = `## 详细分析\n\n`;
    
    // 数据概览
    if (analysisResults.analysis?.exploratory) {
      const overview = analysisResults.analysis.exploratory.overview;
      
      analysis += `### 数据概览\n\n`;
      analysis += `本次分析共收集${overview.totalRecords}条相关数据，`;
      analysis += `数据来源包括${Object.keys(overview.sources).length}个不同信息源。`;
      analysis += `数据质量良好，平均置信度达到${(overview.avgConfidence * 100).toFixed(1)}%。\n\n`;
      
      // 分布分析
      analysis += `### 分布特征\n\n`;
      Object.entries(overview.categories).forEach(([category, count]) => {
        const percentage = ((count / overview.totalRecords) * 100).toFixed(1);
        analysis += `- ${this.getCategoryTitle(category)}：${count}条记录（${percentage}%）\n`;
      });
      analysis += `\n`;
    }
    
    // 趋势分析
    if (analysisResults.analysis?.requirement?.trend) {
      const trend = analysisResults.analysis.requirement.trend;
      
      analysis += `### 趋势分析\n\n`;
      analysis += `时间序列分析显示，${topic}呈现${this.getTrendDescription(trend.overall)}趋势。`;
      
      if (trend.confidence >= 0.7) {
        analysis += `该趋势具有较高的统计显著性（置信度：${(trend.confidence * 100).toFixed(0)}%）。`;
      }
      analysis += `\n\n`;
    }
    
    return analysis;
  }

  /**
   * 生成市场概况
   */
  async generateMarketOverview(analysisResults, topic) {
    let overview = `## 市场概况\n\n`;
    overview += `${topic}市场当前呈现出以下主要特征：\n\n`;
    
    const marketInsights = (analysisResults.insights || []).filter(i => 
      i.category === 'market' || i.type === 'market'
    );
    
    if (marketInsights.length > 0) {
      marketInsights.forEach((insight, index) => {
        overview += `### ${insight.title}\n\n`;
        overview += `${insight.content}\n\n`;
      });
    } else {
      overview += `### 市场规模\n\n`;
      overview += `基于现有数据分析，${topic}市场保持稳定发展态势。\n\n`;
      
      overview += `### 发展特点\n\n`;
      overview += `- 市场参与者数量稳定\n`;
      overview += `- 用户需求持续增长\n`;
      overview += `- 技术创新推动行业发展\n`;
    }
    
    return overview;
  }

  /**
   * 生成竞争分析
   */
  async generateCompetitiveAnalysis(analysisResults, topic) {
    let competitive = `## 竞争分析\n\n`;
    
    const competitiveInsights = (analysisResults.insights || []).filter(i => 
      i.category === 'competitive' || i.type === 'competition'
    );
    
    if (competitiveInsights.length > 0) {
      competitive += `当前${topic}的竞争格局呈现以下特征：\n\n`;
      
      competitiveInsights.forEach(insight => {
        competitive += `### ${insight.title}\n\n`;
        competitive += `${insight.content}\n\n`;
      });
    } else {
      competitive += `### 竞争格局\n\n`;
      competitive += `${topic}领域的竞争格局相对稳定，主要参与者在各自细分领域形成一定优势。\n\n`;
      
      competitive += `### 竞争要素\n\n`;
      competitive += `- **技术创新**：持续的技术创新是核心竞争力\n`;
      competitive += `- **用户体验**：优质的用户体验成为差异化优势\n`;
      competitive += `- **市场执行**：快速的市场响应和执行能力\n`;
    }
    
    return competitive;
  }

  /**
   * 生成趋势预测
   */
  async generateTrendsForecast(analysisResults, topic) {
    let forecast = `## 趋势预测\n\n`;
    forecast += `基于当前数据分析，${topic}未来发展趋势预测如下：\n\n`;
    
    const trendData = analysisResults.analysis?.requirement?.trend;
    
    if (trendData) {
      forecast += `### 短期趋势（3-6个月）\n\n`;
      if (trendData.overall === 'increasing') {
        forecast += `预计${topic}将继续保持增长态势，增长动力主要来自技术进步和市场需求扩大。\n\n`;
      } else if (trendData.overall === 'decreasing') {
        forecast += `${topic}可能面临一定调整压力，需关注市场变化和政策影响。\n\n`;
      } else {
        forecast += `${topic}预计将维持稳定发展，各项指标保持平稳。\n\n`;
      }
      
      forecast += `### 中长期展望（6-18个月）\n\n`;
      forecast += `- 市场规模有望进一步扩大\n`;
      forecast += `- 技术创新将带来新的增长点\n`;
      forecast += `- 行业标准和规范逐步完善\n`;
      forecast += `- 用户需求更加多样化和个性化\n\n`;
    } else {
      forecast += `### 发展方向\n\n`;
      forecast += `- **技术驱动**：技术创新将继续推动行业发展\n`;
      forecast += `- **用户导向**：以用户需求为中心的产品和服务创新\n`;
      forecast += `- **生态协同**：产业链上下游协同发展\n`;
      forecast += `- **规范化发展**：行业规范和标准逐步建立\n`;
    }
    
    return forecast;
  }

  /**
   * 生成建议
   */
  async generateRecommendations(analysisResults, topic) {
    const insights = analysisResults.insights || [];
    const highImportanceInsights = insights.filter(i => i.importance === 'high');
    
    let recommendations = `## 建议与对策\n\n`;
    recommendations += `基于分析结果，我们针对${topic}提出以下建议：\n\n`;
    
    // 战略建议
    recommendations += `### 战略建议\n\n`;
    
    if (highImportanceInsights.length > 0) {
      highImportanceInsights.slice(0, 3).forEach((insight, index) => {
        recommendations += `**${index + 1}. ${this.generateRecommendationTitle(insight)}**\n\n`;
        recommendations += `${this.generateRecommendationContent(insight, topic)}\n\n`;
      });
    } else {
      recommendations += `**1. 持续监控关键指标**\n\n`;
      recommendations += `建议建立完善的监控体系，定期跟踪${topic}相关的关键指标变化。\n\n`;
      
      recommendations += `**2. 强化数据驱动决策**\n\n`;
      recommendations += `加强数据收集和分析能力，基于客观数据制定决策。\n\n`;
    }
    
    // 实施建议
    recommendations += `### 实施路径\n\n`;
    recommendations += `**短期措施（1-3个月）：**\n`;
    recommendations += `- 建立专项工作组，制定详细行动计划\n`;
    recommendations += `- 确定关键绩效指标和评估标准\n\n`;
    
    recommendations += `**中期措施（3-12个月）：**\n`;
    recommendations += `- 逐步实施关键举措，定期评估进展\n`;
    recommendations += `- 建立反馈机制，及时调整策略\n\n`;
    
    return recommendations;
  }

  /**
   * 生成结论
   */
  async generateConclusion(analysisResults, topic) {
    const insights = analysisResults.insights || [];
    const quality = analysisResults.quality || {};
    
    let conclusion = `## 结论\n\n`;
    conclusion += `通过对${topic}的全面分析，我们得出以下主要结论：\n\n`;
    
    if (insights.length > 0) {
      const topInsight = insights[0];
      conclusion += `**核心发现：** ${topInsight.title}。${topInsight.content}\n\n`;
      
      if (insights.length > 1) {
        conclusion += `**关键洞察：**\n`;
        insights.slice(1, 4).forEach((insight, index) => {
          conclusion += `${index + 1}. ${insight.title}\n`;
        });
        conclusion += `\n`;
      }
    }
    
    // 分析质量评估
    if (quality.overallConfidence) {
      const confidence = (quality.overallConfidence * 100).toFixed(0);
      conclusion += `**分析可信度：** 本次分析的整体置信度为${confidence}%，`;
      
      if (confidence >= 80) {
        conclusion += `分析结果具有较高的可信度和参考价值。`;
      } else if (confidence >= 60) {
        conclusion += `分析结果基本可信，建议结合其他信息综合判断。`;
      } else {
        conclusion += `分析结果仅供参考，建议收集更多数据进行验证。`;
      }
      conclusion += `\n\n`;
    }
    
    conclusion += `**价值意义：** 本研究为深入理解${topic}提供了重要参考，`;
    conclusion += `有助于相关决策者把握发展趋势、识别关键机会、制定有效策略。`;
    
    return conclusion;
  }

  /**
   * 生成通用章节
   */
  async generateGenericSection(sectionConfig, analysisResults, topic) {
    let content = `## ${sectionConfig.title}\n\n`;
    content += `本章节对${topic}的${sectionConfig.title}进行详细分析。\n\n`;
    
    const relevantInsights = (analysisResults.insights || []).filter(insight => 
      insight.category === sectionConfig.id || insight.type === sectionConfig.id
    );
    
    if (relevantInsights.length > 0) {
      relevantInsights.forEach(insight => {
        content += `### ${insight.title}\n\n`;
        content += `${insight.content}\n\n`;
      });
    } else {
      content += `基于现有数据分析，${topic}在${sectionConfig.title}方面呈现稳定发展态势。`;
    }
    
    return content;
  }

  /**
   * 组装最终报告
   */
  assembleFinalReport(title, sections, metadata) {
    return {
      title,
      sections,
      metadata: {
        generatedAt: new Date(),
        wordCount: this.calculateWordCount({ sections }),
        sectionCount: sections.length,
        ...metadata
      },
      format: 'markdown',
      version: '1.0'
    };
  }

  // 辅助方法
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

  getCategoryTitle(category) {
    const titleMap = {
      'market': '市场分析',
      'competitive': '竞争分析',
      'trend': '趋势分析',
      'quality': '数据质量',
      'general': '综合分析'
    };
    return titleMap[category] || category;
  }

  getTrendDescription(trend) {
    const descriptions = {
      'increasing': '上升',
      'decreasing': '下降',
      'stable': '稳定'
    };
    return descriptions[trend] || '稳定';
  }

  generateRecommendationTitle(insight) {
    if (insight.type === 'trend') {
      return '把握趋势机会';
    } else if (insight.type === 'market') {
      return '优化市场策略';
    } else if (insight.type === 'competitive') {
      return '强化竞争优势';
    }
    return '重点关注发展';
  }

  generateRecommendationContent(insight, topic) {
    return `基于"${insight.title}"的发现，建议重点关注相关领域的战略布局和资源投入，以充分利用发现的机会点。`;
  }

  calculateWordCount(report) {
    if (!report.sections) return 0;
    return report.sections.reduce((total, section) => {
      return total + (section.content ? section.content.length : 0);
    }, 0);
  }
  
  /**
   * 渲染为多种格式
   */
  renderToMultipleFormats(reportData, formats = ['markdown', 'html', 'json']) {
    const renderedFormats = {};
    
    formats.forEach(format => {
      try {
        renderedFormats[format] = this.renderer.render(reportData, format);
      } catch (error) {
        logger.error(`渲染${format}格式失败:`, error);
        renderedFormats[format] = null;
      }
    });
    
    return renderedFormats;
  }
  
  /**
   * 设置渲染器配置
   */
  setRendererConfig(config) {
    this.renderer.setConfig(config);
  }
  
  /**
   * 获取支持的输出格式
   */
  getSupportedFormats() {
    return this.renderer.getSupportedFormats();
  }
}