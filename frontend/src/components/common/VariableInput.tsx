import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useVariableStore, WorkflowVariable } from '../../stores/variableStore';
import { useWorkflowStore } from '../../stores/workflowStore';
import { Icon } from '../Icon';

interface VariableInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  availableVariables?: WorkflowVariable[];
  nodeId?: string;
  className?: string;
}

// 数据类型配置
const dataTypeConfig: Record<string, { color: string; bgColor: string; icon: string }> = {
  String: { color: 'text-green-600', bgColor: 'bg-green-100', icon: 'Type' },
  Number: { color: 'text-blue-600', bgColor: 'bg-blue-100', icon: 'Hash' },
  Boolean: { color: 'text-amber-600', bgColor: 'bg-amber-100', icon: 'ToggleLeft' },
  Object: { color: 'text-violet-600', bgColor: 'bg-violet-100', icon: 'Braces' },
  Array: { color: 'text-pink-600', bgColor: 'bg-pink-100', icon: 'List' },
  Any: { color: 'text-gray-600', bgColor: 'bg-gray-100', icon: 'Variable' },
};

export const VariableInput: React.FC<VariableInputProps> = ({
  value,
  onChange,
  placeholder,
  multiline = false,
  rows = 3,
  availableVariables: propVariables,
  nodeId,
  className = '',
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [filterNode, setFilterNode] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, width: 320 });
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { variables } = useVariableStore();
  const { workflow } = useWorkflowStore();
  
  // 获取所有上游节点的变量
  const allAvailableVariables = useMemo((): WorkflowVariable[] => {
    if (propVariables && propVariables.length > 0) {
      return propVariables;
    }
    
    if (!nodeId || !workflow) {
      return Object.values(variables);
    }
    
    const upstreamNodeIds = new Set<string>();
    const findUpstream = (nId: string) => {
      workflow.edges
        .filter(e => e.target === nId)
        .forEach(e => {
          upstreamNodeIds.add(e.source);
          findUpstream(e.source);
        });
    };
    findUpstream(nodeId);
    
    const result: WorkflowVariable[] = [];
    
    Object.values(variables).forEach(v => {
      if (upstreamNodeIds.has(v.nodeId)) {
        result.push(v);
      }
    });
    
    workflow.nodes.forEach(node => {
      if (upstreamNodeIds.has(node.id) && node.data.outputs) {
        node.data.outputs.forEach(output => {
          const varName = `${node.data.label.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${output.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
          const exists = result.some(v => v.nodeId === node.id && v.outputKey === output.id);
          
          if (!exists) {
            result.push({
              id: `dynamic_${node.id}_${output.id}`,
              name: varName,
              displayName: `${node.data.label} - ${output.name}`,
              nodeId: node.id,
              nodeName: node.data.label,
              outputKey: output.id,
              dataType: String(output.dataType || output.data_type || 'Any'),
            });
          }
        });
      }
    });
    
    return result;
  }, [propVariables, nodeId, workflow, variables]);

  const nodeNames = useMemo(() => {
    const names = new Set<string>();
    allAvailableVariables.forEach(v => names.add(v.nodeName));
    return Array.from(names);
  }, [allAvailableVariables]);

  const dataTypes = useMemo(() => {
    const types = new Set<string>();
    allAvailableVariables.forEach(v => types.add(v.dataType));
    return Array.from(types);
  }, [allAvailableVariables]);

  const filteredVariables = useMemo(() => {
    return allAvailableVariables.filter((v) => {
      const matchesSearch = searchTerm === '' || 
        v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.nodeName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = !filterType || v.dataType === filterType;
      const matchesNode = !filterNode || v.nodeName === filterNode;
      return matchesSearch && matchesType && matchesNode;
    });
  }, [allAvailableVariables, searchTerm, filterType, filterNode]);

  // 计算菜单位置
  const updateMenuPosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const menuHeight = 400;
    
    // 判断是否应该向上显示
    const spaceBelow = viewportHeight - rect.bottom;
    const showAbove = spaceBelow < menuHeight && rect.top > menuHeight;
    
    setMenuPosition({
      top: showAbove ? rect.top - menuHeight - 4 : rect.bottom + 4,
      left: rect.left,
      width: Math.max(rect.width, 320),
    });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    
    onChange(newValue);

    const textBeforeCursor = newValue.slice(0, cursorPos);
    const lastHashIndex = textBeforeCursor.lastIndexOf('#');
    
    if (lastHashIndex !== -1) {
      const textAfterHash = textBeforeCursor.slice(lastHashIndex + 1);
      if (!textAfterHash.includes(' ') && !textAfterHash.includes('\n')) {
        setSearchTerm(textAfterHash);
        setShowMenu(true);
        setSelectedIndex(0);
        updateMenuPosition();
        return;
      }
    }
    
    setShowMenu(false);
    setSearchTerm('');
  };

  const handleOpenMenu = () => {
    updateMenuPosition();
    setShowMenu(true);
    setSearchTerm('');
    setSelectedIndex(0);
    setTimeout(() => searchInputRef.current?.focus(), 50);
  };

  const insertVariable = useCallback((variable: WorkflowVariable) => {
    if (!inputRef.current) return;
    
    const cursorPos = inputRef.current.selectionStart || 0;
    const textBeforeCursor = value.slice(0, cursorPos);
    const textAfterCursor = value.slice(cursorPos);
    
    const lastHashIndex = textBeforeCursor.lastIndexOf('#');
    
    let newValue: string;
    if (lastHashIndex !== -1 && !textBeforeCursor.slice(lastHashIndex + 1).includes(' ')) {
      newValue = textBeforeCursor.slice(0, lastHashIndex) + `#${variable.name}` + textAfterCursor;
    } else {
      newValue = textBeforeCursor + `#${variable.name}` + textAfterCursor;
    }
    
    onChange(newValue);
    setShowMenu(false);
    setSearchTerm('');
    setFilterType(null);
    setFilterNode(null);
    inputRef.current.focus();
  }, [value, onChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showMenu) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filteredVariables.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredVariables[selectedIndex]) {
          insertVariable(filteredVariables[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowMenu(false);
        setFilterType(null);
        setFilterNode(null);
        break;
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current && 
        !menuRef.current.contains(e.target as Node) &&
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredVariables.length]);

  // 监听滚动和窗口变化
  useEffect(() => {
    if (showMenu) {
      const handleScroll = () => updateMenuPosition();
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleScroll);
      return () => {
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleScroll);
      };
    }
  }, [showMenu, updateMenuPosition]);

  const inputClassName = `
    w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg
    focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
    text-sm font-mono bg-white
    ${className}
  `;

  const getTypeConfig = (type: string) => dataTypeConfig[type] || dataTypeConfig.Any;

  // 变量菜单组件
  const VariableMenu = () => (
    <div
      ref={menuRef}
      className="fixed bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden"
      style={{
        top: menuPosition.top,
        left: menuPosition.left,
        width: menuPosition.width,
        zIndex: 99999,
        maxHeight: 400,
      }}
    >
      {/* 头部 */}
      <div className="p-3 bg-gradient-to-r from-purple-50 to-indigo-50 border-b">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
            <Icon name="Variable" size={16} className="text-purple-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-800">选择变量</h3>
            <p className="text-xs text-gray-500">{allAvailableVariables.length} 个可用</p>
          </div>
        </div>
        
        {/* 搜索框 */}
        <div className="relative">
          <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="搜索变量..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* 筛选器 */}
      {(dataTypes.length > 1 || nodeNames.length > 1) && (
        <div className="p-2 border-b bg-gray-50 flex flex-wrap gap-2">
          {dataTypes.length > 1 && (
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-xs text-gray-500">类型:</span>
              <button
                onClick={() => setFilterType(null)}
                className={`px-2 py-0.5 text-xs rounded-full ${!filterType ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                全部
              </button>
              {dataTypes.slice(0, 4).map(type => {
                const config = getTypeConfig(type);
                return (
                  <button
                    key={type}
                    onClick={() => setFilterType(filterType === type ? null : type)}
                    className={`px-2 py-0.5 text-xs rounded-full flex items-center gap-1 ${filterType === type ? `${config.bgColor} ${config.color}` : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    {type}
                  </button>
                );
              })}
            </div>
          )}
          
          {nodeNames.length > 1 && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500">节点:</span>
              <select
                value={filterNode || ''}
                onChange={(e) => setFilterNode(e.target.value || null)}
                className="text-xs px-2 py-0.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                <option value="">全部</option>
                {nodeNames.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* 变量列表 */}
      <div className="max-h-56 overflow-y-auto">
        {filteredVariables.length > 0 ? (
          <div className="py-1">
            {filteredVariables.map((variable, index) => {
              const config = getTypeConfig(variable.dataType);
              return (
                <button
                  key={variable.id}
                  onClick={() => insertVariable(variable)}
                  className={`w-full px-3 py-2 text-left flex items-center gap-3 transition-colors ${index === selectedIndex ? 'bg-purple-50' : 'hover:bg-gray-50'}`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${config.bgColor}`}>
                    <Icon name={config.icon} size={14} className={config.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-purple-600 font-medium truncate">#{variable.name}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${config.bgColor} ${config.color}`}>{variable.dataType}</span>
                    </div>
                    <div className="text-xs text-gray-500 truncate">{variable.nodeName}</div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="p-6 text-center">
            <Icon name="SearchX" size={24} className="text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">没有找到变量</p>
            <p className="text-xs text-gray-400 mt-1">
              {allAvailableVariables.length === 0 ? '请先连接上游节点' : '调整搜索条件'}
            </p>
          </div>
        )}
      </div>

      {/* 底部提示 */}
      <div className="p-2 border-t bg-gray-50 flex items-center justify-between text-xs text-gray-500">
        <span>↑↓ 导航 · Enter 选择</span>
        <span>输入 # 快速插入</span>
      </div>
    </div>
  );

  return (
    <div ref={containerRef} className="relative">
      {multiline ? (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={rows}
          className={inputClassName}
        />
      ) : (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={inputClassName}
        />
      )}

      <button
        type="button"
        onClick={handleOpenMenu}
        className="absolute right-2 top-2 p-1.5 text-gray-400 hover:text-purple-500 hover:bg-purple-50 rounded-md transition-colors"
        title="选择变量 (#)"
      >
        <Icon name="Variable" size={16} />
      </button>

      {/* 使用 Portal 渲染菜单到 body */}
      {showMenu && createPortal(<VariableMenu />, document.body)}
    </div>
  );
};

export default VariableInput;
