// src/services/agentExecutor.ts
// AI Agent 执行器 - 实现工具调用循环

import { callAIModel } from './aiService';
import { AIProviderConfig, AIModelConfig } from '../types/ai-settings';

export interface AgentTool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
    }>;
    required: string[];
  };
  execute: (args: Record<string, any>) => Promise<any>;
}

export interface AgentStep {
  id: string;
  type: 'thinking' | 'tool_call' | 'tool_result' | 'response';
  content: string;
  toolName?: string;
  toolArgs?: Record<string, any>;
  toolResult?: any;
  timestamp: number;
}

export interface AgentResult {
  success: boolean;
  text: string;
  files: { name: string; path: string; size?: number }[];
  steps: AgentStep[];
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface AgentConfig {
  systemPrompt: string;
  userPrompt: string;
  maxSteps: number;
  tools: AgentTool[];
  resources: { name: string; value: any }[];
  rules: string[];
  onStep?: (step: AgentStep) => void;
}

// Rust 后端 API 地址
const RUST_API_BASE = 'http://localhost:8080';

// 内置工具实现
export const builtinTools: Record<string, (args: any) => Promise<any>> = {
  get_current_time: async () => {
    const now = new Date();
    return {
      success: true,
      iso: now.toISOString(),
      timestamp: now.getTime(),
      formatted: now.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
      date: now.toLocaleDateString('zh-CN'),
      time: now.toLocaleTimeString('zh-CN'),
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
      hour: now.getHours(),
      minute: now.getMinutes(),
      second: now.getSeconds(),
      dayOfWeek: ['日', '一', '二', '三', '四', '五', '六'][now.getDay()],
    };
  },
  
  web_search: async ({ query }: { query: string }) => {
    // 模拟网络搜索
    return {
      results: [
        { title: `搜索结果: ${query}`, snippet: '这是搜索结果的摘要...' }
      ]
    };
  },
  
  read_file: async ({ path }: { path: string }) => {
    try {
      const response = await fetch(`${RUST_API_BASE}/api/v1/files/${encodeURIComponent(path)}`);
      const result = await response.json();
      return result;
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '读取文件失败' 
      };
    }
  },
  
