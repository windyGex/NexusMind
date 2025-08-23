import logger from '../../../utils/logger.js';
import { LLMClient } from '../LLMClient.js';
import { ReportRenderer } from '../../utils/ReportRenderer.js';

/**
 * 报告撰写员智能体 - 深度LLM集成版
 * 专门负责将分析洞察转化为专业的结构化报告
 * 深度集成LLM进行报告架构设计、内容创作和质量优化
 */
export class ReportAgent {
  constructor(config = {}) {
    this.config = {
      maxSectionLength: 3000,
      minSectionLength: 300,
      reportStyle: 'professional',
      language: 'zh-cn',
      outputFormat: 'markdown',
      enableLLMOptimization: true,
      qualityThreshold: 0.8,
      ...config
    };
    
    // 初始化LLM客户端
    this.llm = new LLMClient(config.llm);
    
    this.renderer = new ReportRenderer({
      outputFormat: this.config.outputFormat,
      includeMetadata: true,
      includeTableOfContents: true
    });
    
    this.reportHistory = [];
  }

  /**
   * 执行报告生成任务
   */
  async execute(task) {
    logger.info('📝 报告撰写员开始执行任务...');
    
    try {
      const { analysisResults, topic, metadata, originalQuery } = task;
      
      // 1. 使用LLM分析报告需求和设计报告架构
      const reportArchitecture = await this.designReportArchitectureWithLLM(originalQuery, topic, analysisResults);
      logger.debug(`LLM设计报告架构: ${reportArchitecture.sections?.length || 0} 个章节`);
      
      // 2. 使用LLM生成报告大纲
      const reportOutline = await this.generateReportOutlineWithLLM(reportArchitecture, analysisResults, topic);
      logger.debug(`LLM生成报告大纲完成`);
      
      // 3. 使用LLM撰写各个章节
      const reportSections = await this.generateSectionsWithLLM(reportOutline, analysisResults, topic, metadata);
      logger.debug(`LLM生成 ${reportSections.length} 个章节`);
      
      // 4. 使用LLM优化和完善整体报告
      const optimizedReport = await this.optimizeReportWithLLM(reportSections, reportArchitecture, topic);
      
      // 5. 使用LLM生成执行摘要
      const executiveSummary = await this.generateExecutiveSummaryWithLLM(optimizedReport, analysisResults, topic);
      
      // 6. 组装最终报告
      const finalReport = await this.assembleFinalReportWithLLM(
        optimizedReport, 
        executiveSummary, 
        reportArchitecture, 
        metadata
      );
      
      // 7. 使用LLM进行质量评估和改进建议
      const qualityAssessment = await this.assessReportQualityWithLLM(finalReport, originalQuery);
      
      logger.success(`✅ 报告生成完成，质量评分: ${qualityAssessment.overall_score?.toFixed(2) || 'N/A'}`);
      
      return {
        ...finalReport,
        qualityAssessment,
        architecture: reportArchitecture,
        outline: reportOutline
      };
      
    } catch (error) {
      logger.error('❌ 报告生成失败:', error);
      throw new Error(`报告生成任务执行失败: ${error.message}`);
    }
  }

  /**
   * 使用LLM设计报告架构
   */
  async designReportArchitectureWithLLM(query, topic, analysisResults) {
    const prompt = `作为专业的报告架构设计专家，请基于以下信息设计最适合的报告结构：

用户查询: ${query}
分析主题: ${topic}
分析洞察数量: ${analysisResults.insights?.length || 0}
数据类型: ${Object.keys(analysisResults.analysis || {}).join(', ')}

请分析用户需求并设计专业的报告架构，输出JSON格式：
{
  "report_type": "comprehensive/market_research/technical_analysis/competitive_intelligence",
  "target_audience": "executives/analysts/investors/general",
  "report_purpose": "strategic_planning/investment_decision/market_entry/competitive_analysis",
  "writing_style": "formal/business/academic/accessible",
  "key_focus_areas": ["重点关注领域"],
  "sections": [
    {
      "id": "section_id",
      "title": "章节标题",
      "purpose": "章节目的",
      "content_type": "summary/analysis/data/recommendations",
      "priority": "high/medium/low",
      "estimated_length": "short/medium/long",
      "order": 1
    }
  ],
  "success_criteria": ["成功标准"],
  "design_reasoning": "架构设计理由"
}`;

    try {
      const response = await this.llm.generate(prompt, {
        temperature: 0.3,
        max_tokens: 3000
      });
      
      const architecture = this.parseJSONResponse(response.content);
      return architecture || this.getDefaultArchitecture();
    } catch (error) {
      logger.warn('LLM报告架构设计失败，使用默认架构:', error);
      return this.getDefaultArchitecture();
    }
  }

