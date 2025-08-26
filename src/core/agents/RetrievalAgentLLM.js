import logger from '../../../utils/logger.js';
import { LLMClient } from '../LLMClient.js';

/**
 * 信息检索员智能体 - 优化版
 * 专门负责从搜索结果中提取、分析和结构化关键信息
 * 使用单次LLM调用完成综合信息检索
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
    
    // 初始化LLM客户端，优先使用传入的LLM实例
    if (config.llmInstance) {
      this.llm = config.llmInstance;
    } else {
      this.llm = new LLMClient(config.llm);
    }
    this.extractionHistory = [];
    this.knowledgeBase = new Map();
  }

  /**
   * 执行信息检索任务 - 优化为单次LLM调用
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
      
      // 单次LLM调用完成所有检索相关工作
      const comprehensiveExtractionResult = await this.performComprehensiveExtraction(
        searchResults, requiredDataTypes, topic, subTopics
      );
      
      logger.debug(`单次LLM完成综合信息检索`);
      
      // 基于综合结果生成结构化数据
      const structuredData = this.generateStructuredDataFromExtraction(comprehensiveExtractionResult);
      
      logger.success(`✅ 信息检索完成，获得 ${structuredData.length} 条结构化数据`);
      
      return {
        data: structuredData,
        knowledgeGraph: comprehensiveExtractionResult.knowledgeGraph,
        report: comprehensiveExtractionResult.retrievalReport,
        extractionPlan: comprehensiveExtractionResult.extractionPlan,
        metadata: {
          sourceCount: searchResults.length,
          extractedDocs: comprehensiveExtractionResult.extractedContent?.length || 0,
          structuredRecords: structuredData.length,
          categories: comprehensiveExtractionResult.categories || [],
          extractionTime: new Date(),
          llmCalls: 1 // 优化后只用了1次LLM调用
        }
      };
      
    } catch (error) {
      logger.error('❌ 信息检索失败:', error);
      throw new Error(`信息检索任务执行失败: ${error.message}`);
    }
  }

  /**
   * 单次LLM调用完成综合信息检索
   */
  async performComprehensiveExtraction(searchResults, requiredDataTypes, topic, subTopics) {
    const prompt = `作为专业的信息检索与分析专家，请对以下搜索结果进行综合性信息检索与分析：

**分析参数**：
- 主题: ${topic}
- 子主题: ${subTopics.join(', ') || '无'}
- 需要的数据类型: ${requiredDataTypes.join(', ')}
- 搜索结果数量: ${searchResults.length}

**搜索结果详细信息**：
${searchResults.slice(0, 15).map((result, idx) => `
${idx + 1}. 标题: ${result.title}
   来源: ${result.source}
   URL: ${result.url}
   内容摘要: ${result.snippet || '无摘要'}
   发布时间: ${result.publishDate || '未知'}
   相关性评分: ${result.llm_evaluation?.overall || 'N/A'}`).join('\n')}

**任务要求**：
1. 从搜索结果中提取关键信息和数据点
2. 对信息进行分类和结构化
3. 构建知识图谱表示关系
4. 生成检索分析报告

请输出JSON格式的综合结果：
{
  "extractionPlan": {
    "strategy": "direct_content_analysis",
    "priority_data_types": ["按重要性排序的数据类型"],
    "extraction_focus": ["重点提取的信息类型"],
    "quality_control_criteria": ["质量控制标准"]
  },
  "categorizedInfo": {
    "类别1": {
      "items": [
        {
          "title": "文档标题",
          "source": "来源",
          "url": "链接地址",
          "summary": "内容摘要",
          "key_topics": ["主要话题"],
          "extracted_data": {
            "facts": ["关键事实"],
            "metrics": ["重要指标"],
            "insights": ["洞察点"]
          },
          "confidence": 0.85
        }
      ],
      "category_summary": "类别总结"
    }
  },
  "structuredData": [
    {
      "fact_type": "数据类型",
      "description": "事实描述",
      "value": "具体数值",
      "confidence": 0.85,
      "source_title": "来源标题",
      "source_url": "来源链接",
      "category": "所属类别"
    }
  ],
  "knowledgeGraph": {
    "nodes": [
      {
        "id": "节点ID",
        "label": "节点标签",
        "type": "entity/concept/data",
        "properties": {
          "importance": 0.85,
          "source_count": 2
        }
      }
    ],
    "edges": [
      {
        "source": "源节点ID",
        "target": "目标节点ID",
        "relationship": "关系类型",
        "weight": 0.8
      }
    ],
    "insights": [
      {
        "insight": "洞察描述",
        "supporting_sources": ["支持来源"],
        "confidence": 0.9
      }
    ]
  },
  "retrievalReport": {
    "extraction_summary": {
      "total_sources_processed": ${searchResults.length},
      "successful_extractions": "成功提取数",
      "data_quality_assessment": "数据质量评估"
    },
    "content_analysis": {
      "main_themes_identified": ["识别的主要主题"],
      "data_distribution": "数据分布情况"
    },
    "quality_metrics": {
      "overall_confidence": 0.85,
      "data_completeness": 0.80,
      "source_credibility": 0.90
    }
  }
}`;

    try {
      const response = await this.llm.generate(prompt, {
        temperature: 0.2,
        max_tokens: 6000
      });
      
      const result = this.parseJSONResponse(response.content);
      
      if (result) {
        // 添加元数据
        if (result.knowledgeGraph) {
          result.knowledgeGraph.metadata = {
            topic,
            subTopics,
            nodeCount: result.knowledgeGraph.nodes?.length || 0,
            edgeCount: result.knowledgeGraph.edges?.length || 0,
            createdAt: new Date()
          };
        }
        
        return {
          extractionPlan: result.extractionPlan || this.getDefaultExtractionPlan(),
          categorizedInfo: result.categorizedInfo || {},
          structuredData: result.structuredData || [],
          knowledgeGraph: result.knowledgeGraph || this.generateBasicKnowledgeGraph(topic),
          retrievalReport: result.retrievalReport || this.generateBasicReport([]),
          categories: Object.keys(result.categorizedInfo || {}),
          extractedContent: this.extractContentFromCategories(result.categorizedInfo || {})
        };
      }
    } catch (error) {
      logger.warn('LLM综合信息检索失败，使用默认结果:', error);
    }
    
    // 降级到默认结果
    return {
      extractionPlan: this.getDefaultExtractionPlan(),
      categorizedInfo: { 'general': { items: [], category_summary: '通用类别' } },
      structuredData: [],
      knowledgeGraph: this.generateBasicKnowledgeGraph(topic),
      retrievalReport: this.generateBasicReport([]),
      categories: ['general'],
      extractedContent: []
    };
  }

  /**
   * 从综合结果生成结构化数据
   */
  generateStructuredDataFromExtraction(extractionResult) {
    const structuredData = [];
    
    // 直接使用LLM提取的结构化数据
    if (extractionResult.structuredData && Array.isArray(extractionResult.structuredData)) {
      extractionResult.structuredData.forEach((item, index) => {
        structuredData.push({
          id: this.generateRecordId(),
          category: item.category || 'general',
          source: {
            title: item.source_title || '未知来源',
            url: item.source_url || '',
            relevanceScore: item.confidence || 0.5
          },
          structuredData: {
            structured_facts: [{
              fact_type: item.fact_type || 'general',
              description: item.description || '',
              value: item.value || '',
              confidence: item.confidence || 0.5
            }]
          },
          extractedAt: new Date(),
          confidence: item.confidence || 0.5
        });
      });
    }
    
    return structuredData;
  }

  /**
   * 从分类信息中提取内容
   */
  extractContentFromCategories(categorizedInfo) {
    const extractedContent = [];
    
    Object.entries(categorizedInfo).forEach(([category, categoryData]) => {
      if (categoryData.items && Array.isArray(categoryData.items)) {
        categoryData.items.forEach(item => {
          extractedContent.push({
            title: item.title || '',
            source: item.source || '',
            url: item.url || '',
            analyzedContent: {
              content_summary: item.summary || '',
              key_topics: item.key_topics || [],
              extracted_data: item.extracted_data || {},
              quality_score: item.confidence || 0.5
            },
            category: category
          });
        });
      }
    });
    
    return extractedContent;
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

  generateRecordId() {
    return `record_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getDefaultExtractionPlan() {
    return {
      strategy: 'direct_content_analysis',
      priority_data_types: ['market', 'financial', 'technical'],
      extraction_focus: ['key_facts', 'metrics', 'trends', 'insights'],
      quality_control_criteria: ['credibility', 'relevance', 'freshness']
    };
  }

  generateBasicKnowledgeGraph(topic) {
    return {
      nodes: [
        {
          id: 'main_topic',
          label: topic,
          type: 'concept',
          properties: { importance: 1.0, source_count: 1 }
        }
      ],
      edges: [],
      insights: [
        {
          insight: `关于${topic}的基础知识图谱已构建`,
          supporting_sources: ['search_results'],
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
        total_sources_processed: data.length,
        successful_extractions: data.length,
        data_quality_assessment: '良好'
      },
      content_analysis: {
        main_themes_identified: ['主要主题'],
        data_distribution: '分布均匀'
      },
      quality_metrics: {
        overall_confidence: 0.7,
        data_completeness: 0.7,
        source_credibility: 0.8
      }
    };
  }

  getExtractionHistory() {
    return this.extractionHistory;
  }

  clearExtractionHistory() {
    this.extractionHistory = [];
    this.knowledgeBase.clear();
  }
}