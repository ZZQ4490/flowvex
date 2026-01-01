// src/components/nodes/TypedPort.tsx
// 类型化端口组件 - 根据类型显示不同颜色和样式

import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';
import { Port, getPortDataType } from '../../types/workflow';
import { getTypeColor } from '../../types/data-types';
import { formatType } from '../../utils/type-checker';

interface TypedPortProps {
  port: Port;
  type: 'source' | 'target';
  position: Position;
  isConnected?: boolean;
  nodeId?: string;
}

export const TypedPort: React.FC<TypedPortProps> = ({
  port,
  type,
  position,
  isConnected = false,
  nodeId,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  const dataType = getPortDataType(port);
  const color = port.color || getTypeColor(dataType);
  const isRequired = port.required ?? true;
  
  // 计算提示框位置
  const tooltipPosition = position === Position.Left 
    ? { right: '100%', marginRight: '8px' }
    : { left: '100%', marginLeft: '8px' };

  return (
    <div 
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <Handle
        type={type}
        position={position}
        id={port.id}
        style={{
          background: isConnected ? color : 'transparent',
          border: `2px solid ${color}`,
          width: 12,
          height: 12,
          borderRadius: isRequired ? '50%' : '4px',
          transition: 'all 0.2s ease',
        }}
        className="hover:scale-125"
      />
      
      {/* 悬停提示 */}
      {showTooltip && (
        <div 
          className="absolute z-50 bg-gray-800 text-white text-xs rounded px-2 py-1.5 whitespace-nowrap shadow-lg"
          style={{
            ...tooltipPosition,
            top: '50%',
            transform: 'translateY(-50%)',
          }}
        >
          <div className="font-medium">{port.name}</div>
          <div 
            className="text-gray-300 flex items-center gap-1 mt-0.5"
            style={{ color: color }}
          >
            <span 
              className="w-2 h-2 rounded-full inline-block"
              style={{ backgroundColor: color }}
            />
            {formatType(dataType)}
          </div>
          {port.description && (
            <div className="text-gray-400 mt-1 max-w-[200px] break-words">
              {port.description}
            </div>
          )}
          {!isRequired && (
            <div className="text-yellow-400 mt-1 text-[10px]">可选</div>
          )}
          {port.multiple && (
            <div className="text-blue-400 mt-0.5 text-[10px]">支持多连接</div>
          )}
        </div>
      )}
    </div>
  );
};

// 端口列表组件 - 用于节点内显示多个端口
interface TypedPortListProps {
  ports: Port[];
  type: 'source' | 'target';
  position: Position;
  connectedPorts?: Set<string>;
  nodeId?: string;
}

export const TypedPortList: React.FC<TypedPortListProps> = ({
  ports,
  type,
  position,
  connectedPorts = new Set(),
  nodeId,
}) => {
  if (!ports || ports.length === 0) return null;
  
  return (
    <div className="flex flex-col gap-2">
      {ports.filter(p => !p.hidden).map((port) => (
        <TypedPort
          key={port.id}
          port={port}
          type={type}
          position={position}
          isConnected={connectedPorts.has(port.id)}
          nodeId={nodeId}
        />
      ))}
    </div>
  );
};

export default TypedPort;
