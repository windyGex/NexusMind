# 变更日志

## [2025-01-27] - SearchAgent 真实搜索集成

### ✨ 新增功能

#### SearchAgent 真实搜索集成
- **功能**: 将 `SearchAgent` 中的 `simulateSearch` 方法替换为使用真实的 Serper API 搜索
- **改进**:
  - 集成 Google Serper API，支持真实的网络搜索
  - 支持有机搜索结果和新闻搜索结果
  - 自动域名提取和内容类型推断
  - 智能降级机制：API 失败时自动使用备用搜索结果
  - 支持中文搜索优化（gl=cn, hl=zh-cn）
  - 每个查询获得8个高质量搜索结果
- **配置**: 需要设置环境变量 `SERPER_API_KEY`
- **文件**: `/src/core/agents/SearchAgentLLM.js`
- **新增方法**:
  - `performRealSearch()` - 真实搜索API调用
  - `extractDomain()` - URL域名提取
  - `inferContentType()` - 内容类型推断
  - `getFallbackSearchResults()` - 降级搜索策略

#### 环境配置优化
- **新增**: 创建 `.env.example` 示例配置文件
- **说明**: 详细的环境变量配置指南
- **支持**: SERPER_API_KEY、OPENAI_API_KEY 等关键配置

### 🔧 技术改进

#### 搜索结果数据结构优化
- **新增字段**:
  - `position` - 搜索结果排名
  - `searchEngine` - 搜索引擎来源
  - `apiSource` - API来源标识
- **增强功能**:
  - 更准确的发布日期处理
  - 智能内容类型分类
  - 更好的错误处理和日志记录

### 📋 注意事项

1. 确保环境变量 `SERPER_API_KEY` 已正确设置（获取地址：https://serper.dev/api-key）
2. 真实搜索API有使用配额限制，请合理使用
3. 未配置API密钥时，系统将自动使用降级搜索策略
4. 搜索结果质量和数量取决于 Serper API 的可用性

---

## [2025-01-27] - Plan & Solve 模式执行步骤可视化

### 🚀 新功能

#### Plan & Solve 模式执行步骤可视化
- **实时状态更新**: 在界面上实时显示 Plan & Solve 模式的执行进度
- **阶段指示器**: 显示任务分析、计划制定、计划执行、结果评估四个主要阶段
- **步骤进度**: 实时显示当前执行的步骤编号、名称和类型
- **计划预览**: 在计划制定完成后显示详细的执行计划
- **状态标签**: 使用不同颜色的标签区分执行状态（进行中、完成、失败）

#### 步骤进度可视化增强
- **进度条显示**: 添加可视化的进度条，直观显示执行进度
- **状态持久化**: 保留之前的进度状态，即使状态更新也不会丢失
- **实时进度跟踪**: 准确跟踪已完成的步骤数量
- **错误状态指示**: 步骤失败时进度条变为红色，提供视觉反馈
- **步骤类型标签**: 显示每个步骤的类型（工具调用、推理分析、结果综合）
- **位置优化**: 执行步骤显示在会话上方，便于查看
- **持久显示**: 执行完成后进度显示不会自动隐藏，用户可以查看完整执行过程
- **清除功能**: 提供清除按钮，用户可以手动清除进度显示

#### 组合卡片布局优化
- **左右布局**: 执行状态和思考过程采用左右分栏布局
- **思考过程展示**: 右侧显示详细的思考过程，包括各阶段的描述和状态
- **阶段化显示**: 根据不同执行阶段显示相应的思考过程内容
- **详细信息**: 显示任务类型、复杂度、步骤数量等详细信息
- **图标标识**: 使用emoji图标直观标识不同的执行阶段
- **可滚动内容**: 思考过程内容支持滚动，适应不同长度的信息

#### 工具调用卡片优化
- **固定高度**: 工具调用卡片高度设置为45px，保持界面整洁
- **溢出隐藏**: 默认状态下隐藏详细信息，避免界面混乱
- **展开切换**: 提供详情按钮，支持展开/收起详细信息
- **状态管理**: 使用React状态管理展开状态，支持多个工具卡片独立控制
- **动画效果**: 展开/收起按钮图标旋转动画，提升用户体验
- **详细信息**: 展开后显示工具参数、执行结果、错误信息等详细内容