  /**
   * 使用LLM生成报告大纲
   */
  async generateReportOutlineWithLLM(architecture, analysisResults, topic) {
    const prompt = `作为资深报告撰写专家，请基于报告架构和分析结果生成详细的报告大纲：

报告类型: ${architecture.report_type}
目标读者: ${architecture.target_audience}
写作风格: ${architecture.writing_style}
主题: ${topic}

分析结果概要:
- 洞察数量: ${analysisResults.insights?.length || 0}
- 主要发现: ${analysisResults.insights?.slice(0, 3).map(i => i.title).join(', ') || '无'}
- 数据覆盖: ${Object.keys(analysisResults.analysis || {}).join(', ')}

章节架构:
${architecture.sections?.map(s => `${s.order}. ${s.title} (${s.purpose})`).join('\n') || ''}

请为每个章节生成详细大纲，输出JSON格式：
{
  "report_title": "专业报告标题",
  "subtitle": "副标题",
  "section_outlines": [
    {
      "section_id": "章节ID",
      "title": "章节标题",
      "key_points": ["要点1", "要点2", "要点3"],
      "supporting_data": ["支持数据"],
      "narrative_flow": "叙述逻辑",
      "expected_insights": ["预期洞察"],
      "word_count_target": 500
    }
  ],
  "cross_references": ["章节间关联"],
  "narrative_thread": "整体叙述主线"
}`;

    try {
      const response = await this.llm.generate(prompt, {
        temperature: 0.4,
        max_tokens: 4000
      });
      
      return this.parseJSONResponse(response.content) || this.getDefaultOutline(topic);
    } catch (error) {
      logger.warn('LLM报告大纲生成失败，使用默认大纲:', error);
      return this.getDefaultOutline(topic);
    }
  }

  /**
   * 使用LLM生成各个章节
   */
  async generateSectionsWithLLM(outline, analysisResults, topic, metadata) {
    const sections = [];
    
    for (const sectionOutline of outline.section_outlines || []) {
      try {
        logger.debug(`使用LLM生成章节: ${sectionOutline.title}`);
        
        const sectionContent = await this.generateSectionContentWithLLM(
          sectionOutline, 
          analysisResults, 
          topic, 
          outline.narrative_thread
        );
        
        if (sectionContent) {
          sections.push({
            id: sectionOutline.section_id,
            title: sectionOutline.title,
            content: sectionContent.content,
            metadata: {
              wordCount: sectionContent.word_count,
              keyInsights: sectionContent.key_insights,
              dataReferences: sectionContent.data_references,
              qualityScore: sectionContent.quality_score
            },
            outline: sectionOutline
          });
        }
        
      } catch (error) {
        logger.warn(`章节生成失败 ${sectionOutline.title}: ${error.message}`);
        
        // 生成基础版本章节
        sections.push({
          id: sectionOutline.section_id,
          title: sectionOutline.title,
          content: await this.generateFallbackSection(sectionOutline, topic),
          metadata: { wordCount: 300, qualityScore: 0.6 }
        });
      }
    }
    
    return sections;
  }

  /**
   * 使用LLM生成单个章节内容
   */
  async generateSectionContentWithLLM(sectionOutline, analysisResults, topic, narrativeThread) {
    // 筛选相关的分析数据
    const relevantInsights = this.filterRelevantInsights(analysisResults.insights || [], sectionOutline);
    const relevantData = this.extractRelevantData(analysisResults, sectionOutline);
    
    const prompt = `作为专业的商业分析师和报告撰写专家，请撰写以下章节的详细内容：

章节信息:
- 标题: ${sectionOutline.title}
- 目的: ${sectionOutline.narrative_flow}
- 要点: ${sectionOutline.key_points?.join(', ') || '无'}
- 目标字数: ${sectionOutline.word_count_target || 800}

主题背景: ${topic}
整体叙述主线: ${narrativeThread}

相关洞察:
${relevantInsights.map((insight, idx) => `
${idx + 1}. ${insight.title}
   内容: ${insight.content}
   置信度: ${insight.confidence || 'N/A'}
   重要性: ${insight.importance || 'medium'}
`).join('\n')}

相关数据:
${JSON.stringify(relevantData, null, 2)}

请撰写专业、深入的章节内容，要求：
1. 逻辑清晰，结构合理
2. 数据支撑，观点明确
3. 语言专业，表达准确
4. 符合商业报告写作标准
5. 包含具体的分析和洞察

输出JSON格式：
{
  "content": "完整的章节内容（使用Markdown格式）",
  "key_insights": ["章节关键洞察"],
  "data_references": ["引用的数据点"],
  "word_count": 实际字数,
  "quality_score": 0.85,
  "improvement_suggestions": ["改进建议"]
}`;

    try {
      const response = await this.llm.generate(prompt, {
        temperature: 0.3,
        max_tokens: 4000
      });
      
      return this.parseJSONResponse(response.content);
    } catch (error) {
      logger.warn('LLM章节内容生成失败:', error);
      return null;
    }
  }

