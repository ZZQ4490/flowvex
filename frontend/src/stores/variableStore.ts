import { create } from 'zustand';

// 变量类型定义
export interface WorkflowVariable {
  id: string;
  name: string;           // 变量名，如 crawler_output, ai_result
  displayName: string;    // 显示名称
  nodeId: string;         // 来源节点ID
  nodeName: string;       // 来源节点名称
  outputKey: string;      // 输出键名
  dataType: string;       // 数据类型
  value?: any;            // 运行时的值
  schema?: VariableSchema; // 数据结构描述
}

export interface VariableSchema {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  properties?: Record<string, VariableSchema>;
  items?: VariableSchema;
  description?: string;
}

interface VariableStore {
  // 工作流变量
  variables: Record<string, WorkflowVariable>;
  
  // 变量操作
  registerVariable: (variable: Omit<WorkflowVariable, 'id'>) => string;
  updateVariable: (id: string, updates: Partial<WorkflowVariable>) => void;
  removeVariable: (id: string) => void;
  removeNodeVariables: (nodeId: string) => void;
  setVariableValue: (id: string, value: any) => void;
  clearAllValues: () => void;
  
  // 变量查询
  getVariableByName: (name: string) => WorkflowVariable | undefined;
  getNodeVariables: (nodeId: string) => WorkflowVariable[];
  getAvailableVariables: (currentNodeId: string, connectedNodeIds: string[]) => WorkflowVariable[];
  
  // 变量引用解析
  parseVariableReferences: (text: string) => string[];
  resolveVariables: (text: string) => string;
  
  // 自动命名
  generateVariableName: (nodeName: string, outputKey: string) => string;
}

export const useVariableStore = create<VariableStore>((set, get) => ({
  variables: {},

  registerVariable: (variable) => {
    const id = `var_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const newVariable: WorkflowVariable = { ...variable, id };
    
    set((state) => ({
      variables: { ...state.variables, [id]: newVariable },
    }));
    
    return id;
  },

  updateVariable: (id, updates) => {
    set((state) => ({
      variables: {
        ...state.variables,
        [id]: state.variables[id] ? { ...state.variables[id], ...updates } : state.variables[id],
      },
    }));
  },

  removeVariable: (id) => {
    set((state) => {
      const { [id]: _, ...rest } = state.variables;
      return { variables: rest };
    });
  },

  removeNodeVariables: (nodeId) => {
    set((state) => {
      const filtered = Object.fromEntries(
        Object.entries(state.variables).filter(([_, v]) => v.nodeId !== nodeId)
      );
      return { variables: filtered };
    });
  },

  setVariableValue: (id, value) => {
    set((state) => ({
      variables: {
        ...state.variables,
        [id]: state.variables[id] ? { ...state.variables[id], value } : state.variables[id],
      },
    }));
  },

  clearAllValues: () => {
    set((state) => ({
      variables: Object.fromEntries(
        Object.entries(state.variables).map(([k, v]) => [k, { ...v, value: undefined }])
      ),
    }));
  },

  getVariableByName: (name) => {
    return Object.values(get().variables).find((v) => v.name === name);
  },

  getNodeVariables: (nodeId) => {
    return Object.values(get().variables).filter((v) => v.nodeId === nodeId);
  },

  getAvailableVariables: (currentNodeId, connectedNodeIds) => {
    // 返回所有上游节点的变量
    return Object.values(get().variables).filter(
      (v) => v.nodeId !== currentNodeId && connectedNodeIds.includes(v.nodeId)
    );
  },

  parseVariableReferences: (text) => {
    // 解析 #variable_name 格式的引用
    const regex = /#([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)/g;
    const matches: string[] = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      matches.push(match[1]);
    }
    return matches;
  },

  resolveVariables: (text) => {
    const { variables, parseVariableReferences } = get();
    const refs = parseVariableReferences(text);
    
    let result = text;
    for (const ref of refs) {
      const parts = ref.split('.');
      const varName = parts[0];
      const variable = Object.values(variables).find((v) => v.name === varName);
      
      if (variable && variable.value !== undefined) {
        let value = variable.value;
        
        // 处理嵌套属性访问，如 #crawler_output.title
        for (let i = 1; i < parts.length; i++) {
          if (value && typeof value === 'object') {
            value = value[parts[i]];
          } else {
            value = undefined;
            break;
          }
        }
        
        const replacement = typeof value === 'object' ? JSON.stringify(value) : String(value ?? '');
        result = result.replace(`#${ref}`, replacement);
      }
    }
    
    return result;
  },

  generateVariableName: (nodeName, outputKey) => {
    // 将节点名转换为变量名格式
    const sanitized = nodeName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
    
    return outputKey === 'output' ? `${sanitized}_output` : `${sanitized}_${outputKey}`;
  },
}));
