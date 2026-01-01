import React, { useState } from 'react';
import { Icon } from './Icon';

interface PortConfig {
  id: string;
  name: string;
  data_type: string;
  sourceNodeId?: string;
  sourcePortId?: string;
}

interface MergeNodesDialogProps {
  nodeCount: number;
  suggestedInputs: PortConfig[];
  suggestedOutputs: PortConfig[];
  onConfirm: (name: string, color: string, description: string, inputs: PortConfig[], outputs: PortConfig[]) => void;
  onCancel: () => void;
}

const colorOptions = [
  { value: '#6366f1', label: '靛蓝', className: 'bg-indigo-500' },
  { value: '#8b5cf6', label: '紫色', className: 'bg-violet-500' },
  { value: '#3b82f6', label: '蓝色', className: 'bg-blue-500' },
  { value: '#10b981', label: '绿色', className: 'bg-emerald-500' },
  { value: '#f59e0b', label: '橙色', className: 'bg-amber-500' },
  { value: '#ec4899', label: '粉色', className: 'bg-pink-500' },
  { value: '#06b6d4', label: '青色', className: 'bg-cyan-500' },
  { value: '#ef4444', label: '红色', className: 'bg-red-500' },
];

const dataTypes = ['Any', 'String', 'Number', 'Boolean', 'Object', 'Array'];

export const MergeNodesDialog: React.FC<MergeNodesDialogProps> = ({
  nodeCount,
  suggestedInputs,
  suggestedOutputs,
  onConfirm,
  onCancel,
}) => {
  const [name, setName] = useState('子流程');
  const [color, setColor] = useState('#6366f1');
  const [description, setDescription] = useState('');
  const [inputs, setInputs] = useState<PortConfig[]>(suggestedInputs);
  const [outputs, setOutputs] = useState<PortConfig[]>(suggestedOutputs);
  const [activeTab, setActiveTab] = useState<'basic' | 'ports'>('basic');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onConfirm(name.trim(), color, description.trim(), inputs, outputs);
    }
  };

  const addInput = () => {
    setInputs([...inputs, { id: `input_${Date.now()}`, name: '新输入', data_type: 'Any' }]);
  };

  const addOutput = () => {
    setOutputs([...outputs, { id: `output_${Date.now()}`, name: '新输出', data_type: 'Any' }]);
  };

  const removeInput = (id: string) => {
    setInputs(inputs.filter(p => p.id !== id));
  };

  const removeOutput = (id: string) => {
    setOutputs(outputs.filter(p => p.id !== id));
  };

  const updateInput = (id: string, field: 'name' | 'data_type', value: string) => {
    setInputs(inputs.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const updateOutput = (id: string, field: 'name' | 'data_type', value: string) => {
    setOutputs(outputs.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
      <div className="bg-white rounded-2xl shadow-2xl w-[520px] max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
              <Icon name="Layers" size={20} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">合并到新节点</h2>
              <p className="text-sm text-gray-500">将 {nodeCount} 个节点合并为子流程</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Icon name="X" size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6 flex-shrink-0">
          <button
            onClick={() => setActiveTab('basic')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'basic' 
                ? 'border-indigo-500 text-indigo-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            基本信息
          </button>
          <button
            onClick={() => setActiveTab('ports')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'ports' 
                ? 'border-indigo-500 text-indigo-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            输入输出端口
            <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-gray-100 rounded">
              {inputs.length + outputs.length}
            </span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          {activeTab === 'basic' && (
            <div className="p-6 space-y-5">
              {/* Name Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  节点名称
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="输入节点名称"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  autoFocus
                />
              </div>

              {/* Color Picker */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  节点颜色
                </label>
                <div className="flex gap-2 flex-wrap">
                  {colorOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setColor(option.value)}
                      className={`w-9 h-9 rounded-lg ${option.className} transition-all ${
                        color === option.value
                          ? 'ring-2 ring-offset-2 ring-gray-400 scale-110'
                          : 'hover:scale-105'
                      }`}
                      title={option.label}
                    />
                  ))}
                </div>
              </div>

              {/* Description Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  描述 <span className="text-gray-400 font-normal">(可选)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="描述这个子流程的功能..."
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
                />
              </div>

              {/* Preview */}
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-2">预览</p>
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm"
                    style={{ backgroundColor: color }}
                  >
                    <Icon name="Layers" size={24} color="white" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{name || '子流程'}</p>
                    <p className="text-sm text-gray-500">
                      {inputs.length} 个输入 · {outputs.length} 个输出
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ports' && (
            <div className="p-6 space-y-6">
              {/* Inputs */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    输入端口
                  </label>
                  <button
                    type="button"
                    onClick={addInput}
                    className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                  >
                    <Icon name="Plus" size={12} />
                    添加
                  </button>
                </div>
                {inputs.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4 bg-gray-50 rounded-lg">
                    无输入端口
                  </p>
                ) : (
                  <div className="space-y-2">
                    {inputs.map((port) => (
                      <div key={port.id} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
                        <input
                          type="text"
                          value={port.name}
                          onChange={(e) => updateInput(port.id, 'name', e.target.value)}
                          className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          placeholder="端口名称"
                        />
                        <select
                          value={port.data_type}
                          onChange={(e) => updateInput(port.id, 'data_type', e.target.value)}
                          className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                        >
                          {dataTypes.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <button
                          type="button"
                          onClick={() => removeInput(port.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        >
                          <Icon name="Trash2" size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Outputs */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    输出端口
                  </label>
                  <button
                    type="button"
                    onClick={addOutput}
                    className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                  >
                    <Icon name="Plus" size={12} />
                    添加
                  </button>
                </div>
                {outputs.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4 bg-gray-50 rounded-lg">
                    无输出端口
                  </p>
                ) : (
                  <div className="space-y-2">
                    {outputs.map((port) => (
                      <div key={port.id} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
                        <input
                          type="text"
                          value={port.name}
                          onChange={(e) => updateOutput(port.id, 'name', e.target.value)}
                          className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          placeholder="端口名称"
                        />
                        <select
                          value={port.data_type}
                          onChange={(e) => updateOutput(port.id, 'data_type', e.target.value)}
                          className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                        >
                          {dataTypes.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <button
                          type="button"
                          onClick={() => removeOutput(port.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        >
                          <Icon name="Trash2" size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Help text */}
              <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
                <p className="font-medium mb-1">💡 端口说明</p>
                <p>输入端口：外部数据进入子流程的入口</p>
                <p>输出端口：子流程数据输出到外部的出口</p>
              </div>
            </div>
          )}
        </form>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            确认合并
          </button>
        </div>
      </div>
    </div>
  );
};
