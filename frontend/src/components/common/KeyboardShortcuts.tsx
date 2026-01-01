import React from 'react';
import { Icon } from '../Icon';

interface KeyboardShortcutsProps {
  onClose: () => void;
}

export const KeyboardShortcuts: React.FC<KeyboardShortcutsProps> = ({ onClose }) => {
  const shortcuts = [
    { category: '通用', items: [
      { keys: ['Ctrl', 'S'], description: '保存工作流' },
      { keys: ['Ctrl', 'Z'], description: '撤销' },
      { keys: ['Ctrl', 'Y'], description: '重做' },
      { keys: ['Delete'], description: '删除选中节点' },
      { keys: ['Escape'], description: '取消选择' },
    ]},
    { category: '画布操作', items: [
      { keys: ['滚轮'], description: '缩放画布' },
      { keys: ['拖拽空白'], description: '平移画布' },
      { keys: ['双击节点'], description: '编辑节点' },
      { keys: ['右键'], description: '打开上下文菜单' },
    ]},
    { category: '节点操作', items: [
      { keys: ['拖拽'], description: '从侧边栏添加节点' },
      { keys: ['双击侧边栏'], description: '在画布中心添加节点' },
      { keys: ['Ctrl', '拖拽'], description: '复制节点' },
    ]},
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-[500px] max-h-[80vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon name="Keyboard" size={20} className="text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">键盘快捷键</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Icon name="X" size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {shortcuts.map(section => (
            <div key={section.category}>
              <h3 className="text-sm font-medium text-gray-500 mb-3">{section.category}</h3>
              <div className="space-y-2">
                {section.items.map((item, index) => (
                  <div key={index} className="flex items-center justify-between py-2">
                    <span className="text-sm text-gray-700">{item.description}</span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((key, keyIndex) => (
                        <React.Fragment key={keyIndex}>
                          {keyIndex > 0 && <span className="text-gray-400 text-xs">+</span>}
                          <kbd className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 border border-gray-200 rounded">
                            {key}
                          </kbd>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <p className="text-xs text-gray-500 text-center">
            按 <kbd className="px-1.5 py-0.5 text-xs bg-gray-200 rounded">?</kbd> 随时查看快捷键
          </p>
        </div>
      </div>
    </div>
  );
};
