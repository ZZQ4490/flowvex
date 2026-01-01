import React, { useState } from 'react';
import { nodeCategories } from '../constants/nodeTemplates';
import { NodeTemplate } from '../types/workflow';
import { Icon } from './Icon';

interface NodePaletteProps {
  onDragStart: (event: React.DragEvent, template: NodeTemplate) => void;
  onNodeDoubleClick?: (template: NodeTemplate) => void;
}

export const NodePalette: React.FC<NodePaletteProps> = ({ onDragStart, onNodeDoubleClick }) => {
  const [expandedCategories, setExpandedCategories] = useState<string[]>(
    nodeCategories.map(c => c.id)
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [draggingNode, setDraggingNode] = useState<string | null>(null);

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
    
    // Create custom drag image
    const dragImage = document.createElement('div');
    dragImage.className = 'fixed pointer-events-none bg-white rounded-lg shadow-xl border-2 border-blue-400 px-3 py-2 flex items-center gap-2';
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
    
    // Clean up drag image after a short delay
    setTimeout(() => {
      document.body.removeChild(dragImage);
    }, 0);
    
    onDragStart(e, node);
  };

  const handleDragEnd = () => {
    setDraggingNode(null);
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <Icon name="Layers" size={20} />
          节点面板
        </h2>
        <div className="relative">
          <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="搜索节点..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Node Categories */}
      <div className="flex-1 overflow-y-auto p-2">
        {filteredCategories.map(category => (
          <div key={category.id} className="mb-2">
            {/* Category Header */}
            <button
              onClick={() => toggleCategory(category.id)}
              className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
            >
              <span className="flex items-center gap-2">
                <Icon name={category.icon} size={16} />
                <span>{category.name}</span>
              </span>
              <Icon 
                name={expandedCategories.includes(category.id) ? 'ChevronDown' : 'ChevronRight'} 
                size={16} 
                className="text-gray-400"
              />
            </button>

            {/* Category Nodes */}
            {expandedCategories.includes(category.id) && (
              <div className="mt-1 space-y-1">
                {category.nodes.map(node => (
                  <div
                    key={`${node.type}-${node.label}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, node)}
                    onDragEnd={handleDragEnd}
                    onDoubleClick={() => onNodeDoubleClick?.(node)}
                    className={`flex items-center gap-2 px-3 py-2 ml-2 text-sm text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-md cursor-grab active:cursor-grabbing transition-all ${
                      draggingNode === `${node.type}-${node.label}` ? 'opacity-50 scale-95' : ''
                    }`}
                    style={{ borderLeft: `3px solid ${node.color}` }}
                  >
                    <div 
                      className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: node.color }}
                    >
                      <Icon name={node.icon} size={14} color="white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{node.label}</div>
                      <div className="text-xs text-gray-400 truncate">{node.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Help Text */}
      <div className="p-3 border-t border-gray-200 bg-gray-50">
        <p className="text-xs text-gray-500 text-center flex items-center justify-center gap-1">
          <Icon name="MousePointer" size={12} />
          拖拽节点到画布 或 右键添加
        </p>
      </div>
    </div>
  );
};
