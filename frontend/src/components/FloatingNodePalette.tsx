import React, { useState } from 'react';
import { nodeCategories } from '../constants/nodeTemplates';
import { NodeTemplate } from '../types/workflow';
import { Icon } from './Icon';

interface FloatingNodePaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onDragStart: (event: React.DragEvent, template: NodeTemplate) => void;
  onNodeDoubleClick?: (template: NodeTemplate) => void;
}

export const FloatingNodePalette: React.FC<FloatingNodePaletteProps> = ({ 
  isOpen, 
  onClose, 
  onDragStart, 
  onNodeDoubleClick,
}) => {
  const [expandedCategories, setExpandedCategories] = useState<string[]>(
    nodeCategories.map(c => c.id)
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [draggingNode, setDraggingNode] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const filteredCategories = nodeCategories.map(category => ({
    ...category,
    nodes: category.nodes.filter(
      node =>
        node.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        node.description.toLowerCase().includes(searchTerm.toLowerCase())
    ),
  })).filter(category => category.nodes.length > 0);

  const handleDragStart = (e: React.DragEvent, node: NodeTemplate) => {
    setDraggingNode(`${node.type}-${node.label}`);
    
    const dragImage = document.createElement('div');
    dragImage.className = 'fixed pointer-events-none bg-white rounded-lg shadow-xl border-2 border-primary-400 px-3 py-2 flex items-center gap-2';
    dragImage.style.cssText = 'position: absolute; top: -1000px; left: -1000px;';
    dragImage.innerHTML = `
      <div class="w-6 h-6 rounded flex items-center justify-center" style="background-color: ${node.color}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
        </svg>
      </div>
      <span class="font-medium text-sm text-gray-800">${node.label}</span>
    `;
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 50, 25);
    
    setTimeout(() => {
      document.body.removeChild(dragImage);
    }, 0);
    
    onDragStart(e, node);
  };

  const handleDragEnd = () => {
    setDraggingNode(null);
  };

  return (
    <div className="absolute left-4 top-4 z-30 w-72 max-h-[calc(100%-32px)] bg-white rounded-xl shadow-xl border border-gray-200 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Icon name="Layers" size={18} className="text-primary-500" />
          节点
        </h2>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
        >
          <Icon name="X" size={16} />
        </button>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-gray-100 flex-shrink-0">
        <div className="relative">
          <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="搜索节点..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
          />
        </div>
      </div>

      {/* Node Categories */}
      <div className="flex-1 overflow-y-auto p-2">
        {filteredCategories.map(category => (
          <div key={category.id} className="mb-1">
            <button
              onClick={() => toggleCategory(category.id)}
              className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <span className="flex items-center gap-2">
                <Icon name={category.icon} size={16} className="text-gray-400" />
                <span>{category.name}</span>
                <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-md">
                  {category.nodes.length}
                </span>
              </span>
              <Icon 
                name={expandedCategories.includes(category.id) ? 'ChevronDown' : 'ChevronRight'} 
                size={16} 
                className="text-gray-400"
              />
            </button>

            {expandedCategories.includes(category.id) && (
              <div className="mt-1 space-y-0.5 ml-1">
                {category.nodes.map(node => (
                  <div
                    key={`${node.type}-${node.label}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, node)}
                    onDragEnd={handleDragEnd}
                    onDoubleClick={() => onNodeDoubleClick?.(node)}
                    className={`flex items-center gap-2.5 px-3 py-2 text-sm text-gray-600 bg-gray-50/50 hover:bg-primary-50 hover:text-primary-700 rounded-lg cursor-grab active:cursor-grabbing transition-all border border-transparent hover:border-primary-200 ${
                      draggingNode === `${node.type}-${node.label}` ? 'opacity-50 scale-95' : ''
                    }`}
                  >
                    <div 
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm"
                      style={{ backgroundColor: node.color }}
                    >
                      <Icon name={node.icon} size={14} color="white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate text-gray-800">{node.label}</div>
                      <div className="text-xs text-gray-400 truncate">{node.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-100 bg-gray-50/50 flex-shrink-0">
        <p className="text-xs text-gray-500 text-center flex items-center justify-center gap-1.5">
          <Icon name="MousePointer" size={12} />
          拖拽到画布 · 双击快速添加
        </p>
      </div>
    </div>
  );
};