#### 悬浮顶部状态指示器
- **悬浮定位**: Plan & Solve状态指示器悬浮在页面顶部，始终可见
- **宽度适配**: 状态指示器宽度与会话界面保持一致，不延伸到Sidebar
- **动态调整**: 根据Sidebar折叠状态动态调整位置（展开320px，折叠80px）
- **固定布局**: 使用fixed定位，不随页面滚动而移动
- **阴影效果**: 添加阴影效果，增强视觉层次感
- **空间预留**: 为悬浮卡片预留120px的顶部空间，避免内容被遮挡
- **过渡动画**: 添加平滑的过渡动画，提升用户体验
- **JSON数据展示**: 在每个思考阶段显示大模型返回的规划JSON数据，支持展开/收起查看
- **执行步骤清单**: 在执行状态中显示完整的执行步骤清单，包含步骤状态指示器，始终可见不隐藏

### 🔧 技术实现

#### 后端更新
- **Agent.js**: 添加 `sendPlanSolveUpdate` 方法，支持发送执行状态更新
- **WebSocket集成**: 在 `planSolveMethod` 中添加状态更新回调
- **步骤监控**: 在 `executePlan` 方法中添加步骤开始、完成、失败的状态通知
- **进度计算**: 改进步骤进度计算逻辑，准确跟踪已完成步骤数

#### 前端更新
- **useWebSocket Hook**: 添加 `planSolveStatus` 和 `planSolveProgress` 状态管理
- **ChatInterface组件**: 新增 `plan_solve_update` 消息类型渲染和进度条组件
- **实时显示**: 在消息列表中实时显示 Plan & Solve 执行状态
- **进度指示**: 显示步骤进度和类型信息
- **状态持久化**: 使用 `planSolveProgress` 保留进度状态，避免状态丢失

### 📊 用户体验优化
- **可视化进度**: 用户可以清楚看到智能体的思考过程
- **透明执行**: 每个步骤的执行状态都有明确的指示
- **计划预览**: 在执行前可以查看完整的执行计划
- **错误反馈**: 步骤失败时提供详细的错误信息
- **进度条动画**: 平滑的进度条动画效果，提升用户体验
- **状态保持**: 进度状态持久化，确保用户不会丢失进度信息
- **位置布局**: 进度显示位于会话上方，提供更好的视觉层次
- **持久化显示**: 执行完成后保持进度显示，便于回顾执行过程
- **组合布局**: 执行状态和思考过程在同一卡片中左右分栏显示
- **思考可视化**: 详细展示智能体的思考过程和各阶段状态
- **信息丰富**: 提供任务分析、计划制定、执行过程等详细信息
- **工具卡片优化**: 工具调用卡片高度固定，支持展开/收起详细信息
- **界面整洁**: 通过固定高度和溢出隐藏保持界面整洁统一
- **悬浮指示器**: Plan & Solve状态指示器悬浮顶部，宽度与会话界面一致，始终可见
- **动态适配**: 根据Sidebar状态动态调整位置，提供更好的用户体验
- **JSON数据展示**: 在每个思考阶段显示大模型返回的规划JSON数据，支持展开/收起查看
- **执行步骤清单**: 在执行状态中显示完整的执行步骤清单，包含步骤状态指示器，始终可见不隐藏

## [2025-01-27] - 网页抓取工具集成

### 🌐 新增功能

#### 1. 本地网页抓取工具
- **功能**: 实现了完整的本地网页抓取工具集，支持多种抓取模式
- **工具列表**:
  - `web_scraper`: 基础网页内容抓取，支持文本、链接、图片、元数据提取
  - `batch_web_scraper`: 批量网页抓取，支持并发控制
  - `precise_content_extractor`: 精确内容提取，使用自定义CSS选择器
  - `web_content_analyzer`: 网页内容分析，支持基础、详细、SEO分析

#### 2. 技术特性
- **多引擎支持**: 使用JSDOM和Cheerio双引擎，提供灵活的内容解析
- **智能缓存**: 内置缓存机制，避免重复抓取相同页面
- **用户代理轮换**: 随机用户代理，提高抓取成功率
- **错误处理**: 完善的错误处理和重试机制
- **并发控制**: 批量抓取时支持并发数量控制

#### 3. 内容提取能力
- **文本提取**: 智能识别主要内容区域，提取标题、段落、标题结构
- **链接提取**: 提取页面中的所有外部链接
- **图片提取**: 提取图片信息，包括alt文本、尺寸等
- **元数据提取**: 提取Open Graph、Twitter Card、meta标签等
- **自定义选择器**: 支持CSS选择器精确提取特定内容

### 📁 文件结构

#### 新增文件
- `src/tools/webScrapingTools.js`: 网页抓取工具核心类
- `src/tools/webScrapingToolRegistry.js`: 工具注册定义
- `test/web-scraping-test.js`: 工具测试文件

#### 修改文件
- `src/core/ToolRegistry.js`: 集成网页抓取工具注册

### 🔧 技术实现

