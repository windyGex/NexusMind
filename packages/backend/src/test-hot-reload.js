// 热更新测试文件
// 修改此文件内容来测试热更新功能

export function testHotReload() {
  const timestamp = new Date().toLocaleString();
  console.log(`🔥 热更新测试 - ${timestamp}`);
  console.log('✅ 如果您看到这条消息，说明热更新功能正常工作！');
  
  return {
    message: '热更新测试成功',
    timestamp: timestamp,
    version: '1.0.0'
  };
}

// 导出测试函数
export default testHotReload; 