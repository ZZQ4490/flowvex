// AI Service - Actual AI API calls for workflow execution

import { AIProviderConfig, AIModelConfig } from '../types/ai-settings';
import { useVariableStore } from '../stores/variableStore';

export interface AICallOptions {
  systemPrompt?: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AICallResult {
  success: boolean;
  text?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  error?: string;
  latency?: number;
}

/**
 * Call AI model with the given prompt
 */
export async function callAIModel(
  provider: AIProviderConfig,
  model: AIModelConfig,
  options: AICallOptions
): Promise<AICallResult> {
  const startTime = Date.now();

  // 解析变量引用
  const variableStore = useVariableStore.getState();
  const resolvedPrompt = variableStore.resolveVariables(options.userPrompt);
  const resolvedSystemPrompt = options.systemPrompt 
    ? variableStore.resolveVariables(options.systemPrompt)
    : undefined;

  try {
    const { url, headers, body } = buildAIRequest(provider, model, {
      ...options,
      userPrompt: resolvedPrompt,
      systemPrompt: resolvedSystemPrompt,
    });

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const latency = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorJson.message || errorMessage;
      } catch {
        errorMessage = errorText.slice(0, 500) || errorMessage;
      }
      return {
        success: false,
        error: errorMessage,
        latency,
      };
    }

    const data = await response.json();
    const { text, usage } = extractResponse(provider.provider, data);

    return {
      success: true,
      text,
      usage,
      latency,
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    
    return {
      success: false,
      error: errorMessage,
      latency,
    };
  }
}

function buildAIRequest(
  provider: AIProviderConfig,
  model: AIModelConfig,
  options: AICallOptions
): { url: string; headers: Record<string, string>; body: object } {
  const baseUrl = provider.apiBase || getDefaultApiBase(provider.provider);
  
  const messages: Array<{ role: string; content: string }> = [];
  
  if (options.systemPrompt) {
    messages.push({ role: 'system', content: options.systemPrompt });
  }
  messages.push({ role: 'user', content: options.userPrompt });

  switch (provider.provider) {
    case 'openai':
    case 'azure':
    case 'custom':
      return {
        url: `${baseUrl}/chat/completions`,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${provider.apiKey}`,
        },
        body: {
          model: model.modelId,
          messages,
          max_tokens: options.maxTokens || 2048,
          temperature: options.temperature ?? 0.7,
        },
      };

    case 'anthropic':
      return {
        url: `${baseUrl}/v1/messages`,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': provider.apiKey || '',
          'anthropic-version': '2023-06-01',
        },
        body: {
          model: model.modelId,
          system: options.systemPrompt,
          messages: [{ role: 'user', content: options.userPrompt }],
          max_tokens: options.maxTokens || 2048,
          temperature: options.temperature ?? 0.7,
        },
      };

    case 'google':
      return {
        url: `${baseUrl}/v1beta/models/${model.modelId}:generateContent?key=${provider.apiKey}`,
        headers: {
          'Content-Type': 'application/json',
        },
        body: {
          contents: [{ 
            parts: [{ text: options.userPrompt }] 
          }],
          systemInstruction: options.systemPrompt ? {
            parts: [{ text: options.systemPrompt }]
          } : undefined,
          generationConfig: { 
            maxOutputTokens: options.maxTokens || 2048,
            temperature: options.temperature ?? 0.7,
          },
        },
      };

    case 'ollama':
      return {
        url: `${baseUrl}/api/chat`,
        headers: {
          'Content-Type': 'application/json',
        },
        body: {
          model: model.modelId,
          messages,
          stream: false,
          options: { 
            num_predict: options.maxTokens || 2048,
            temperature: options.temperature ?? 0.7,
          },
        },
      };

    default:
      return {
        url: `${baseUrl}/chat/completions`,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${provider.apiKey}`,
        },
        body: {
          model: model.modelId,
          messages,
          max_tokens: options.maxTokens || 2048,
          temperature: options.temperature ?? 0.7,
        },
      };
  }
}

function getDefaultApiBase(provider: string): string {
  switch (provider) {
    case 'openai':
      return 'https://api.openai.com/v1';
    case 'anthropic':
      return 'https://api.anthropic.com';
    case 'google':
      return 'https://generativelanguage.googleapis.com';
    case 'ollama':
      return 'http://localhost:11434';
    default:
      return '';
  }
}

function extractResponse(provider: string, data: any): { 
  text: string; 
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number } 
} {
  try {
    switch (provider) {
      case 'openai':
      case 'azure':
      case 'custom':
        return {
          text: data.choices?.[0]?.message?.content || '',
          usage: data.usage ? {
            promptTokens: data.usage.prompt_tokens || 0,
            completionTokens: data.usage.completion_tokens || 0,
            totalTokens: data.usage.total_tokens || 0,
          } : undefined,
        };
      case 'anthropic':
        return {
          text: data.content?.[0]?.text || '',
          usage: data.usage ? {
            promptTokens: data.usage.input_tokens || 0,
            completionTokens: data.usage.output_tokens || 0,
            totalTokens: (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0),
          } : undefined,
        };
      case 'google':
        return {
          text: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
          usage: data.usageMetadata ? {
            promptTokens: data.usageMetadata.promptTokenCount || 0,
            completionTokens: data.usageMetadata.candidatesTokenCount || 0,
            totalTokens: data.usageMetadata.totalTokenCount || 0,
          } : undefined,
        };
      case 'ollama':
        return {
          text: data.message?.content || '',
          usage: {
            promptTokens: data.prompt_eval_count || 0,
            completionTokens: data.eval_count || 0,
            totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
          },
        };
      default:
        return {
          text: data.choices?.[0]?.message?.content || '',
        };
    }
  } catch {
    return { text: '' };
  }
}
