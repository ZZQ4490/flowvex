// src/utils/type-converter.ts
// 类型转换器 - 在不同类型之间转换数据

import { DataType } from '../types/data-types';

type ConversionFunction = (value: any) => any;

// 类型转换映射表
export const CONVERSION_MAP: Record<string, Record<string, ConversionFunction>> = {
  'Number': {
    'String': (v) => String(v),
    'Boolean': (v) => v !== 0,
  },
  'String': {
    'Number': (v) => {
      const num = parseFloat(v);
      if (isNaN(num)) throw new Error(`无法将 "${v}" 转换为数字`);
      return num;
    },
    'Boolean': (v) => v.toLowerCase() === 'true' || v === '1',
    'Array': (v) => v.split(',').map((s: string) => s.trim()),
  },
  'Boolean': {
    'String': (v) => String(v),
    'Number': (v) => v ? 1 : 0,
  },
  'Object': {
    'String': (v) => JSON.stringify(v, null, 2),
    'Array': (v) => Object.values(v),
  },
  'Array': {
    'String': (v) => v.join(', '),
    'Object': (v) => v.reduce((acc: any, item: any, i: number) => {
      acc[i] = item;
      return acc;
    }, {}),
  },
};

// 获取转换路径
export function getConversionPath(source: DataType, target: DataType): string | null {
  const sourceKey = typeof source === 'string' ? source : source.type;
  const targetKey = typeof target === 'string' ? target : target.type;
  
  if (CONVERSION_MAP[sourceKey]?.[targetKey]) {
    return `${sourceKey}→${targetKey}`;
  }
  return null;
}

// 转换数据
export function convertData(value: any, source: DataType, target: DataType): any {
  // 如果目标是 Any，直接返回
  if (target === 'Any') {
    return value;
  }
  
  // 如果源是 Any，尝试推断类型
  if (source === 'Any') {
    return value;
  }
  
  const sourceKey = typeof source === 'string' ? source : source.type;
  const targetKey = typeof target === 'string' ? target : target.type;
  
  // 相同类型不需要转换
  if (sourceKey === targetKey) {
    return value;
  }
  
  const converter = CONVERSION_MAP[sourceKey]?.[targetKey];
  if (!converter) {
    throw new Error(`不支持从 ${sourceKey} 转换到 ${targetKey}`);
  }
  
  return converter(value);
}

// 安全转换数据（不抛出异常）
export function safeConvertData(value: any, source: DataType, target: DataType): { success: boolean; value?: any; error?: string } {
  try {
    const converted = convertData(value, source, target);
    return { success: true, value: converted };
  } catch (e) {
    return { 
      success: false, 
      error: e instanceof Error ? e.message : '转换失败' 
    };
  }
}

// 检查是否支持转换
export function supportsConversion(source: DataType, target: DataType): boolean {
  return getConversionPath(source, target) !== null;
}

// 获取所有支持的转换目标类型
export function getSupportedConversions(source: DataType): string[] {
  const sourceKey = typeof source === 'string' ? source : source.type;
  const conversions = CONVERSION_MAP[sourceKey];
  return conversions ? Object.keys(conversions) : [];
}
