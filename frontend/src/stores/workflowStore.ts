import { create } from 'zustand';
import { Workflow, WorkflowNode, WorkflowEdge, NodeTemplate, Port } from '../types/workflow';
import { nanoid } from 'nanoid';
import { useVariableStore } from './variableStore';
import { useAISettingsStore } from './aiSettingsStore';
import { callAIModel } from '../services/aiService';
import { executeScraperNode, clearCurrentContext, getCurrentContextId, checkScraperServiceHealth } from '../services/scraperExecutor';
import { executeAgent, createBuiltinTools } from '../services/agentExecutor';

interface EditorAction {
  type: string;
  payload: any;
  previousState?: any;
}

interface WorkflowStore {
  // State
  workflow: Workflow | null;
  workflows: Workflow[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  undoStack: EditorAction[];
  redoStack: EditorAction[];
  isExecuting: boolean;
  executionState: Record<string, 'idle' | 'running' | 'success' | 'error'>;
  nodeOutputs: Record<string, any>;
  
  // Workflow CRUD
  createWorkflow: (name: string, description?: string) => Workflow;
  setWorkflow: (workflow: Workflow | null) => void;
  updateWorkflowMeta: (updates: Partial<Pick<Workflow, 'name' | 'description'>>) => void;
  loadWorkflows: () => void;
  saveWorkflow: () => void;
  deleteWorkflow: (id: string) => void;
  
  // Node operations
  addNode: (template: NodeTemplate, position: { x: number; y: number }) => void;
  removeNode: (nodeId: string) => void;
  updateNode: (nodeId: string, data: Partial<WorkflowNode>) => void;
  updateNodeConfig: (nodeId: string, config: Record<string, any>) => void;
  updateNodeOutputs: (nodeId: string, outputs: Port[]) => void;
  updateNodePosition: (nodeId: string, position: { x: number; y: number }) => void;
  mergeNodes: (nodeIds: string[], options: { 
    name: string; 
    color: string; 
    description: string;
    inputs: Array<{ id: string; name: string; data_type: string }>;
    outputs: Array<{ id: string; name: string; data_type: string }>;
  }) => void;
  
  // Edge operations
  addEdge: (edge: Omit<WorkflowEdge, 'id'>) => void;
  removeEdge: (edgeId: string) => void;
  
  // Selection
  selectNode: (nodeId: string | null) => void;
  selectEdge: (edgeId: string | null) => void;
  
  // Undo/Redo
  undo: () => void;
  redo: () => void;
  pushAction: (action: EditorAction) => void;
  
  // Execution
  startExecution: () => void;
  stopExecution: () => void;
  setNodeExecutionState: (nodeId: string, state: 'idle' | 'running' | 'success' | 'error') => void;
  setNodeOutput: (nodeId: string, output: any) => void;
  runWorkflow: () => Promise<void>;
}

export const useWorkflowStore = create<WorkflowStore>((set, get) => ({
  workflow: null,
  workflows: [],
  selectedNodeId: null,
  selectedEdgeId: null,
  undoStack: [],
  redoStack: [],
  isExecuting: false,
  executionState: {},
  nodeOutputs: {},

  createWorkflow: (name, description) => {
    const newWorkflow: Workflow = {
      id: nanoid(),
      name,
      description,
      nodes: [],
      edges: [],
      variables: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: 'draft',
    };
    set((state) => ({
      workflow: newWorkflow,
      workflows: [...state.workflows, newWorkflow],
    }));
    return newWorkflow;
  },

  setWorkflow: (workflow) => set({ 
    workflow, 
    selectedNodeId: null, 
    selectedEdgeId: null,
    undoStack: [],
    redoStack: [],
    executionState: {},
  }),

  updateWorkflowMeta: (updates) => {
    set((state) => ({
      workflow: state.workflow
        ? { ...state.workflow, ...updates, updated_at: new Date().toISOString() }
        : null,
    }));
  },

  loadWorkflows: () => {
    // Load from localStorage for now
    const saved = localStorage.getItem('workflows');
    if (saved) {
      set({ workflows: JSON.parse(saved) });
    }
  },

  saveWorkflow: () => {
    const { workflow, workflows } = get();
    if (!workflow) return;
    
    const updated = workflows.map(w => w.id === workflow.id ? workflow : w);
    if (!workflows.find(w => w.id === workflow.id)) {
      updated.push(workflow);
    }
    
    localStorage.setItem('workflows', JSON.stringify(updated));
    set({ workflows: updated });
  },

  deleteWorkflow: (id) => {
    set((state) => {
      const updated = state.workflows.filter(w => w.id !== id);
      localStorage.setItem('workflows', JSON.stringify(updated));
      return {
        workflows: updated,
        workflow: state.workflow?.id === id ? null : state.workflow,
      };
    });
  },

  addNode: (template, position) => {
    const newNode: WorkflowNode = {
      id: nanoid(),
      type: template.type,
      nodeType: template.nodeType,
      position,
      data: {
        label: template.label,
        description: template.description,
        icon: template.icon,
        config: { ...template.defaultConfig },
        inputs: template.inputs,
        outputs: template.outputs,
        status: 'idle',
      },
    };

    const action: EditorAction = { type: 'ADD_NODE', payload: newNode };
    get().pushAction(action);

    // 注册节点输出变量
    const variableStore = useVariableStore.getState();
    const outputs = template.outputs || [];
    const nodeName = template.label.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    
    if (outputs.length > 0) {
      outputs.forEach(port => {
        const varName = `${nodeName}_${port.id}`;
        // 检查是否已存在同名变量
        if (!variableStore.getVariableByName(varName)) {
          variableStore.registerVariable({
            name: varName,
            displayName: `${template.label} - ${port.name}`,
            nodeId: newNode.id,
            nodeName: template.label,
            outputKey: port.id,
            dataType: port.data_type || 'Any',
          });
        }
      });
    } else {
      // 默认输出变量
      const varName = `${nodeName}_output`;
      if (!variableStore.getVariableByName(varName)) {
        variableStore.registerVariable({
          name: varName,
          displayName: `${template.label} - 输出`,
          nodeId: newNode.id,
          nodeName: template.label,
          outputKey: 'output',
          dataType: 'Any',
        });
      }
    }

    set((state) => ({
      workflow: state.workflow
        ? { 
            ...state.workflow, 
            nodes: [...state.workflow.nodes, newNode],
            updated_at: new Date().toISOString(),
          }
        : null,
    }));
  },

  removeNode: (nodeId) => {
    const { workflow } = get();
    if (!workflow) return;

    const node = workflow.nodes.find(n => n.id === nodeId);
    const action: EditorAction = { 
      type: 'REMOVE_NODE', 
      payload: nodeId,
      previousState: node,
    };
    get().pushAction(action);

    // 移除节点关联的变量
    const variableStore = useVariableStore.getState();
    variableStore.removeNodeVariables(nodeId);

    set((state) => ({
      workflow: state.workflow
        ? {
            ...state.workflow,
            nodes: state.workflow.nodes.filter(n => n.id !== nodeId),
            edges: state.workflow.edges.filter(
              e => e.source !== nodeId && e.target !== nodeId
            ),
            updated_at: new Date().toISOString(),
          }
        : null,
      selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
    }));
  },

  updateNode: (nodeId, data) => {
    set((state) => ({
      workflow: state.workflow
        ? {
            ...state.workflow,
            nodes: state.workflow.nodes.map(n =>
              n.id === nodeId ? { ...n, ...data } : n
            ),
            updated_at: new Date().toISOString(),
          }
        : null,
    }));
  },

  updateNodeConfig: (nodeId, config) => {
    set((state) => ({
      workflow: state.workflow
        ? {
            ...state.workflow,
            nodes: state.workflow.nodes.map(n =>
              n.id === nodeId 
                ? { ...n, data: { ...n.data, config: { ...n.data.config, ...config } } }
                : n
            ),
            updated_at: new Date().toISOString(),
          }
        : null,
    }));
  },

  updateNodeOutputs: (nodeId, outputs) => {
    set((state) => ({
      workflow: state.workflow
        ? {
            ...state.workflow,
            nodes: state.workflow.nodes.map(n =>
              n.id === nodeId 
                ? { ...n, data: { ...n.data, outputs } }
                : n
            ),
            updated_at: new Date().toISOString(),
          }
        : null,
    }));
  },

  updateNodePosition: (nodeId, position) => {
    set((state) => ({
      workflow: state.workflow
        ? {
            ...state.workflow,
            nodes: state.workflow.nodes.map(n =>
              n.id === nodeId ? { ...n, position } : n
            ),
            updated_at: new Date().toISOString(),
          }
        : null,
    }));
  },

  mergeNodes: (nodeIds, options) => {
    const { workflow } = get();
    if (!workflow || nodeIds.length < 2) return;

    // Get nodes to merge
    const nodesToMerge = workflow.nodes.filter(n => nodeIds.includes(n.id));
    if (nodesToMerge.length < 2) return;

    const nodeIdSet = new Set(nodeIds);

    // Calculate center position of merged nodes
    const positions = nodesToMerge.map(n => n.position);
    const centerX = positions.reduce((sum, p) => sum + p.x, 0) / positions.length;
    const centerY = positions.reduce((sum, p) => sum + p.y, 0) / positions.length;

    // Calculate relative positions for sub-nodes
    const subNodes = nodesToMerge.map(n => ({
      id: n.id,
      type: n.type,
      nodeType: n.nodeType,
      data: n.data,
      relativePosition: {
        x: n.position.x - centerX,
        y: n.position.y - centerY,
      },
    }));

    // Get internal edges (edges between merged nodes)
    const internalEdges = workflow.edges.filter(
      e => nodeIdSet.has(e.source) && nodeIdSet.has(e.target)
    );

    // 使用用户定义的输入输出端口
    const inputPorts = options.inputs.map(p => ({ 
      id: p.id, 
      name: p.name, 
      data_type: p.data_type as any 
    }));
    const outputPorts = options.outputs.map(p => ({ 
      id: p.id, 
      name: p.name, 
      data_type: p.data_type as any 
    }));

    // Create new group node
    const newGroupNode: WorkflowNode = {
      id: nanoid(),
      type: 'group',
      nodeType: { 
        type: 'Custom', 
        config: {
          language: 'subflow',
          code: '',
          dependencies: [],
          subNodes,
          subEdges: internalEdges,
        }
      },
      position: { x: centerX, y: centerY },
      data: {
        label: options.name,
        description: options.description,
        icon: 'Layers',
        config: {
          color: options.color,
          subNodeCount: nodesToMerge.length,
          expanded: false,
        },
        inputs: inputPorts,
        outputs: outputPorts,
        status: 'idle',
      },
    };

    // 处理外部边的重定向
    const updatedEdges: WorkflowEdge[] = [];
    
    workflow.edges.forEach(edge => {
      // 跳过内部边
      if (nodeIdSet.has(edge.source) && nodeIdSet.has(edge.target)) {
        return;
      }
      
      // 外部 -> 合并组内节点：重定向到合并节点的第一个输入端口
      if (!nodeIdSet.has(edge.source) && nodeIdSet.has(edge.target)) {
        const portId = inputPorts.length > 0 ? inputPorts[0].id : 'input';
        updatedEdges.push({
          ...edge,
          target: newGroupNode.id,
          targetHandle: portId,
        });
        return;
      }
      
      // 合并组内节点 -> 外部：重定向从合并节点的第一个输出端口
      if (nodeIdSet.has(edge.source) && !nodeIdSet.has(edge.target)) {
        const portId = outputPorts.length > 0 ? outputPorts[0].id : 'output';
        updatedEdges.push({
          ...edge,
          source: newGroupNode.id,
          sourceHandle: portId,
        });
        return;
      }
      
      // 完全不涉及合并节点的边，保持不变
      updatedEdges.push(edge);
    });

    const action: EditorAction = { 
      type: 'MERGE_NODES', 
      payload: { nodeIds, newNode: newGroupNode },
      previousState: { nodes: nodesToMerge, edges: workflow.edges },
    };
    get().pushAction(action);

    set((state) => ({
      workflow: state.workflow
        ? {
            ...state.workflow,
            nodes: [
              ...state.workflow.nodes.filter(n => !nodeIds.includes(n.id)),
              newGroupNode,
            ],
            edges: updatedEdges,
            updated_at: new Date().toISOString(),
          }
        : null,
      selectedNodeId: newGroupNode.id,
    }));
  },

  addEdge: (edge) => {
    const newEdge: WorkflowEdge = {
      id: nanoid(),
      ...edge,
    };

    const action: EditorAction = { type: 'ADD_EDGE', payload: newEdge };
    get().pushAction(action);

    set((state) => ({
      workflow: state.workflow
        ? { 
            ...state.workflow, 
            edges: [...state.workflow.edges, newEdge],
            updated_at: new Date().toISOString(),
          }
        : null,
    }));
  },

  removeEdge: (edgeId) => {
    const { workflow } = get();
    if (!workflow) return;

    const edge = workflow.edges.find(e => e.id === edgeId);
    const action: EditorAction = { 
      type: 'REMOVE_EDGE', 
      payload: edgeId,
      previousState: edge,
    };
    get().pushAction(action);

    set((state) => ({
      workflow: state.workflow
        ? {
            ...state.workflow,
            edges: state.workflow.edges.filter(e => e.id !== edgeId),
            updated_at: new Date().toISOString(),
          }
        : null,
      selectedEdgeId: state.selectedEdgeId === edgeId ? null : state.selectedEdgeId,
    }));
  },

  selectNode: (nodeId) => set({ selectedNodeId: nodeId, selectedEdgeId: null }),
  selectEdge: (edgeId) => set({ selectedEdgeId: edgeId, selectedNodeId: null }),

  undo: () => {
    const { undoStack, redoStack, workflow } = get();
    if (undoStack.length === 0 || !workflow) return;

    const action = undoStack[undoStack.length - 1];
    
    // Reverse the action
    switch (action.type) {
      case 'ADD_NODE':
        set((state) => ({
          workflow: state.workflow
            ? {
                ...state.workflow,
                nodes: state.workflow.nodes.filter(n => n.id !== action.payload.id),
              }
            : null,
        }));
        break;
      case 'REMOVE_NODE':
        if (action.previousState) {
          set((state) => ({
            workflow: state.workflow
              ? {
                  ...state.workflow,
                  nodes: [...state.workflow.nodes, action.previousState],
                }
              : null,
          }));
        }
        break;
      case 'ADD_EDGE':
        set((state) => ({
          workflow: state.workflow
            ? {
                ...state.workflow,
                edges: state.workflow.edges.filter(e => e.id !== action.payload.id),
              }
            : null,
        }));
        break;
      case 'REMOVE_EDGE':
        if (action.previousState) {
          set((state) => ({
            workflow: state.workflow
              ? {
                  ...state.workflow,
                  edges: [...state.workflow.edges, action.previousState],
                }
              : null,
          }));
        }
        break;
    }

    set({
      undoStack: undoStack.slice(0, -1),
      redoStack: [...redoStack, action],
    });
  },

  redo: () => {
    const { undoStack, redoStack, workflow } = get();
    if (redoStack.length === 0 || !workflow) return;

    const action = redoStack[redoStack.length - 1];
    
    // Reapply the action
    switch (action.type) {
      case 'ADD_NODE':
        set((state) => ({
          workflow: state.workflow
            ? {
                ...state.workflow,
                nodes: [...state.workflow.nodes, action.payload],
              }
            : null,
        }));
        break;
      case 'REMOVE_NODE':
        set((state) => ({
          workflow: state.workflow
            ? {
                ...state.workflow,
                nodes: state.workflow.nodes.filter(n => n.id !== action.payload),
              }
            : null,
        }));
        break;
      case 'ADD_EDGE':
        set((state) => ({
          workflow: state.workflow
            ? {
                ...state.workflow,
                edges: [...state.workflow.edges, action.payload],
              }
            : null,
        }));
        break;
      case 'REMOVE_EDGE':
        set((state) => ({
          workflow: state.workflow
            ? {
                ...state.workflow,
                edges: state.workflow.edges.filter(e => e.id !== action.payload),
              }
            : null,
        }));
        break;
    }

    set({
      redoStack: redoStack.slice(0, -1),
      undoStack: [...undoStack, action],
    });
  },

  pushAction: (action) =>
    set((state) => ({
      undoStack: [...state.undoStack, action],
      redoStack: [],
    })),

  startExecution: () => {
    const { workflow } = get();
    if (!workflow) return;
    
    const initialState: Record<string, 'idle' | 'running' | 'success' | 'error'> = {};
    workflow.nodes.forEach(n => {
      initialState[n.id] = 'idle';
    });
    
    set({ isExecuting: true, executionState: initialState });
  },

  stopExecution: () => {
    set({ isExecuting: false });
  },

  setNodeExecutionState: (nodeId, state) => {
    set((s) => ({
      executionState: { ...s.executionState, [nodeId]: state },
    }));
  },

  setNodeOutput: (nodeId, output) => {
    set((s) => ({
      nodeOutputs: { ...s.nodeOutputs, [nodeId]: output },
    }));
  },

  runWorkflow: async () => {
    const { workflow, setNodeExecutionState, setNodeOutput, startExecution, stopExecution } = get();
    if (!workflow || workflow.nodes.length === 0) return;

    startExecution();
    
    // 获取变量store
    const variableStore = useVariableStore.getState();
    variableStore.clearAllValues();

    const nodes = [...workflow.nodes];
    const edges = workflow.edges;

    // 构建入度表和邻接表
    const inDegree: Record<string, number> = {};
    const adjacency: Record<string, string[]> = {};
    const reverseAdjacency: Record<string, string[]> = {}; // 反向邻接表，用于获取上游节点
    
    // 初始化
    nodes.forEach(n => {
      inDegree[n.id] = 0;
      adjacency[n.id] = [];
      reverseAdjacency[n.id] = [];
    });
    
    // 构建图
    edges.forEach(e => {
      if (adjacency[e.source]) {
        adjacency[e.source].push(e.target);
      }
      if (reverseAdjacency[e.target]) {
        reverseAdjacency[e.target].push(e.source);
      }
      if (inDegree[e.target] !== undefined) {
        inDegree[e.target]++;
      }
    });

    // 找到所有入度为0的节点（起始节点）
    const queue: string[] = [];
    Object.keys(inDegree).forEach(nodeId => {
      if (inDegree[nodeId] === 0) {
        queue.push(nodeId);
      }
    });

    // 执行单个节点
    const executeNode = async (nodeId: string) => {
      // 从最新的 workflow 状态获取节点（确保配置是最新的）
      const currentWorkflow = get().workflow;
      const node = currentWorkflow?.nodes.find(n => n.id === nodeId);
      if (!node) return;

      setNodeExecutionState(nodeId, 'running');

      // Simulate output based on node type
      let output: any = { success: true, timestamp: new Date().toISOString() };
      
      try {
        if (node.nodeType.type === 'Trigger') {
          await new Promise(resolve => setTimeout(resolve, 300));
          output = { triggered: true, type: node.data.label };
        } else if (node.nodeType.type === 'AI') {
          // 实际调用 AI API
          const aiSettingsStore = useAISettingsStore.getState();
          const modelId = node.data.config.modelId;
          
          if (!modelId) {
            throw new Error('未配置 AI 模型');
          }
          
          const model = aiSettingsStore.getModelById(modelId);
          if (!model) {
            throw new Error('模型配置不存在');
          }
          
          const provider = aiSettingsStore.getProviderById(model.providerId);
          if (!provider) {
            throw new Error('提供商配置不存在');
          }
          
          // 检查是否是 Agent 节点
          const aiType = (node.nodeType as any).ai_type;
          if (aiType === 'Agent') {
            // AI Agent 执行
            const config = node.data.config;
            
            // 从连接的节点获取工具、资源、规则
            const incomingEdges = edges.filter(e => e.target === nodeId);
            const connectedTools: string[] = [];
            const connectedResources: { name: string; value: any }[] = [];
            const connectedRules: string[] = [];
            let userPrompt = config.userPrompt || '';
            
            for (const edge of incomingEdges) {
              const sourceNode = nodes.find(n => n.id === edge.source);
              if (!sourceNode) continue;
              
              const sourceOutput = get().nodeOutputs[edge.source];
              
              // 根据连接的端口类型处理
              if (edge.targetHandle === 'tools' || sourceNode.type === 'agentTool') {
                // 工具节点
                const toolConfig = sourceNode.data.config;
                if (toolConfig.enabled !== false && toolConfig.toolType) {
                  connectedTools.push(toolConfig.toolType);
                }
              } else if (edge.targetHandle === 'resources' || sourceNode.type === 'agentResource') {
                // 资源节点
                const resConfig = sourceNode.data.config;
                const resourceName = resConfig.name || sourceNode.data.label;
                let resourceValue: any = null;
                
                switch (resConfig.resourceType) {
                  case 'text':
                    resourceValue = resConfig.content || sourceOutput?.dynamic;
                    break;
                  case 'file':
                    resourceValue = resConfig.fileContent || `[文件: ${resConfig.fileName}]`;
                    break;
                  case 'image':
                    resourceValue = resConfig.imageBase64 || resConfig.imageUrl || sourceOutput?.imageData;
                    break;
                  case 'url':
                    resourceValue = resConfig.url;
                    break;
                  case 'data':
                    resourceValue = sourceOutput?.data || sourceOutput;
                    break;
                  default:
                    resourceValue = sourceOutput;
                }
                
                if (resourceName && resourceValue) {
                  connectedResources.push({ name: resourceName, value: resourceValue });
                }
              } else if (edge.targetHandle === 'rules' || sourceNode.type === 'agentRule') {
                // 规则节点
                const ruleConfig = sourceNode.data.config;
                
                switch (ruleConfig.ruleType) {
                  case 'behavior':
                    (ruleConfig.rules || []).forEach((r: string) => {
                      if (r) connectedRules.push(r);
                    });
                    break;
                  case 'format':
                    if (ruleConfig.outputFormat) {
                      connectedRules.push(`输出格式必须是 ${ruleConfig.outputFormat}`);
                    }
                    if (ruleConfig.formatInstructions) {
                      connectedRules.push(ruleConfig.formatInstructions);
                    }
                    break;
                  case 'safety':
                    if (ruleConfig.blockedTopics?.length > 0) {
                      connectedRules.push(`禁止讨论以下话题: ${ruleConfig.blockedTopics.join(', ')}`);
                    }
                    if (ruleConfig.maxOutputLength) {
                      connectedRules.push(`输出长度不超过 ${ruleConfig.maxOutputLength} 字符`);
                    }
                    break;
                  case 'custom':
                    if (ruleConfig.content) {
                      connectedRules.push(ruleConfig.content);
                    }
                    break;
                }
              }
              
              // 替换变量引用
              if (sourceOutput && typeof sourceOutput === 'object') {
                Object.keys(sourceOutput).forEach(key => {
                  userPrompt = userPrompt.replace(
                    new RegExp(`#${key}`, 'g'),
                    JSON.stringify(sourceOutput[key])
                  );
                });
              }
            }
            
            const tools = createBuiltinTools(connectedTools);
            
            // 实时更新执行步骤
            const onStep = (step: any) => {
              const currentOutput = get().nodeOutputs[nodeId] || {};
              const currentSteps = currentOutput.steps || [];
              setNodeOutput(nodeId, {
                ...currentOutput,
                steps: [...currentSteps, step],
              });
            };
            
            const agentResult = await executeAgent(provider, model, {
              systemPrompt: config.systemPrompt || '你是一个智能助手。',
              userPrompt,
              maxSteps: config.maxSteps || 10,
              tools,
              resources: connectedResources,
              rules: connectedRules,
              onStep,
            });
            
            if (!agentResult.success) {
              throw new Error(agentResult.error || 'Agent 执行失败');
            }
            
            output = {
              text: agentResult.text,
              files: agentResult.files,
              steps: agentResult.steps,
              usage: agentResult.usage,
            };
          } else {
            // 普通 AI 文本生成
            const result = await callAIModel(provider, model, {
              systemPrompt: node.data.config.systemPrompt,
              userPrompt: node.data.config.prompt || '请回复',
              temperature: node.data.config.temperature,
              maxTokens: node.data.config.maxTokens,
            });
            
            if (!result.success) {
              throw new Error(result.error || 'AI 调用失败');
            }
            
            output = { 
              text: result.text,
              usage: result.usage,
              latency: result.latency,
            };
          }
        } else if ((node.nodeType as any).scraper_type) {
          // 爬虫节点 - 调用真正的爬虫服务
          const scraperType = (node.nodeType as any).scraper_type;
          const config = node.data.config;
          
          // 检查爬虫服务是否可用
          const isServiceAvailable = await checkScraperServiceHealth();
          if (!isServiceAvailable) {
            throw new Error('爬虫服务未启动，请先运行: cd scraper-server && npm install && npm start');
          }
          
          const result = await executeScraperNode(scraperType, config);
          
          if (!result.success) {
            throw new Error(result.error || '爬虫执行失败');
          }
          
          output = result.data;
        } else if ((node.nodeType as any).action_type === 'JsonProcessor' || node.type === 'jsonProcessor') {
          // JSON处理器节点 - 从输入JSON中提取字段
          const config = node.data.config;
          const outputFields = config.outputFields || [];
          
          // 获取上游节点的输出作为输入
          const incomingEdges = edges.filter(e => e.target === nodeId);
          let inputData: any = null;
          
          if (incomingEdges.length > 0) {
            const sourceNodeId = incomingEdges[0].source;
            inputData = get().nodeOutputs[sourceNodeId];
          }
          
          if (!inputData) {
            throw new Error('JSON处理器没有输入数据');
          }
          
          // 解析JSON路径并提取数据
          const extractValue = (obj: any, path: string): any => {
            if (!path) return obj;
            
            const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.');
            let current = obj;
            
            for (const part of parts) {
              if (current === null || current === undefined) return undefined;
              
              // 处理通配符 [*]
              if (part === '*') {
                if (Array.isArray(current)) {
                  const remainingPath = parts.slice(parts.indexOf(part) + 1).join('.');
                  return current.map(item => extractValue(item, remainingPath));
                }
                return undefined;
              }
              
              current = current[part];
            }
            
            return current;
          };
          
          // 为每个输出字段提取值
          output = {};
          for (const field of outputFields) {
            output[field.id] = extractValue(inputData, field.path);
          }
        } else if (node.type === 'agentTool') {
          // Agent 工具节点是声明性的，不执行
          // 只标记为成功，输出工具类型信息供 AI Agent 使用
          const toolConfig = node.data.config;
          output = {
            _isDeclarative: true,
            toolType: toolConfig.toolType,
            enabled: toolConfig.enabled !== false,
          };
        } else if (node.type === 'agentResource') {
          // Agent 资源节点 - 输出资源数据
          const resConfig = node.data.config;
          
          // 获取上游输入（如果有）
          const incomingEdges = edges.filter(e => e.target === nodeId);
          let dynamicData = null;
          if (incomingEdges.length > 0) {
            const sourceNodeId = incomingEdges[0].source;
            dynamicData = get().nodeOutputs[sourceNodeId];
          }
          
          let resourceValue: any = null;
          switch (resConfig.resourceType) {
            case 'text':
              resourceValue = resConfig.content || dynamicData;
              break;
            case 'file':
              resourceValue = resConfig.fileContent || `[文件: ${resConfig.fileName}]`;
              break;
            case 'image':
              resourceValue = resConfig.imageBase64 || resConfig.imageUrl || dynamicData;
              break;
            case 'url':
              resourceValue = resConfig.url;
              break;
            case 'data':
              resourceValue = dynamicData;
              break;
          }
          
          output = {
            resource: {
              name: resConfig.name || node.data.label,
              type: resConfig.resourceType,
              value: resourceValue,
              description: resConfig.description,
            }
          };
        } else if (node.type === 'agentRule') {
          // Agent 规则节点 - 输出规则列表
          const ruleConfig = node.data.config;
          const rulesList: string[] = [];
          
          switch (ruleConfig.ruleType) {
            case 'behavior':
              (ruleConfig.rules || []).forEach((r: string) => {
                if (r) rulesList.push(r);
              });
              break;
            case 'format':
              if (ruleConfig.outputFormat) {
                rulesList.push(`输出格式: ${ruleConfig.outputFormat}`);
              }
              if (ruleConfig.formatInstructions) {
                rulesList.push(ruleConfig.formatInstructions);
              }
              break;
            case 'safety':
              if (ruleConfig.blockedTopics?.length > 0) {
                rulesList.push(`禁止话题: ${ruleConfig.blockedTopics.join(', ')}`);
              }
              if (ruleConfig.maxOutputLength) {
                rulesList.push(`最大输出长度: ${ruleConfig.maxOutputLength}`);
              }
              break;
            case 'custom':
              if (ruleConfig.content) {
                rulesList.push(ruleConfig.content);
              }
              break;
          }
          
          output = {
            rules: rulesList,
            priority: ruleConfig.priority || 5,
          };
        } else if (node.nodeType.type === 'Action') {
          await new Promise(resolve => setTimeout(resolve, 300));
          output = { status: 200, data: { result: 'Action completed' } };
        } else if (node.nodeType.type === 'Condition') {
          await new Promise(resolve => setTimeout(resolve, 200));
          output = { condition: true, branch: 'true' };
        }

        // 特殊节点输出模拟
        if (node.data.label === '网页爬虫') {
          await new Promise(resolve => setTimeout(resolve, 500));
          output = {
            data: [
              { title: '热搜话题1', hot: 9999999 },
              { title: '热搜话题2', hot: 8888888 },
              { title: '热搜话题3', hot: 7777777 },
            ],
            raw: '<html>...</html>',
          };
        } else if (node.data.label === '时间节点') {
          const now = new Date();
          output = {
            formatted: now.toLocaleString('zh-CN'),
            timestamp: now.getTime(),
            iso: now.toISOString(),
          };
        } else if (node.data.label === '显示文字' || node.type === 'display') {
          // 显示文字节点：获取上游节点的输出
          const incomingEdges = edges.filter(e => e.target === nodeId);
          if (incomingEdges.length > 0) {
            const sourceNodeId = incomingEdges[0].source;
            const sourceOutput = get().nodeOutputs[sourceNodeId];
            output = sourceOutput || { text: '无输入数据' };
          }
        }

        setNodeOutput(nodeId, output);
        setNodeExecutionState(nodeId, 'success');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '执行失败';
        output = { error: errorMessage };
        setNodeOutput(nodeId, output);
        setNodeExecutionState(nodeId, 'error');
        console.error(`Node ${node.data.label} execution error:`, error);
      }

      // 注册节点输出为变量
      const outputs = node.data.outputs || [];
      const nodeName = node.data.label.toLowerCase().replace(/[^a-z0-9]+/g, '_');
      
      if (outputs.length > 0) {
        outputs.forEach(port => {
          const varName = `${nodeName}_${port.id}`;
          const existingVar = variableStore.getVariableByName(varName);
          
          if (existingVar) {
            // 更新现有变量的值
            variableStore.setVariableValue(existingVar.id, output[port.id] ?? output);
          } else {
            // 注册新变量
            const varId = variableStore.registerVariable({
              name: varName,
              displayName: `${node.data.label} - ${port.name}`,
              nodeId: node.id,
              nodeName: node.data.label,
              outputKey: port.id,
              dataType: port.data_type || 'Any',
              value: output[port.id] ?? output,
            });
            variableStore.setVariableValue(varId, output[port.id] ?? output);
          }
        });
      } else {
        // 默认输出变量
        const varName = `${nodeName}_output`;
        const existingVar = variableStore.getVariableByName(varName);
        
        if (existingVar) {
          variableStore.setVariableValue(existingVar.id, output);
        } else {
          variableStore.registerVariable({
            name: varName,
            displayName: `${node.data.label} - 输出`,
            nodeId: node.id,
            nodeName: node.data.label,
            outputKey: 'output',
            dataType: 'Any',
            value: output,
          });
        }
      }
    };

    try {
      // 清理之前的爬虫上下文（前端变量）
      clearCurrentContext();
      
      // 使用拓扑排序执行节点，确保依赖顺序
      const executed = new Set<string>();
      
      while (queue.length > 0) {
        // 获取当前层级所有可执行的节点
        const currentLevel = [...queue];
        queue.length = 0;
        
        // 按顺序执行当前层级的节点
        for (const nodeId of currentLevel) {
          if (executed.has(nodeId)) continue;
          
          // 检查所有上游节点是否都已执行完成
          const upstreamNodes = reverseAdjacency[nodeId] || [];
          const allUpstreamDone = upstreamNodes.every(upId => executed.has(upId));
          
          if (!allUpstreamDone) {
            // 上游还没完成，放回队列稍后处理
            queue.push(nodeId);
            continue;
          }
          
          // 执行节点
          await executeNode(nodeId);
          executed.add(nodeId);
          
          // 将下游节点加入队列
          const downstreamNodes = adjacency[nodeId] || [];
          for (const downId of downstreamNodes) {
            if (!executed.has(downId) && !queue.includes(downId)) {
              queue.push(downId);
            }
          }
        }
      }
    } catch (error) {
      console.error('Workflow execution error:', error);
    } finally {
      // 工作流结束时关闭浏览器上下文
      const contextId = getCurrentContextId();
      if (contextId) {
        try {
          await fetch('http://localhost:3001/api/scraper/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: { type: 'closePage' },
              context_id: contextId,
              config: {}
            })
          });
        } catch (e) {
          console.warn('Failed to close browser context:', e);
        }
        clearCurrentContext();
      }
      stopExecution();
    }
  },
}));

// Expose store for testing purposes
if (typeof window !== 'undefined') {
  (window as any).__workflowStore__ = useWorkflowStore;
}
