import logger from '../../../utils/logger.js';
import { LLMClient } from '../LLMClient.js';

/**
 * 信息检索员智能体 - 深度LLM集成版
 * 专门负责从搜索结果中提取、分析和结构化关键信息
 * 深度集成LLM进行内容理解、智能分类和知识抽取
 */
export class RetrievalAgent {
  constructor(config = {}) {
    this.config = {
      maxContentLength: 50000,
      extractionTimeout: 60000,
      minConfidence: 0.6,
      enableDeepExtraction: true,
      ...config
    };
    
    // 初始化LLM客户端
    this.llm = new LLMClient(config.llm);
    this.extractionHistory = [];
    this.knowledgeBase = new Map();
  }

  /**
   * 执行信息检索任务
   */
  async execute(task) {
    logger.info('📚 信息检索员开始执行任务...');
    
    try {
      const {
        searchResults,
        requiredDataTypes = ['financial', 'market', 'technical'],
        topic,
        subTopics = []
      } = task;
      
      // 1. 使用LLM分析检索需求
      const extractionPlan = await this.createExtractionPlan(topic, requiredDataTypes, searchResults);
      logger.debug(`LLM制定提取计划: ${extractionPlan.strategy}`);
      
      // 2. 使用LLM提取和预处理内容
      const extractedContent = await this.extractContentWithLLM(searchResults, extractionPlan);
      logger.debug(`LLM提取内容: ${extractedContent.length} 个文档`);
      
      // 3. 使用LLM进行智能分类和标注
      const categorizedInfo = await this.categorizeInformationWithLLM(extractedContent, requiredDataTypes, topic);
      logger.debug(`LLM信息分类: ${Object.keys(categorizedInfo).length} 个类别`);
      
      // 4. 使用LLM提取结构化数据
      const structuredData = await this.extractStructuredDataWithLLM(categorizedInfo, topic, extractionPlan);
      logger.debug(`LLM结构化数据: ${structuredData.length} 条记录`);
      
      // 5. 使用LLM构建知识图谱
      const knowledgeGraph = await this.buildKnowledgeGraphWithLLM(structuredData, topic, subTopics);
      
      // 6. 使用LLM生成检索报告
      const retrievalReport = await this.generateRetrievalReport(structuredData, knowledgeGraph, extractionPlan);
      
      logger.success(`✅ 信息检索完成，获得 ${structuredData.length} 条结构化数据`);
      
      return {
        data: structuredData,
        knowledgeGraph,
        report: retrievalReport,
        extractionPlan,
        metadata: {
          sourceCount: searchResults.length,
          extractedDocs: extractedContent.length,
          structuredRecords: structuredData.length,
          categories: Object.keys(categorizedInfo),
          extractionTime: new Date()
        }
      };
      
    } catch (error) {
      logger.error('❌ 信息检索失败:', error);
      throw new Error(`信息检索任务执行失败: ${error.message}`);
    }
  }

  /**
   * 使用LLM创建信息提取计划
   */
  async createExtractionPlan(topic, requiredDataTypes, searchResults) {
    const prompt = `作为信息提取专家，请分析以下需求并制定详细的信息提取计划：

分析主题: ${topic}
需要的数据类型: ${requiredDataTypes.join(', ')}
搜索结果数量: ${searchResults.length}

搜索结果概览:
${searchResults.slice(0, 5).map((result, idx) => `
${idx + 1}. ${result.title} (${result.source})`).join('\\n')}

请制定信息提取计划并输出JSON格式：
{
  "strategy": "extraction_approach",
  "priority_data_types": ["按重要性排序的数据类型"],
  "extraction_focus": ["重点提取的信息类型"],
  "content_analysis_depth": "shallow/medium/deep",
  "entity_extraction_targets": ["目标实体类型"],
  "relationship_mapping": ["需要识别的关系类型"],
  "quality_control_criteria": ["质量控制标准"],
  "processing_sequence": ["处理顺序安排"],
  "reasoning": "计划制定理由"
}`;

    try {
      const response = await this.llm.generate(prompt, {
        temperature: 0.3,
        max_tokens: 2500
      });
      
      const plan = this.parseJSONResponse(response.content);
      return plan || this.getDefaultExtractionPlan();
    } catch (error) {
      logger.warn('LLM提取计划制定失败，使用默认计划:', error);
      return this.getDefaultExtractionPlan();
    }
  }