  write_file: async ({ path, content }: { path: string; content: string }) => {
    try {
      // 确保 path 和 content 是字符串
      const safePath = String(path || 'output.txt');
      const safeContent = String(content || '');
      
      const response = await fetch(`${RUST_API_BASE}/api/v1/files/write`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ path: safePath, content: safeContent }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        return { 
          success: false, 
          error: `HTTP ${response.status}: ${errorText}` 
        };
      }
      
      const result = await response.json();
      
      // 返回文件信息，包含下载链接
      if (result.success && result.file) {
        return {
          success: true,
          path: safePath,
          downloadUrl: `${RUST_API_BASE}${result.file.path}`,
          file: result.file,
        };
      }
      
      return result;
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '写入文件失败' 
      };
    }
  },
  
  list_files: async () => {
    try {
      const response = await fetch(`${RUST_API_BASE}/api/v1/files`);
      const result = await response.json();
      return result;
    } catch (error) {
      return { 
        success: false, 
        files: [],
        error: error instanceof Error ? error.message : '列出文件失败' 
      };
    }
  },
  
  delete_file: async ({ path }: { path: string }) => {
    try {
      const response = await fetch(`${RUST_API_BASE}/api/v1/files/${encodeURIComponent(path)}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      return result;
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '删除文件失败' 
      };
    }
  },
  
  execute_code: async ({ code, language = 'javascript' }: { code: string; language?: string }) => {
    if (language === 'javascript') {
      try {
        const fn = new Function('return ' + code);
        const result = fn();
        return { result, success: true };
      } catch (error) {
        return { 
          error: error instanceof Error ? error.message : '执行失败',
          success: false 
        };
      }
    }
    return { error: `不支持的语言: ${language}`, success: false };
  },
  
  http_request: async ({ url, method = 'GET', body }: { url: string; method?: string; body?: any }) => {
    try {
      const response = await fetch(url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await response.text();
      return { 
        status: response.status,
        data: data.slice(0, 5000), // 限制返回大小
        success: response.ok 
      };
    } catch (error) {
      return { 
        error: error instanceof Error ? error.message : '请求失败',
        success: false 
      };
    }
  },
  
  scrape_webpage: async ({ url, selector }: { url: string; selector?: string }) => {
    try {
      const response = await fetch('http://localhost:3001/api/scraper/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: { type: 'openPage', url },
          config: { timeout: 15000 }
        })
      });
      const result = await response.json();
      
      if (result.success) {
        // 获取文本内容
        const textResponse = await fetch('http://localhost:3001/api/scraper/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: { type: 'getText', selector: selector || 'body' },
            context_id: result.context_id,
            config: {}
          })
        });
        const textResult = await textResponse.json();
        
        // 关闭页面
        await fetch('http://localhost:3001/api/scraper/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: { type: 'closePage' },
            context_id: result.context_id,
            config: {}
          })
        });
        
        return {
          title: result.data.title,
          url: result.data.url,
          content: textResult.success ? textResult.data.text?.slice(0, 5000) : '',
          success: true
        };
      }
      
      return { error: result.error, success: false };
    } catch (error) {
      return { 
        error: error instanceof Error ? error.message : '爬取失败',
        success: false 
      };
    }
  },
};



// 解析 AI 响应中的工具调用
function parseToolCalls(response: string): { toolName: string; args: Record<string, any> }[] {
  const toolCalls: { toolName: string; args: Record<string, any> }[] = [];
  
  // 1. 尝试解析 ```json ``` 代码块格式
  const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      if (parsed.tool_calls && Array.isArray(parsed.tool_calls)) {
        return parsed.tool_calls.map((tc: any) => ({
          toolName: tc.name || tc.tool,
          args: tc.arguments || tc.args || {}
        }));
      }
      if (parsed.name || parsed.tool) {
        return [{
          toolName: parsed.name || parsed.tool,
          args: parsed.arguments || parsed.args || {}
        }];
      }
    } catch (e) {
      // 解析失败，继续尝试其他格式
    }
  }
  
  // 2. 尝试解析 <tool_call> 格式
  const toolCallMatch = response.match(/<tool_call>\s*([\s\S]*?)\s*<\/tool_call>/);
  if (toolCallMatch) {
    try {
      const parsed = JSON.parse(toolCallMatch[1]);
      return [{
        toolName: parsed.name || parsed.tool,
        args: parsed.arguments || parsed.args || {}
      }];
    } catch (e) {
      // 解析失败
    }
  }
  
  // 3. 尝试直接解析整个响应为 JSON（AI 可能直接返回 JSON）
  try {
    // 清理响应文本，移除可能的前后文字
    const trimmed = response.trim();
    // 查找 JSON 对象的开始和结束
    const jsonStart = trimmed.indexOf('{');
    const jsonEnd = trimmed.lastIndexOf('}');
    
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      const jsonStr = trimmed.slice(jsonStart, jsonEnd + 1);
      const parsed = JSON.parse(jsonStr);
      
      if (parsed.tool_calls && Array.isArray(parsed.tool_calls)) {
        return parsed.tool_calls.map((tc: any) => ({
          toolName: tc.name || tc.tool,
          args: tc.arguments || tc.args || {}
        }));
      }
      if (parsed.name || parsed.tool) {
        return [{
          toolName: parsed.name || parsed.tool,
          args: parsed.arguments || parsed.args || {}
        }];
      }
    }
  } catch (e) {
    // 解析失败
  }
  
  // 4. 尝试匹配多个独立的工具调用 JSON
  const multipleJsonMatches = response.matchAll(/\{\s*"name"\s*:\s*"([^"]+)"\s*,\s*"arguments"\s*:\s*(\{[^}]+\})\s*\}/g);
  for (const match of multipleJsonMatches) {
    try {
      const args = JSON.parse(match[2]);
      toolCalls.push({
        toolName: match[1],
        args
      });
    } catch (e) {
      // 跳过解析失败的
    }
  }
  
  return toolCalls;
}

// 执行 Agent
export async function executeAgent(
  provider: AIProviderConfig,
  model: AIModelConfig,
  config: AgentConfig
): Promise<AgentResult> {
  const steps: AgentStep[] = [];
  const files: { name: string; path: string; size?: number }[] = [];
  let totalUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  
  const addStep = (step: Omit<AgentStep, 'id' | 'timestamp'>) => {
    const newStep: AgentStep = {
      ...step,
      id: `step_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
    };
    steps.push(newStep);
    config.onStep?.(newStep);
    return newStep;
  };

  // 构建系统提示词
  let systemPrompt = config.systemPrompt || '你是一个智能助手。';
  
  // 添加规则
  if (config.rules.length > 0) {
    systemPrompt += '\n\n## 规则\n你必须遵守以下规则：\n';
    config.rules.forEach((rule, i) => {
      systemPrompt += `${i + 1}. ${rule}\n`;
    });
  }
  
  // 添加资源信息
  if (config.resources.length > 0) {
    systemPrompt += '\n\n## 可用资源\n';
    config.resources.forEach(res => {
      systemPrompt += `- ${res.name}: ${JSON.stringify(res.value).slice(0, 500)}\n`;
    });
  }
  
  // 添加工具说明
  if (config.tools.length > 0) {
    systemPrompt += '\n\n## 可用工具\n你可以使用以下工具来完成任务：\n';
    config.tools.forEach(tool => {
      systemPrompt += `- ${tool.name}: ${tool.description}\n`;
    });
    systemPrompt += `
当你需要使用工具时，请使用以下格式：
\`\`\`json
{
  "tool_calls": [
    {
      "name": "工具名称",
      "arguments": { "参数名": "参数值" }
    }
  ]
}
\`\`\`

当你完成任务后，直接输出最终结果，不要使用工具调用格式。
`;
  }

  // 消息历史
  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: config.userPrompt },
  ];

  try {
    for (let step = 0; step < config.maxSteps; step++) {
      addStep({
        type: 'thinking',
        content: `正在思考... (步骤 ${step + 1}/${config.maxSteps})`,
      });

      // 调用 AI
      const result = await callAIModel(provider, model, {
        systemPrompt: messages[0].content,
        userPrompt: messages.slice(1).map(m => `${m.role}: ${m.content}`).join('\n\n'),
        temperature: 0.7,
        maxTokens: 4096,
      });

      if (!result.success) {
        return {
          success: false,
          text: '',
          files,
          steps,
          error: result.error,
        };
      }

      // 更新 token 使用量
      if (result.usage) {
        totalUsage.promptTokens += result.usage.promptTokens || 0;
        totalUsage.completionTokens += result.usage.completionTokens || 0;
        totalUsage.totalTokens += result.usage.totalTokens || 0;
      }

      const responseText = result.text || '';
      
      // 检查是否有工具调用
      const toolCalls = parseToolCalls(responseText);
      
      if (toolCalls.length > 0) {
        // 执行工具调用
        for (const tc of toolCalls) {
          addStep({
            type: 'tool_call',
            content: `调用工具: ${tc.toolName}`,
            toolName: tc.toolName,
            toolArgs: tc.args,
          });

          // 查找并执行工具
          const tool = config.tools.find(t => t.name === tc.toolName);
          let toolResult: any;
          
          if (tool) {
            try {
              toolResult = await tool.execute(tc.args);
            } catch (error) {
              toolResult = { 
                error: error instanceof Error ? error.message : '工具执行失败',
                success: false 
              };
            }
          } else {
            toolResult = { error: `未知工具: ${tc.toolName}`, success: false };
          }

          addStep({
            type: 'tool_result',
            content: `工具结果: ${JSON.stringify(toolResult).slice(0, 500)}`,
            toolName: tc.toolName,
            toolResult,
          });

          // 检查是否生成了文件
          if (tc.toolName === 'write_file' && toolResult.success) {
            files.push({
              name: toolResult.path || toolResult.file?.name || 'output.txt',
              path: toolResult.downloadUrl || toolResult.file?.path || '',
              size: toolResult.file?.size,
            });
          }

          // 将工具结果添加到消息历史
          messages.push({ role: 'assistant', content: responseText });
          messages.push({ 
            role: 'user', 
            content: `工具 ${tc.toolName} 的执行结果:\n${JSON.stringify(toolResult, null, 2)}\n\n请继续完成任务。` 
          });
        }
      } else {
        // 没有工具调用，认为是最终响应
        addStep({
          type: 'response',
          content: responseText,
        });

        return {
          success: true,
          text: responseText,
          files,
          steps,
          usage: totalUsage,
        };
      }
    }

    // 达到最大步数
    return {
      success: true,
      text: '已达到最大执行步数，任务可能未完全完成。',
      files,
      steps,
      usage: totalUsage,
    };

  } catch (error) {
    return {
      success: false,
      text: '',
      files,
      steps,
      error: error instanceof Error ? error.message : '执行失败',
    };
  }
}