#### 1. WebScrapingTools类
```javascript
class WebScrapingTools {
  // 核心方法
  async scrapeWebPage(url, options) // 基础网页抓取
  async scrapeWithCheerio(url, options) // 精确内容提取
  async scrapeMultiplePages(urls, options) // 批量抓取
  extractTextContent(document, customSelectors) // 文本内容提取
  extractMetaData(document) // 元数据提取
  extractLinks(document) // 链接提取
  extractImages(document) // 图片提取
}
```

#### 2. 工具注册
```javascript
// 自动注册到ToolRegistry
this.registerWebScrapingTools();

// 工具分类: web-scraping
// 支持参数验证和错误处理
```

#### 3. 缓存机制
- 基于URL的缓存键
- 自动缓存抓取结果
- 支持缓存清理和统计

### 🧪 测试验证

#### 测试覆盖
- 基础网页抓取功能
- 工具注册和集成
- Agent工具调用
- 批量抓取功能
- 精确内容提取
- 特定网站测试

#### 测试命令
```bash
node test/web-scraping-test.js
```

### 📋 使用示例

#### 基础抓取
```javascript
const result = await agent.tools.execute('web_scraper', {
  url: 'https://example.com',
  options: {
    extractText: true,
    extractLinks: true,
    extractMeta: true
  }
});
```

#### 批量抓取
```javascript
const result = await agent.tools.execute('batch_web_scraper', {
  urls: ['https://site1.com', 'https://site2.com'],
  options: {
    concurrency: 3,
    extractText: true
  }
});
```

#### 精确提取
```javascript
const result = await agent.tools.execute('precise_content_extractor', {
  url: 'https://example.com',
  selectors: {
    title: 'h1.title',
    content: '.main-content',
    author: '.author-name'
  }
});
```

### 🔗 依赖关系

#### 核心依赖
- `axios`: HTTP请求
- `jsdom`: HTML解析
- `cheerio`: 精确内容提取
- `lodash`: 工具函数

#### 项目集成
- 自动注册到Agent工具系统
- 支持MCP协议集成
- 与现有搜索工具协同工作

---

## [2025-01-27] - Plan & Solve模式优化

### 🧠 重大改进

#### 1. 大模型驱动的参数处理
- **功能**: 将 `executeToolStep` 中的变量替换改为使用大模型完成
- **优势**:
  - **智能理解**: 大模型能够理解复杂的变量引用和上下文关系
  - **灵活处理**: 支持各种格式的结果转换和参数适配
  - **类型安全**: 确保参数符合工具的参数类型要求
  - **错误恢复**: 智能处理缺失或格式错误的结果

#### 2. 简化结果评估流程
- **功能**: 将 `evaluateResult` 方法简化为直接使用大模型总结结果
- **改进**:
  - **去除复杂评估**: 不再进行多维度结果质量评估
  - **智能总结**: 使用大模型根据执行情况直接总结最终答案
  - **简化返回**: 返回结构更加简洁，只包含最终答案和执行摘要
  - **错误恢复**: 保留回退机制，确保系统稳定性

#### 2. 新增 processToolArgsWithLLM 方法
- **功能**: 专门使用大模型处理工具参数和变量替换
- **上下文信息**:
  - 当前步骤的详细信息（名称、描述、工具、原始参数）
  - 工具的描述和参数类型定义
  - 前面所有步骤的执行结果
  - 步骤间的依赖关系

#### 3. 智能参数处理能力
- **变量引用**: 智能识别和替换 `{step_N_result}` 格式的变量引用
- **格式转换**: 自动处理不同格式的结果（字符串、JSON、对象）
- **类型适配**: 根据工具参数类型要求进行智能转换
- **错误处理**: 优雅处理缺失结果和格式错误

### 📝 技术实现

#### 1. 大模型提示词设计
```javascript
const argsProcessingPrompt = `你是一个智能参数处理专家。请根据前面步骤的执行结果，智能处理当前步骤的工具参数。

当前步骤信息：
- 步骤名称: ${step.stepName}
- 步骤描述: ${step.description}
- 工具名称: ${step.tool}
- 原始参数: ${JSON.stringify(step.args, null, 2)}

工具信息：
- 工具描述: ${toolInfo.description}
- 参数类型: ${JSON.stringify(toolInfo.parameters, null, 2)}

前面步骤的执行结果：
${previousResultsInfo.map(info => `
步骤 ${info.stepNumber} (${info.stepName}):
${typeof info.result === 'string' ? info.result : JSON.stringify(info.result, null, 2)}
`).join('\n')}

任务要求：
1. 分析原始参数中是否包含对前面步骤结果的引用
2. 根据前面步骤的实际执行结果，智能替换这些引用
3. 确保替换后的参数符合工具的参数类型要求
4. 如果参数需要转换格式，请进行相应处理
5. 如果找不到对应的步骤结果，保持原始参数不变`;
```

