// src/types/data-types.ts
// 增强类型系统 - 数据类型定义

// 基础类型
export type PrimitiveType = 'String' | 'Number' | 'Boolean' | 'Null';

// 复合类型
export interface ArrayType {
  type: 'Array';
  itemType: DataType;
}

export interface ObjectType {
  type: 'Object';
  properties?: Record<string, DataType>;
}

export interface UnionType {
  type: 'Union';
  types: DataType[];
}

export interface OptionalType {
  type: 'Optional';
  innerType: DataType;
}

export type ComplexType = ArrayType | ObjectType | UnionType | OptionalType;

// 领域特定类型
export type DomainType = 
  | 'BrowserContext'     // 浏览器上下文
  | 'HTMLElement'        // DOM 元素引用
  | 'HTTPResponse'       // HTTP 响应
  | 'FileHandle'         // 文件句柄
  | 'DatabaseConnection' // 数据库连接
  | 'AIResponse'         // AI 响应
  | 'Tool'               // Agent 工具定义
  | 'Resource'           // Agent 资源
  | 'Rule';              // Agent 规则

// 完整类型定义
export type DataType = PrimitiveType | ComplexType | DomainType | 'Any';

// 类型颜色映射
export const TYPE_COLORS: Record<string, string> = {
  String: '#10b981',        // 绿色
  Number: '#3b82f6',        // 蓝色
  Boolean: '#f59e0b',       // 黄色
  Object: '#f97316',        // 橙色
  Array: '#8b5cf6',         // 紫色
  BrowserContext: '#06b6d4', // 青色
  HTMLElement: '#14b8a6',   // 青绿色
  HTTPResponse: '#6366f1',  // 靛蓝色
  FileHandle: '#84cc16',    // 黄绿色
  DatabaseConnection: '#ec4899', // 粉色
  AIResponse: '#a855f7',    // 紫罗兰色
  Tool: '#3b82f6',          // 蓝色 - 工具
  Resource: '#8b5cf6',      // 紫色 - 资源
  Rule: '#ef4444',          // 红色 - 规则
  Any: '#6b7280',           // 灰色
  Null: '#9ca3af',          // 浅灰色
  Union: '#64748b',         // 石板灰
  Optional: '#78716c',      // 暖灰色
};

// 获取类型的显示颜色
export function getTypeColor(dataType: DataType): string {
  if (typeof dataType === 'string') {
    return TYPE_COLORS[dataType] || TYPE_COLORS.Any;
  }
  return TYPE_COLORS[dataType.type] || TYPE_COLORS.Any;
}

// 获取类型的简短名称
export function getTypeName(dataType: DataType): string {
  if (typeof dataType === 'string') {
    return dataType;
  }
  return dataType.type;
}

// 检查是否为基础类型
export function isPrimitiveType(dataType: DataType): dataType is PrimitiveType {
  return typeof dataType === 'string' && 
    ['String', 'Number', 'Boolean', 'Null'].includes(dataType);
}

// 检查是否为复合类型
export function isComplexType(dataType: DataType): dataType is ComplexType {
  return typeof dataType === 'object' && 'type' in dataType;
}

// 检查是否为领域类型
export function isDomainType(dataType: DataType): dataType is DomainType {
  return typeof dataType === 'string' && 
    ['BrowserContext', 'HTMLElement', 'HTTPResponse', 'FileHandle', 'DatabaseConnection', 'AIResponse', 'Tool', 'Resource', 'Rule'].includes(dataType);
}

// 检查是否为 Any 类型
export function isAnyType(dataType: DataType): boolean {
  return dataType === 'Any';
}

// 创建 Array 类型
export function createArrayType(itemType: DataType): ArrayType {
  return { type: 'Array', itemType };
}

// 创建 Object 类型
export function createObjectType(properties?: Record<string, DataType>): ObjectType {
  return { type: 'Object', properties };
}

// 创建 Union 类型
export function createUnionType(types: DataType[]): UnionType {
  return { type: 'Union', types };
}

// 创建 Optional 类型
export function createOptionalType(innerType: DataType): OptionalType {
  return { type: 'Optional', innerType };
}
