import React, { useEffect, useRef } from 'react';
import { Icon } from './Icon';
import { nodeCategories } from '../constants/nodeTemplates';
import { NodeTemplate } from '../types/workflow';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onAddNode: (template: NodeTemplate, position: { x: number; y: number }) => void;
  onDelete?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onMergeNodes?: () => void;
  onAutoLayout?: () => void;
  showNodeOptions?: boolean;
  selectedCount?: number;
  canvasPosition: { x: number; y: number };
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  onClose,
  onAddNode,
  onDelete,
  onCopy,
  onPaste,
  onMergeNodes,
  onAutoLayout,
  showNodeOptions = false,
  selectedCount = 0,
  canvasPosition,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [expandedCategory, setExpandedCategory] = React.useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const handleAddNode = (template: NodeTemplate) => {
    onAddNode(template, canvasPosition);
    onClose();
  };

  // 计算菜单位置，确保不超出屏幕
  const menuStyle: React.CSSProperties = {
    left: x,
    top: y,
  };

  // 检查是否超出右边界
  if (x + 220 > window.innerWidth) {
    menuStyle.left = x - 220;
  }

  // 检查是否超出下边界
  if (y + 400 > window.innerHeight) {
    menuStyle.top = Math.max(10, window.innerHeight - 400);
  }

  return (
    <div
      ref={menuRef}
      className="fixed bg-white rounded-xl shadow-2xl border border-gray-200 py-2 z-50 min-w-[220px] max-h-[80vh] overflow-y-auto"
      style={menuStyle}
    >
      {/* 多选合并按钮 */}
      {selectedCount >= 2 && onMergeNodes && (
        <button
          onClick={() => { onMergeNodes(); }}
          className="w-full px-3 py-2.5 text-left text-sm text-indigo-600 hover:bg-indigo-50 flex items-center gap-2 transition-colors font-medium"
        >
          <Icon name="Layers" size={16} />
          合并到新节点
          <span className="ml-auto text-xs text-indigo-400">({selectedCount}个)</span>
        </button>
      )}
      
      {/* 单节点操作 */}
      {showNodeOptions && (
        <>
          {onCopy && (
            <button
              onClick={() => { onCopy(); onClose(); }}
              className="w-full px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
            >
              <Icon name="Copy" size={16} />
              复制节点
              <span className="ml-auto text-xs text-gray-400">Ctrl+C</span>
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => { onDelete(); onClose(); }}
              className="w-full px-3 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
            >
              <Icon name="Trash2" size={16} />
              删除节点
              <span className="ml-auto text-xs text-gray-400">Del</span>
            </button>
          )}
          <div className="border-t border-gray-100 my-2" />
        </>
      )}

      {onPaste && (
        <>
          <button
            onClick={() => { onPaste(); onClose(); }}
            className="w-full px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
          >
            <Icon name="Clipboard" size={16} />
            粘贴
            <span className="ml-auto text-xs text-gray-400">Ctrl+V</span>
          </button>
          <div className="border-t border-gray-100 my-2" />
        </>
      )}

      {/* 整理排版按钮 */}
      {onAutoLayout && (
        <>
          <button
            onClick={() => { onAutoLayout(); onClose(); }}
            className="w-full px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
          >
            <Icon name="LayoutGrid" size={16} />
            整理排版
          </button>
          <div className="border-t border-gray-100 my-2" />
        </>
      )}

      <div className="px-3 py-1.5 text-xs text-gray-400 font-medium">添加节点</div>
      
      {nodeCategories.map(category => (
        <div key={category.id}>
          <button
            onClick={() => setExpandedCategory(
              expandedCategory === category.id ? null : category.id
            )}
            className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center justify-between transition-colors"
          >
            <span className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-gray-100 flex items-center justify-center">
                <Icon name={category.icon} size={12} className="text-gray-500" />
              </div>
              {category.name}
              <span className="text-xs text-gray-400">({category.nodes.length})</span>
            </span>
            <Icon 
              name={expandedCategory === category.id ? 'ChevronDown' : 'ChevronRight'} 
              size={14}
              className="text-gray-400"
            />
          </button>
          
          {expandedCategory === category.id && (
            <div className="bg-gray-50 py-1">
              {category.nodes.map(node => (
                <button
                  key={`${node.type}-${node.label}`}
                  onClick={() => handleAddNode(node)}
                  className="w-full px-4 py-2 text-left text-sm text-gray-600 hover:bg-gray-100 flex items-center gap-2 transition-colors"
                >
                  <div 
                    className="w-6 h-6 rounded-lg flex items-center justify-center shadow-sm"
                    style={{ backgroundColor: node.color }}
                  >
                    <Icon name={node.icon} size={12} color="white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="truncate">{node.label}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
