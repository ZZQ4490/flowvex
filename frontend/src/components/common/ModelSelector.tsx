import React, { useState, useRef, useEffect } from 'react';
import { Icon } from '../Icon';
import { useAISettingsStore } from '../../stores/aiSettingsStore';
import { AIModelType } from '../../types/ai-settings';

interface ModelSelectorProps {
  value: string | null;
  onChange: (modelId: string) => void;
  modelType?: AIModelType;
  placeholder?: string;
  disabled?: boolean;
  showProviderBadge?: boolean;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  value,
  onChange,
  modelType = 'chat',
  placeholder = '选择模型',
  disabled = false,
  showProviderBadge = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { getEnabledModels, getModelById, defaultModelId } = useAISettingsStore();
  
  const enabledModels = getEnabledModels(modelType);
  const selectedModel = value ? getModelById(value) : null;

  // Filter models by search
  const filteredModels = enabledModels.filter(m =>
    m.displayName.toLowerCase().includes(search.toLowerCase()) ||
    m.modelId.toLowerCase().includes(search.toLowerCase()) ||
    m.providerName.toLowerCase().includes(search.toLowerCase())
  );

  // Group models by provider
  const groupedModels = filteredModels.reduce((acc, model) => {
    if (!acc[model.providerName]) {
      acc[model.providerName] = [];
    }
    acc[model.providerName].push(model);
    return acc;
  }, {} as Record<string, typeof filteredModels>);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (modelId: string) => {
    onChange(modelId);
    setIsOpen(false);
    setSearch('');
  };

  // Use default model if no value selected
  useEffect(() => {
    if (!value && defaultModelId && enabledModels.some(m => m.id === defaultModelId)) {
      onChange(defaultModelId);
    }
  }, [value, defaultModelId, enabledModels, onChange]);

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full px-3 py-2 border rounded-lg text-left flex items-center justify-between transition-all ${
          disabled
            ? 'bg-gray-100 border-gray-200 cursor-not-allowed'
            : isOpen
            ? 'border-blue-500 ring-2 ring-blue-100'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        {selectedModel ? (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Icon name="Bot" size={16} className="text-purple-500 flex-shrink-0" />
            <span className="font-medium text-gray-900 truncate">{selectedModel.displayName}</span>
            {showProviderBadge && (
              <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-500 rounded flex-shrink-0">
                {selectedModel.providerName}
              </span>
            )}
          </div>
        ) : (
          <span className="text-gray-400">{placeholder}</span>
        )}
        <Icon 
          name={isOpen ? 'ChevronUp' : 'ChevronDown'} 
          size={16} 
          className="text-gray-400 flex-shrink-0" 
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Search Input */}
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索模型..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Model List */}
          <div className="max-h-[300px] overflow-y-auto">
            {Object.keys(groupedModels).length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                {enabledModels.length === 0 ? (
                  <div>
                    <Icon name="AlertCircle" size={24} className="mx-auto mb-2 text-gray-400" />
                    <p>没有可用的模型</p>
                    <p className="text-xs text-gray-400 mt-1">请先在设置中配置模型提供商</p>
                  </div>
                ) : (
                  <p>没有匹配的模型</p>
                )}
              </div>
            ) : (
              Object.entries(groupedModels).map(([providerName, models]) => (
                <div key={providerName}>
                  {/* Provider Header */}
                  <div className="px-3 py-1.5 bg-gray-50 text-xs font-medium text-gray-500 sticky top-0">
                    {providerName}
                  </div>
                  {/* Models */}
                  {models.map(model => (
                    <button
                      key={model.id}
                      onClick={() => handleSelect(model.id)}
                      className={`w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-blue-50 transition-colors ${
                        value === model.id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <Icon 
                        name="Bot" 
                        size={16} 
                        className={value === model.id ? 'text-blue-500' : 'text-gray-400'} 
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium truncate ${
                            value === model.id ? 'text-blue-600' : 'text-gray-900'
                          }`}>
                            {model.displayName}
                          </span>
                          {model.id === defaultModelId && (
                            <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-600 rounded">
                              默认
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>{model.modelId}</span>
                          {model.contextWindow && (
                            <>
                              <span>•</span>
                              <span>{(model.contextWindow / 1000).toFixed(0)}K 上下文</span>
                            </>
                          )}
                        </div>
                      </div>
                      {value === model.id && (
                        <Icon name="Check" size={16} className="text-blue-500 flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
