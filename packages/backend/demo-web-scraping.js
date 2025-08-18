import axios from 'axios';

// 演示网页抓取和投资分析功能
async function demoWebScraping() {
  console.log('🚀 网页抓取与投资分析功能演示');
  console.log('='.repeat(50));
  
  const baseUrl = 'http://localhost:3002/api/web-scraping';
  
  try {
    // 1. 健康检查
    console.log('\n1️⃣ 健康检查');
    const healthResponse = await axios.get(`${baseUrl}/health`);
    console.log('✅ 服务状态:', healthResponse.data.status);
    
    // 2. 获取可用工具
    console.log('\n2️⃣ 获取可用工具');
    const toolsResponse = await axios.get(`${baseUrl}/tools`);
    console.log('📋 可用工具数量:', toolsResponse.data.data.length);
    toolsResponse.data.data.forEach(tool => {
      console.log(`   - ${tool.name}: ${tool.description}`);
    });
    
    // 3. 单个网页抓取
    console.log('\n3️⃣ 单个网页抓取');
    const scrapeResponse = await axios.post(`${baseUrl}/scrape`, {
      url: 'https://httpbin.org/html',
      options: {
        extractText: true,
        extractLinks: false,
        extractImages: false
      }
    });
    
    if (scrapeResponse.data.success) {
      const data = scrapeResponse.data.data;
      console.log('✅ 抓取成功:');
      console.log(`   - URL: ${data.url}`);
      console.log(`   - 标题: ${data.title || '无标题'}`);
      console.log(`   - 内容长度: ${data.content.text?.mainText?.length || 0} 字符`);
    }
    
    // 4. 股票投资分析
    console.log('\n4️⃣ 股票投资分析');
    const analysisResponse = await axios.post(`${baseUrl}/analyze-stock`, {
      urls: [
        'https://httpbin.org/html',
        'https://httpbin.org/json'
      ],
      analysisType: 'comprehensive'
    });
    
    if (analysisResponse.data.success) {
      const analysis = analysisResponse.data.data;
      console.log('✅ 分析完成:');
      console.log(`   - 整体情绪: ${analysis.comprehensiveAdvice.overallSentiment}`);
      console.log(`   - 风险水平: ${analysis.comprehensiveAdvice.riskLevel}`);
      console.log(`   - 置信度: ${analysis.comprehensiveAdvice.confidence}%`);
      console.log('   - 仓位配比:');
      console.log(`     * 保守型: ${analysis.comprehensiveAdvice.positionAllocation.conservative}%`);
      console.log(`     * 平衡型: ${analysis.comprehensiveAdvice.positionAllocation.moderate}%`);
      console.log(`     * 激进型: ${analysis.comprehensiveAdvice.positionAllocation.aggressive}%`);
      console.log('   - 投资建议:');
      analysis.comprehensiveAdvice.recommendations.forEach((rec, index) => {
        console.log(`     ${index + 1}. ${rec}`);
      });
    }
    
    console.log('\n🎉 演示完成！');
    console.log('\n💡 使用提示:');
    console.log('   - 访问 http://localhost:5173 查看前端界面');
    console.log('   - 在侧边栏选择"网页抓取分析"功能');
    console.log('   - 输入要分析的网页URL，选择分析类型');
    console.log('   - 点击"开始分析"查看结果');
    
  } catch (error) {
    console.error('❌ 演示失败:', error.message);
    if (error.response) {
      console.error('   响应数据:', error.response.data);
    }
  }
}

// 运行演示
demoWebScraping().catch(console.error); 