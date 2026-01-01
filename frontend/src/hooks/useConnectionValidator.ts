// src/hooks/useConnectionValidator.ts
// 连接验证 Hook - 在连接时检查类型兼容性

import { useCallback } from 'react';
import { Connection, useReactFlow } from 'reactflow';
import { isTypeCompatible, formatType } from '../utils/type-checker';
import { Port, getPortDataType } from '../types/workflow';

export interface ValidationResult {
  valid: boolean;
  requiresConversion: boolean;
  conversionPath?: string;
  errorMessage?: string;
  sourceType?: string;
  targetType?: string;
}

export interface ConnectionValidatorOptions {
  onWarning?: (message: string) => void;
  onError?: (message: string) => void;
  allowConversion?: boolean;
}

export function useConnectionValidator(options: ConnectionValidatorOptions = {}) {
  const { getNode } = useReactFlow();
  const { onWarning, onError, allowConversion = true } = options;
  
  const validateConnection = useCallback((connection: Connection): ValidationResult => {
    // 检查连接的基本有效性
    if (!connection.source || !connection.target) {
      return { valid: false, requiresConversion: false, errorMessage: '无效的连接' };
    }
    
    // 不允许自连接
    if (connection.source === connection.target) {
      return { valid: false, requiresConversion: false, errorMessage: '不能连接到自身' };
    }
    
    const sourceNode = getNode(connection.source);
    const targetNode = getNode(connection.target);
    
    if (!sourceNode || !targetNode) {
      return { valid: false, requiresConversion: false, errorMessage: '节点不存在' };
    }
    
    // 查找源端口和目标端口
    const sourcePort = sourceNode.data.outputs?.find(
      (p: Port) => p.id === connection.sourceHandle
    );
    const targetPort = targetNode.data.inputs?.find(
      (p: Port) => p.id === connection.targetHandle
    );
    
    if (!sourcePort || !targetPort) {
      // 如果找不到端口定义，默认允许连接（向后兼容）
      return { valid: true, requiresConversion: false };
    }
    
    const sourceType = getPortDataType(sourcePort);
    const targetType = getPortDataType(targetPort);
    
    // 检查类型兼容性
    const result = isTypeCompatible(sourceType, targetType);
    
    if (!result.compatible) {
      const errorMsg = result.errorMessage || 
        `类型不兼容: ${formatType(sourceType)} 无法连接到 ${formatType(targetType)}`;
      onError?.(errorMsg);
      return { 
        valid: false, 
        requiresConversion: false, 
        errorMessage: errorMsg,
        sourceType: formatType(sourceType),
        targetType: formatType(targetType),
      };
    }
    
    if (result.requiresConversion) {
      if (!allowConversion) {
        const errorMsg = `需要类型转换: ${formatType(sourceType)} → ${formatType(targetType)}`;
        onError?.(errorMsg);
        return { 
          valid: false, 
          requiresConversion: true, 
          errorMessage: errorMsg,
          sourceType: formatType(sourceType),
          targetType: formatType(targetType),
        };
      }
      
      const warningMsg = `类型将自动转换: ${formatType(sourceType)} → ${formatType(targetType)}`;
      onWarning?.(warningMsg);
      return { 
        valid: true, 
        requiresConversion: true,
        conversionPath: result.conversionPath,
        sourceType: formatType(sourceType),
        targetType: formatType(targetType),
      };
    }
    
    return { 
      valid: true, 
      requiresConversion: false,
      sourceType: formatType(sourceType),
      targetType: formatType(targetType),
    };
  }, [getNode, onWarning, onError, allowConversion]);
  
  // 检查是否可以开始连接（用于 isValidConnection）
  const canConnect = useCallback((connection: Connection): boolean => {
    const result = validateConnection(connection);
    return result.valid;
  }, [validateConnection]);
  
  return { validateConnection, canConnect };
}

export default useConnectionValidator;
