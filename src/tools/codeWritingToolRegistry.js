/**
 * 代码编写工具注册文件
 * 导出代码编写相关的工具
 */

import { codeWritingTools } from './codeWritingTools.js';

// 导出代码编写工具
export const codeWritingToolRegistry = codeWritingTools;

// 导出单个工具函数
export const getCodeWritingTools = () => codeWritingTools;

export const getCodeWritingTool = (name) => codeWritingTools[name];

export default codeWritingToolRegistry;