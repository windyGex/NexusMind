#!/usr/bin/env node

/**
 * NexusMind 系统演示脚本
 * 测试前后端通信和Agent功能
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3001/api';
const WS_URL = 'ws://localhost:3001';

async function testHealthCheck() {
  console.log('🏥 测试健康检查...');
  try {
    const response = await fetch(`${API_BASE}/health`);
    const data = await response.json();
    console.log('✅ 健康检查通过:', data.status);
    return true;
  } catch (error) {
    console.error('❌ 健康检查失败:', error.message);
    return false;
  }
}

async function testAgentStatus() {
  console.log('🤖 测试Agent状态...');
  try {
    const response = await fetch(`${API_BASE}/agent/status`);
    const data = await response.json();
    console.log('✅ Agent状态:', {
      name: data.name,
      thinkingMode: data.thinkingMode,
      availableTools: data.availableTools,
      memorySize: data.memorySize
    });
    return true;
  } catch (error) {
    console.error('❌ Agent状态检查失败:', error.message);
    return false;
  }
}

async function testAgentReset() {
  console.log('🔄 测试Agent重置...');
  try {
    const response = await fetch(`${API_BASE}/agent/reset`, {
      method: 'POST'
    });
    const data = await response.json();
    console.log('✅ Agent重置成功:', data.message);
    return true;
  } catch (error) {
    console.error('❌ Agent重置失败:', error.message);
    return false;
  }
}

async function testToolsList() {
  console.log('🔧 测试工具列表...');
  try {
    const response = await fetch(`${API_BASE}/agent/tools`);
    const data = await response.json();
    console.log('✅ 可用工具数量:', data.total || data.length);
    return true;
  } catch (error) {
    console.error('❌ 工具列表获取失败:', error.message);
    return false;
  }
}

async function runDemo() {
  console.log('🚀 开始NexusMind系统演示...\n');
  
  // 测试各项功能
  const tests = [
    testHealthCheck,
    testAgentStatus,
    testAgentReset,
    testToolsList
  ];
  
  let passedTests = 0;
  const totalTests = tests.length;
  
  for (const test of tests) {
    const result = await test();
    if (result) passedTests++;
    console.log('');
  }
  
  // 输出结果
  console.log('📊 测试结果:');
  console.log(`✅ 通过: ${passedTests}/${totalTests}`);
  console.log(`❌ 失败: ${totalTests - passedTests}/${totalTests}`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 所有测试通过！系统运行正常。');
    console.log('📱 前端界面: http://localhost:5173');
    console.log('🔗 后端API: http://localhost:3001');
  } else {
    console.log('\n⚠️ 部分测试失败，请检查服务状态。');
  }
}

// 运行演示
runDemo().catch(console.error); 