// src/utils/type-checker.ts
// 类型检查器 - 检查类型兼容性

import { DataType, isComplexType, isAnyType } from '../types/data-types';

export interface TypeCheckResult {
  compatible: boolean;
  requiresConversion: boolean;
  conversionPath?: string;
  errorMessage?: string;
}

// 深度比较两个类型是否相等
function deepEqual(a: DataType, b: DataType): boolean {
  if (typeof a === 'string' && typeof b === 'string') {
    return a === b;
  }
  
  if (typeof a === 'object' && typeof b === 'object') {
    if (a.type !== b.type) return false;
    
    switch (a.type) {
      case 'Array':
        return deepEqual(a.itemType, (b as typeof a).itemType);
      case 'Object':
        // 简化比较：只比较类型名
        return true;
      case 'Union':
        const bUnion = b as typeof a;
        if (a.types.length !== bUnion.types.length) return false;
        return a.types.every((t, i) => deepEqual(t, bUnion.types[i]));
      case 'Optional':
        return deepEqual(a.innerType, (b as typeof a).innerType);
      default:
        return false;
    }
  }
  
  return false;
}

// 获取转换路径
export function getConversionPath(source: DataType, target: DataType): string | null {
  const sourceKey = typeof source === 'string' ? source : source.type;
  const targetKey = typeof target === 'string' ? target : target.type;
  
  // 定义可转换的类型对
  const conversions: Record<string, string[]> = {
    'Number': ['String', 'Boolean'],
    'String': ['Number', 'Boolean', 'Array'],
    'Boolean': ['String', 'Number'],
    'Object': ['String', 'Array'],
    'Array': ['String', 'Object'],
  };
  
  if (conversions[sourceKey]?.includes(targetKey)) {
    return `${sourceKey}→${targetKey}`;
  }
  
  return null;
}

// 检查类型兼容性
export function isTypeCompatible(source: DataType, target: DataType): TypeCheckResult {
  // Any 类型兼容所有类型
  if (isAnyType(target) || isAnyType(source)) {
    return { compatible: true, requiresConversion: false };
  }
  
  // 相同类型直接兼容
  if (deepEqual(source, target)) {
    return { compatible: true, requiresConversion: false };
  }
  
  // 检查是否可以转换
  const conversionPath = getConversionPath(source, target);
  if (conversionPath) {
    return { 
      compatible: true, 
      requiresConversion: true,
      conversionPath 
    };
  }
  
  // 检查 Union 类型
  if (isComplexType(target) && target.type === 'Union') {
    for (const unionType of target.types) {
      const result = isTypeCompatible(source, unionType);
      if (result.compatible) {
        return result;
      }
    }
  }
  
  // 检查 Optional 类型
  if (isComplexType(target) && target.type === 'Optional') {
    return isTypeCompatible(source, target.innerType);
  }
  
  // 检查 Array 类型
  if (isComplexType(source) && source.type === 'Array' &&
      isComplexType(target) && target.type === 'Array') {
    return isTypeCompatible(source.itemType, target.itemType);
  }
  
  // Null 可以赋值给 Optional 类型
  if (source === 'Null' && isComplexType(target) && target.type === 'Optional') {
    return { compatible: true, requiresConversion: false };
  }
  
  return {
    compatible: false,
    requiresConversion: false,
    errorMessage: `类型不兼容: ${formatType(source)} 无法连接到 ${formatType(target)}`
  };
}

// 格式化类型为可读字符串
export function formatType(dataType: DataType): string {
  if (typeof dataType === 'string') {
    return dataType;
  }
  
  switch (dataType.type) {
    case 'Array':
      return `Array<${formatType(dataType.itemType)}>`;
    case 'Object':
      if (dataType.properties) {
        const props = Object.entries(dataType.properties)
          .map(([k, v]) => `${k}: ${formatType(v)}`)
          .join(', ');
        return `{ ${props} }`;
      }
      return 'Object';
    case 'Union':
      return dataType.types.map(formatType).join(' | ');
    case 'Optional':
      return `${formatType(dataType.innerType)}?`;
    default:
      return 'Unknown';
  }
}

// 检查是否可以转换
export function canConvert(source: DataType, target: DataType): boolean {
  return getConversionPath(source, target) !== null;
}