#### 2. 结果总结提示词设计
```javascript
const summaryPrompt = `你是一个智能结果总结专家。请根据执行情况为用户提供最终的答案。

原始任务: ${userInput}

执行计划: ${JSON.stringify(plan, null, 2)}

执行结果:
${executionResult.results.map((result, index) => `
步骤 ${index + 1} (${result.step.stepName}):
- 类型: ${result.step.type}
- 工具: ${result.step.tool || '无'}
- 状态: ${result.error ? '失败' : '成功'}
- 结果: ${result.error ? result.error.message : (result.result.content || JSON.stringify(result.result))}
`).join('\n')}

任务要求：
1. 分析所有步骤的执行情况
2. 基于成功的步骤结果，为用户提供完整、准确的最终答案
3. 如果所有步骤都失败，提供合理的解释和建议
4. 如果部分步骤成功，基于可用信息提供最佳答案
5. 确保答案直接回应用户的原始问题

请直接返回最终答案，不要添加任何评估或评分内容。`;
```

#### 处理流程
1. **收集上下文**: 获取当前步骤信息、工具定义、前面步骤结果
2. **构建提示词**: 包含完整的上下文信息和要求
3. **大模型处理**: 使用低温度设置确保一致性
4. **结果解析**: 清理和验证返回的JSON
5. **错误恢复**: 失败时回退到原始参数

### 🎯 使用效果

#### 1. 智能变量替换示例
```json
// 原始参数
{
  "query": "分析 {step_1_result} 中的关键信息",
  "format": "summary"
}

// 前面步骤结果
步骤 1: {"content": "人工智能技术发展迅速，包括机器学习、深度学习等领域"}

// 处理后的参数
{
  "query": "分析 人工智能技术发展迅速，包括机器学习、深度学习等领域 中的关键信息",
  "format": "summary"
}
```

#### 2. 复杂格式转换
```json
// 原始参数
{
  "data": "{step_2_result}",
  "extract_fields": ["title", "content"]
}

// 前面步骤结果
步骤 2: {"content": "{\"title\":\"AI新闻\",\"content\":\"最新AI发展\",\"date\":\"2024-01-27\"}"}

// 处理后的参数
{
  "data": {"title":"AI新闻","content":"最新AI发展","date":"2024-01-27"},
  "extract_fields": ["title", "content"]
}
```

#### 3. 智能结果总结示例
```javascript
// 执行情况
步骤 1: 搜索信息 - 成功 - 找到相关数据
步骤 2: 分析数据 - 成功 - 生成分析报告
步骤 3: 生成图表 - 失败 - 工具不可用

// 大模型总结结果
"根据搜索结果，我为您分析了相关数据并生成了详细报告。虽然图表生成功能暂时不可用，但我已经为您提供了完整的文字分析结果，包括关键发现和重要趋势。"
```

### 🔧 兼容性

- **向后兼容**: 保持对现有计划的完全兼容
- **渐进增强**: 新功能不影响现有功能
- **错误恢复**: 处理失败时自动回退到原始逻辑
- **性能优化**: 使用低温度设置和合理的token限制

### 📝 技术细节

#### 变量引用格式
- **格式**: `{step_N_result}` 其中 N 是步骤编号
- **示例**: `{step_1_result}`, `{step_2_result}`
- **用途**: 在后续步骤的参数中引用前面步骤的执行结果

#### 参数替换逻辑
```javascript
// 改进后的替换逻辑
const processedArgsStr = argsStr.replace(/\{step_(\d+)_result\}/g, (match, stepNum) => {
  const stepResult = previousResults.get(parseInt(stepNum));
  if (stepResult) {
    const resultContent = stepResult.content || stepResult;
    return typeof resultContent === 'string' ? resultContent : JSON.stringify(resultContent);
  }
  logger.warn(`步骤 ${stepNum} 的结果未找到，保持原始变量引用: ${match}`);
  return match;
});
```

### 🎯 使用示例

现在LLM生成的计划可以包含变量引用：

```json
{
  "steps": [
    {
      "stepNumber": 1,
      "stepName": "搜索信息",
      "type": "tool_call",
      "tool": "web_search",
      "args": {"query": "人工智能发展"}
    },
    {
      "stepNumber": 2,
      "stepName": "分析结果",
      "type": "tool_call", 
      "tool": "text_analysis",
      "args": {"text": "{step_1_result}", "analysis_type": "summary"}
    }
  ]
}
```

## [2025-01-27] - MCP配置管理界面

### 🎛️ 新增功能

