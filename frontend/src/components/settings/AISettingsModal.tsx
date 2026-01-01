import React, { useState } from 'react';
import { Icon } from '../Icon';
import { useAISettingsStore } from '../../stores/aiSettingsStore';
import { 
  AI_PROVIDERS, 
  AIProvider, 
  AIProviderConfig,
  getProviderMeta,
  getModelTypeLabel,
} from '../../types/ai-settings';

interface AISettingsModalProps {
  onClose: () => void;
}

export const AISettingsModal: React.FC<AISettingsModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'providers' | 'models'>('providers');
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [editingProvider, setEditingProvider] = useState<AIProviderConfig | null>(null);

  const { 
    providers, 
    defaultModelId,
    removeProvider, 
    toggleProvider,
    setDefaultModel,
    getEnabledModels,
  } = useAISettingsStore();

  const enabledModels = getEnabledModels('chat');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div 
        className="bg-white rounded-xl shadow-2xl w-[900px] max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <Icon name="Settings" size={20} color="white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">AI 模型设置</h2>
              <p className="text-sm text-gray-500">配置和管理 AI 模型提供商</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Icon name="X" size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 border-b border-gray-200">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('providers')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'providers'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="flex items-center gap-2">
                <Icon name="Server" size={16} />
                模型提供商
              </span>
            </button>
            <button
              onClick={() => setActiveTab('models')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'models'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="flex items-center gap-2">
                <Icon name="Bot" size={16} />
                默认模型
              </span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'providers' && (
            <div className="space-y-4">
              {/* Add Provider Button */}
              <button
                onClick={() => setShowAddProvider(true)}
                className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50/50 transition-all flex items-center justify-center gap-2"
              >
                <Icon name="Plus" size={20} />
                添加模型提供商
              </button>

              {/* Provider List */}
              {providers.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-xl flex items-center justify-center">
                    <Icon name="Server" size={32} className="text-gray-400" />
                  </div>
                  <p className="text-gray-500">还没有配置任何模型提供商</p>
                  <p className="text-sm text-gray-400 mt-1">点击上方按钮添加第一个提供商</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {providers.map(provider => (
                    <ProviderCard
                      key={provider.id}
                      provider={provider}
                      onEdit={() => setEditingProvider(provider)}
                      onToggle={() => toggleProvider(provider.id)}
                      onDelete={() => removeProvider(provider.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'models' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Icon name="Info" size={20} className="text-blue-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-blue-800 font-medium">默认模型设置</p>
                    <p className="text-sm text-blue-600 mt-1">
                      选择一个默认的对话模型，在创建 AI 节点时会自动使用此模型
                    </p>
                  </div>
                </div>
              </div>

              {enabledModels.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-xl flex items-center justify-center">
                    <Icon name="Bot" size={32} className="text-gray-400" />
                  </div>
                  <p className="text-gray-500">没有可用的模型</p>
                  <p className="text-sm text-gray-400 mt-1">请先添加并启用模型提供商</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {enabledModels.map(model => (
                    <label
                      key={model.id}
                      className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-all ${
                        defaultModelId === model.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="defaultModel"
                        checked={defaultModelId === model.id}
                        onChange={() => setDefaultModel(model.id)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{model.displayName}</span>
                          <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                            {model.providerName}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          <span>{getModelTypeLabel(model.modelType)}</span>
                          {model.contextWindow && (
                            <span>上下文: {(model.contextWindow / 1000).toFixed(0)}K</span>
                          )}
                        </div>
                      </div>
                      {defaultModelId === model.id && (
                        <span className="px-2 py-1 text-xs bg-blue-500 text-white rounded">
                          默认
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors"
          >
            完成
          </button>
        </div>
      </div>

      {/* Add Provider Modal */}
      {showAddProvider && (
        <AddProviderModal onClose={() => setShowAddProvider(false)} />
      )}

      {/* Edit Provider Modal */}
      {editingProvider && (
        <EditProviderModal 
          provider={editingProvider} 
          onClose={() => setEditingProvider(null)} 
        />
      )}
    </div>
  );
};

// Provider Card Component
interface ProviderCardProps {
  provider: AIProviderConfig;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}

const ProviderCard: React.FC<ProviderCardProps> = ({ provider, onEdit, onToggle, onDelete }) => {
  const meta = getProviderMeta(provider.provider);
  const enabledModels = provider.models.filter(m => m.enabled).length;

  return (
    <div className={`border rounded-lg p-4 transition-all ${
      provider.enabled ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            provider.enabled ? 'bg-gradient-to-br from-blue-500 to-purple-600' : 'bg-gray-300'
          }`}>
            <Icon name={meta?.icon || 'Server'} size={20} color="white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-gray-900">{provider.name}</h3>
              <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                {meta?.name}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              {enabledModels} 个模型已启用
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle Switch */}
          <button
            onClick={onToggle}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              provider.enabled ? 'bg-blue-500' : 'bg-gray-300'
            }`}
          >
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
              provider.enabled ? 'left-6' : 'left-1'
            }`} />
          </button>

          {/* Edit Button */}
          <button
            onClick={onEdit}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Icon name="Settings" size={16} />
          </button>

          {/* Delete Button */}
          <button
            onClick={onDelete}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Icon name="Trash2" size={16} />
          </button>
        </div>
      </div>

      {/* API Key Status */}
      {meta?.requiresApiKey && (
        <div className="mt-3 flex items-center gap-2 text-sm">
          {provider.apiKey ? (
            <>
              <Icon name="Key" size={14} className="text-green-500" />
              <span className="text-green-600">API Key 已配置</span>
            </>
          ) : (
            <>
              <Icon name="AlertCircle" size={14} className="text-amber-500" />
              <span className="text-amber-600">需要配置 API Key</span>
            </>
          )}
        </div>
      )}
    </div>
  );
};

// Add Provider Modal
const AddProviderModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [selectedProvider, setSelectedProvider] = useState<AIProvider | null>(null);
  const [name, setName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiBase, setApiBase] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  const { addProvider } = useAISettingsStore();

  const meta = selectedProvider ? getProviderMeta(selectedProvider) : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProvider || !name) return;

    addProvider(
      selectedProvider,
      name,
      apiKey || undefined,
      apiBase || undefined
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-xl shadow-2xl w-[500px] max-h-[80vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">添加模型提供商</h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Icon name="X" size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Provider Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              选择提供商
            </label>
            <div className="grid grid-cols-2 gap-2">
              {AI_PROVIDERS.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setSelectedProvider(p.id);
                    setName(p.name);
                    setApiBase(p.defaultApiBase || '');
                  }}
                  className={`p-3 border rounded-lg text-left transition-all ${
                    selectedProvider === p.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon name={p.icon} size={18} className={
                      selectedProvider === p.id ? 'text-blue-500' : 'text-gray-500'
                    } />
                    <span className="font-medium text-sm">{p.name}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 truncate">{p.description}</p>
                </button>
              ))}
            </div>
          </div>

          {selectedProvider && (
            <>
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  显示名称
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例如: 我的 OpenAI"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {/* API Key */}
              {meta?.requiresApiKey && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    API Key
                  </label>
                  <div className="relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="sk-..."
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                    >
                      <Icon name={showApiKey ? 'EyeOff' : 'Eye'} size={18} />
                    </button>
                  </div>
                </div>
              )}

              {/* API Base */}
              {meta?.requiresApiBase && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    API Base URL
                  </label>
                  <input
                    type="url"
                    value={apiBase}
                    onChange={(e) => setApiBase(e.target.value)}
                    placeholder="https://api.example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}
            </>
          )}
        </form>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedProvider || !name}
            className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            添加
          </button>
        </div>
      </div>
    </div>
  );
};

// Edit Provider Modal
const EditProviderModal: React.FC<{ provider: AIProviderConfig; onClose: () => void }> = ({ 
  provider: initialProvider, 
  onClose 
}) => {
  const [name, setName] = useState(initialProvider.name);
  const [apiKey, setApiKey] = useState(initialProvider.apiKey || '');
  const [apiBase, setApiBase] = useState(initialProvider.apiBase || '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [showAddModel, setShowAddModel] = useState(false);
  const [newModelId, setNewModelId] = useState('');
  const [newModelName, setNewModelName] = useState('');
  const [newModelType, setNewModelType] = useState<'chat' | 'embedding'>('chat');

  const { updateProvider, toggleModel, addModel, removeModel, getProviderById } = useAISettingsStore();
  
  // Get real-time provider data from store
  const provider = getProviderById(initialProvider.id) || initialProvider;
  const meta = getProviderMeta(provider.provider);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProvider(provider.id, {
      name,
      apiKey: apiKey || undefined,
      apiBase: apiBase || undefined,
    });
    onClose();
  };

  const handleAddModel = () => {
    if (!newModelId.trim() || !newModelName.trim()) return;
    
    addModel(provider.id, {
      modelId: newModelId.trim(),
      displayName: newModelName.trim(),
      modelType: newModelType,
      enabled: true,
    });
    
    setNewModelId('');
    setNewModelName('');
    setShowAddModel(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-xl shadow-2xl w-[550px] max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">编辑 {provider.name}</h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Icon name="X" size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              显示名称
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* API Key */}
          {meta?.requiresApiKey && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Key
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                >
                  <Icon name={showApiKey ? 'EyeOff' : 'Eye'} size={18} />
                </button>
              </div>
            </div>
          )}

          {/* API Base */}
          {(meta?.requiresApiBase || provider.apiBase) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Base URL
              </label>
              <input
                type="url"
                value={apiBase}
                onChange={(e) => setApiBase(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          {/* Models */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                可用模型
              </label>
              <button
                type="button"
                onClick={() => setShowAddModel(!showAddModel)}
                className="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1"
              >
                <Icon name="Plus" size={14} />
                添加模型
              </button>
            </div>

            {/* Add Model Form */}
            {showAddModel && (
              <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">模型 ID</label>
                    <input
                      type="text"
                      value={newModelId}
                      onChange={(e) => setNewModelId(e.target.value)}
                      placeholder="gpt-4o, claude-3..."
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">显示名称</label>
                    <input
                      type="text"
                      value={newModelName}
                      onChange={(e) => setNewModelName(e.target.value)}
                      placeholder="GPT-4o"
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-500">类型:</label>
                    <select
                      value={newModelType}
                      onChange={(e) => setNewModelType(e.target.value as 'chat' | 'embedding')}
                      className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="chat">对话</option>
                      <option value="embedding">嵌入</option>
                      <option value="completion">补全</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddModel(false)}
                      className="px-2 py-1 text-xs text-gray-500 hover:bg-gray-200 rounded"
                    >
                      取消
                    </button>
                    <button
                      type="button"
                      onClick={handleAddModel}
                      disabled={!newModelId.trim() || !newModelName.trim()}
                      className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                    >
                      添加
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Model List */}
            <div className="space-y-1 max-h-[200px] overflow-y-auto border border-gray-200 rounded-lg">
              {provider.models.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  <Icon name="Bot" size={24} className="mx-auto mb-2 text-gray-300" />
                  <p>暂无模型</p>
                  <p className="text-xs text-gray-400">点击上方"添加模型"手动添加</p>
                </div>
              ) : (
                provider.models.map(model => (
                  <div
                    key={model.id}
                    className="flex items-center gap-3 p-2 hover:bg-gray-50 group"
                  >
                    <input
                      type="checkbox"
                      checked={model.enabled}
                      onChange={() => toggleModel(provider.id, model.id)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-gray-900">{model.displayName}</span>
                      <span className="ml-2 text-xs text-gray-500">{model.modelId}</span>
                    </div>
                    <span className="text-xs text-gray-400 px-1.5 py-0.5 bg-gray-100 rounded">
                      {getModelTypeLabel(model.modelType)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeModel(provider.id, model.id)}
                      className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Icon name="X" size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </form>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
};
