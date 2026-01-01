import React, { useEffect, useRef, useState } from 'react';
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

interface SubMenuState {
  categoryId: string | null;
  x: number;
  y: number;
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
  const [subMenu, setSubMenu] = useState<SubMenuState>({ categoryId: null, x: 0, y: 0 });
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, [onClose]);

  const handleAddNode = (template: NodeTemplate) => {
    onAddNode(template, canvasPosition);
    onClose();
  };

  const handleCategoryHover = (categoryId: string, event: React.MouseEvent) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    
    hoverTimeoutRef.current = setTimeout(() => {
      setSubMenu({
        categoryId,
        x: rect.right,
        y: rect.top,
      });
    }, 100);
  };

  const handleCategoryLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
  };

  const handleSubMenuEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
  };

  const handleSubMenuLeave = () => {
    setSubMenu({ categoryId: null, x: 0, y: 0 });
  };

  // 计算菜单位置，确保不超出屏幕
  const menuWidth = 220;
  const subMenuWidth = 240;
  
  let menuLeft = x;
  let openDirection: 'right' | 'left' = 'right';
  
  // 检查主菜单是否超出右边界
  if (x + menuWidth > window.innerWidth) {
    menuLeft = x - menuWidth;
  }
  
  // 检查子菜单方向
  if (x + menuWidth + subMenuWidth > window.innerWidth) {
    openDirection = 'left';
  }

  // 检查是否超出下边界
  let menuTop = y;
  if (y + 400 > window.innerHeight) {
    menuTop = Math.max(10, window.innerHeight - 400);
  }

  // 计算子菜单位置
  const getSubMenuStyle = (): React.CSSProperties => {
    let subMenuLeft = subMenu.x;
    let subMenuTop = subMenu.y;
    
    if (openDirection === 'left') {
      subMenuLeft = menuLeft - subMenuWidth - 4;
    } else {
      subMenuLeft = subMenu.x + 4;
    }
    
    // 确保子菜单不超出下边界
    const subMenuHeight = 300;
    if (subMenuTop + subMenuHeight > window.innerHeight) {
      subMenuTop = Math.max(10, window.innerHeight - subMenuHeight);
    }
    
    return {
      left: subMenuLeft,
      top: subMenuTop,
    };
  };

  const currentCategory = nodeCategories.find(c => c.id === subMenu.categoryId);

  return (
    <div ref={menuRef}>
      {/* Main Menu */}
      <div
        className="fixed bg-white rounded-xl shadow-2xl border border-gray-200 py-2 z-50 min-w-[220px]"
        style={{ left: menuLeft, top: menuTop }}
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
          <div
            key={category.id}
            onMouseEnter={(e) => handleCategoryHover(category.id, e)}
            onMouseLeave={handleCategoryLeave}
            className={`relative px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center justify-between transition-colors cursor-pointer ${
              subMenu.categoryId === category.id ? 'bg-gray-50' : ''
            }`}
          >
            <span className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-gray-100 flex items-center justify-center">
                <Icon name={category.icon} size={12} className="text-gray-500" />
              </div>
              {category.name}
              <span className="text-xs text-gray-400">({category.nodes.length})</span>
            </span>
            <Icon 
              name="ChevronRight" 
              size={14}
              className="text-gray-400"
            />
          </div>
        ))}
      </div>

      {/* Sub Menu - Slide Out */}
      {subMenu.categoryId && currentCategory && (
        <div
          className="fixed bg-white rounded-xl shadow-2xl border border-gray-200 py-2 z-50 min-w-[240px] max-h-[300px] overflow-y-auto animate-in fade-in slide-in-from-left-2 duration-150"
          style={getSubMenuStyle()}
          onMouseEnter={handleSubMenuEnter}
          onMouseLeave={handleSubMenuLeave}
        >
          <div className="px-3 py-1.5 text-xs text-gray-400 font-medium border-b border-gray-100 mb-1">
            {currentCategory.name}
          </div>
          {currentCategory.nodes.map(node => (
            <button
              key={`${node.type}-${node.label}`}
              onClick={() => handleAddNode(node)}
              className="w-full px-3 py-2 text-left text-sm text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2 transition-colors"
            >
              <div 
                className="w-7 h-7 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0"
                style={{ backgroundColor: node.color }}
              >
                <Icon name={node.icon} size={14} color="white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{node.label}</div>
                <div className="text-xs text-gray-400 truncate">{node.description}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
