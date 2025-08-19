# 变更日志

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
