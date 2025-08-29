import { webScrapingToolRegistry } from '../../../src/tools/webScrapingToolRegistry.js';
import { searchAnalysisToolRegistry } from '../../../src/tools/searchAnalysisToolRegistry.js';
import { fileOperationToolRegistry } from '../../../src/tools/fileOperationToolRegistry.js';
import { codeExecutionToolRegistry } from '../../../src/tools/codeExecutionToolRegistry.js';
import { codeWritingToolRegistry } from '../../../src/tools/codeWritingToolRegistry.js';

/**
 * 后端工具注册管理器
 * 负责管理和注册所有后端工具
 */

// 合并所有工具
const allTools = {
  ...webScrapingToolRegistry,
  ...searchAnalysisToolRegistry,
  ...fileOperationToolRegistry,
  ...codeExecutionToolRegistry,
  ...codeWritingToolRegistry
};

/**
 * 获取所有后端工具
 * @returns {object} 所有工具的映射
 */
export function getAllBackendTools() {
  return allTools;
}

/**
 * 获取指定名称的工具
 * @param {string} name - 工具名称
 * @returns {object|undefined} 工具定义或undefined
 */
export function getBackendTool(name) {
  return allTools[name];
}

/**
 * 获取指定类别的工具
 * @param {string} category - 工具类别
 * @returns {array} 指定类别的工具列表
 */
export function getBackendToolsByCategory(category) {
  return Object.values(allTools).filter(tool => tool.category === category);
}

/**
 * 获取所有工具类别
 * @returns {array} 所有工具类别的数组
 */
export function getAllBackendToolCategories() {
  const categories = new Set();
  Object.values(allTools).forEach(tool => {
    if (tool.category) {
      categories.add(tool.category);
    }
  });
  return Array.from(categories);
}