/**
 * 提示词管理
 */

export const Prompts = {
  // 系统角色
  SYSTEM_ROLE: `你是一个智能助手，具备准确性、完整性、清晰性、逻辑性、实用性和适应性。请提供高质量的回答。`,

  // 任务分析
  TASK_ANALYSIS: (task, context, tools) => `分析任务：${task}
上下文：${JSON.stringify(context)}
可用工具：${tools.map(t => `${t.name}: ${t.description}`).join('\n')}

请提供详细的任务分析报告。`,

  // 计划制定
  PLAN_CREATION: (task, analysis, tools) => `基于任务分析制定执行计划：
任务：${task}
分析：${analysis}
工具：${tools.map(t => `${t.name}: ${t.description}`).join('\n')}

请制定详细的执行计划。`,

  // 结果评估
  RESULT_EVALUATION: (task, result) => `评估执行结果：
原始任务：${task}
执行结果：${JSON.stringify(result)}

请全面评估结果质量。`,

  // Chain of Thought
  COT: (input, context, tools) => `仔细分析用户问题：${input}
上下文：${JSON.stringify(context)}
可用工具：${tools.map(t => `${t.name}: ${t.description}`).join('\n')}

请提供详细的推理过程和答案。`,

  // ReAct
  REACT: (input, context, tools, iteration, maxIterations) => `智能推理和行动：
用户问题：${input}
上下文：${JSON.stringify(context)}
可用工具：${tools.map(t => `${t.name}: ${t.description}`).join('\n')}
迭代：${iteration}/${maxIterations}

请进行推理并选择行动。`
}; 