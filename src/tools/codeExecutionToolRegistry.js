/**
 * 代码执行工具注册文件
 * 导出代码执行相关的工具
 */

import { codeExecutionTools } from './codeExecutionTools.js';

// 导出代码执行工具
export const codeExecutionToolRegistry = codeExecutionTools;

// 导出单个工具函数
export const getCodeExecutionTools = () => codeExecutionTools;

export const getCodeExecutionTool = (name) => codeExecutionTools[name];

export default codeExecutionToolRegistry;