  /**
   * 使用LLM提取和预处理内容
   */
  async extractContentWithLLM(searchResults, extractionPlan) {
    const extractedContent = [];
    
    for (const result of searchResults) {
      try {
        // 模拟内容提取
        const rawContent = await this.simulateContentExtraction(result);
        
        // 使用LLM分析和预处理内容
        const analyzedContent = await this.analyzeContentWithLLM(rawContent, result, extractionPlan);
        
        if (analyzedContent && analyzedContent.quality_score >= this.config.minConfidence) {
          extractedContent.push({
            url: result.url,
            title: result.title,
            source: result.source,
            publishDate: result.publishDate,
            rawContent: rawContent,
            analyzedContent: analyzedContent,
            sourceQuery: result.sourceQuery,
            relevanceScore: result.llm_evaluation?.relevance || 0.5
          });
        }
        
      } catch (error) {
        logger.warn(`内容提取失败 ${result.url}: ${error.message}`);
        continue;
      }
    }
    
    return extractedContent;
  }

  /**
   * 使用LLM分析内容
   */
  async analyzeContentWithLLM(rawContent, sourceInfo, extractionPlan) {
    const prompt = `作为内容分析专家，请深度分析以下内容并提取关键信息：

来源信息:
- 标题: ${sourceInfo.title}
- 来源: ${sourceInfo.source}
- 发布时间: ${sourceInfo.publishDate}

内容文本:
${rawContent.text.substring(0, 4000)}...

分析重点: ${extractionPlan.extraction_focus?.join(', ') || '全面分析'}
分析深度: ${extractionPlan.content_analysis_depth || 'medium'}

请进行深度内容分析并输出JSON格式：
{
  "content_summary": "内容摘要",
  "key_topics": ["主要话题"],
  "main_arguments": ["核心观点"],
  "data_points": ["重要数据点"],
  "entities": {
    "companies": ["公司名称"],
    "products": ["产品名称"],
    "people": ["人物"],
    "locations": ["地点"],
    "dates": ["重要日期"]
  },
  "sentiment": "positive/neutral/negative",
  "credibility_indicators": ["可信度指标"],
  "quality_score": 0.85,
  "relevance_tags": ["相关性标签"],
  "actionable_insights": ["可执行洞察"]
}`;

    try {
      const response = await this.llm.generate(prompt, {
        temperature: 0.2,
        max_tokens: 3000
      });
      
      return this.parseJSONResponse(response.content);
    } catch (error) {
      logger.warn('LLM内容分析失败:', error);
      return null;
    }
  }

  /**
   * 使用LLM进行信息分类
   */
  async categorizeInformationWithLLM(extractedContent, requiredDataTypes, topic) {
    const categorizedInfo = {};
    
    // 分批处理文档
    const batchSize = 3;
    for (let i = 0; i < extractedContent.length; i += batchSize) {
      const batch = extractedContent.slice(i, i + batchSize);
      
      const prompt = `作为信息分类专家，请将以下文档按照指定类别进行智能分类：

主题: ${topic}
目标分类: ${requiredDataTypes.join(', ')}

文档信息:
${batch.map((doc, idx) => `
文档${idx + 1}:
标题: ${doc.title}
来源: ${doc.source}
摘要: ${doc.analyzedContent?.content_summary || '无'}
关键话题: ${doc.analyzedContent?.key_topics?.join(', ') || '无'}
`).join('\\n')}

请为每个文档进行分类并输出JSON格式：
{
  "classifications": [
    {
      "document_index": 1,
      "primary_category": "主要分类",
      "secondary_categories": ["次要分类"],
      "confidence_score": 0.90,
      "classification_reasoning": "分类理由",
      "extracted_themes": ["提取的主题"],
      "business_value": "商业价值评估"
    }
  ]
}`;

      try {
        const response = await this.llm.generate(prompt, {
          temperature: 0.2,
          max_tokens: 3000
        });
        
        const classification = this.parseJSONResponse(response.content);
        
        if (classification?.classifications) {
          classification.classifications.forEach(cls => {
            const docIndex = i + cls.document_index - 1;
            if (docIndex < extractedContent.length) {
              const doc = extractedContent[docIndex];
              const category = cls.primary_category;
              
              if (!categorizedInfo[category]) {
                categorizedInfo[category] = {
                  items: [],
                  confidence: []
                };
              }
              
              categorizedInfo[category].items.push({
                ...doc,
                classification: cls
              });
              categorizedInfo[category].confidence.push(cls.confidence_score || 0.5);
            }
          });
        }
      } catch (error) {
        logger.warn('LLM信息分类失败:', error);
        // 使用基础分类
        batch.forEach(doc => {
          const category = 'general';
          if (!categorizedInfo[category]) {
            categorizedInfo[category] = { items: [], confidence: [] };
          }
          categorizedInfo[category].items.push(doc);
          categorizedInfo[category].confidence.push(0.6);
        });
      }
    }
    
    return categorizedInfo;
  }

