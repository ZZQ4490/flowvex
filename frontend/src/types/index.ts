// src/types/index.ts
// Types 导出

// 数据类型系统
export {
  TYPE_COLORS,
  getTypeColor,
  getTypeName,
  isPrimitiveType,
  isComplexType,
  isDomainType,
  isAnyType,
  createArrayType,
  createObjectType,
  createUnionType,
  createOptionalType,
} from './data-types';
export type {
  PrimitiveType,
  ComplexType,
  DomainType,
  DataType,
  ArrayType,
  ObjectType,
  UnionType,
  OptionalType,
} from './data-types';

// 数据包
export {
  createDataPacket,
  unwrapDataPacket,
  convertDataPacket,
  isValidDataPacket,
  cloneDataPacket,
  mergeDataPackets,
  extractFromArrayPacket,
} from './data-packet';
export type {
  DataPacket,
  DataPacketMetadata,
  JSONSchema,
} from './data-packet';

// 工作流类型
export {
  normalizePort,
  getPortDataType,
} from './workflow';
export type {
  Workflow,
  WorkflowNode,
  WorkflowEdge,
  NodeType,
  NodeData,
  Port,
  SimplePort,
  NodeTemplate,
  NodeCategory,
  ExecutionState,
  CustomNodeConfig,
} from './workflow';

// AI 设置类型
export type {
  AIProvider,
  AIModel,
  AISettings,
} from './ai-settings';