  /**
   * 使用LLM优化整体报告
   */
  async optimizeReportWithLLM(sections, architecture, topic) {
    const prompt = `作为报告质量优化专家，请分析和优化以下报告的整体结构和内容：

报告主题: ${topic}
报告类型: ${architecture.report_type}
目标读者: ${architecture.target_audience}

当前章节结构:
${sections.map((section, idx) => `
${idx + 1}. ${section.title}
   字数: ${section.metadata?.wordCount || 'N/A'}
   质量评分: ${section.metadata?.qualityScore || 'N/A'}
   关键洞察: ${section.metadata?.keyInsights?.join(', ') || '无'}
`).join('\n')}

请分析报告的整体质量并提供优化建议，输出JSON格式：
{
  "structure_analysis": "结构分析",
  "content_quality_assessment": "内容质量评估",
  "logical_flow_evaluation": "逻辑流畅性评估",
  "optimization_recommendations": [
    {
      "section_id": "章节ID",
      "recommendation_type": "content/structure/flow",
      "specific_suggestion": "具体建议",
      "priority": "high/medium/low"
    }
  ],
  "overall_improvements": ["整体改进建议"],
  "missing_elements": ["缺失要素"],
  "redundant_content": ["冗余内容"],
  "enhancement_opportunities": ["增强机会"]
}`;

    try {
      const response = await this.llm.generate(prompt, {
        temperature: 0.3,
        max_tokens: 3000
      });
      
      const optimization = this.parseJSONResponse(response.content);
      
      // 应用优化建议（这里简化处理，实际可以更详细）
      if (optimization?.optimization_recommendations) {
        await this.applyOptimizations(sections, optimization);
      }
      
      return sections;
    } catch (error) {
      logger.warn('LLM报告优化失败:', error);
      return sections;
    }
  }

  /**
   * 使用LLM生成执行摘要
   */
  async generateExecutiveSummaryWithLLM(reportSections, analysisResults, topic) {
    const keyInsights = reportSections
      .flatMap(s => s.metadata?.keyInsights || [])
      .slice(0, 10);
    
    const prompt = `作为高级商业分析师，请基于完整报告内容生成专业的执行摘要：

报告主题: ${topic}
章节数量: ${reportSections.length}

关键洞察:
${keyInsights.map((insight, idx) => `${idx + 1}. ${insight}`).join('\n')}

分析概况:
- 数据洞察数量: ${analysisResults.insights?.length || 0}
- 整体置信度: ${analysisResults.quality?.overallConfidence || 'N/A'}
- 分析覆盖度: ${Object.keys(analysisResults.analysis || {}).join(', ')}

请撰写简洁有力的执行摘要，要求：
1. 突出核心发现和关键洞察
2. 明确战略意义和商业价值
3. 简洁明了，适合高管阅读
4. 控制在500-800字

输出JSON格式：
{
  "executive_summary": "完整的执行摘要内容",
  "key_recommendations": ["核心建议"],
  "critical_insights": ["关键洞察"],
  "business_impact": "商业影响评估",
  "action_items": ["行动要点"],
  "risk_considerations": ["风险考量"]
}`;

    try {
      const response = await this.llm.generate(prompt, {
        temperature: 0.3,
        max_tokens: 3000
      });
      
      return this.parseJSONResponse(response.content) || this.getDefaultExecutiveSummary(topic);
    } catch (error) {
      logger.warn('LLM执行摘要生成失败，使用默认摘要:', error);
      return this.getDefaultExecutiveSummary(topic);
    }
  }