#### 1. MCP服务器配置界面
- **功能**: 在前端界面添加了完整的MCP服务器配置管理页面
- **特点**:
  - **可视化配置**: 通过表格形式展示所有MCP服务器配置
  - **CRUD操作**: 支持添加、编辑、删除MCP服务器配置
  - **连接测试**: 可以测试MCP服务器连接状态和工具数量
  - **本地存储**: 配置保存到本地临时文件中
  - **实时状态**: 显示服务器连接状态和工具数量

#### 2. 前端界面增强
- **导航菜单**: 在侧边栏添加了智能对话和MCP配置的切换菜单
- **响应式设计**: 配置页面采用Ant Design组件，支持各种屏幕尺寸
- **用户友好**: 提供详细的配置说明和操作提示

#### 3. 后端配置API
- **RESTful API**: 完整的MCP配置管理API接口
  - `GET /api/mcp/config` - 获取所有服务器配置
  - `POST /api/mcp/config` - 添加新服务器
  - `PUT /api/mcp/config/:id` - 更新服务器配置
  - `DELETE /api/mcp/config/:id` - 删除服务器
  - `POST /api/mcp/test-connection` - 测试服务器连接
- **配置验证**: 完善的配置参数验证和错误处理
- **文件存储**: 配置自动保存到 `temp/mcp-config.json`

### 🗂️ 本地文件存储

#### 1. 配置文件结构
- **存储位置**: `temp/mcp-config.json`
- **文件格式**: JSON格式，包含服务器列表和元数据
- **自动创建**: 首次运行时自动创建默认配置
- **备份安全**: 支持配置的导入导出（预留功能）

#### 2. 默认配置
- **高德地图服务器**: 预配置的标准HTTP MCP服务器
- **febase服务器**: 预配置的streamable-HTTP MCP服务器
- **扩展性**: 支持添加任意数量的自定义MCP服务器

### 📁 文件变更

#### 新增文件
- `packages/frontend/src/components/MCPConfig.jsx` - MCP配置管理页面组件
- `packages/backend/src/services/mcpConfigService.js` - MCP配置服务
- `packages/backend/src/routes/mcpConfig.js` - MCP配置API路由
- `temp/mcp-config.json` - MCP服务器配置文件

#### 修改文件
- `packages/frontend/src/App.jsx` - 添加页面切换和MCP配置页面
- `packages/frontend/src/components/Sidebar.jsx` - 添加导航菜单
- `packages/backend/src/index.js` - 注册MCP配置路由

### 🎯 使用方式

1. **访问配置页面**: 在前端界面点击侧边栏的"MCP配置"
2. **添加服务器**: 点击"添加服务器"按钮，填写服务器信息
3. **测试连接**: 点击"测试"按钮验证服务器连接
4. **编辑配置**: 点击"编辑"按钮修改服务器配置
5. **删除服务器**: 点击"删除"按钮移除不需要的服务器

### 📋 配置示例

```json
{
  "servers": [
    {
      "id": "amap",
      "name": "高德地图",
      "serverUrl": "https://mcp.amap.com/mcp",
      "type": "standard",
      "apiKey": "your-api-key",
      "status": "connected",
      "toolsCount": 15
    }
  ],
  "lastUpdated": "2025-01-27T07:14:33.173Z"
}
```

## [2025-01-27] - MCP客户端流式HTTP支持

### 🌊 新增功能

#### 1. MCP Streamable-HTTP 支持
- **功能**: MCP客户端现在支持 `streamable-http` 类型的工具调用
- **特点**:
  - **流式响应**: 支持Server-Sent Events (SSE)格式的流式数据传输
  - **实时反馈**: 工具执行过程中可以实时接收进度更新和中间结果
  - **灵活处理**: 支持不同类型的流数据（progress、data、complete、error）
  - **向后兼容**: 保持对现有普通HTTP工具的完全兼容

#### 2. 流式工具调用API
- **新方法**:
  - `callStreamableTool()` - 便捷的流式工具调用方法
  - `isToolStreamable()` - 检查工具是否支持流式响应
  - `getStreamableTools()` - 获取所有支持流式响应的工具列表
- **回调支持**:
  - `onStreamData` - 处理流式数据
  - `onProgress` - 处理进度更新
  - `onComplete` - 处理完成事件
  - `onError` - 处理错误事件

#### 3. 前后端集成
- **后端支持**: 自动检测MCP工具是否支持流式响应，智能选择调用方式
- **WebSocket集成**: 流式数据通过WebSocket实时传输到前端
- **消息类型**: 新增多种流式消息类型（tool_stream_data、tool_progress等）

### 🔧 技术实现

#### 1. 流式响应处理
- **Server-Sent Events解析**: 完整支持SSE格式数据流
- **缓冲管理**: 智能处理不完整的数据行
- **错误处理**: 完善的流式响应错误处理机制

