import OpenAI from 'openai';

/**
 * LLM客户端
 * 封装OpenAI API调用，提供统一的LLM接口
 */
export class LLMClient {
  constructor(config = {}) {
    this.client = new OpenAI({
      apiKey: config.apiKey || process.env.OPENAI_API_KEY,
      baseURL: config.baseURL || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
      dangerouslyAllowBrowser: false
    });
    
    this.defaultModel = config.model || process.env.OPENAI_MODEL || 'gpt-4';
    this.defaultOptions = {
      temperature: config.temperature || 0.7,
      max_tokens: config.maxTokens || 1000,
      ...config.defaultOptions
    };
  }

  /**
   * 生成文本响应
   */
  async generate(prompt, options = {}) {
    try {
      const mergedOptions = { ...this.defaultOptions, ...options };
      
      const response = await this.client.chat.completions.create({
        model: this.defaultModel,
        messages: [
          {
            role: 'system',
            content: `你是一个智能助手，具备以下特点：

1. **准确性**: 提供准确、可靠的信息和答案
2. **完整性**: 确保回答全面，不遗漏重要信息
3. **清晰性**: 使用清晰、易懂的语言表达
4. **逻辑性**: 按照逻辑顺序组织思路和回答
5. **实用性**: 提供有实际价值的建议和解决方案
6. **适应性**: 根据用户需求调整回答的深度和风格

请根据用户的问题提供高质量的回答。如果问题涉及计算、推理或复杂分析，请详细展示你的思考过程。`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        ...mergedOptions
      });

      return {
        content: response.choices[0].message.content,
        usage: response.usage,
        model: response.model,
        finishReason: response.choices[0].finish_reason
      };

    } catch (error) {
      console.error('LLM generation error:', error);
      throw new Error(`LLM调用失败: ${error.message}`);
    }
  }

  /**
   * 生成流式响应
   */
  async generateStream(prompt, options = {}) {
    try {
      const mergedOptions = { ...this.defaultOptions, ...options };
      
      const stream = await this.client.chat.completions.create({
        model: this.defaultModel,
        messages: [
          {
            role: 'system',
            content: '你是一个智能助手，请根据用户的问题提供准确、有用的回答。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        stream: true,
        ...mergedOptions
      });

      return stream;

    } catch (error) {
      console.error('LLM stream generation error:', error);
      throw new Error(`LLM流式调用失败: ${error.message}`);
    }
  }

  /**
   * 生成嵌入向量
   */
  async generateEmbedding(text) {
    try {
      const response = await this.client.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text
      });

      return {
        embedding: response.data[0].embedding,
        usage: response.usage
      };

    } catch (error) {
      console.error('Embedding generation error:', error);
      throw new Error(`嵌入生成失败: ${error.message}`);
    }
  }

  /**
   * 批量生成嵌入向量
   */
  async generateEmbeddings(texts) {
    try {
      const response = await this.client.embeddings.create({
        model: 'text-embedding-ada-002',
        input: texts
      });

      return {
        embeddings: response.data.map(item => item.embedding),
        usage: response.usage
      };

    } catch (error) {
      console.error('Batch embedding generation error:', error);
      throw new Error(`批量嵌入生成失败: ${error.message}`);
    }
  }

  /**
   * 计算文本相似度
   */
  async calculateSimilarity(text1, text2) {
    try {
      const embeddings = await this.generateEmbeddings([text1, text2]);
      const [embedding1, embedding2] = embeddings.embeddings;
      
      return this.cosineSimilarity(embedding1, embedding2);

    } catch (error) {
      console.error('Similarity calculation error:', error);
      throw new Error(`相似度计算失败: ${error.message}`);
    }
  }

  /**
   * 计算余弦相似度
   */
  cosineSimilarity(vec1, vec2) {
    if (vec1.length !== vec2.length) {
      throw new Error('向量维度不匹配');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }

    norm1 = Math.sqrt(norm1);
    norm2 = Math.sqrt(norm2);

    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }

    return dotProduct / (norm1 * norm2);
  }

  /**
   * 获取模型信息
   */
  async getModelInfo() {
    try {
      const models = await this.client.models.list();
      return models.data;

    } catch (error) {
      console.error('Model info error:', error);
      throw new Error(`获取模型信息失败: ${error.message}`);
    }
  }

  /**
   * 检查API连接
   */
  async testConnection() {
    try {
      await this.generate('Hello', { max_tokens: 5 });
      return true;

    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  /**
   * 获取使用统计
   */
  getUsageStats() {
    return {
      model: this.defaultModel,
      defaultOptions: this.defaultOptions
    };
  }
} 