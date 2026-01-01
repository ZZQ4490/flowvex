import { memo } from 'react';
import { NodeProps } from 'reactflow';
import BaseNode from './BaseNode';
import TriggerNodeComponent from './TriggerNode';
import DisplayNodeComponent from './DisplayNode';
import AINodeComponent from './AINode';
import GroupNodeComponent from './GroupNode';
import OutputNodeComponent from './OutputNode';
import { NodeData } from '../../types/workflow';

// Trigger Node - Uses special TriggerNode component with run button
export const TriggerNode = memo((props: NodeProps<NodeData>) => (
  <TriggerNodeComponent {...props} color="#10b981" />
));
TriggerNode.displayName = 'TriggerNode';

// Action Node
export const ActionNode = memo((props: NodeProps<NodeData>) => (
  <BaseNode {...props} color="#3b82f6" />
));
ActionNode.displayName = 'ActionNode';

// AI Node - Uses special AINode component with model info
export const AINode = memo((props: NodeProps<NodeData>) => (
  <AINodeComponent {...props} color="#8b5cf6" />
));
AINode.displayName = 'AINode';

// Condition Node
export const ConditionNode = memo((props: NodeProps<NodeData>) => (
  <BaseNode {...props} color="#f59e0b" />
));
ConditionNode.displayName = 'ConditionNode';

// Loop Node
export const LoopNode = memo((props: NodeProps<NodeData>) => (
  <BaseNode {...props} color="#ec4899" />
));
LoopNode.displayName = 'LoopNode';

// Custom Node
export const CustomNode = memo((props: NodeProps<NodeData>) => (
  <BaseNode {...props} color="#6366f1" />
));
CustomNode.displayName = 'CustomNode';

// Display Node - Shows content directly on canvas (legacy, use OutputNode)
export const DisplayNode = memo((props: NodeProps<NodeData>) => (
  <DisplayNodeComponent {...props} color="#06b6d4" />
));
DisplayNode.displayName = 'DisplayNode';

// Output Node - Universal output display (text/image/file/json)
export const OutputNode = memo((props: NodeProps<NodeData>) => (
  <OutputNodeComponent {...props} color="#06b6d4" />
));
OutputNode.displayName = 'OutputNode';

// Group Node - Contains merged sub-nodes
export const GroupNode = memo((props: NodeProps<NodeData>) => (
  <GroupNodeComponent {...props} />
));
GroupNode.displayName = 'GroupNode';

// Scraper Node - Web scraping nodes
export const ScraperNode = memo((props: NodeProps<NodeData>) => (
  <BaseNode {...props} color="#06b6d4" />
));
ScraperNode.displayName = 'ScraperNode';

// JSON Processor Node - Data transformation with dynamic outputs
export const JsonProcessorNode = memo((props: NodeProps<NodeData>) => (
  <BaseNode {...props} color="#8b5cf6" />
));
JsonProcessorNode.displayName = 'JsonProcessorNode';

// Agent Tool Node - Tools for AI Agent
export const AgentToolNode = memo((props: NodeProps<NodeData>) => (
  <BaseNode {...props} color="#3b82f6" />
));
AgentToolNode.displayName = 'AgentToolNode';

// Agent Resource Node - Resources for AI Agent
export const AgentResourceNode = memo((props: NodeProps<NodeData>) => (
  <BaseNode {...props} color="#8b5cf6" />
));
AgentResourceNode.displayName = 'AgentResourceNode';

// Agent Rule Node - Rules for AI Agent
export const AgentRuleNode = memo((props: NodeProps<NodeData>) => (
  <BaseNode {...props} color="#ef4444" />
));
AgentRuleNode.displayName = 'AgentRuleNode';

// Node types mapping for ReactFlow
export const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  ai: AINode,
  condition: ConditionNode,
  loop: LoopNode,
  custom: CustomNode,
  display: DisplayNode,
  output: OutputNode,
  group: GroupNode,
  scraper: ScraperNode,
  jsonProcessor: JsonProcessorNode,
  agentTool: AgentToolNode,
  agentResource: AgentResourceNode,
  agentRule: AgentRuleNode,
};
