// 工具索引文件
// 汇总所有工具模块并导出

import { webScrapingToolRegistry } from './webScrapingToolRegistry.js';
import { searchAnalysisToolRegistry } from './searchAnalysisToolRegistry.js';
import { fileOperationToolRegistry } from './fileOperationToolRegistry.js';
import { codeExecutionToolRegistry } from './codeExecutionToolRegistry.js';
import { codeWritingToolRegistry } from './codeWritingToolRegistry.js';

// 合并所有工具
const allTools = {
  ...webScrapingToolRegistry,
  ...searchAnalysisToolRegistry,
  ...fileOperationToolRegistry,
  ...codeExecutionToolRegistry,
  ...codeWritingToolRegistry
};

export default allTools;