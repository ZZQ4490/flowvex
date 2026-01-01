// Workflow types matching Rust backend

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  variables: Record<string, any>;
  created_at: string;
  updated_at: string;
  status?: 'draft' | 'published' | 'archived';
}

export interface WorkflowNode {
  id: string;
  type: string; // ReactFlow node type
  nodeType: NodeType; // Our custom node type
  position: { x: number; y: number };
  data: NodeData;
}

export type NodeType = 
  | { type: 'Trigger'; trigger_type: TriggerType }
  | { type: 'Action'; action_type: ActionType }
  | { type: 'Condition'; condition_type: ConditionType }
  | { type: 'Loop'; loop_type: LoopType }
  | { type: 'AI'; ai_type: AINodeType }
  | { type: 'Custom'; config: CustomNodeConfig }
  | { type: 'AgentTool'; tool_type: AgentToolType }
  | { type: 'AgentResource'; resource_type: AgentResourceType }
  | { type: 'AgentRule'; rule_type: AgentRuleType };

export type TriggerType = 'Webhook' | 'Schedule' | 'Manual';
export type ActionType = 'Http' | 'Email' | 'Database' | 'Integration' | 'Display' | 'Output';
export type ConditionType = 'If' | 'Switch';
export type LoopType = 'ForEach' | 'While';
export type AINodeType = 'TextGeneration' | 'ToolCalling' | 'Classification' | 'Agent';

// Agent 相关类型
export type AgentToolType = 
  | 'get_current_time'
  | 'web_search'
  | 'http_request'
  | 'scrape_webpage'
  | 'read_file'
  | 'write_file'
  | 'list_files'
  | 'delete_file'
  | 'execute_code'
  | 'send_email'
  | 'database_query'
  | 'custom';

export type AgentResourceType = 'text' | 'file' | 'url' | 'data';
export type AgentRuleType = 'behavior' | 'format' | 'safety' | 'custom';

export interface NodeData {
  label: string;
  description?: string;
  icon?: string;
  config: Record<string, any>;
  inputs?: Port[];
  outputs?: Port[];
  status?: 'idle' | 'running' | 'success' | 'error';
}

// 导入增强类型系统
import { DataType as EnhancedDataType } from './data-types';

// 增强的端口定义
export interface Port {
  id: string;
  name: string;
  description?: string;
  
  // 类型定义 - 支持新旧两种格式
  dataType?: EnhancedDataType;
  data_type?: DataType; // 向后兼容
  
  // 约束
  required?: boolean;             // 是否必须连接，默认 true
  multiple?: boolean;             // 是否允许多个连接，默认 false
  
  // 默认值和提示
  defaultValue?: any;
  placeholder?: string;
  examples?: any[];
  
  // UI 配置
  color?: string;                // 端口颜色 (可选，默认按类型)
  hidden?: boolean;              // 是否隐藏
}

// 简化端口定义（向后兼容）
export interface SimplePort {
  id: string;
  name: string;
  data_type: DataType;
}

// 端口转换函数 - 将旧格式转换为新格式
export function normalizePort(port: Port | SimplePort): Port {
  // 如果已经是新格式
  if ('dataType' in port && port.dataType !== undefined) {
    return {
      ...port,
      required: port.required ?? true,
      multiple: port.multiple ?? false,
    };
  }
  
  // 转换旧格式
  const dataType = port.data_type || 'Any';
  return {
    id: port.id,
    name: port.name,
    dataType: dataType as EnhancedDataType,
    data_type: dataType,
    required: true,
    multiple: false,
  };
}

// 获取端口的数据类型（兼容新旧格式）
export function getPortDataType(port: Port | SimplePort): EnhancedDataType {
  if ('dataType' in port && port.dataType !== undefined) {
    return port.dataType;
  }
  return (port.data_type || 'Any') as EnhancedDataType;
}

// 旧的简单类型定义（保持向后兼容）
export type DataType = 'String' | 'Number' | 'Boolean' | 'Object' | 'Array' | 'Any';

export interface WorkflowEdge {
  id: string;
  source: string;
  sourceHandle: string;
  target: string;
  targetHandle: string;
  animated?: boolean;
}

export interface CustomNodeConfig {
  language: string;
  code: string;
  dependencies: string[];
  // 子流程相关
  subNodes?: Array<{
    id: string;
    type: string;
    nodeType: NodeType;
    data: NodeData;
    relativePosition: { x: number; y: number };
  }>;
  subEdges?: WorkflowEdge[];
  // 数据中转节点ID
  dataRelayNodeId?: string;
}

export interface ExecutionState {
  execution_id: string;
  workflow_id: string;
  state: 'Pending' | 'Running' | 'Paused' | 'Completed' | 'Failed' | 'Cancelled';
  started_at: string;
  completed_at?: string;
  error?: string;
  current_node?: string;
}

// Node category for sidebar
export interface NodeCategory {
  id: string;
  name: string;
  icon: string;
  nodes: NodeTemplate[];
}

export interface NodeTemplate {
  type: string;
  nodeType: NodeType;
  label: string;
  description: string;
  icon: string;
  color: string;
  defaultConfig: Record<string, any>;
  inputs: Port[];
  outputs: Port[];
}