#### 2. 工具能力检测
- **元数据检查**: 通过工具元数据判断是否支持流式响应
- **类型标识**: 支持 `type: 'streamable-http'` 和 `streamable: true` 标识
- **能力查询**: 提供工具能力查询接口

#### 3. 状态监控
- **客户端状态**: 增加流式工具统计信息
- **能力报告**: 在状态信息中包含流式HTTP支持能力
- **调试支持**: 详细的流式调用日志和调试信息

### 📁 文件变更

#### 新增文件
- `test/test-streamable-mcp.js` - MCP流式HTTP功能测试

#### 修改文件
- `src/mcp/MCPClient.js` - 核心MCP客户端流式支持实现
- `packages/backend/src/index.js` - 后端流式工具调用集成

### 🧪 测试
- 创建了完整的流式MCP功能测试用例
- 支持高德地图等MCP服务器的流式工具测试
- 包含普通调用和流式调用的对比测试
- 验证了febase服务器的streamable-http连接成功

### ✅ 验证结果
- **高德地图MCP服务器**: 15个工具，连接成功
- **febase MCP服务器**: 5个工具，streamable-http连接成功
- **总计**: 20个MCP工具可用

### 📋 使用示例

```javascript
// 流式工具调用
const result = await mcpClient.callStreamableTool('tool_name', args, {
  onStreamData: (data) => console.log('Stream data:', data),
  onProgress: (progress) => console.log('Progress:', progress),
  onComplete: (result) => console.log('Complete:', result)
});

// 检查工具是否支持流式响应
const isStreamable = mcpClient.isToolStreamable('tool_name');

// 获取支持流式响应的工具列表
const streamableTools = mcpClient.getStreamableTools();
```

## [2025-08-18] - 智能体思维模式增强：Plan & Solve模式

### 🧠 新增功能

#### 1. Plan & Solve 思维模式
- **功能**: 在原有ReAct模式基础上，新增Plan & Solve思维模式
- **特点**:
  - **全局规划**: 先制定详细计划，再按步骤执行
  - **结构化执行**: 支持工具调用、推理和综合三种步骤类型
  - **质量评估**: 执行完成后自动评估结果质量
  - **系统性思考**: 适合需要系统性分析和结构化处理的任务

#### 2. 思维模式管理系统
- **配置支持**: 
  - 支持通过环境变量 `THINKING_MODE` 设置默认模式
  - 可配置计划最大步骤数、计划优化等选项
- **API接口**: 
  - `GET /api/agent/thinking-modes` - 获取支持的思维模式
  - `POST /api/agent/thinking-mode` - 动态切换思维模式
- **前端界面**: 在侧边栏添加思维模式选择器，支持实时切换

#### 3. Plan & Solve 执行流程
- **阶段1 - 任务分析**: 深入分析任务类型、复杂度、所需工具等
- **阶段2 - 计划制定**: 基于分析结果制定详细执行计划（最多8步）
- **阶段3 - 计划执行**: 按步骤执行，支持步骤依赖和备选方案
- **阶段4 - 结果评估**: 多维度评估结果质量（完整性、准确性、实用性、清晰度）

#### 4. 增强的记忆管理
- **新增记忆类型**: 添加 `system` 和 `collaboration` 记忆类型
- **思维模式历史**: 记录模式切换历史和原因
- **计划存储**: Plan & Solve模式的计划和执行结果持久化

### 🔧 技术实现

#### 1. 核心架构更新
- **Agent类增强**: 
  - 支持多种思维模式的动态切换
  - 新增 `planSolveMethod` 方法实现Plan & Solve逻辑
  - 添加 `setThinkingMode` 和 `getSupportedThinkingModes` 方法
- **配置系统**: 更新 `AgentConfig` 支持思维模式相关配置
- **状态管理**: Agent状态中包含当前计划信息

#### 2. Plan & Solve实现细节
- **任务分析**: 智能分析任务类型、复杂度和所需资源
- **计划制定**: 基于可用工具和任务特点生成最优执行计划
- **步骤执行**: 
  - 工具调用步骤：支持参数引用前面步骤结果
  - 推理步骤：进行逻辑推理和分析
  - 综合步骤：整合多个步骤结果
- **错误处理**: 支持备选方案和故障恢复

#### 3. 前端界面优化
- **模式选择器**: 下拉式选择器，显示模式图标和描述
- **状态显示**: 实时显示当前思维模式和计划状态
- **用户体验**: 切换提示和加载状态

### 📊 性能优化

#### 1. 智能计划优化
- **步骤依赖**: 自动检测和管理步骤间依赖关系
- **参数传递**: 支持步骤间结果引用和参数替换
- **并行执行**: 未来可扩展支持无依赖步骤的并行执行

