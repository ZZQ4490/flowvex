// AI Model Provider and Settings Types

export type AIProvider = 'openai' | 'anthropic' | 'azure' | 'google' | 'ollama' | 'custom';

export interface AIProviderConfig {
  id: string;
  provider: AIProvider;
  name: string;
  apiKey?: string;
  apiBase?: string;
  enabled: boolean;
  models: AIModelConfig[];
  createdAt: string;
  updatedAt: string;
}

export interface AIModelConfig {
  id: string;
  providerId: string;
  modelId: string;
  displayName: string;
  modelType: AIModelType;
  maxTokens?: number;
  contextWindow?: number;
  enabled: boolean;
  isDefault?: boolean;
}

export type AIModelType = 
  | 'chat'           // 对话模型
  | 'completion'     // 补全模型
  | 'embedding'      // 嵌入模型
  | 'image'          // 图像生成
  | 'audio'          // 语音模型
  | 'moderation';    // 内容审核

export interface AIProviderMeta {
  id: AIProvider;
  name: string;
  icon: string;
  description: string;
  website: string;
  requiresApiKey: boolean;
  requiresApiBase: boolean;
  defaultApiBase?: string;
  supportedModelTypes: AIModelType[];
  predefinedModels: PredefinedModel[];
}

export interface PredefinedModel {
  modelId: string;
  displayName: string;
  modelType: AIModelType;
  maxTokens?: number;
  contextWindow?: number;
  description?: string;
}

// Provider metadata
export const AI_PROVIDERS: AIProviderMeta[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    icon: 'Bot',
    description: 'GPT-4, GPT-3.5 等模型',
    website: 'https://openai.com',
    requiresApiKey: true,
    requiresApiBase: false,
    defaultApiBase: 'https://api.openai.com/v1',
    supportedModelTypes: ['chat', 'completion', 'embedding', 'image', 'audio', 'moderation'],
    predefinedModels: [
      { modelId: 'gpt-4o', displayName: 'GPT-4o', modelType: 'chat', contextWindow: 128000 },
      { modelId: 'gpt-4o-mini', displayName: 'GPT-4o Mini', modelType: 'chat', contextWindow: 128000 },
      { modelId: 'gpt-4-turbo', displayName: 'GPT-4 Turbo', modelType: 'chat', contextWindow: 128000 },
      { modelId: 'gpt-4', displayName: 'GPT-4', modelType: 'chat', contextWindow: 8192 },
      { modelId: 'gpt-3.5-turbo', displayName: 'GPT-3.5 Turbo', modelType: 'chat', contextWindow: 16385 },
      { modelId: 'text-embedding-3-large', displayName: 'Embedding 3 Large', modelType: 'embedding' },
      { modelId: 'text-embedding-3-small', displayName: 'Embedding 3 Small', modelType: 'embedding' },
      { modelId: 'dall-e-3', displayName: 'DALL-E 3', modelType: 'image' },
      { modelId: 'whisper-1', displayName: 'Whisper', modelType: 'audio' },
      { modelId: 'tts-1', displayName: 'TTS-1', modelType: 'audio' },
    ],
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    icon: 'Sparkles',
    description: 'Claude 3.5, Claude 3 等模型',
    website: 'https://anthropic.com',
    requiresApiKey: true,
    requiresApiBase: false,
    defaultApiBase: 'https://api.anthropic.com',
    supportedModelTypes: ['chat'],
    predefinedModels: [
      { modelId: 'claude-3-5-sonnet-20241022', displayName: 'Claude 3.5 Sonnet', modelType: 'chat', contextWindow: 200000 },
      { modelId: 'claude-3-5-haiku-20241022', displayName: 'Claude 3.5 Haiku', modelType: 'chat', contextWindow: 200000 },
      { modelId: 'claude-3-opus-20240229', displayName: 'Claude 3 Opus', modelType: 'chat', contextWindow: 200000 },
      { modelId: 'claude-3-sonnet-20240229', displayName: 'Claude 3 Sonnet', modelType: 'chat', contextWindow: 200000 },
      { modelId: 'claude-3-haiku-20240307', displayName: 'Claude 3 Haiku', modelType: 'chat', contextWindow: 200000 },
    ],
  },
  {
    id: 'azure',
    name: 'Azure OpenAI',
    icon: 'Cloud',
    description: 'Microsoft Azure 托管的 OpenAI 服务',
    website: 'https://azure.microsoft.com/products/ai-services/openai-service',
    requiresApiKey: true,
    requiresApiBase: true,
    supportedModelTypes: ['chat', 'completion', 'embedding'],
    predefinedModels: [],
  },
  {
    id: 'google',
    name: 'Google AI',
    icon: 'Gem',
    description: 'Gemini Pro, Gemini Flash 等模型',
    website: 'https://ai.google.dev',
    requiresApiKey: true,
    requiresApiBase: false,
    defaultApiBase: 'https://generativelanguage.googleapis.com',
    supportedModelTypes: ['chat', 'embedding'],
    predefinedModels: [
      { modelId: 'gemini-2.0-flash-exp', displayName: 'Gemini 2.0 Flash', modelType: 'chat', contextWindow: 1000000 },
      { modelId: 'gemini-1.5-pro', displayName: 'Gemini 1.5 Pro', modelType: 'chat', contextWindow: 2000000 },
      { modelId: 'gemini-1.5-flash', displayName: 'Gemini 1.5 Flash', modelType: 'chat', contextWindow: 1000000 },
      { modelId: 'text-embedding-004', displayName: 'Text Embedding', modelType: 'embedding' },
    ],
  },
  {
    id: 'ollama',
    name: 'Ollama',
    icon: 'Server',
    description: '本地运行的开源模型',
    website: 'https://ollama.ai',
    requiresApiKey: false,
    requiresApiBase: true,
    defaultApiBase: 'http://localhost:11434',
    supportedModelTypes: ['chat', 'embedding'],
    predefinedModels: [
      { modelId: 'llama3.2', displayName: 'Llama 3.2', modelType: 'chat' },
      { modelId: 'llama3.1', displayName: 'Llama 3.1', modelType: 'chat' },
      { modelId: 'qwen2.5', displayName: 'Qwen 2.5', modelType: 'chat' },
      { modelId: 'deepseek-r1', displayName: 'DeepSeek R1', modelType: 'chat' },
      { modelId: 'mistral', displayName: 'Mistral', modelType: 'chat' },
      { modelId: 'nomic-embed-text', displayName: 'Nomic Embed', modelType: 'embedding' },
    ],
  },
  {
    id: 'custom',
    name: '自定义',
    icon: 'Settings',
    description: '兼容 OpenAI API 的自定义服务',
    website: '',
    requiresApiKey: true,
    requiresApiBase: true,
    supportedModelTypes: ['chat', 'completion', 'embedding'],
    predefinedModels: [],
  },
];

// Helper functions
export function getProviderMeta(provider: AIProvider): AIProviderMeta | undefined {
  return AI_PROVIDERS.find(p => p.id === provider);
}

export function getModelTypeLabel(type: AIModelType): string {
  const labels: Record<AIModelType, string> = {
    chat: '对话',
    completion: '补全',
    embedding: '嵌入',
    image: '图像',
    audio: '语音',
    moderation: '审核',
  };
  return labels[type];
}
