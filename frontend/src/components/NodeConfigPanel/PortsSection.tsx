// src/components/NodeConfigPanel/PortsSection.tsx
// 端口区域组件 - 显示输入输出端口状态

import React from 'react';
import { Port, getPortDataType } from '../../types/workflow';
import { getTypeColor } from '../../types/data-types';
import { formatType } from '../../utils/type-checker';
import { Icon } from '../Icon';

export interface PortConnection {
  nodeId: string;
  nodeName: string;
  portId: string;
  portName: string;
}

interface PortsSectionProps {
  title: string;
  ports: Port[];
  connections: Map<string, PortConnection>;
  nodeId: string;
  isInput?: boolean;
  onValueChange?: (portId: string, value: any) => void;
}

export const PortsSection: React.FC<PortsSectionProps> = ({
  title,
  ports,
  connections,
  nodeId,
  isInput = true,
  onValueChange,
}) => {
  if (!ports || ports.length === 0) return null;
  
  return (
    <div className="border-t border-gray-200 pt-4 mt-4">
      <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
        <Icon name={isInput ? 'ArrowDownToLine' : 'ArrowUpFromLine'} size={14} />
        {title}
      </h4>
      <div className="space-y-3">
        {ports.filter(p => !p.hidden).map((port) => {
          const connection = connections.get(port.id);
          const dataType = getPortDataType(port);
          const color = port.color || getTypeColor(dataType);
          const isRequired = port.required ?? true;
          const isConnected = !!connection;
          
          return (
            <div key={port.id} className="flex items-start gap-2">
              {/* 端口指示器 */}
              <div
                className="w-3 h-3 mt-1 flex-shrink-0 transition-all"
                style={{
                  background: isConnected ? color : 'transparent',
                  border: `2px solid ${color}`,
                  borderRadius: isRequired ? '50%' : '4px',
                }}
              />
              
              <div className="flex-1 min-w-0">
                {/* 端口名称和类型 */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-800">
                    {port.name}
                  </span>
                  <span 
                    className="text-xs px-1.5 py-0.5 rounded"
                    style={{ background: `${color}20`, color }}
                  >
                    {formatType(dataType)}
                  </span>
                  {!isRequired && (
                    <span className="text-xs text-gray-400">可选</span>
                  )}
                  {port.multiple && (
                    <span className="text-xs text-blue-400">多连接</span>
                  )}
                </div>
                
                {/* 端口描述 */}
                {port.description && (
                  <p className="text-xs text-gray-500 mt-0.5">{port.description}</p>
                )}
                
                {/* 连接状态或输入框 */}
                {isInput ? (
                  // 输入端口
                  connection ? (
                    <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <Icon name="Link" size={10} className="text-green-500" />
                      <span>来自: </span>
                      <span className="font-medium text-gray-700">
                        {connection.nodeName}
                      </span>
                      <span className="text-gray-400">.</span>
                      <span className="text-gray-600">{connection.portName}</span>
                    </div>
                  ) : onValueChange ? (
                    <input
                      type="text"
                      className="mt-1 w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder={port.placeholder || `输入 ${port.name}`}
                      defaultValue={port.defaultValue}
                      onChange={(e) => onValueChange(port.id, e.target.value)}
                    />
                  ) : (
                    <div className={`text-xs mt-1 flex items-center gap-1 ${isRequired ? 'text-yellow-600' : 'text-gray-400'}`}>
                      {isRequired && <Icon name="AlertCircle" size={10} />}
                      <span>{isRequired ? '未连接 (必需)' : '未连接'}</span>
                    </div>
                  )
                ) : (
                  // 输出端口
                  <>
                    {connection && (
                      <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <Icon name="Link" size={10} className="text-blue-500" />
                        <span>连接到: </span>
                        <span className="font-medium text-gray-700">
                          {connection.nodeName}
                        </span>
                      </div>
                    )}
                    <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                      <Icon name="Hash" size={10} />
                      <span className="font-mono">
                        #node_{nodeId.slice(0, 8)}_{port.id}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// 简化版端口状态显示
interface PortStatusProps {
  port: Port;
  isConnected: boolean;
  connectionInfo?: PortConnection;
}

export const PortStatus: React.FC<PortStatusProps> = ({
  port,
  isConnected,
  connectionInfo,
}) => {
  const dataType = getPortDataType(port);
  const color = port.color || getTypeColor(dataType);
  const isRequired = port.required ?? true;
  
  return (
    <div className="flex items-center gap-2 text-sm">
      <div
        className="w-2.5 h-2.5"
        style={{
          background: isConnected ? color : 'transparent',
          border: `2px solid ${color}`,
          borderRadius: isRequired ? '50%' : '2px',
        }}
      />
      <span className="text-gray-700">{port.name}</span>
      {isConnected && connectionInfo && (
        <span className="text-xs text-gray-400">
          ← {connectionInfo.nodeName}
        </span>
      )}
      {!isConnected && isRequired && (
        <span className="text-xs text-yellow-500">未连接</span>
      )}
    </div>
  );
};

export default PortsSection;
