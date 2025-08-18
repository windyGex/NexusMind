import express from 'express';
import { webScrapingTools, cleanupWebScrapingService } from '../tools/webScrapingTools.js';

const router = express.Router();

// 健康检查
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'web-scraping',
    timestamp: new Date().toISOString()
  });
});

// 获取可用工具列表
router.get('/tools', (req, res) => {
  const tools = webScrapingTools.map(tool => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters
  }));
  
  res.json({
    success: true,
    data: tools
  });
});

// 抓取单个网页
router.post('/scrape', async (req, res) => {
  try {
    const { url, options = {} } = req.body;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required'
      });
    }
    
    const scrapeTool = webScrapingTools.find(tool => tool.name === 'scrape_webpage');
    if (!scrapeTool) {
      return res.status(500).json({
        success: false,
        error: 'Scraping tool not available'
      });
    }
    
    const result = await scrapeTool.execute({
      url,
      ...options
    });
    
    res.json(result);
  } catch (error) {
    console.error('❌ 网页抓取失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 批量抓取网页
router.post('/scrape-batch', async (req, res) => {
  try {
    const { urls, options = {} } = req.body;
    
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'URLs array is required'
      });
    }
    
    const batchTool = webScrapingTools.find(tool => tool.name === 'scrape_multiple_pages');
    if (!batchTool) {
      return res.status(500).json({
        success: false,
        error: 'Batch scraping tool not available'
      });
    }
    
    const result = await batchTool.execute({
      urls,
      options
    });
    
    res.json(result);
  } catch (error) {
    console.error('❌ 批量网页抓取失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 股票投资分析
router.post('/analyze-stock', async (req, res) => {
  try {
    const { urls, analysisType = 'comprehensive' } = req.body;
    
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'URLs array is required'
      });
    }
    
    const analysisTool = webScrapingTools.find(tool => tool.name === 'analyze_stock_investment');
    if (!analysisTool) {
      return res.status(500).json({
        success: false,
        error: 'Stock analysis tool not available'
      });
    }
    
    const result = await analysisTool.execute({
      urls,
      analysisType
    });
    
    res.json(result);
  } catch (error) {
    console.error('❌ 股票投资分析失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 生成投资报告
router.post('/generate-report', async (req, res) => {
  try {
    const { scrapedData, reportType = 'summary', includeRecommendations = true } = req.body;
    
    if (!scrapedData || !Array.isArray(scrapedData)) {
      return res.status(400).json({
        success: false,
        error: 'Scraped data array is required'
      });
    }
    
    const reportTool = webScrapingTools.find(tool => tool.name === 'generate_investment_report');
    if (!reportTool) {
      return res.status(500).json({
        success: false,
        error: 'Report generation tool not available'
      });
    }
    
    const result = await reportTool.execute({
      scrapedData,
      reportType,
      includeRecommendations
    });
    
    res.json(result);
  } catch (error) {
    console.error('❌ 投资报告生成失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 综合投资分析（一步完成抓取和分析）
router.post('/comprehensive-analysis', async (req, res) => {
  try {
    const { 
      urls, 
      analysisType = 'comprehensive',
      reportType = 'summary',
      includeRecommendations = true 
    } = req.body;
    
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'URLs array is required'
      });
    }
    
    // 第一步：抓取网页
    const batchTool = webScrapingTools.find(tool => tool.name === 'scrape_multiple_pages');
    const scrapeResult = await batchTool.execute({ urls });
    
    if (!scrapeResult.success) {
      return res.status(500).json(scrapeResult);
    }
    
    // 第二步：股票投资分析
    const analysisTool = webScrapingTools.find(tool => tool.name === 'analyze_stock_investment');
    const analysisResult = await analysisTool.execute({
      urls,
      analysisType
    });
    
    if (!analysisResult.success) {
      return res.status(500).json(analysisResult);
    }
    
    // 第三步：生成报告
    const reportTool = webScrapingTools.find(tool => tool.name === 'generate_investment_report');
    const reportResult = await reportTool.execute({
      scrapedData: scrapeResult.data.results,
      reportType,
      includeRecommendations
    });
    
    if (!reportResult.success) {
      return res.status(500).json(reportResult);
    }
    
    // 返回综合结果
    res.json({
      success: true,
      data: {
        scraping: scrapeResult.data,
        analysis: analysisResult.data,
        report: reportResult.data,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ 综合投资分析失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 清理资源
router.post('/cleanup', async (req, res) => {
  try {
    await cleanupWebScrapingService();
    res.json({
      success: true,
      message: 'Web scraping service cleaned up successfully'
    });
  } catch (error) {
    console.error('❌ 清理资源失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router; 