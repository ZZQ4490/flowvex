// src/types/data-packet.ts
// 数据包格式 - 统一的数据传递格式

import { DataType } from './data-types';
import { convertData } from '../utils/type-converter';

// JSON Schema 类型定义（简化版）
export interface JSONSchema {
  type?: string;
  properties?: Record<string, JSONSchema>;
  items?: JSONSchema;
  required?: string[];
  description?: string;
}

// 数据包元数据
export interface DataPacketMetadata {
  sourceNode: string;
  sourcePort: string;
  timestamp: number;
  executionId: string;
  originalType?: DataType;
  convertedFrom?: DataType;
}

// 数据包接口
export interface DataPacket<T = any> {
  type: DataType;
  value: T;
  schema?: JSONSchema;
  metadata: DataPacketMetadata;
}

// 创建数据包
export function createDataPacket<T>(
  value: T,
  type: DataType,
  sourceNode: string,
  sourcePort: string,
  executionId: string,
  schema?: JSONSchema
): DataPacket<T> {
  return {
    type,
    value,
    schema,
    metadata: {
      sourceNode,
      sourcePort,
      timestamp: Date.now(),
      executionId,
    },
  };
}

// 解包数据
export function unwrapDataPacket<T>(packet: DataPacket<T>): T {
  return packet.value;
}

// 转换数据包类型
export function convertDataPacket<T, U>(
  packet: DataPacket<T>,
  targetType: DataType
): DataPacket<U> {
  const convertedValue = convertData(packet.value, packet.type, targetType) as U;
  return {
    type: targetType,
    value: convertedValue,
    metadata: {
      ...packet.metadata,
      originalType: packet.metadata.originalType || packet.type,
      convertedFrom: packet.type,
    },
  };
}

// 检查数据包是否有效
export function isValidDataPacket(packet: any): packet is DataPacket {
  return (
    packet &&
    typeof packet === 'object' &&
    'type' in packet &&
    'value' in packet &&
    'metadata' in packet &&
    typeof packet.metadata === 'object' &&
    'sourceNode' in packet.metadata &&
    'sourcePort' in packet.metadata &&
    'timestamp' in packet.metadata &&
    'executionId' in packet.metadata
  );
}

// 克隆数据包
export function cloneDataPacket<T>(packet: DataPacket<T>): DataPacket<T> {
  return {
    type: packet.type,
    value: JSON.parse(JSON.stringify(packet.value)),
    schema: packet.schema ? JSON.parse(JSON.stringify(packet.schema)) : undefined,
    metadata: { ...packet.metadata },
  };
}

// 合并多个数据包为数组
export function mergeDataPackets<T>(
  packets: DataPacket<T>[],
  executionId: string
): DataPacket<T[]> {
  const values = packets.map(p => p.value);
  const sourceNodes = packets.map(p => p.metadata.sourceNode).join(',');
  
  return {
    type: { type: 'Array', itemType: packets[0]?.type || 'Any' },
    value: values,
    metadata: {
      sourceNode: sourceNodes,
      sourcePort: 'merged',
      timestamp: Date.now(),
      executionId,
    },
  };
}

// 从数据包数组中提取单个元素
export function extractFromArrayPacket<T>(
  packet: DataPacket<T[]>,
  index: number,
  executionId: string
): DataPacket<T> | null {
  if (!Array.isArray(packet.value) || index >= packet.value.length) {
    return null;
  }
  
  const itemType = typeof packet.type === 'object' && packet.type.type === 'Array'
    ? packet.type.itemType
    : 'Any';
  
  return {
    type: itemType,
    value: packet.value[index],
    metadata: {
      sourceNode: packet.metadata.sourceNode,
      sourcePort: `${packet.metadata.sourcePort}[${index}]`,
      timestamp: Date.now(),
      executionId,
    },
  };
}
