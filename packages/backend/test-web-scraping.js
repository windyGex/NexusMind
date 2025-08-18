import WebScrapingService from './src/services/webScrapingService.js';

async function testWebScraping() {
  console.log('🧪 开始测试网页抓取功能...');
  
  const service = new WebScrapingService();
  
  try {
    // 初始化服务
    await service.initialize();
    console.log('✅ WebScrapingService 初始化成功');
    
    // 测试单个网页抓取
    console.log('\n📄 测试单个网页抓取...');
    const singleResult = await service.scrapeWebPage('https://httpbin.org/html', {
      waitForTimeout: 2000,
      extractText: true,
      extractLinks: false,
      extractImages: false
    });
    
    console.log('✅ 单个网页抓取成功:');
    console.log('- URL:', singleResult.url);
    console.log('- 标题:', singleResult.title);
    console.log('- 内容长度:', singleResult.content.text?.mainText?.length || 0);
    
    // 测试股票投资分析
    console.log('\n📊 测试股票投资分析...');
    const analysisUrls = [
      'https://httpbin.org/html',
      'https://httpbin.org/json'
    ];
    
    const analysisResults = await service.analyzeStockInvestment(analysisUrls, 'comprehensive');
    
    console.log('✅ 股票投资分析成功:');
    console.log('- 分析URL数量:', analysisResults.length);
    
    analysisResults.forEach((result, index) => {
      console.log(`\n分析结果 ${index + 1}:`);
      console.log('- URL:', result.url);
      if (result.analysis) {
        console.log('- 分析类型:', result.analysis.type);
        console.log('- 情绪:', result.analysis.sentiment);
        console.log('- 风险水平:', result.analysis.riskLevel);
        console.log('- 摘要:', result.analysis.summary);
        console.log('- 建议:', result.analysis.recommendations);
      } else if (result.error) {
        console.log('- 错误:', result.error);
      }
    });
    
    console.log('\n🎉 所有测试完成！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    // 清理资源
    await service.close();
    console.log('🧹 资源清理完成');
  }
}

// 运行测试
testWebScraping().catch(console.error); 