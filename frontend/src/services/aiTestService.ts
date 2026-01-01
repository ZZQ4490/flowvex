// AI Connection Test Service
// Tests model connectivity by sending a simple request to the AI provider

import { AIProviderConfig, AIModelConfig } from '../types/ai-settings';

export interface TestResult {
  success: boolean;
  message: string;
  latency?: number;
  response?: string;
}

/**
 * Test connection to an AI model
 */
export async function testModelConnection(
  provider: AIProviderConfig,
  model: AIModelConfig
): Promise<TestResult> {
  const startTime = Date.now();

  try {
    // Build request based on provider type
    const { url, headers, body } = buildTestRequest(provider, model);

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
        errorMessage = errorText.slice(0, 200) || errorMessage;
      }
      return {
        success: false,
        message: `连接失败: ${errorMessage}`,
        latency,
      };
    }

    const data = await response.json();
    const responseText = extractResponseText(provider.provider, data);

    return {
      success: true,
      message: '连接成功',
      latency,
      response: responseText,
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    
    // Handle common errors
    if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
      return {
        success: false,
        message: '网络错误: 无法连接到 API 服务器，请检查网络或 API Base URL',
        latency,
      };
    }

    return {
      success: false,
      message: `连接失败: ${errorMessage}`,
      latency,
    };
  }
}

function buildTestRequest(
  provider: AIProviderConfig,
  model: AIModelConfig
): { url: string; headers: Record<string, string>; body: object } {
  const baseUrl = provider.apiBase || getDefaultApiBase(provider.provider);
  
  // Common test message
  const testMessage = 'Hi, this is a connection test. Please respond with "OK".';

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
          messages: [{ role: 'user', content: testMessage }],
          max_tokens: 10,
          temperature: 0,
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
          messages: [{ role: 'user', content: testMessage }],
          max_tokens: 10,
        },
      };

    case 'google':
      // Google Gemini API format
      return {
        url: `${baseUrl}/v1beta/models/${model.modelId}:generateContent?key=${provider.apiKey}`,
        headers: {
          'Content-Type': 'application/json',
        },
        body: {
          contents: [{ parts: [{ text: testMessage }] }],
          generationConfig: { maxOutputTokens: 10 },
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
          messages: [{ role: 'user', content: testMessage }],
          stream: false,
          options: { num_predict: 10 },
        },
      };

    default:
      // Default to OpenAI-compatible format
      return {
        url: `${baseUrl}/chat/completions`,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${provider.apiKey}`,
        },
        body: {
          model: model.modelId,
          messages: [{ role: 'user', content: testMessage }],
          max_tokens: 10,
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

function extractResponseText(provider: string, data: any): string {
  try {
    switch (provider) {
      case 'openai':
      case 'azure':
      case 'custom':
        return data.choices?.[0]?.message?.content || '';
      case 'anthropic':
        return data.content?.[0]?.text || '';
      case 'google':
        return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      case 'ollama':
        return data.message?.content || '';
      default:
        return data.choices?.[0]?.message?.content || JSON.stringify(data).slice(0, 100);
    }
  } catch {
    return '';
  }
}
