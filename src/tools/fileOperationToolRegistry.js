/**
 * 文件操作工具注册文件
 * 导出文件操作相关的工具
 */

import { fileOperationTools } from './fileOperationTools.js';

// 导出文件操作工具
export const fileOperationToolRegistry = fileOperationTools;

// 导出单个工具函数
export const getFileOperationTools = () => fileOperationTools;

export const getFileOperationTool = (name) => fileOperationTools[name];

export default fileOperationToolRegistry;
