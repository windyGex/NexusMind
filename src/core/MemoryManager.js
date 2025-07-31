import NodeCache from 'node-cache';

/**
 * 记忆管理器
 * 提供短期记忆缓存、相关性检索和记忆管理功能
 */
export class MemoryManager {
  constructor(config = {}) {
    this.cache = new NodeCache({
      stdTTL: config.ttl || 3600, // 默认1小时过期
      maxKeys: config.maxSize || 1000,
      checkperiod: 600 // 每10分钟检查过期
    });
    
    this.memoryTypes = ['conversation', 'reasoning', 'task', 'tool_usage'];
    this.embeddingCache = new Map(); // 简单的文本相似度缓存
  }

  /**
   * 添加记忆
   */
  add(type, data) {
    if (!this.memoryTypes.includes(type)) {
      throw new Error(`不支持的记忆类型: ${type}`);
    }

    const memoryItem = {
      id: this.generateId(),
      type,
      data,
      timestamp: new Date(),
      accessCount: 0,
      lastAccessed: new Date()
    };

    this.cache.set(memoryItem.id, memoryItem);
    return memoryItem.id;
  }

  /**
   * 获取记忆
   */
  get(id) {
    const memory = this.cache.get(id);
    if (memory) {
      memory.accessCount++;
      memory.lastAccessed = new Date();
      this.cache.set(id, memory);
    }
    return memory;
  }

  /**
   * 获取所有记忆
   */
  getAll() {
    const keys = this.cache.keys();
    return keys.map(key => this.cache.get(key)).filter(Boolean);
  }

  /**
   * 根据类型获取记忆
   */
  getByType(type) {
    const allMemories = this.getAll();
    return allMemories.filter(memory => memory.type === type);
  }

  /**
   * 获取相关记忆（基于简单文本匹配）
   */
  getRelevant(query, limit = 5) {
    const allMemories = this.getAll();
    const queryLower = query.toLowerCase();
    
    // 计算相关性分数
    const scoredMemories = allMemories.map(memory => {
      const content = this.extractContent(memory.data);
      const score = this.calculateRelevance(queryLower, content);
      return { ...memory, relevanceScore: score };
    });

    // 按相关性排序并返回前N个
    return scoredMemories
      .filter(memory => memory.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit)
      .map(memory => ({
        id: memory.id,
        type: memory.type,
        content: this.extractContent(memory.data),
        timestamp: memory.timestamp,
        relevanceScore: memory.relevanceScore
      }));
  }

  /**
   * 提取记忆内容
   */
  extractContent(data) {
    if (typeof data === 'string') {
      return data;
    }
    if (data.content) {
      return data.content;
    }
    if (data.thoughts) {
      return data.thoughts;
    }
    if (data.input) {
      return data.input;
    }
    return JSON.stringify(data);
  }

  /**
   * 计算相关性分数（简单的文本匹配）
   */
  calculateRelevance(query, content) {
    const contentLower = content.toLowerCase();
    const queryWords = query.split(/\s+/);
    let score = 0;

    for (const word of queryWords) {
      if (word.length >= 2 && contentLower.includes(word)) {
        score += 1;
      }
    }

    // 考虑时间衰减
    const timeDecay = this.calculateTimeDecay();
    return score * timeDecay;
  }

  /**
   * 计算时间衰减因子
   */
  calculateTimeDecay() {
    const now = new Date();
    const maxAge = 24 * 60 * 60 * 1000; // 24小时
    const decay = 0.5; // 衰减因子

    const memories = this.getAll();
    if (memories.length === 0) return 1;

    const avgAge = memories.reduce((sum, memory) => {
      return sum + (now - memory.timestamp);
    }, 0) / memories.length;

    return Math.max(0.1, 1 - (avgAge / maxAge) * decay);
  }

  /**
   * 搜索记忆
   */
  search(query, options = {}) {
    const {
      type = null,
      limit = 10,
      minRelevance = 0.1
    } = options;

    let memories = type ? this.getByType(type) : this.getAll();
    
    if (query) {
      const queryLower = query.toLowerCase();
      memories = memories.map(memory => {
        const content = this.extractContent(memory.data);
        const score = this.calculateRelevance(queryLower, content);
        return { ...memory, relevanceScore: score };
      }).filter(memory => memory.relevanceScore >= minRelevance);
    }

    return memories
      .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
      .slice(0, limit);
  }

  /**
   * 更新记忆
   */
  update(id, data) {
    const memory = this.get(id);
    if (!memory) {
      throw new Error(`记忆不存在: ${id}`);
    }

    const updatedMemory = {
      ...memory,
      data: { ...memory.data, ...data },
      lastModified: new Date()
    };

    this.cache.set(id, updatedMemory);
    return updatedMemory;
  }

  /**
   * 删除记忆
   */
  delete(id) {
    return this.cache.del(id);
  }

  /**
   * 清空所有记忆
   */
  clear() {
    this.cache.flushAll();
  }

  /**
   * 获取记忆统计信息
   */
  getStats() {
    const keys = this.cache.keys();
    const memories = keys.map(key => this.cache.get(key)).filter(Boolean);
    
    const stats = {
      total: memories.length,
      byType: {},
      oldest: null,
      newest: null,
      avgAccessCount: 0
    };

    if (memories.length > 0) {
      // 按类型统计
      this.memoryTypes.forEach(type => {
        stats.byType[type] = memories.filter(m => m.type === type).length;
      });

      // 时间范围
      const timestamps = memories.map(m => m.timestamp);
      stats.oldest = new Date(Math.min(...timestamps));
      stats.newest = new Date(Math.max(...timestamps));

      // 平均访问次数
      const totalAccess = memories.reduce((sum, m) => sum + m.accessCount, 0);
      stats.avgAccessCount = totalAccess / memories.length;
    }

    return stats;
  }

  /**
   * 生成唯一ID
   */
  generateId() {
    return `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取记忆大小
   */
  size() {
    return this.cache.keys().length;
  }

  /**
   * 导出记忆
   */
  export() {
    return this.getAll();
  }

  /**
   * 导入记忆
   */
  import(memories) {
    for (const memory of memories) {
      if (memory.id && memory.type && memory.data) {
        this.cache.set(memory.id, {
          ...memory,
          timestamp: new Date(memory.timestamp),
          lastAccessed: new Date(memory.lastAccessed || memory.timestamp)
        });
      }
    }
  }
} 