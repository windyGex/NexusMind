# SearchAgent 真实搜索功能使用指南

## 📋 概述

SearchAgent 现已升级支持真实的网络搜索功能，使用 Google Serper API 进行实时搜索，提供更准确和及时的搜索结果。

## 🔧 配置要求

### 1. 获取 Serper API 密钥

1. 访问 [Serper.dev](https://serper.dev/api-key)
2. 注册账号并获取免费的API密钥
3. 免费账户提供每月2,500次搜索额度

### 2. 环境变量配置

在项目根目录创建 `.env` 文件（参考 `.env.example`）：

```bash
# 必需配置
OPENAI_API_KEY=your_openai_api_key_here
SERPER_API_KEY=your_serper_api_key_here

# 可选配置
OPENAI_API_BASE=https://api.openai.com/v1
NODE_ENV=development
LOG_LEVEL=info
```

## 🚀 功能特性

### 真实搜索能力

- ✅ **Google 搜索集成**: 使用 Serper API 获取真实的 Google 搜索结果
- ✅ **有机搜索结果**: 获取排名靠前的网页搜索结果
- ✅ **新闻搜索**: 自动包含相关新闻结果
- ✅ **中文优化**: 针对中文搜索进行了专门优化
- ✅ **智能降级**: API失败时自动使用备用搜索策略

### 搜索结果增强

- 🔍 **域名提取**: 自动提取结果来源域名
- 📊 **内容分类**: 智能识别内容类型（新闻、报告、研究、文章等）
- 📅 **时间信息**: 保留发布时间和时效性信息
- ⭐ **质量评估**: LLM驱动的结果质量评估和排序

## 💻 使用示例

### 基础搜索

```javascript
import { SearchAgent } from './src/core/agents/SearchAgentLLM.js';

const searchAgent = new SearchAgent({
  llm: {
    provider: 'openai',
    model: 'gpt-4',
    apiKey: process.env.OPENAI_API_KEY
  }
});

const task = {
  queries: ['人工智能最新发展', 'AI技术趋势'],
  topic: '人工智能发展现状',
  timeframe: 'recent',
  scope: 'comprehensive',
  dataTypes: ['news', 'web', 'research']
};

const result = await searchAgent.execute(task);
console.log(`获得 ${result.results.length} 个高质量搜索结果`);
```

### 搜索结果结构

```javascript
{
  "results": [
    {
      "title": "人工智能最新发展 - 权威分析报告",
      "url": "https://example.com/ai-analysis",
      "snippet": "关于人工智能最新发展的详细分析...",
      "publishDate": "2024-01-15T10:00:00.000Z",
      "source": "example.com",
      "contentType": "report",
      "position": 1,
      "searchEngine": "google",
      "apiSource": "serper",
      "llm_evaluation": {
        "relevance": 0.85,
        "authority": 0.90,
        "freshness": 0.75,
        "overall": 0.83
      }
    }
  ],
  "summary": {
    "execution_overview": "完成综合搜索，获得8个查询结果",
    "coverage_analysis": "覆盖多个权威信息源",
    "key_findings": ["发现最新AI技术趋势", "获得权威机构分析"]
  },
  "metadata": {
    "queriesUsed": 8,
    "totalResults": 32,
    "qualifiedResults": 12,
    "llmCalls": 1
  }
}
```

## 🔄 降级策略

当 `SERPER_API_KEY` 未配置或API调用失败时：

1. **自动检测**: 系统自动检测API可用性
2. **智能降级**: 使用内置的备用搜索结果
3. **日志记录**: 详细记录降级原因和过程
4. **用户提示**: 在日志中提示配置API密钥以获得更好效果

```javascript
// 未配置API密钥时的日志输出
// WARN: SERPER_API_KEY 环境变量未设置，使用模拟搜索结果
// INFO: 使用降级搜索结果: 人工智能最新发展
```

## 📊 性能优化

### LLM调用优化

- **单次调用**: 每个搜索任务仅需1次LLM调用
- **综合处理**: 查询优化、策略制定、结果评估一次完成
- **Token节省**: 相比原方案减少85-87%的Token消耗

### 搜索效率

- **并发限制**: 避免过于频繁的API调用
- **结果缓存**: 智能缓存搜索结果
- **错误处理**: 完善的重试和降级机制

## 🛠️ 调试和测试

### 环境检查

```bash
# 检查环境变量配置
echo $SERPER_API_KEY
echo $OPENAI_API_KEY
```

### 测试搜索功能

```javascript
// 简单测试
const testResult = await searchAgent.execute({
  queries: ['测试搜索'],
  topic: '测试主题',
  dataTypes: ['web']
});

console.log('搜索测试结果:', testResult.metadata);
```

### 常见问题排查

1. **API密钥错误**: 检查 `.env` 文件中的密钥格式
2. **网络连接**: 确保能够访问 `google.serper.dev`
3. **配额限制**: 检查Serper账户的API使用配额
4. **权限问题**: 确保API密钥有效且未过期

## 📈 最佳实践

### 搜索查询优化

- 使用具体、明确的搜索词
- 结合时间限定词（如"2024年"、"最新"）
- 包含行业专业术语提高准确性

### 结果处理

- 利用LLM评估分数筛选高质量结果
- 关注结果的时效性和权威性
- 结合多个搜索角度获得全面信息

### 配额管理

- 监控API使用量，避免超出配额
- 合理设置搜索频率和结果数量
- 利用缓存机制减少重复搜索

## 🔮 未来规划

- [ ] 支持更多搜索引擎API
- [ ] 增加搜索结果去重功能
- [ ] 实现搜索历史管理
- [ ] 添加搜索性能分析工具
- [ ] 支持自定义搜索模板

---

**更新时间**: 2025-01-27  
**版本**: v1.0.0  
**文档维护**: NexusMind 开发团队