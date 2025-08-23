import logger from '../../../utils/logger.js';

/**
 * 信息检索员智能体
 * 专门负责从搜索结果中提取、清洗、分类和结构化关键信息
 * 具备内容解析、数据提取、信息验证和知识图谱构建能力
 */
export class RetrievalAgent {
  constructor(config = {}) {
    this.config = {
      maxContentLength: 50000,
      extractionTimeout: 60000,
      minConfidence: 0.6,
      enableDeepExtraction: true,
      enableFactVerification: false,
      ...config
    };
    
    this.extractionHistory = [];
    this.knowledgeBase = new Map();
    this.entityDatabase = new Map();
    this.initializeExtractionRules();
  }

  /**
   * 初始化信息提取规则
   */
  initializeExtractionRules() {
    this.extractionRules = {
      // 数值信息提取
      numbers: {
        patterns: [
          /(\d+(?:\.\d+)?)[%％]/g, // 百分比
          /(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:万|亿|千万|百万)/g, // 中文数字单位
          /\$(\d+(?:,\d{3})*(?:\.\d+)?)/g, // 美元
          /(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:元|美元|欧元)/g // 货币
        ],
        types: ['percentage', 'large_number', 'currency', 'currency']
      },
      
      // 时间信息提取
      dates: {
        patterns: [
          /(\d{4})年(\d{1,2})月/g,
          /(\d{4})-(\d{1,2})-(\d{1,2})/g,
          /(\d{1,2})月(\d{1,2})日/g,
          /(第[一二三四]季度)/g
        ],
        types: ['year_month', 'full_date', 'month_day', 'quarter']
      },
      
      // 实体信息提取
      entities: {
        patterns: [
          /([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\s*(?:公司|Corp|Inc|Ltd)/g, // 公司名
          /([一-龯]{2,10}(?:公司|集团|科技|技术))/g, // 中文公司名
          /([A-Z]{2,10})/g, // 股票代码
          /(CEO|CTO|CFO|总裁|董事长|创始人)/g // 职位
        ],
        types: ['company_en', 'company_cn', 'stock_code', 'position']
      },
      
      // 关键指标提取
      metrics: {
        patterns: [
          /(营收|收入|营业收入)[：:]\s*([^，。\n]+)/g,
          /(净利润|利润)[：:]\s*([^，。\n]+)/g,
          /(市值|估值)[：:]\s*([^，。\n]+)/g,
          /(用户数|客户数)[：:]\s*([^，。\n]+)/g
        ],
        types: ['revenue', 'profit', 'valuation', 'users']
      }
    };
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
      
      // 1. 内容提取和预处理
      const extractedContent = await this.extractContentFromResults(searchResults);
      logger.debug(`提取内容: ${extractedContent.length} 个网页`);
      
      // 2. 信息分类和标注
      const categorizedInfo = await this.categorizeInformation(extractedContent, requiredDataTypes);
      logger.debug(`信息分类: ${Object.keys(categorizedInfo).length} 个类别`);
      
      // 3. 结构化数据提取
      const structuredData = await this.extractStructuredData(categorizedInfo, topic);
      logger.debug(`结构化数据: ${structuredData.length} 条记录`);
      
      // 4. 信息验证和去重
      const verifiedData = await this.verifyAndDeduplicateData(structuredData);
      logger.debug(`验证后数据: ${verifiedData.length} 条记录`);
      
      // 5. 知识图谱构建
      const knowledgeGraph = await this.buildKnowledgeGraph(verifiedData, topic, subTopics);
      
      // 6. 生成检索报告
      const retrievalReport = this.generateRetrievalReport(verifiedData, knowledgeGraph);
      
      logger.success(`✅ 信息检索完成，获得 ${verifiedData.length} 条结构化数据`);
      
      return {
        data: verifiedData,
        knowledgeGraph,
        report: retrievalReport,
        metadata: {
          sourceCount: searchResults.length,
          extractedPages: extractedContent.length,
          structuredRecords: verifiedData.length,
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
   * 从搜索结果中提取内容
   */
  async extractContentFromResults(searchResults) {
    const extractedContent = [];
    
    for (const result of searchResults) {
      try {
        // 模拟网页内容提取（实际应用中会使用web scraping工具）
        const content = await this.simulateContentExtraction(result);
        
        if (content && content.text && content.text.length > 100) {
          extractedContent.push({
            url: result.url,
            title: result.title,
            source: result.source,
            publishDate: result.publishDate,
            content: content,
            sourceQuery: result.sourceQuery,
            relevanceScore: result.scores?.relevance || 0.5
          });
        }
        
      } catch (error) {
        logger.warn(`提取内容失败 ${result.url}: ${error.message}`);
        continue;
      }
    }
    
    return extractedContent;
  }

  /**
   * 模拟内容提取
   */
  async simulateContentExtraction(result) {
    // 模拟从网页提取的详细内容
    const mockContent = `
      ${result.title}
      
      ${result.snippet}
      
      详细分析内容：
      
      1. 市场概况
      ${result.source}发布的最新数据显示，相关市场在2024年呈现稳定增长态势。
      预计全年营收将达到1000亿元，同比增长15.8%。
      
      2. 技术发展
      在技术创新方面，主要公司持续加大研发投入，预计研发费用占营收比重将达到12%。
      新技术的应用使得用户体验显著提升，用户满意度达到85%以上。
      
      3. 竞争格局
      目前市场前三名公司分别占据45%、28%和15%的市场份额。
      行业集中度相对较高，但仍有新进入者带来创新活力。
      
      4. 未来展望
      专家预测，随着政策支持和技术进步，该领域在未来3-5年内将保持20%以上的年均增长率。
      投资价值凸显，建议重点关注技术领先和商业模式创新的公司。
    `;
    
    return {
      text: mockContent,
      length: mockContent.length,
      extractedAt: new Date(),
      metadata: {
        hasNumbers: /\d+/.test(mockContent),
        hasPercentages: /%/.test(mockContent),
        hasCompanies: /公司|Corp|Inc/.test(mockContent),
        language: 'zh-cn'
      }
    };
  }

  /**
   * 信息分类和标注
   */
  async categorizeInformation(extractedContent, requiredDataTypes) {
    const categorizedInfo = {};
    
    // 初始化类别
    const categories = {
      financial: { items: [], confidence: [] },
      market: { items: [], confidence: [] },
      technical: { items: [], confidence: [] },
      competitive: { items: [], confidence: [] },
      regulatory: { items: [], confidence: [] },
      social: { items: [], confidence: [] }
    };
    
    for (const content of extractedContent) {
      const text = content.content.text;
      
      // 财务信息识别
      if (this.containsFinancialTerms(text)) {
        categories.financial.items.push(content);
        categories.financial.confidence.push(this.calculateFinancialConfidence(text));
      }
      
      // 市场信息识别
      if (this.containsMarketTerms(text)) {
        categories.market.items.push(content);
        categories.market.confidence.push(this.calculateMarketConfidence(text));
      }
      
      // 技术信息识别
      if (this.containsTechnicalTerms(text)) {
        categories.technical.items.push(content);
        categories.technical.confidence.push(this.calculateTechnicalConfidence(text));
      }
      
      // 竞争信息识别
      if (this.containsCompetitiveTerms(text)) {
        categories.competitive.items.push(content);
        categories.competitive.confidence.push(this.calculateCompetitiveConfidence(text));
      }
      
      // 监管信息识别
      if (this.containsRegulatoryTerms(text)) {
        categories.regulatory.items.push(content);
        categories.regulatory.confidence.push(this.calculateRegulatoryConfidence(text));
      }
      
      // 社会影响识别
      if (this.containsSocialTerms(text)) {
        categories.social.items.push(content);
        categories.social.confidence.push(this.calculateSocialConfidence(text));
      }
    }
    
    // 过滤置信度过低的类别
    Object.keys(categories).forEach(category => {
      if (requiredDataTypes.includes(category)) {
        const avgConfidence = categories[category].confidence.length > 0 
          ? categories[category].confidence.reduce((a, b) => a + b, 0) / categories[category].confidence.length
          : 0;
        
        if (avgConfidence >= this.config.minConfidence) {
          categorizedInfo[category] = categories[category];
        }
      }
    });
    
    return categorizedInfo;
  }

  /**
   * 检测财务相关术语
   */
  containsFinancialTerms(text) {
    const financialTerms = [
      '营收', '收入', '利润', '成本', '费用', '资产', '负债', '现金流',
      '市值', '估值', '投资', '融资', '上市', '股价', '股票', '财报',
      '营业额', '毛利率', '净利率', 'ROE', 'ROA', 'PE', 'PB'
    ];
    
    return financialTerms.some(term => text.includes(term));
  }

  /**
   * 检测市场相关术语
   */
  containsMarketTerms(text) {
    const marketTerms = [
      '市场', '行业', '用户', '客户', '需求', '供给', '竞争', '份额',
      '增长', '规模', '趋势', '预测', '调研', '分析', '报告', '数据'
    ];
    
    return marketTerms.some(term => text.includes(term));
  }

  /**
   * 检测技术相关术语
   */
  containsTechnicalTerms(text) {
    const technicalTerms = [
      '技术', '研发', '创新', '专利', '算法', '平台', '系统', '架构',
      '产品', '功能', '性能', '优化', '升级', '迭代', '开发', '设计'
    ];
    
    return technicalTerms.some(term => text.includes(term));
  }

  /**
   * 检测竞争相关术语
   */
  containsCompetitiveTerms(text) {
    const competitiveTerms = [
      '竞争', '对手', '竞品', '比较', '优势', '劣势', '差异化', '战略',
      '领先', '落后', '挑战', '机会', '威胁', '壁垒', '护城河'
    ];
    
    return competitiveTerms.some(term => text.includes(term));
  }

  /**
   * 检测监管相关术语
   */
  containsRegulatoryTerms(text) {
    const regulatoryTerms = [
      '政策', '法规', '监管', '合规', '审批', '许可', '标准', '规范',
      '法律', '条例', '规定', '要求', '限制', '禁止', '允许', '支持'
    ];
    
    return regulatoryTerms.some(term => text.includes(term));
  }

  /**
   * 检测社会影响术语
   */
  containsSocialTerms(text) {
    const socialTerms = [
      '社会', '影响', '责任', '可持续', '环保', '公益', '就业', '民生',
      '舆论', '关注', '讨论', '争议', '支持', '反对', '评价', '口碑'
    ];
    
    return socialTerms.some(term => text.includes(term));
  }

  /**
   * 计算各类别置信度
   */
  calculateFinancialConfidence(text) {
    let score = 0;
    if (/\d+(?:\.\d+)?[%％]/.test(text)) score += 0.3; // 包含百分比
    if (/\d+(?:万|亿|千万|百万)/.test(text)) score += 0.3; // 包含大数字
    if (/财报|年报|季报/.test(text)) score += 0.4; // 包含报告类型
    return Math.min(score, 1.0);
  }

  calculateMarketConfidence(text) {
    let score = 0;
    if (/市场份额|市场规模/.test(text)) score += 0.4;
    if (/用户数|客户数/.test(text)) score += 0.3;
    if (/增长率|增长速度/.test(text)) score += 0.3;
    return Math.min(score, 1.0);
  }

  calculateTechnicalConfidence(text) {
    let score = 0;
    if (/研发费用|研发投入/.test(text)) score += 0.4;
    if (/专利|技术创新/.test(text)) score += 0.3;
    if (/产品功能|技术优势/.test(text)) score += 0.3;
    return Math.min(score, 1.0);
  }

  calculateCompetitiveConfidence(text) {
    let score = 0;
    if (/竞争格局|市场地位/.test(text)) score += 0.4;
    if (/优势|劣势|对比/.test(text)) score += 0.3;
    if (/排名|第一|领先/.test(text)) score += 0.3;
    return Math.min(score, 1.0);
  }

  calculateRegulatoryConfidence(text) {
    let score = 0;
    if (/政策支持|监管要求/.test(text)) score += 0.4;
    if (/合规|审批|许可/.test(text)) score += 0.3;
    if (/标准|规范|规定/.test(text)) score += 0.3;
    return Math.min(score, 1.0);
  }

  calculateSocialConfidence(text) {
    let score = 0;
    if (/社会责任|可持续发展/.test(text)) score += 0.4;
    if (/用户评价|口碑|满意度/.test(text)) score += 0.3;
    if (/社会影响|公众关注/.test(text)) score += 0.3;
    return Math.min(score, 1.0);
  }

  /**
   * 提取结构化数据
   */
  async extractStructuredData(categorizedInfo, topic) {
    const structuredData = [];
    
    for (const [category, categoryData] of Object.entries(categorizedInfo)) {
      for (const item of categoryData.items) {
        const text = item.content.text;
        
        // 应用提取规则
        const extractedEntities = this.applyExtractionRules(text);
        
        // 创建结构化记录
        const record = {
          id: this.generateRecordId(),
          category,
          source: {
            url: item.url,
            title: item.title,
            publishDate: item.publishDate,
            relevanceScore: item.relevanceScore
          },
          entities: extractedEntities,
          rawText: text,
          extractedAt: new Date(),
          confidence: this.calculateExtractionConfidence(extractedEntities),
          topic: topic
        };
        
        structuredData.push(record);
      }
    }
    
    return structuredData;
  }

  /**
   * 应用信息提取规则
   */
  applyExtractionRules(text) {
    const entities = {
      numbers: [],
      dates: [],
      entities: [],
      metrics: []
    };
    
    // 应用每个类别的提取规则
    Object.keys(this.extractionRules).forEach(category => {
      const rules = this.extractionRules[category];
      
      rules.patterns.forEach((pattern, index) => {
        const matches = [...text.matchAll(pattern)];
        
        matches.forEach(match => {
          entities[category].push({
            text: match[0],
            value: match[1] || match[0],
            type: rules.types[index],
            position: match.index,
            confidence: this.calculateEntityConfidence(match[0], rules.types[index])
          });
        });
      });
    });
    
    return entities;
  }

  /**
   * 计算实体置信度
   */
  calculateEntityConfidence(entity, type) {
    let confidence = 0.5;
    
    switch (type) {
      case 'percentage':
        confidence = 0.9; // 百分比通常比较准确
        break;
      case 'currency':
        confidence = 0.8; // 货币金额相对准确
        break;
      case 'company_en':
      case 'company_cn':
        confidence = 0.7; // 公司名需要验证
        break;
      case 'full_date':
        confidence = 0.9; // 完整日期很准确
        break;
      default:
        confidence = 0.6;
    }
    
    return confidence;
  }

  /**
   * 计算提取置信度
   */
  calculateExtractionConfidence(entities) {
    let totalEntities = 0;
    let totalConfidence = 0;
    
    Object.values(entities).forEach(entityList => {
      entityList.forEach(entity => {
        totalEntities++;
        totalConfidence += entity.confidence;
      });
    });
    
    return totalEntities > 0 ? totalConfidence / totalEntities : 0;
  }

  /**
   * 验证和去重数据
   */
  async verifyAndDeduplicateData(structuredData) {
    logger.info('🔍 验证和去重结构化数据...');
    
    // 1. 去重
    const deduplicatedData = this.removeDuplicates(structuredData);
    
    // 2. 数据验证
    const validatedData = deduplicatedData.filter(record => {
      return record.confidence >= this.config.minConfidence &&
             this.validateRecord(record);
    });
    
    // 3. 交叉验证
    if (this.config.enableFactVerification) {
      return await this.crossValidateData(validatedData);
    }
    
    return validatedData;
  }

  /**
   * 移除重复数据
   */
  removeDuplicates(data) {
    const seen = new Set();
    
    return data.filter(record => {
      const key = `${record.source.url}_${record.category}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * 验证记录
   */
  validateRecord(record) {
    // 检查必要字段
    if (!record.source || !record.category || !record.entities) {
      return false;
    }
    
    // 检查实体数量
    const entityCount = Object.values(record.entities).reduce((sum, entities) => sum + entities.length, 0);
    if (entityCount === 0) {
      return false;
    }
    
    return true;
  }

  /**
   * 交叉验证数据
   */
  async crossValidateData(data) {
    // 简化的交叉验证逻辑
    // 实际应用中可以实现更复杂的验证机制
    return data;
  }

  /**
   * 构建知识图谱
   */
  async buildKnowledgeGraph(data, topic, subTopics) {
    logger.info('🧠 构建知识图谱...');
    
    const graph = {
      nodes: [],
      edges: [],
      metadata: {
        topic,
        subTopics,
        nodeCount: 0,
        edgeCount: 0,
        createdAt: new Date()
      }
    };
    
    // 创建主题节点
    graph.nodes.push({
      id: 'main_topic',
      label: topic,
      type: 'topic',
      weight: 1.0
    });
    
    // 处理每条数据记录
    data.forEach(record => {
      const recordId = record.id;
      
      // 创建记录节点
      graph.nodes.push({
        id: recordId,
        label: record.source.title,
        type: 'document',
        category: record.category,
        weight: record.confidence,
        metadata: {
          url: record.source.url,
          publishDate: record.source.publishDate
        }
      });
      
      // 连接到主题
      graph.edges.push({
        source: 'main_topic',
        target: recordId,
        type: 'contains',
        weight: record.confidence
      });
      
      // 处理提取的实体
      Object.values(record.entities).forEach(entityList => {
        entityList.forEach(entity => {
          const entityId = `entity_${this.hashString(entity.text)}`;
          
          // 创建或更新实体节点
          let entityNode = graph.nodes.find(n => n.id === entityId);
          if (!entityNode) {
            entityNode = {
              id: entityId,
              label: entity.text,
              type: 'entity',
              subtype: entity.type,
              weight: entity.confidence,
              count: 1
            };
            graph.nodes.push(entityNode);
          } else {
            entityNode.count++;
            entityNode.weight = Math.max(entityNode.weight, entity.confidence);
          }
          
          // 连接实体到记录
          graph.edges.push({
            source: recordId,
            target: entityId,
            type: 'mentions',
            weight: entity.confidence
          });
        });
      });
    });
    
    // 更新元数据
    graph.metadata.nodeCount = graph.nodes.length;
    graph.metadata.edgeCount = graph.edges.length;
    
    return graph;
  }

  /**
   * 生成检索报告
   */
  generateRetrievalReport(data, knowledgeGraph) {
    const categoryStats = {};
    const entityStats = {};
    const sourceStats = {};
    
    // 统计分析
    data.forEach(record => {
      // 类别统计
      categoryStats[record.category] = (categoryStats[record.category] || 0) + 1;
      
      // 来源统计
      const domain = new URL(record.source.url).hostname;
      sourceStats[domain] = (sourceStats[domain] || 0) + 1;
      
      // 实体统计
      Object.values(record.entities).forEach(entityList => {
        entityList.forEach(entity => {
          entityStats[entity.type] = (entityStats[entity.type] || 0) + 1;
        });
      });
    });
    
    return {
      summary: {
        totalRecords: data.length,
        avgConfidence: data.reduce((sum, r) => sum + r.confidence, 0) / data.length,
        categoriesFound: Object.keys(categoryStats).length,
        uniqueSources: Object.keys(sourceStats).length,
        extractionTime: new Date()
      },
      statistics: {
        categories: categoryStats,
        entities: entityStats,
        sources: sourceStats
      },
      knowledgeGraph: {
        nodeCount: knowledgeGraph.metadata.nodeCount,
        edgeCount: knowledgeGraph.metadata.edgeCount,
        topEntities: knowledgeGraph.nodes
          .filter(n => n.type === 'entity')
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)
          .map(n => ({ label: n.label, count: n.count, type: n.subtype }))
      },
      qualityMetrics: {
        highConfidenceRecords: data.filter(r => r.confidence >= 0.8).length,
        mediumConfidenceRecords: data.filter(r => r.confidence >= 0.6 && r.confidence < 0.8).length,
        lowConfidenceRecords: data.filter(r => r.confidence < 0.6).length
      }
    };
  }

  // 辅助方法
  generateRecordId() {
    return `record_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * 获取检索历史
   */
  getExtractionHistory() {
    return this.extractionHistory;
  }

  /**
   * 清除检索历史
   */
  clearExtractionHistory() {
    this.extractionHistory = [];
    this.knowledgeBase.clear();
    this.entityDatabase.clear();
  }
}