#### 2. 质量评估系统
- **多维度评估**: 从完整性、准确性、实用性、清晰度四个维度评估
- **智能评分**: 1-10分评分系统，提供详细评价和改进建议
- **学习反馈**: 评估结果可用于优化后续计划制定

### 🎯 使用场景对比

#### ReAct模式适合：
- 需要实时交互和调整的任务
- 探索性问题解决
- 快速响应和迭代
- 工具驱动的任务

#### Plan & Solve模式适合：
- 复杂的多步骤任务
- 需要系统性分析的问题
- 要求高质量结果的场景
- 结构化处理流程

### 🔗 API文档

#### 获取思维模式
```bash
GET /api/agent/thinking-modes
```
响应：
```json
{
  "currentMode": "react",
  "supportedModes": [
    {
      "mode": "react",
      "name": "ReAct模式",
      "description": "推理-行动循环，适合需要多步骤交互和工具调用的复杂任务",
      "characteristics": ["迭代式处理", "实时调整", "工具驱动", "响应式决策"]
    },
    {
      "mode": "plan_solve",
      "name": "Plan & Solve模式",
      "description": "先制定详细计划再执行，适合需要系统性分析和结构化处理的任务",
      "characteristics": ["全局规划", "结构化执行", "质量评估", "系统性思考"]
    }
  ]
}
```

#### 切换思维模式
```bash
POST /api/agent/thinking-mode
Content-Type: application/json
{
  "mode": "plan_solve"
}
```

### 🔄 向后兼容
- 默认保持ReAct模式，确保现有功能不受影响
- 所有现有API和功能完全兼容
- 新功能通过可选配置启用

---

## [2024-12-19] - 通用智能体搜索功能修复与性能优化

### 🚀 性能优化

#### 1. Token超限问题解决
- **问题**: 在`analyzeInformation`阶段，完整的搜索结果（包括HTML字符串）被传递给LLM，导致token超限
- **优化**: 
  - 从`scrapeWebContent`方法中移除HTML字符串返回，只保留结构化文本内容
  - 在`analyzeInformation`方法中添加搜索结果优化逻辑，提取关键信息避免token超限
  - 限制抓取内容的文本长度（前1000字符）
  - 限制分析结果的关键词数量（前5个）
  - 优化传递给LLM的提示词内容，减少数据量

#### 2. 搜索阶段内容抓取优化
- **优化**: 
  - 在智能搜索和分析工具中，只保存抓取内容的关键信息
  - 移除完整的HTML内容存储
  - 限制标题数量（前5个）
  - 添加字数统计信息
  - 优化分析结果的数据结构，只保留必要字段
  - 重构结构化数据提取方法，避免使用完整HTML
  - 添加`extractStructuredDataFromPage`方法，直接从页面提取结构化数据
  - 保留原方法以保持向后兼容性

## [2024-12-19] - 通用智能体搜索功能修复与性能优化

### 🐛 修复的问题

#### 1. 任务规划JSON解析失败
- **问题**: LLM返回的JSON格式包含Markdown代码块标记，导致JSON解析失败
- **修复**: 
  - 在`planTask`方法中添加JSON内容清理逻辑
  - 移除Markdown代码块标记（```json和```）
  - 添加必要字段的默认值设置
  - 增强错误处理和备用解析方法

#### 2. 网页抓取超时优化
- **问题**: 网页抓取超时时间过长，影响整体性能
- **修复**: 
  - 将默认超时时间从30秒减少到10秒
  - 将智能搜索中的超时时间从15秒减少到10秒
  - 提高抓取效率，减少等待时间

## [2024-12-19] - 通用智能体搜索功能修复与性能优化

### 🐛 修复的问题

#### 1. content.toLowerCase is not a function 错误
- **问题**: 在内容分析过程中，传递给分析工具的内容不是字符串类型，导致toLowerCase()方法调用失败
- **修复**: 
  - 在 `UniversalAgentTools.analyzeContent()` 方法中添加类型检查
  - 在 `UniversalAgentTools.extractKeyTopics()` 方法中添加字符串类型验证
  - 在 `UniversalAgentTools.analyzeSentiment()` 方法中添加错误处理
  - 在 `MemoryManager.calculateRelevance()` 方法中添加类型检查

#### 2. web_search 工具参数传递错误
- **问题**: 工具调用时传递了object而不是字符串参数
- **修复**:
  - 在 `searchAnalysisToolRegistry.js` 中修复 `web_search` 工具的 `execute` 方法
  - 添加参数类型验证和错误处理
  - 确保query参数是字符串类型