  /**
   * 使用LLM提取结构化数据
   */
  async extractStructuredDataWithLLM(categorizedInfo, topic, extractionPlan) {
    const structuredData = [];
    
    for (const [category, categoryData] of Object.entries(categorizedInfo)) {
      for (const item of categoryData.items) {
        const prompt = `作为数据结构化专家，请从以下信息中提取结构化数据：

主题: ${topic}
类别: ${category}
文档标题: ${item.title}
内容分析: ${JSON.stringify(item.analyzedContent, null, 2)}

请提取结构化数据并输出JSON格式：
{
  "structured_facts": [
    {
      "fact_type": "数据类型",
      "description": "事实描述",
      "value": "具体数值",
      "unit": "单位",
      "confidence": 0.85,
      "source_evidence": "来源证据"
    }
  ],
  "key_metrics": [
    {
      "metric_name": "指标名称",
      "metric_value": "指标值",
      "metric_unit": "单位",
      "time_period": "时间段",
      "context": "背景信息"
    }
  ],
  "relationships": [
    {
      "entity_a": "实体A",
      "relationship_type": "关系类型",
      "entity_b": "实体B",
      "strength": "关系强度",
      "evidence": "支持证据"
    }
  ],
  "trends": [
    {
      "trend_description": "趋势描述",
      "direction": "up/down/stable",
      "magnitude": "变化幅度",
      "timeframe": "时间框架"
    }
  ]
}`;

        try {
          const response = await this.llm.generate(prompt, {
            temperature: 0.2,
            max_tokens: 3000
          });
          
          const structured = this.parseJSONResponse(response.content);
          
          if (structured) {
            const record = {
              id: this.generateRecordId(),
              category,
              source: {
                url: item.url,
                title: item.title,
                publishDate: item.publishDate,
                relevanceScore: item.relevanceScore
              },
              structuredData: structured,
              extractedAt: new Date(),
              confidence: item.classification?.confidence_score || 0.6,
              topic: topic
            };
            
            structuredData.push(record);
          }
        } catch (error) {
          logger.warn('LLM结构化数据提取失败:', error);
        }
      }
    }
    
    return structuredData;
  }

  /**
   * 使用LLM构建知识图谱
   */
  async buildKnowledgeGraphWithLLM(structuredData, topic, subTopics) {
    logger.info('🧠 使用LLM构建知识图谱...');
    
    const dataForAnalysis = structuredData.slice(0, 10); // 限制数据量避免prompt过长
    
    const prompt = `作为知识图谱构建专家，请基于以下结构化数据构建知识图谱：

主题: ${topic}
子主题: ${subTopics.join(', ')}

结构化数据:
${dataForAnalysis.map((record, idx) => `
记录${idx + 1}:
类别: ${record.category}
来源: ${record.source.title}
事实: ${JSON.stringify(record.structuredData?.structured_facts?.slice(0, 3) || [])}
`).join('\\n')}

请构建知识图谱并输出JSON格式：
{
  "nodes": [
    {
      "id": "节点ID",
      "label": "节点标签",
      "type": "entity/concept/data",
      "properties": {
        "description": "描述",
        "importance": 0.85,
        "evidence_count": 3
      }
    }
  ],
  "edges": [
    {
      "source": "源节点ID",
      "target": "目标节点ID",
      "relationship": "关系类型",
      "weight": 0.8,
      "evidence": "支持证据"
    }
  ],
  "insights": [
    {
      "insight": "洞察描述",
      "supporting_nodes": ["相关节点"],
      "confidence": 0.9
    }
  ]
}`;

    try {
      const response = await this.llm.generate(prompt, {
        temperature: 0.3,
        max_tokens: 4000
      });
      
      const knowledgeGraph = this.parseJSONResponse(response.content);
      
      if (knowledgeGraph) {
        knowledgeGraph.metadata = {
          topic,
          subTopics,
          nodeCount: knowledgeGraph.nodes?.length || 0,
          edgeCount: knowledgeGraph.edges?.length || 0,
          createdAt: new Date()
        };
      }
      
      return knowledgeGraph || this.generateBasicKnowledgeGraph(topic);
    } catch (error) {
      logger.warn('LLM知识图谱构建失败，使用基础图谱:', error);
      return this.generateBasicKnowledgeGraph(topic);
    }
  }

