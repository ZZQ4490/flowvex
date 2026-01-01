import React, { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import ReactFlow, {
  Connection,
  addEdge,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useReactFlow,
  Node,
  Edge,
  NodeMouseHandler,
  OnNodesChange,
  OnEdgesChange,
  applyNodeChanges,
  applyEdgeChanges,
  ConnectionLineType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useWorkflowStore } from '../stores/workflowStore';
import { nodeTypes } from './nodes';
import { ContextMenu } from './ContextMenu';
import { MergeNodesDialog } from './MergeNodesDialog';
import { NodeTemplate } from '../types/workflow';

interface ContextMenuState {
  show: boolean;
  x: number;
  y: number;
  nodeId: string | null;
  canvasPosition: { x: number; y: number };
}

interface SelectionBox {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

interface WorkflowCanvasProps {
  onNodeSelect?: (nodeId: string | null) => void;
}

// 自定义边样式 - 更粗的连接线，使用贝塞尔曲线
const defaultEdgeOptions = {
  style: { 
    stroke: '#6366f1', 
    strokeWidth: 3,
  },
  type: 'default',
};

// 连接线样式 - 拖拽时也是粗线
const connectionLineStyle = {
  stroke: '#6366f1',
  strokeWidth: 3,
};

const WorkflowCanvasInner: React.FC<WorkflowCanvasProps> = ({ onNodeSelect }) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();
  
  const { 
    workflow, 
    addEdge: addWorkflowEdge, 
    addNode,
    removeNode,
    selectNode,
    selectedNodeId,
    updateNodePosition,
    mergeNodes,
    saveWorkflow,
  } = useWorkflowStore();

  // 自动保存 - 每5秒保存一次
  useEffect(() => {
    if (!workflow) return;
    
    const autoSaveInterval = setInterval(() => {
      saveWorkflow();
      console.log('Auto-saved workflow at', new Date().toLocaleTimeString());
    }, 5000);
    
    return () => clearInterval(autoSaveInterval);
  }, [workflow, saveWorkflow]);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    show: false,
    x: 0,
    y: 0,
    nodeId: null,
    canvasPosition: { x: 0, y: 0 },
  });

  // Multi-selection state
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const [showMergeDialog, setShowMergeDialog] = useState(false);

  // Convert workflow nodes to ReactFlow nodes - 只依赖 workflow.nodes
  const workflowNodes = useMemo(() => {
    return workflow?.nodes || [];
  }, [workflow?.nodes]);

  // Convert workflow edges to ReactFlow edges
  const workflowEdges = useMemo(() => {
    return workflow?.edges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
      animated: e.animated,
      style: { stroke: '#6366f1', strokeWidth: 3 },
      type: 'default', // 贝塞尔曲线
    })) || [];
  }, [workflow?.edges]);

  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  // Sync nodes when workflow changes - 只在 workflow.nodes 变化时同步
  useEffect(() => {
    setNodes(workflowNodes.map(n => ({
      id: n.id,
      type: n.type,
      position: n.position,
      data: { ...n.data, selected: n.id === selectedNodeId || selectedNodeIds.has(n.id) },
      selected: n.id === selectedNodeId || selectedNodeIds.has(n.id),
    })));
  }, [workflowNodes]);

  // 单独处理选中状态变化，不影响位置
  useEffect(() => {
    setNodes(prevNodes => prevNodes.map(n => ({
      ...n,
      data: { ...n.data, selected: n.id === selectedNodeId || selectedNodeIds.has(n.id) },
      selected: n.id === selectedNodeId || selectedNodeIds.has(n.id),
    })));
  }, [selectedNodeId, selectedNodeIds]);

  // Sync edges when workflow changes
  useEffect(() => {
    setEdges(workflowEdges);
  }, [workflowEdges]);

  // Handle node changes (drag, select, etc.)
  const onNodesChange: OnNodesChange = useCallback((changes) => {
    // 过滤掉由我们的多选引起的 select 变化，避免冲突
    const filteredChanges = changes.filter(change => {
      if (change.type === 'select') {
        // 忽略 ReactFlow 的选择变化，我们自己管理多选
        return false;
      }
      return true;
    });
    
    if (filteredChanges.length > 0) {
      setNodes((nds) => applyNodeChanges(filteredChanges, nds));
    }
    
    // Update positions in store when dragging ends
    changes.forEach((change) => {
      if (change.type === 'position' && change.dragging === false && change.position) {
        updateNodePosition(change.id, change.position);
      }
    });
  }, [updateNodePosition]);

  // Handle edge changes
  const onEdgesChange: OnEdgesChange = useCallback((changes) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, []);

  // Handle new connections
  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      
      const newEdge = {
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle || '',
        targetHandle: connection.targetHandle || '',
      };
      
      setEdges((eds) => addEdge({
        ...connection,
        style: { stroke: '#6366f1', strokeWidth: 3 },
        type: 'default',
      }, eds));
      addWorkflowEdge(newEdge);
    },
    [addWorkflowEdge]
  );

  // Handle node click - select node
  const onNodeClick: NodeMouseHandler = useCallback((event, node) => {
    event.stopPropagation();
    
    // Ctrl/Cmd + click for multi-select toggle
    if (event.ctrlKey || event.metaKey) {
      setSelectedNodeIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(node.id)) {
          newSet.delete(node.id);
        } else {
          newSet.add(node.id);
        }
        return newSet;
      });
    } else {
      // Normal click - single select
      setSelectedNodeIds(new Set());
      selectNode(node.id);
      onNodeSelect?.(node.id);
    }
  }, [selectNode, onNodeSelect]);

  // Handle pane click - deselect
  const onPaneClick = useCallback(() => {
    selectNode(null);
    onNodeSelect?.(null);
    setSelectedNodeIds(new Set());
    setContextMenu(prev => ({ ...prev, show: false }));
  }, [selectNode, onNodeSelect]);

  // Handle drag over for drop zone
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Handle drop from node palette
  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();

    const data = event.dataTransfer.getData('application/reactflow');
    if (!data) return;

    try {
      const template: NodeTemplate = JSON.parse(data);
      
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      addNode(template, position);
    } catch (e) {
      console.error('Failed to parse dropped node data:', e);
    }
  }, [screenToFlowPosition, addNode]);

  // Close context menu
  const closeContextMenu = useCallback(() => {
    setContextMenu(prev => ({ ...prev, show: false }));
  }, []);

  // Handle add node from context menu
  const handleAddNode = useCallback((template: NodeTemplate, position: { x: number; y: number }) => {
    addNode(template, position);
  }, [addNode]);

  // Handle delete node from context menu
  const handleDeleteNode = useCallback(() => {
    if (contextMenu.nodeId) {
      removeNode(contextMenu.nodeId);
    }
  }, [contextMenu.nodeId, removeNode]);

  // Handle merge nodes
  const handleMergeNodes = useCallback(() => {
    setShowMergeDialog(true);
    closeContextMenu();
  }, [closeContextMenu]);

  // 计算建议的输入输出端口
  const getSuggestedPorts = useCallback(() => {
    if (!workflow) return { inputs: [], outputs: [] };
    
    const nodeIdsToMerge = selectedNodeIds.size > 1 
      ? Array.from(selectedNodeIds) 
      : contextMenu.nodeId 
        ? [contextMenu.nodeId, ...Array.from(selectedNodeIds).filter(id => id !== contextMenu.nodeId)]
        : [];
    
    const nodeIdSet = new Set(nodeIdsToMerge);
    const nodesToMerge = workflow.nodes.filter(n => nodeIdSet.has(n.id));
    
    // 找出外部连接到内部的边 -> 这些目标端口成为输入
    const suggestedInputs: Array<{ id: string; name: string; data_type: string; sourceNodeId?: string; sourcePortId?: string }> = [];
    // 找出内部连接到外部的边 -> 这些源端口成为输出
    const suggestedOutputs: Array<{ id: string; name: string; data_type: string; sourceNodeId?: string; sourcePortId?: string }> = [];
    
    const addedInputKeys = new Set<string>();
    const addedOutputKeys = new Set<string>();
    
    workflow.edges.forEach(edge => {
      const sourceInGroup = nodeIdSet.has(edge.source);
      const targetInGroup = nodeIdSet.has(edge.target);
      
      // 外部 -> 内部：目标端口成为输入
      if (!sourceInGroup && targetInGroup) {
        const targetNode = nodesToMerge.find(n => n.id === edge.target);
        if (targetNode) {
          const portId = edge.targetHandle || 'input';
          const key = `${edge.target}_${portId}`;
          if (!addedInputKeys.has(key)) {
            addedInputKeys.add(key);
            const portDef = targetNode.data.inputs?.find(p => p.id === portId);
            suggestedInputs.push({
              id: `input_${suggestedInputs.length}`,
              name: portDef?.name || `${targetNode.data.label} 输入`,
              data_type: portDef?.data_type || 'Any',
              sourceNodeId: edge.target,
              sourcePortId: portId,
            });
          }
        }
      }
      
      // 内部 -> 外部：源端口成为输出
      if (sourceInGroup && !targetInGroup) {
        const sourceNode = nodesToMerge.find(n => n.id === edge.source);
        if (sourceNode) {
          const portId = edge.sourceHandle || 'output';
          const key = `${edge.source}_${portId}`;
          if (!addedOutputKeys.has(key)) {
            addedOutputKeys.add(key);
            const portDef = sourceNode.data.outputs?.find(p => p.id === portId);
            suggestedOutputs.push({
              id: `output_${suggestedOutputs.length}`,
              name: portDef?.name || `${sourceNode.data.label} 输出`,
              data_type: portDef?.data_type || 'Any',
              sourceNodeId: edge.source,
              sourcePortId: portId,
            });
          }
        }
      }
    });
    
    // 如果没有外部连接，提供默认端口
    if (suggestedInputs.length === 0) {
      suggestedInputs.push({ id: 'input_0', name: '输入', data_type: 'Any' });
    }
    if (suggestedOutputs.length === 0) {
      suggestedOutputs.push({ id: 'output_0', name: '输出', data_type: 'Any' });
    }
    
    return { inputs: suggestedInputs, outputs: suggestedOutputs };
  }, [workflow, selectedNodeIds, contextMenu.nodeId]);

  const handleConfirmMerge = useCallback((
    name: string, 
    color: string, 
    description: string,
    inputs: Array<{ id: string; name: string; data_type: string }>,
    outputs: Array<{ id: string; name: string; data_type: string }>
  ) => {
    const nodeIdsToMerge = selectedNodeIds.size > 1 
      ? Array.from(selectedNodeIds) 
      : contextMenu.nodeId 
        ? [contextMenu.nodeId, ...Array.from(selectedNodeIds).filter(id => id !== contextMenu.nodeId)]
        : [];
    
    if (nodeIdsToMerge.length >= 2) {
      mergeNodes(nodeIdsToMerge, { name, color, description, inputs, outputs });
      setSelectedNodeIds(new Set());
    }
    setShowMergeDialog(false);
  }, [selectedNodeIds, contextMenu.nodeId, mergeNodes]);

  // 自动布局 - 按工作流主线逻辑排列
  const handleAutoLayout = useCallback(() => {
    if (!workflow || workflow.nodes.length === 0) return;

    const nodes = workflow.nodes;
    const edges = workflow.edges;

    // 1. 分类节点
    const auxiliaryTypes = new Set(['agentTool', 'agentResource', 'agentRule']);
    const outputTypes = new Set(['output', 'display']);
    
    const auxiliaryNodes: typeof nodes = [];
    const outputNodes: typeof nodes = [];
    const mainlineCandidate: typeof nodes = [];
    
    nodes.forEach(n => {
      if (auxiliaryTypes.has(n.type)) {
        auxiliaryNodes.push(n);
      } else if (outputTypes.has(n.type)) {
        outputNodes.push(n);
      } else {
        mainlineCandidate.push(n);
      }
    });

    // 2. 构建主线子图（只包含主线候选节点）
    const mainlineIds = new Set(mainlineCandidate.map(n => n.id));
    const adjacency: Record<string, string[]> = {};
    const reverseAdjacency: Record<string, string[]> = {};
    const inDegree: Record<string, number> = {};

    mainlineCandidate.forEach(n => {
      adjacency[n.id] = [];
      reverseAdjacency[n.id] = [];
      inDegree[n.id] = 0;
    });

    edges.forEach(e => {
      // 只考虑主线节点之间的边
      if (mainlineIds.has(e.source) && mainlineIds.has(e.target)) {
        adjacency[e.source].push(e.target);
        reverseAdjacency[e.target].push(e.source);
        inDegree[e.target]++;
      }
    });

    // 3. 找主线 - 从触发节点开始的最长路径
    const findLongestPath = (): string[] => {
      // 找起点（入度为0或trigger类型）
      let startNodes = mainlineCandidate.filter(n => 
        inDegree[n.id] === 0 || n.type === 'trigger'
      );
      
      if (startNodes.length === 0 && mainlineCandidate.length > 0) {
        startNodes = [mainlineCandidate[0]];
      }

      let longestPath: string[] = [];

      // DFS 找最长路径
      const dfs = (nodeId: string, path: string[], visited: Set<string>) => {
        if (visited.has(nodeId)) return;
        
        const newPath = [...path, nodeId];
        const newVisited = new Set(visited);
        newVisited.add(nodeId);

        if (newPath.length > longestPath.length) {
          longestPath = newPath;
        }

        (adjacency[nodeId] || []).forEach(nextId => {
          dfs(nextId, newPath, newVisited);
        });
      };

      startNodes.forEach(start => {
        dfs(start.id, [], new Set());
      });

      return longestPath;
    };

    const mainlinePath = findLongestPath();
    const mainlineSet = new Set(mainlinePath);

    // 4. 布局参数
    const NODE_WIDTH = 280;
    const HORIZONTAL_GAP = 120;
    const VERTICAL_GAP = 60;
    const START_X = 80;
    const MAIN_Y = 350; // 主线Y位置
    const TOOL_OFFSET_Y = -180; // 工具节点在主线上方
    const RULE_OFFSET_Y = 200; // 规则节点在主线下方
    const RESOURCE_OFFSET_Y = -100;
    const OUTPUT_GAP = 280; // 输出节点之间的垂直间距

    const newPositions: Record<string, { x: number; y: number }> = {};

    // 5. 布局主线节点
    const mainlineX: Record<string, number> = {};
    mainlinePath.forEach((nodeId, index) => {
      const x = START_X + index * (NODE_WIDTH + HORIZONTAL_GAP);
      mainlineX[nodeId] = x;
      newPositions[nodeId] = { x, y: MAIN_Y };
    });

    // 6. 找到辅助节点连接的目标主线节点
    const getTargetMainlineNode = (auxNodeId: string): string | null => {
      for (const edge of edges) {
        if (edge.source === auxNodeId && mainlineSet.has(edge.target)) {
          return edge.target;
        }
      }
      // 如果没有直接连接，找最近的主线节点
      return mainlinePath.length > 0 ? mainlinePath[Math.floor(mainlinePath.length / 2)] : null;
    };

    // 7. 布局辅助节点
    const toolsByTarget: Record<string, typeof nodes> = {};
    const rulesByTarget: Record<string, typeof nodes> = {};
    const resourcesByTarget: Record<string, typeof nodes> = {};

    auxiliaryNodes.forEach(node => {
      const targetId = getTargetMainlineNode(node.id);
      if (!targetId) return;

      if (node.type === 'agentTool') {
        if (!toolsByTarget[targetId]) toolsByTarget[targetId] = [];
        toolsByTarget[targetId].push(node);
      } else if (node.type === 'agentRule') {
        if (!rulesByTarget[targetId]) rulesByTarget[targetId] = [];
        rulesByTarget[targetId].push(node);
      } else if (node.type === 'agentResource') {
        if (!resourcesByTarget[targetId]) resourcesByTarget[targetId] = [];
        resourcesByTarget[targetId].push(node);
      }
    });

    // 布局工具节点（主线上方，垂直堆叠）
    Object.entries(toolsByTarget).forEach(([targetId, tools]) => {
      const baseX = mainlineX[targetId] - 50;
      tools.forEach((node, index) => {
        newPositions[node.id] = {
          x: baseX,
          y: MAIN_Y + TOOL_OFFSET_Y - index * (100 + VERTICAL_GAP),
        };
      });
    });

    // 布局规则节点（主线下方，垂直堆叠）
    Object.entries(rulesByTarget).forEach(([targetId, rules]) => {
      const baseX = mainlineX[targetId] - 50;
      rules.forEach((node, index) => {
        newPositions[node.id] = {
          x: baseX,
          y: MAIN_Y + RULE_OFFSET_Y + index * (120 + VERTICAL_GAP),
        };
      });
    });

    // 布局资源节点（主线上方偏左）
    Object.entries(resourcesByTarget).forEach(([targetId, resources]) => {
      const baseX = mainlineX[targetId] - 150;
      resources.forEach((node, index) => {
        newPositions[node.id] = {
          x: baseX,
          y: MAIN_Y + RESOURCE_OFFSET_Y - index * (100 + VERTICAL_GAP),
        };
      });
    });

    // 8. 布局不在主线上的其他主线候选节点（支线）
    const branchNodes = mainlineCandidate.filter(n => !mainlineSet.has(n.id));
    
    // 按深度排列支线节点
    const branchDepth: Record<string, number> = {};
    branchNodes.forEach(node => {
      // 找到连接的主线节点，确定深度
      let depth = 0;
      for (const edge of edges) {
        if (edge.target === node.id && mainlineSet.has(edge.source)) {
          const sourceIndex = mainlinePath.indexOf(edge.source);
          depth = Math.max(depth, sourceIndex + 1);
        }
        if (edge.source === node.id && mainlineSet.has(edge.target)) {
          const targetIndex = mainlinePath.indexOf(edge.target);
          depth = Math.max(depth, targetIndex);
        }
      }
      branchDepth[node.id] = depth;
    });

    // 按深度分组
    const branchByDepth: Record<number, typeof nodes> = {};
    branchNodes.forEach(node => {
      const depth = branchDepth[node.id];
      if (!branchByDepth[depth]) branchByDepth[depth] = [];
      branchByDepth[depth].push(node);
    });

    // 布局支线节点（主线上方）
    Object.entries(branchByDepth).forEach(([depthStr, nodesAtDepth]) => {
      const depth = parseInt(depthStr);
      const baseX = START_X + depth * (NODE_WIDTH + HORIZONTAL_GAP);
      nodesAtDepth.forEach((node, index) => {
        newPositions[node.id] = {
          x: baseX,
          y: MAIN_Y - 250 - index * (120 + VERTICAL_GAP),
        };
      });
    });

    // 9. 布局输出节点（最右边，垂直排列）
    const maxMainlineX = mainlinePath.length > 0 
      ? mainlineX[mainlinePath[mainlinePath.length - 1]] 
      : START_X;
    const outputX = maxMainlineX + NODE_WIDTH + HORIZONTAL_GAP + 100;

    outputNodes.forEach((node, index) => {
      newPositions[node.id] = {
        x: outputX,
        y: START_X + index * OUTPUT_GAP,
      };
    });

    // 10. 应用布局
    Object.entries(newPositions).forEach(([nodeId, position]) => {
      updateNodePosition(nodeId, position);
    });

    // 立即更新本地 ReactFlow 节点状态
    setNodes(prevNodes => 
      prevNodes.map(n => ({
        ...n,
        position: newPositions[n.id] || n.position,
      }))
    );

    // 保存工作流
    saveWorkflow();
  }, [workflow, updateNodePosition, saveWorkflow]);

  // 计算选区内的节点 - 只有蓝框真正碰到节点本体才选中
  const getNodesInSelectionBox = useCallback((box: SelectionBox) => {
    if (!reactFlowWrapper.current || !workflow?.nodes) return new Set<string>();
    
    const rect = reactFlowWrapper.current.getBoundingClientRect();
    const minX = Math.min(box.startX, box.endX);
    const maxX = Math.max(box.startX, box.endX);
    const minY = Math.min(box.startY, box.endY);
    const maxY = Math.max(box.startY, box.endY);

    // 选区太小时不选中任何节点（避免点击时误选）
    const boxWidth = Math.abs(box.endX - box.startX);
    const boxHeight = Math.abs(box.endY - box.startY);
    if (boxWidth < 10 || boxHeight < 10) {
      return new Set<string>();
    }

    const topLeft = screenToFlowPosition({ x: rect.left + minX, y: rect.top + minY });
    const bottomRight = screenToFlowPosition({ x: rect.left + maxX, y: rect.top + maxY });

    const selectedIds = new Set<string>();
    
    workflow.nodes.forEach(node => {
      const nodeX = node.position.x;
      const nodeY = node.position.y;
      const nodeWidth = 220;
      const nodeHeight = 100;

      // 检查选区是否与节点本体相交（严格判断）
      const selLeft = topLeft.x;
      const selTop = topLeft.y;
      const selRight = bottomRight.x;
      const selBottom = bottomRight.y;

      // 两个矩形相交：必须有实际重叠面积
      const overlapLeft = Math.max(selLeft, nodeX);
      const overlapRight = Math.min(selRight, nodeX + nodeWidth);
      const overlapTop = Math.max(selTop, nodeY);
      const overlapBottom = Math.min(selBottom, nodeY + nodeHeight);
      
      // 只有当重叠区域有效时才选中
      if (overlapRight > overlapLeft && overlapBottom > overlapTop) {
        selectedIds.add(node.id);
      }
    });

    return selectedIds;
  }, [screenToFlowPosition, workflow?.nodes]);

  // Selection box handlers for Shift+drag
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    // 只处理 Shift + 左键，不干扰右键
    if (event.shiftKey && event.button === 0) {
      event.preventDefault();
      event.stopPropagation();
      const rect = reactFlowWrapper.current?.getBoundingClientRect();
      if (rect) {
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        setIsSelecting(true);
        setSelectionBox({ startX: x, startY: y, endX: x, endY: y });
        setSelectedNodeIds(new Set()); // 开始新选区时清空之前的选择
      }
    }
  }, []);

  // 用 ref 存储上一次选中的节点，避免不必要的更新
  const lastSelectedIdsRef = useRef<string>('');

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (isSelecting && selectionBox) {
      event.preventDefault();
      const rect = reactFlowWrapper.current?.getBoundingClientRect();
      if (rect) {
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const newBox = { ...selectionBox, endX: x, endY: y };
        setSelectionBox(newBox);
        
        // 实时更新选中的节点，但只在变化时更新
        const selectedIds = getNodesInSelectionBox(newBox);
        const selectedIdsStr = Array.from(selectedIds).sort().join(',');
        
        if (selectedIdsStr !== lastSelectedIdsRef.current) {
          lastSelectedIdsRef.current = selectedIdsStr;
          setSelectedNodeIds(selectedIds);
        }
      }
    }
  }, [isSelecting, selectionBox, getNodesInSelectionBox]);

  const handleMouseUp = useCallback((event: React.MouseEvent) => {
    if (isSelecting) {
      event.preventDefault();
      event.stopPropagation();
      lastSelectedIdsRef.current = ''; // 重置
    }
    setIsSelecting(false);
    setSelectionBox(null);
  }, [isSelecting]);

  // Handle mouse leave - cancel selection
  const handleMouseLeave = useCallback(() => {
    if (isSelecting) {
      setIsSelecting(false);
      setSelectionBox(null);
    }
  }, [isSelecting]);

  // Handle right-click - 直接在 wrapper 上处理
  const handleContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    
    const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    
    // 检查是否点击在节点上
    const target = event.target as HTMLElement;
    const nodeElement = target.closest('.react-flow__node');
    
    if (nodeElement) {
      const nodeId = nodeElement.getAttribute('data-id');
      
      if (nodeId) {
        // 判断当前选中状态
        const isNodeInSelection = selectedNodeIds.has(nodeId);
        
        // 如果点击的节点不在多选中，只选中当前节点
        // 如果在多选中，保持多选状态不变
        if (!isNodeInSelection) {
          setSelectedNodeIds(new Set([nodeId]));
        }
        // 注意：这里不需要等待 setState 完成，因为 ContextMenu 会在下一次渲染时获取最新的 selectedNodeIds
        
        setContextMenu({
          show: true,
          x: event.clientX,
          y: event.clientY,
          nodeId: nodeId,
          canvasPosition: position,
        });
        return;
      }
    }
    
    // 点击在画布空白处
    setContextMenu({
      show: true,
      x: event.clientX,
      y: event.clientY,
      nodeId: null,
      canvasPosition: position,
    });
  }, [screenToFlowPosition, selectedNodeIds]);

  return (
    <div 
      ref={reactFlowWrapper} 
      className="w-full h-full relative"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onContextMenu={handleContextMenu}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onDragOver={onDragOver}
        onDrop={onDrop}
        nodeTypes={nodeTypes}
        fitView={false}
        fitViewOptions={{ padding: 0.2 }}
        snapToGrid
        snapGrid={[15, 15]}
        deleteKeyCode="Delete"
        nodesDraggable={true}
        nodesConnectable={true}
        elementsSelectable={true}
        selectionOnDrag={false}
        panOnDrag={!isSelecting}
        defaultEdgeOptions={defaultEdgeOptions}
        connectionLineStyle={connectionLineStyle}
        connectionLineType={ConnectionLineType.Bezier}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#e5e7eb" gap={20} />
        <Controls />
        <MiniMap 
          nodeColor={(node) => {
            switch (node.type) {
              case 'trigger': return '#10b981';
              case 'action': return '#3b82f6';
              case 'ai': return '#8b5cf6';
              case 'condition': return '#f59e0b';
              case 'loop': return '#ec4899';
              case 'display': return '#06b6d4';
              case 'group': return '#6366f1';
              default: return '#6366f1';
            }
          }}
        />
      </ReactFlow>

      {/* Selection Box */}
      {isSelecting && selectionBox && (
        <div
          className="absolute border-2 border-blue-500 bg-blue-500/10 pointer-events-none z-50"
          style={{
            left: Math.min(selectionBox.startX, selectionBox.endX),
            top: Math.min(selectionBox.startY, selectionBox.endY),
            width: Math.abs(selectionBox.endX - selectionBox.startX),
            height: Math.abs(selectionBox.endY - selectionBox.startY),
          }}
        />
      )}

      {/* Context Menu */}
      {contextMenu.show && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={closeContextMenu}
          onAddNode={handleAddNode}
          onDelete={contextMenu.nodeId ? handleDeleteNode : undefined}
          onMergeNodes={handleMergeNodes}
          onAutoLayout={handleAutoLayout}
          showNodeOptions={!!contextMenu.nodeId}
          selectedCount={selectedNodeIds.size}
          canvasPosition={contextMenu.canvasPosition}
        />
      )}

      {/* Merge Nodes Dialog */}
      {showMergeDialog && (
        <MergeNodesDialog
          nodeCount={selectedNodeIds.size}
          suggestedInputs={getSuggestedPorts().inputs}
          suggestedOutputs={getSuggestedPorts().outputs}
          onConfirm={handleConfirmMerge}
          onCancel={() => setShowMergeDialog(false)}
        />
      )}
    </div>
  );
};

// Wrap with ReactFlowProvider
export const WorkflowCanvas: React.FC<WorkflowCanvasProps> = (props) => {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner {...props} />
    </ReactFlowProvider>
  );
};
