import { webScrapingTools } from './webScrapingTools.js';

/**
 * 后端工具注册管理器
 * 集中管理所有后端工具的注册和导出
 */

/**
 * 获取所有后端工具
 */
export function getAllBackendTools() {
  // 合并所有工具
  const allTools = {};
  
  // 注册网页抓取工具
  webScrapingTools.forEach(tool => {
    allTools[tool.name] = {
      ...tool,
      category: tool.category || 'web-scraping'
    };
  });
  
  return allTools;
}

/**
 * 按类别获取工具
 */
export function getBackendToolsByCategory(category) {
  const allTools = getAllBackendTools();
  const toolsInCategory = {};
  
  for (const [name, tool] of Object.entries(allTools)) {
    if (tool.category === category) {
      toolsInCategory[name] = tool;
    }
  }
  
  return toolsInCategory;
}

/**
 * 获取工具类别列表
 */
export function getBackendToolCategories() {
  const allTools = getAllBackendTools();
  const categories = new Set();
  
  for (const tool of Object.values(allTools)) {
    categories.add(tool.category || 'general');
  }
  
  return Array.from(categories);
}

/**
 * 根据名称获取工具
 */
export function getBackendToolByName(name) {
  const allTools = getAllBackendTools();
  return allTools[name];
}

export default {
  getAllBackendTools,
  getBackendToolsByCategory,
  getBackendToolCategories,
  getBackendToolByName
};