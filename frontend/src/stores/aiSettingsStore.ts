import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import { 
  AIProviderConfig, 
  AIModelConfig, 
  AIProvider, 
  AIModelType,
  getProviderMeta,
} from '../types/ai-settings';

interface AISettingsStore {
  // State
  providers: AIProviderConfig[];
  defaultModelId: string | null;
  
  // Provider operations
  addProvider: (provider: AIProvider, name: string, apiKey?: string, apiBase?: string) => AIProviderConfig;
  updateProvider: (id: string, updates: Partial<AIProviderConfig>) => void;
  removeProvider: (id: string) => void;
  toggleProvider: (id: string) => void;
  
  // Model operations
  addModel: (providerId: string, model: Omit<AIModelConfig, 'id' | 'providerId'>) => void;
  updateModel: (providerId: string, modelId: string, updates: Partial<AIModelConfig>) => void;
  removeModel: (providerId: string, modelId: string) => void;
  toggleModel: (providerId: string, modelId: string) => void;
  
  // Default model
  setDefaultModel: (modelId: string | null) => void;
  
  // Getters
  getEnabledModels: (modelType?: AIModelType) => Array<AIModelConfig & { providerName: string }>;
  getModelById: (modelId: string) => (AIModelConfig & { providerName: string }) | undefined;
  getProviderById: (providerId: string) => AIProviderConfig | undefined;
}

export const useAISettingsStore = create<AISettingsStore>()(
  persist(
    (set, get) => ({
      providers: [],
      defaultModelId: null,

      addProvider: (provider, name, apiKey, apiBase) => {
        const meta = getProviderMeta(provider);
        const newProvider: AIProviderConfig = {
          id: nanoid(),
          provider,
          name,
          apiKey,
          apiBase: apiBase || meta?.defaultApiBase,
          enabled: true,
          models: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // Auto-add predefined models
        if (meta?.predefinedModels) {
          newProvider.models = meta.predefinedModels.map((m, index) => ({
            id: nanoid(),
            providerId: newProvider.id,
            modelId: m.modelId,
            displayName: m.displayName,
            modelType: m.modelType,
            maxTokens: m.maxTokens,
            contextWindow: m.contextWindow,
            enabled: true,
            isDefault: index === 0,
          }));
        }

        set((state) => ({
          providers: [...state.providers, newProvider],
          // Set first chat model as default if no default exists
          defaultModelId: state.defaultModelId || 
            newProvider.models.find(m => m.modelType === 'chat')?.id || 
            state.defaultModelId,
        }));

        return newProvider;
      },

      updateProvider: (id, updates) => {
        set((state) => ({
          providers: state.providers.map(p =>
            p.id === id
              ? { ...p, ...updates, updatedAt: new Date().toISOString() }
              : p
          ),
        }));
      },

      removeProvider: (id) => {
        set((state) => {
          const provider = state.providers.find(p => p.id === id);
          const modelIds = provider?.models.map(m => m.id) || [];
          return {
            providers: state.providers.filter(p => p.id !== id),
            defaultModelId: modelIds.includes(state.defaultModelId || '')
              ? null
              : state.defaultModelId,
          };
        });
      },

      toggleProvider: (id) => {
        set((state) => ({
          providers: state.providers.map(p =>
            p.id === id
              ? { ...p, enabled: !p.enabled, updatedAt: new Date().toISOString() }
              : p
          ),
        }));
      },

      addModel: (providerId, model) => {
        const newModel: AIModelConfig = {
          id: nanoid(),
          providerId,
          ...model,
        };

        set((state) => ({
          providers: state.providers.map(p =>
            p.id === providerId
              ? { 
                  ...p, 
                  models: [...p.models, newModel],
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        }));
      },

      updateModel: (providerId, modelId, updates) => {
        set((state) => ({
          providers: state.providers.map(p =>
            p.id === providerId
              ? {
                  ...p,
                  models: p.models.map(m =>
                    m.id === modelId ? { ...m, ...updates } : m
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        }));
      },

      removeModel: (providerId, modelId) => {
        set((state) => ({
          providers: state.providers.map(p =>
            p.id === providerId
              ? {
                  ...p,
                  models: p.models.filter(m => m.id !== modelId),
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
          defaultModelId: state.defaultModelId === modelId ? null : state.defaultModelId,
        }));
      },

      toggleModel: (providerId, modelId) => {
        set((state) => ({
          providers: state.providers.map(p =>
            p.id === providerId
              ? {
                  ...p,
                  models: p.models.map(m =>
                    m.id === modelId ? { ...m, enabled: !m.enabled } : m
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : p
          ),
        }));
      },

      setDefaultModel: (modelId) => {
        set({ defaultModelId: modelId });
      },

      getEnabledModels: (modelType) => {
        const { providers } = get();
        const models: Array<AIModelConfig & { providerName: string }> = [];

        providers
          .filter(p => p.enabled)
          .forEach(p => {
            p.models
              .filter(m => m.enabled && (!modelType || m.modelType === modelType))
              .forEach(m => {
                models.push({ ...m, providerName: p.name });
              });
          });

        return models;
      },

      getModelById: (modelId) => {
        const { providers } = get();
        for (const provider of providers) {
          const model = provider.models.find(m => m.id === modelId);
          if (model) {
            return { ...model, providerName: provider.name };
          }
        }
        return undefined;
      },

      getProviderById: (providerId) => {
        return get().providers.find(p => p.id === providerId);
      },
    }),
    {
      name: 'ai-settings-storage',
    }
  )
);
