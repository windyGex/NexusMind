import { webScrapingTools } from './webScrapingTools.js';

// 股票投资工具定义
export const stockInvestmentTools = [
  {
    name: 'smart_stock_analysis',
    description: '智能股票投资分析工具，自动搜索相关网页内容，进行综合分析并生成投资建议',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '投资查询，如"2025年最值得投资的股票"'
        },
        analysisType: {
          type: 'string',
          enum: ['comprehensive', 'technical', 'fundamental', 'basic'],
          description: '分析类型',
          default: 'comprehensive'
        }
      },
      required: ['query']
    },
    execute: async (args) => {
      try {
        const { query, analysisType = 'comprehensive' } = args;
        
        console.log(`🔍 开始智能股票分析: ${query}`);
        
        // 构建搜索URL列表
        const searchUrls = [
          `https://www.baidu.com/s?wd=${encodeURIComponent(query)}`,
          `https://cn.bing.com/search?q=${encodeURIComponent(query)}`
        ];
        
        // 抓取搜索结果页面
        const scrapeTool = webScrapingTools.find(tool => tool.name === 'scrape_multiple_pages');
        if (!scrapeTool) {
          throw new Error('网页抓取工具不可用');
        }
        
        const scrapeResult = await scrapeTool.execute({
          urls: searchUrls,
          options: {
            waitForTimeout: 3000,
            extractText: true,
            extractLinks: true
          }
        });
        
        if (!scrapeResult.success) {
          throw new Error('网页抓取失败');
        }
        
        // 从抓取结果中提取相关链接
        const relevantUrls = [];
        for (const result of scrapeResult.data.results) {
          if (result.success && result.data?.content?.links) {
            for (const link of result.data.content.links) {
              if (link.href && link.text && 
                  (link.href.includes('finance') || 
                   link.href.includes('stock') || 
                   link.text.includes('股票') ||
                   link.text.includes('投资'))) {
                relevantUrls.push(link.href);
              }
            }
          }
        }
        
        const uniqueUrls = [...new Set(relevantUrls)].slice(0, 5);
        
        if (uniqueUrls.length === 0) {
          return {
            success: false,
            error: '未找到相关的投资网页'
          };
        }
        
        // 分析相关网页
        const analysisTool = webScrapingTools.find(tool => tool.name === 'analyze_stock_investment');
        if (!analysisTool) {
          throw new Error('股票分析工具不可用');
        }
        
        const analysisResult = await analysisTool.execute({
          urls: uniqueUrls,
          analysisType
        });
        
        return {
          success: true,
          data: {
            query,
            scrapedUrls: uniqueUrls,
            analysis: analysisResult.data
          }
        };
        
      } catch (error) {
        console.error('❌ 智能股票分析失败:', error);
        return {
          success: false,
          error: error.message
        };
      }
    }
  }
];

// 注册股票投资工具到智能体
export async function registerStockInvestmentTools(agent) {
  try {
    console.log('🔧 注册股票投资工具...');
    
    for (const tool of stockInvestmentTools) {
      agent.tools.registerTool(tool.name, {
        name: tool.name,
        description: tool.description,
        category: 'stock-investment',
        parameters: tool.parameters,
        execute: tool.execute
      });
      console.log(`✅ 已注册股票投资工具: ${tool.name}`);
    }
    
    console.log(`📋 成功注册了 ${stockInvestmentTools.length} 个股票投资工具`);
  } catch (error) {
    console.error('❌ 注册股票投资工具失败:', error);
  }
} 