#### 3. 搜索结果缺乏结构化提取
- **问题**: 搜索结果没有通过网页抓取进行结构化提取和分析
- **修复**:
  - 创建新的 `intelligent_search_and_analyze` 综合工具
  - 整合搜索、抓取、分析三个步骤
  - 自动执行完整的搜索-抓取-分析流程
  - 返回结构化的分析结果

#### 4. 报告生成质量不佳
- **问题**: 最终report没有很好地返回结果给前端
- **修复**:
  - 改进 `UniversalAgent.generateReport()` 方法
  - 添加分析数据有效性检查
  - 优化报告生成提示词
  - 增加错误处理和元数据

#### 5. 搜索实现优化
- **问题**: `intelligentSearch` 方法使用Playwright直接进行Google搜索，容易受到反爬虫限制
- **修复**:
  - 将 `intelligentSearch` 方法修改为使用 `core/ToolRegistry` 中的 `webSearch` 实现
  - 移除了Playwright浏览器搜索逻辑，改用Serper API
  - 提高了搜索的稳定性和成功率
  - 保持了结果格式的兼容性

#### 6. 大模型调用效率优化
- **问题**: 各个阶段通过 `processInput` 方法调用大模型，造成重复的解析和推理过程
- **修复**:
  - 重构 `executeSearch` 方法，直接调用工具而不是通过 `processInput`
  - 重构 `analyzeInformation` 方法，直接使用 `llm.generate`
  - 重构 `generateReport` 方法，直接使用 `llm.generate`
  - 重构 `planTask` 方法，确保直接使用 `llm.generate`
  - 显著减少了不必要的大模型调用次数

### ✨ 新增功能

#### 1. 智能搜索和分析工具
- 新增 `intelligent_search_and_analyze` 工具
- 自动执行搜索、抓取、分析完整流程
- 支持配置最大结果数量、是否抓取、是否分析等选项
- 返回结构化的综合结果

#### 2. 改进的错误处理
- 在所有关键方法中添加try-catch错误处理
- 提供详细的错误信息和日志
- 确保错误不会导致整个流程中断

#### 3. 类型安全检查
- 添加参数类型验证
- 确保字符串方法调用前进行类型检查
- 提供友好的错误提示

### 🔧 技术改进

#### 1. 代码健壮性
- 添加大量类型检查和错误处理
- 改进参数验证逻辑
- 增强异常情况的处理能力

#### 2. 工具调用优化
- 简化工具调用流程
- 减少手动步骤，提高自动化程度
- 改进工具间的数据传递

#### 3. 日志和调试
- 添加详细的执行日志
- 改进错误信息的可读性
- 便于问题定位和调试

#### 4. 搜索架构优化
- 统一使用ToolRegistry中的webSearch实现
- 移除了对Playwright浏览器的依赖
- 提高了搜索的可靠性和性能
- 支持更好的错误回退机制

#### 5. 性能优化
- **减少大模型调用次数**: 从每个阶段2次调用减少到1次调用
- **提高响应速度**: 避免了重复的提示词解析和推理过程
- **降低API成本**: 减少了不必要的token消耗
- **提升用户体验**: 整体处理时间显著缩短

### 📝 测试

#### 1. 新增测试脚本
- 创建 `test-universal-agent-fix.js` 测试脚本
- 创建 `test-simple-fix.js` 简化测试脚本
- 创建 `test-search-results.js` 搜索结果质量测试脚本
- 创建 `test-performance-improvement.js` 性能改进测试脚本
- 验证修复的有效性
- 测试完整的搜索-分析-报告流程

### 🚀 使用说明

#### 1. 运行测试
```bash
# 基础功能测试
node test-simple-fix.js

# 搜索结果质量测试
node test-search-results.js

# 性能改进测试
node test-performance-improvement.js

# 完整流程测试
node test-universal-agent-fix.js
```

#### 2. 使用新的综合工具
```javascript
// 直接使用intelligent_search_and_analyze工具
const result = await agent.tools.execute('intelligent_search_and_analyze', {
  query: '搜索关键词',
  options: {
    maxResults: 5,
    scrapePages: true,
    analyzeContent: true
  }
});
```

### 📋 注意事项

1. 确保环境变量 `OPENAI_API_KEY` 已正确设置
2. 确保环境变量 `SERPER_API_KEY` 已正确设置（用于搜索功能）
3. 网络连接正常，能够访问搜索引擎和网页
4. 首次运行可能需要下载Playwright浏览器（用于网页抓取）
5. 大量搜索可能会消耗较多时间和资源

### 🔄 后续计划

1. 进一步优化搜索结果的准确性
2. 添加更多搜索引擎支持
3. 改进内容分析的NLP算法
4. 增加缓存机制提高性能
5. 支持更多报告格式和模板