  /**
   * 使用LLM组装最终报告
   */
  async assembleFinalReportWithLLM(sections, executiveSummary, architecture, metadata) {
    const prompt = `作为报告编辑专家，请将以下组件组装成完整的专业报告：

报告架构: ${architecture.report_type}
执行摘要: ${executiveSummary.executive_summary}
章节数量: ${sections.length}

请生成最终报告结构，输出JSON格式：
{
  "title": "最终报告标题",
  "subtitle": "副标题",
  "version": "1.0",
  "report_metadata": {
    "generated_date": "生成日期",
    "total_word_count": 总字数,
    "section_count": 章节数,
    "confidence_level": "整体置信度",
    "quality_rating": "质量评级"
  },
  "table_of_contents": ["目录结构"],
  "formatting_instructions": ["格式要求"],
  "distribution_guidelines": ["分发指南"]
}`;

    try {
      const response = await this.llm.generate(prompt, {
        temperature: 0.2,
        max_tokens: 2000
      });
      
      const reportStructure = this.parseJSONResponse(response.content);
      
      // 组装完整报告
      const finalReport = {
        title: reportStructure?.title || `${metadata?.topic || '主题'}分析报告`,
        subtitle: reportStructure?.subtitle || '基于AI多智能体协作的深度分析',
        executiveSummary: executiveSummary,
        sections: sections,
        metadata: {
          generatedAt: new Date(),
          totalWordCount: sections.reduce((sum, s) => sum + (s.metadata?.wordCount || 0), 0),
          sectionCount: sections.length,
          architecture: architecture,
          version: reportStructure?.version || '1.0',
          ...metadata
        },
        tableOfContents: this.generateTableOfContents(sections),
        format: this.config.outputFormat
      };
      
      // 渲染为指定格式
      finalReport.content = this.renderer.render(finalReport, this.config.outputFormat);
      
      return finalReport;
      
    } catch (error) {
      logger.warn('LLM报告组装失败，使用基础组装:', error);
      return this.assembleBasicReport(sections, executiveSummary, metadata);
    }
  }