// 创建内置工具的 AgentTool 定义
export function createBuiltinTools(enabledTools: string[]): AgentTool[] {
  const toolDefinitions: Record<string, Omit<AgentTool, 'execute'>> = {
    get_current_time: {
      name: 'get_current_time',
      description: '获取当前时间，返回多种格式的时间信息',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    },
    web_search: {
      name: 'web_search',
      description: '搜索互联网获取最新信息',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: '搜索关键词' }
        },
        required: ['query']
      }
    },
    read_file: {
      name: 'read_file',
      description: '读取文件内容',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: '文件路径' }
        },
        required: ['path']
      }
    },
    write_file: {
      name: 'write_file',
      description: '写入内容到文件',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: '文件路径' },
          content: { type: 'string', description: '文件内容' }
        },
        required: ['path', 'content']
      }
    },
    execute_code: {
      name: 'execute_code',
      description: '执行 JavaScript 代码并返回结果',
      parameters: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'JavaScript 代码' }
        },
        required: ['code']
      }
    },
    http_request: {
      name: 'http_request',
      description: '发送 HTTP 请求',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: '请求 URL' },
          method: { type: 'string', description: 'HTTP 方法 (GET/POST/PUT/DELETE)' },
          body: { type: 'object', description: '请求体 (可选)' }
        },
        required: ['url']
      }
    },
    scrape_webpage: {
      name: 'scrape_webpage',
      description: '爬取网页内容',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: '网页 URL' },
          selector: { type: 'string', description: 'CSS 选择器 (可选)' }
        },
        required: ['url']
      }
    },
  };

  return enabledTools
    .filter(name => toolDefinitions[name])
    .map(name => ({
      ...toolDefinitions[name],
      execute: builtinTools[name],
    }));
}