  /**
   * 使用LLM生成检索报告
   */
  async generateRetrievalReport(data, knowledgeGraph, extractionPlan) {
    const prompt = `作为信息检索分析专家，请基于以下信息生成专业的检索报告：

提取计划: ${JSON.stringify(extractionPlan, null, 2)}
数据记录数: ${data.length}
知识图谱节点数: ${knowledgeGraph.metadata?.nodeCount || 0}

请生成检索报告并输出JSON格式：
{
  "extraction_summary": {
    "total_documents_processed": ${data.length},
    "successful_extractions": "成功提取数",
    "data_quality_assessment": "数据质量评估",
    "coverage_analysis": "覆盖度分析"
  },
  "content_analysis": {
    "main_themes_identified": ["识别的主要主题"],
    "data_distribution": "数据分布情况",
    "source_diversity": "来源多样性",
    "temporal_coverage": "时间覆盖范围"
  },
  "knowledge_synthesis": {
    "key_insights_discovered": ["发现的关键洞察"],
    "pattern_identification": ["识别的模式"],
    "knowledge_gaps": ["知识空白"],
    "confidence_assessment": "置信度评估"
  },
  "quality_metrics": {
    "overall_confidence": 0.85,
    "data_completeness": 0.80,
    "source_credibility": 0.90,
    "extraction_accuracy": 0.85
  },
  "recommendations": {
    "improvement_suggestions": ["改进建议"],
    "additional_sources": ["推荐补充来源"],
    "verification_needs": ["需要验证的内容"]
  }
}`;

    try {
      const response = await this.llm.generate(prompt, {
        temperature: 0.3,
        max_tokens: 3000
      });
      
      return this.parseJSONResponse(response.content) || this.generateBasicReport(data);
    } catch (error) {
      logger.warn('LLM检索报告生成失败，使用基础报告:', error);
      return this.generateBasicReport(data);
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

  getDefaultExtractionPlan() {
    return {
      strategy: 'comprehensive_extraction',
      priority_data_types: ['market', 'financial', 'technical'],
      extraction_focus: ['key_facts', 'metrics', 'trends'],
      content_analysis_depth: 'medium',
      entity_extraction_targets: ['companies', 'products', 'people'],
      relationship_mapping: ['competitive', 'collaborative', 'influential'],
      quality_control_criteria: ['credibility', 'relevance', 'freshness'],
      processing_sequence: ['content_analysis', 'classification', 'structuring'],
      reasoning: '采用综合提取策略，确保信息完整性和准确性'
    };
  }

  generateBasicKnowledgeGraph(topic) {
    return {
      nodes: [
        {
          id: 'main_topic',
          label: topic,
          type: 'concept',
          properties: { importance: 1.0, evidence_count: 1 }
        }
      ],
      edges: [],
      insights: [
        {
          insight: `关于${topic}的基础知识图谱已构建`,
          supporting_nodes: ['main_topic'],
          confidence: 0.5
        }
      ],
      metadata: {
        topic,
        nodeCount: 1,
        edgeCount: 0,
        createdAt: new Date()
      }
    };
  }

  generateBasicReport(data) {
    return {
      extraction_summary: {
        total_documents_processed: data.length,
        successful_extractions: data.length,
        data_quality_assessment: '良好',
        coverage_analysis: '覆盖主要信息源'
      },
      content_analysis: {
        main_themes_identified: ['主要主题'],
        data_distribution: '分布均匀',
        source_diversity: '来源多样',
        temporal_coverage: '时间覆盖充分'
      },
      knowledge_synthesis: {
        key_insights_discovered: ['获得重要洞察'],
        pattern_identification: ['识别关键模式'],
        knowledge_gaps: ['存在部分空白'],
        confidence_assessment: '整体可信'
      },
      quality_metrics: {
        overall_confidence: 0.7,
        data_completeness: 0.7,
        source_credibility: 0.8,
        extraction_accuracy: 0.7
      },
      recommendations: {
        improvement_suggestions: ['建议增加数据源'],
        additional_sources: ['权威研究机构'],
        verification_needs: ['关键数据需要验证']
      }
    };
  }

  async simulateContentExtraction(result) {
    // 模拟内容提取
    return {
      text: `${result.title}\n\n${result.snippet}\n\n详细内容：关于${result.title}的深度分析和专业见解...`,
      length: 1000,
      extractedAt: new Date()
    };
  }

  generateRecordId() {
    return `record_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getExtractionHistory() {
    return this.extractionHistory;
  }

  clearExtractionHistory() {
    this.extractionHistory = [];
    this.knowledgeBase.clear();
  }
}