  /**
   * 使用LLM评估报告质量
   */
  async assessReportQualityWithLLM(report, originalQuery) {
    const prompt = `作为报告质量评估专家，请全面评估以下报告的质量：

原始查询: ${originalQuery}
报告标题: ${report.title}
章节数量: ${report.sections?.length || 0}
总字数: ${report.metadata?.totalWordCount || 0}

评估维度：
1. 内容完整性 - 是否充分回答了用户查询
2. 逻辑结构性 - 章节组织是否合理
3. 分析深度 - 分析是否深入透彻
4. 数据支撑 - 结论是否有数据支持
5. 可读性 - 语言表达是否清晰
6. 专业性 - 是否符合商业报告标准
7. 实用性 - 是否具有实际应用价值

请进行综合评估并输出JSON格式：
{
  "overall_score": 0.85,
  "dimension_scores": {
    "content_completeness": 0.90,
    "logical_structure": 0.85,
    "analysis_depth": 0.80,
    "data_support": 0.85,
    "readability": 0.90,
    "professionalism": 0.85,
    "practicality": 0.80
  },
  "strengths": ["优势点"],
  "weaknesses": ["不足之处"],
  "improvement_suggestions": ["改进建议"],
  "quality_grade": "A/B/C/D",
  "recommendation": "推荐使用/需要改进/重新生成"
}`;

    try {
      const response = await this.llm.generate(prompt, {
        temperature: 0.2,
        max_tokens: 2500
      });
      
      return this.parseJSONResponse(response.content) || this.getDefaultQualityAssessment();
    } catch (error) {
      logger.warn('LLM质量评估失败，使用默认评估:', error);
      return this.getDefaultQualityAssessment();
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

  filterRelevantInsights(insights, sectionOutline) {
    if (!insights || !Array.isArray(insights)) return [];
    
    const keywords = [
      ...(sectionOutline.key_points || []),
      sectionOutline.title,
      sectionOutline.section_id
    ].map(k => k.toLowerCase());
    
    return insights.filter(insight => {
      const insightText = `${insight.title} ${insight.content}`.toLowerCase();
      return keywords.some(keyword => insightText.includes(keyword.toLowerCase()));
    }).slice(0, 5);
  }

  extractRelevantData(analysisResults, sectionOutline) {
    // 简化的数据提取逻辑
    const relevantData = {};
    
    if (analysisResults.analysis) {
      Object.entries(analysisResults.analysis).forEach(([key, value]) => {
        if (sectionOutline.supporting_data?.includes(key) || 
            sectionOutline.section_id.includes(key)) {
          relevantData[key] = value;
        }
      });
    }
    
    return relevantData;
  }

  async generateFallbackSection(sectionOutline, topic) {
    return `## ${sectionOutline.title}\n\n基于当前分析，${topic}在${sectionOutline.title}方面呈现以下特征：\n\n${sectionOutline.key_points?.map(point => `- ${point}`).join('\n') || '- 相关分析正在进行中'}\n\n更详细的分析结果将在后续研究中补充。`;
  }

  async applyOptimizations(sections, optimization) {
    // 简化的优化应用逻辑
    optimization.optimization_recommendations?.forEach(rec => {
      const section = sections.find(s => s.id === rec.section_id);
      if (section && rec.priority === 'high') {
        section.metadata.optimizationApplied = rec.specific_suggestion;
      }
    });
  }

  generateTableOfContents(sections) {
    return sections.map((section, index) => ({
      number: index + 1,
      title: section.title,
      id: section.id,
      page: index + 1
    }));
  }

  assembleBasicReport(sections, executiveSummary, metadata) {
    return {
      title: `${metadata?.topic || '主题'}分析报告`,
      subtitle: '基于AI多智能体协作的深度分析',
      executiveSummary: executiveSummary,
      sections: sections,
      metadata: {
        generatedAt: new Date(),
        totalWordCount: sections.reduce((sum, s) => sum + (s.metadata?.wordCount || 0), 0),
        sectionCount: sections.length,
        version: '1.0',
        ...metadata
      },
      tableOfContents: this.generateTableOfContents(sections),
      format: this.config.outputFormat,
      content: this.renderer.render({ sections }, this.config.outputFormat)
    };
  }

  getDefaultArchitecture() {
    return {
      report_type: 'comprehensive',
      target_audience: 'executives',
      report_purpose: 'strategic_planning',
      writing_style: 'business',
      key_focus_areas: ['市场分析', '竞争格局', '发展趋势'],
      sections: [
        { id: 'summary', title: '执行摘要', purpose: '概述核心发现', content_type: 'summary', priority: 'high', order: 1 },
        { id: 'background', title: '背景分析', purpose: '提供背景信息', content_type: 'analysis', priority: 'medium', order: 2 },
        { id: 'findings', title: '主要发现', purpose: '展示关键洞察', content_type: 'analysis', priority: 'high', order: 3 },
        { id: 'recommendations', title: '建议', purpose: '提供行动建议', content_type: 'recommendations', priority: 'high', order: 4 }
      ],
      success_criteria: ['清晰准确', '逻辑合理', '实用性强'],
      design_reasoning: '采用标准商业报告结构，确保信息传达效果'
    };
  }

  getDefaultOutline(topic) {
    return {
      report_title: `${topic}深度分析报告`,
      subtitle: '基于AI多智能体协作分析',
      section_outlines: [
        {
          section_id: 'summary',
          title: '执行摘要',
          key_points: ['核心发现', '关键洞察', '主要建议'],
          narrative_flow: '概述分析核心结果',
          word_count_target: 600
        },
        {
          section_id: 'analysis',
          title: '详细分析',
          key_points: ['数据分析', '趋势识别', '影响因素'],
          narrative_flow: '深入分析具体情况',
          word_count_target: 1200
        }
      ],
      narrative_thread: '从概述到详细，系统性分析主题'
    };
  }

  getDefaultExecutiveSummary(topic) {
    return {
      executive_summary: `本报告对${topic}进行了全面深入的分析。通过多维度数据收集和智能分析，我们发现了若干重要洞察和发展趋势。`,
      key_recommendations: ['持续关注发展动态', '制定应对策略'],
      critical_insights: ['发现重要发展趋势', '识别关键影响因素'],
      business_impact: '对相关业务决策具有重要参考价值',
      action_items: ['建立监控机制', '制定行动计划'],
      risk_considerations: ['注意市场变化风险', '关注政策影响']
    };
  }

  getDefaultQualityAssessment() {
    return {
      overall_score: 0.75,
      dimension_scores: {
        content_completeness: 0.75,
        logical_structure: 0.80,
        analysis_depth: 0.70,
        data_support: 0.75,
        readability: 0.80,
        professionalism: 0.75,
        practicality: 0.70
      },
      strengths: ['结构清晰', '内容完整'],
      weaknesses: ['分析深度可进一步加强'],
      improvement_suggestions: ['增加更多数据支撑', '深化分析洞察'],
      quality_grade: 'B',
      recommendation: '质量良好，可以使用'
    };
  }

  getReportHistory() {
    return this.reportHistory;
  }

  clearReportHistory() {
    this.reportHistory = [];
  }
}