// Agent 相关节点模板 - 工具、资源、规则节点
// 工具节点是声明性的，不会被系统执行，只表明 AI Agent 可以调用这些工具
import { NodeCategory, NodeTemplate } from '../types/workflow';

// ==================== Agent 工具节点 ====================
// 这些节点不会被执行，只是声明 AI 可以使用的工具
export const agentToolTemplates: NodeTemplate[] = [
  // ===== 时间类工具 =====
  {
    type: 'agentTool',
    nodeType: { type: 'AgentTool', tool_type: 'get_current_time' },
    label: '获取时间',
    description: '获取当前时间，支持多种格式输出',
    icon: 'Clock',
    color: '#10b981',
    defaultConfig: {
      toolType: 'get_current_time',
      enabled: true,
      isDeclarative: true,
    },
    inputs: [],
    outputs: [{ id: 'tool', name: '工具', data_type: 'Object' }],
  },
  
  // ===== 网络类工具 =====
  {
    type: 'agentTool',
    nodeType: { type: 'AgentTool', tool_type: 'web_search' },
    label: '网络搜索',
    description: '搜索互联网获取最新信息',
    icon: 'Search',
    color: '#3b82f6',
    defaultConfig: {
      toolType: 'web_search',
      enabled: true,
      isDeclarative: true,
    },
    inputs: [],
    outputs: [{ id: 'tool', name: '工具', data_type: 'Object' }],
  },
  {
    type: 'agentTool',
    nodeType: { type: 'AgentTool', tool_type: 'http_request' },
    label: 'HTTP 请求',
    description: '发送 HTTP 请求获取或提交数据',
    icon: 'Globe',
    color: '#3b82f6',
    defaultConfig: {
      toolType: 'http_request',
      enabled: true,
      isDeclarative: true,
    },
    inputs: [],
    outputs: [{ id: 'tool', name: '工具', data_type: 'Object' }],
  },
  {
    type: 'agentTool',
    nodeType: { type: 'AgentTool', tool_type: 'scrape_webpage' },
    label: '网页爬取',
    description: '爬取网页内容并提取信息',
    icon: 'FileSearch',
    color: '#3b82f6',
    defaultConfig: {
      toolType: 'scrape_webpage',
      enabled: true,
      isDeclarative: true,
    },
    inputs: [],
    outputs: [{ id: 'tool', name: '工具', data_type: 'Object' }],
  },
  
  // ===== 文件类工具 =====
  {
    type: 'agentTool',
    nodeType: { type: 'AgentTool', tool_type: 'read_file' },
    label: '读取文件',
    description: '读取文件内容',
    icon: 'FileText',
    color: '#10b981',
    defaultConfig: {
      toolType: 'read_file',
      enabled: true,
      isDeclarative: true,
    },
    inputs: [],
    outputs: [{ id: 'tool', name: '工具', data_type: 'Object' }],
  },
  {
    type: 'agentTool',
    nodeType: { type: 'AgentTool', tool_type: 'write_file' },
    label: '写入文件',
    description: '写入内容到文件',
    icon: 'FilePlus',
    color: '#10b981',
    defaultConfig: {
      toolType: 'write_file',
      enabled: true,
      isDeclarative: true,
    },
    inputs: [],
    outputs: [{ id: 'tool', name: '工具', data_type: 'Object' }],
  },
  {
    type: 'agentTool',
    nodeType: { type: 'AgentTool', tool_type: 'list_files' },
    label: '列出文件',
    description: '列出目录中的文件',
    icon: 'FolderOpen',
    color: '#10b981',
    defaultConfig: {
      toolType: 'list_files',
      enabled: true,
      isDeclarative: true,
    },
    inputs: [],
    outputs: [{ id: 'tool', name: '工具', data_type: 'Object' }],
  },
  {
    type: 'agentTool',
    nodeType: { type: 'AgentTool', tool_type: 'delete_file' },
    label: '删除文件',
    description: '删除指定文件',
    icon: 'Trash2',
    color: '#ef4444',
    defaultConfig: {
      toolType: 'delete_file',
      enabled: true,
      isDeclarative: true,
    },
    inputs: [],
    outputs: [{ id: 'tool', name: '工具', data_type: 'Object' }],
  },
  
  // ===== 代码执行工具 =====
  {
    type: 'agentTool',
    nodeType: { type: 'AgentTool', tool_type: 'execute_code' },
    label: '执行代码',
    description: '执行 JavaScript 代码并返回结果',
    icon: 'Code',
    color: '#6366f1',
    defaultConfig: {
      toolType: 'execute_code',
      enabled: true,
      isDeclarative: true,
    },
    inputs: [],
    outputs: [{ id: 'tool', name: '工具', data_type: 'Object' }],
  },
  
  // ===== 通信类工具 =====
  {
    type: 'agentTool',
    nodeType: { type: 'AgentTool', tool_type: 'send_email' },
    label: '发送邮件',
    description: '发送电子邮件',
    icon: 'Mail',
    color: '#ef4444',
    defaultConfig: {
      toolType: 'send_email',
      enabled: true,
      isDeclarative: true,
    },
    inputs: [],
    outputs: [{ id: 'tool', name: '工具', data_type: 'Object' }],
  },
  
  // ===== 数据库工具 =====
  {
    type: 'agentTool',
    nodeType: { type: 'AgentTool', tool_type: 'database_query' },
    label: '数据库查询',
    description: '执行数据库查询操作',
    icon: 'Database',
    color: '#3b82f6',
    defaultConfig: {
      toolType: 'database_query',
      enabled: true,
      isDeclarative: true,
    },
    inputs: [],
    outputs: [{ id: 'tool', name: '工具', data_type: 'Object' }],
  },
  
  // ===== 自定义工具 =====
  {
    type: 'agentTool',
    nodeType: { type: 'AgentTool', tool_type: 'custom' },
    label: '自定义工具',
    description: '定义自定义工具供 Agent 使用',
    icon: 'Wrench',
    color: '#f59e0b',
    defaultConfig: {
      toolType: 'custom',
      enabled: true,
      isDeclarative: true,
      name: '',
      description: '',
      parameters: [],
    },
    inputs: [],
    outputs: [{ id: 'tool', name: '工具', data_type: 'Object' }],
  },
];


// ==================== Agent 资源节点 ====================
export const agentResourceTemplates: NodeTemplate[] = [
  {
    type: 'agentResource',
    nodeType: { type: 'AgentResource', resource_type: 'text' },
    label: '文本资源',
    description: '提供文本内容给 Agent',
    icon: 'FileText',
    color: '#8b5cf6',
    defaultConfig: {
      resourceType: 'text',
      name: '',
      content: '',
      description: '',
    },
    inputs: [{ id: 'dynamic', name: '动态内容', data_type: 'String' }],
    outputs: [{ id: 'resource', name: '资源', data_type: 'Object' }],
  },
  {
    type: 'agentResource',
    nodeType: { type: 'AgentResource', resource_type: 'file' },
    label: '文件资源',
    description: '上传文件供 Agent 访问',
    icon: 'File',
    color: '#8b5cf6',
    defaultConfig: {
      resourceType: 'file',
      name: '',
      filePath: '',
      fileType: 'auto',
      description: '',
    },
    inputs: [],
    outputs: [{ id: 'resource', name: '资源', data_type: 'Object' }],
  },
  {
    type: 'agentResource',
    nodeType: { type: 'AgentResource', resource_type: 'url' },
    label: 'URL资源',
    description: '提供网页 URL 供 Agent 访问',
    icon: 'Link',
    color: '#06b6d4',
    defaultConfig: {
      resourceType: 'url',
      name: '',
      url: '',
      fetchContent: true,
      description: '',
    },
    inputs: [],
    outputs: [{ id: 'resource', name: '资源', data_type: 'Object' }],
  },
  {
    type: 'agentResource',
    nodeType: { type: 'AgentResource', resource_type: 'data' },
    label: '数据资源',
    description: '将上游节点数据作为资源',
    icon: 'Database',
    color: '#f59e0b',
    defaultConfig: {
      resourceType: 'data',
      name: '',
      description: '',
    },
    inputs: [{ id: 'data', name: '数据输入', data_type: 'Any' }],
    outputs: [{ id: 'resource', name: '资源', data_type: 'Object' }],
  },
];

// ==================== Agent 规则节点 ====================
export const agentRuleTemplates: NodeTemplate[] = [
  {
    type: 'agentRule',
    nodeType: { type: 'AgentRule', rule_type: 'behavior' },
    label: '行为规则',
    description: '定义 Agent 的行为准则',
    icon: 'Shield',
    color: '#ef4444',
    defaultConfig: {
      ruleType: 'behavior',
      priority: 1,
      rules: [],
    },
    inputs: [],
    outputs: [{ id: 'rules', name: '规则', data_type: 'Array' }],
  },
  {
    type: 'agentRule',
    nodeType: { type: 'AgentRule', rule_type: 'format' },
    label: '输出格式',
    description: '定义 Agent 输出的格式要求',
    icon: 'FileJson',
    color: '#8b5cf6',
    defaultConfig: {
      ruleType: 'format',
      priority: 2,
      outputFormat: 'text',
      schema: null,
    },
    inputs: [],
    outputs: [{ id: 'rules', name: '规则', data_type: 'Array' }],
  },
  {
    type: 'agentRule',
    nodeType: { type: 'AgentRule', rule_type: 'safety' },
    label: '安全规则',
    description: '定义 Agent 的安全限制',
    icon: 'ShieldAlert',
    color: '#ef4444',
    defaultConfig: {
      ruleType: 'safety',
      priority: 0,
      blockedTopics: [],
      allowedDomains: [],
      maxOutputLength: 10000,
    },
    inputs: [],
    outputs: [{ id: 'rules', name: '规则', data_type: 'Array' }],
  },
  {
    type: 'agentRule',
    nodeType: { type: 'AgentRule', rule_type: 'custom' },
    label: '自定义规则',
    description: '添加自定义规则文本',
    icon: 'ScrollText',
    color: '#6b7280',
    defaultConfig: {
      ruleType: 'custom',
      priority: 5,
      content: '',
    },
    inputs: [],
    outputs: [{ id: 'rules', name: '规则', data_type: 'Array' }],
  },
];

// Agent 工具分类
export const agentToolCategory: NodeCategory = {
  id: 'agent-tools',
  name: 'AI 工具',
  icon: 'Wrench',
  nodes: agentToolTemplates,
};

// Agent 资源分类
export const agentResourceCategory: NodeCategory = {
  id: 'agent-resources',
  name: 'AI 资源',
  icon: 'FolderOpen',
  nodes: agentResourceTemplates,
};

// Agent 规则分类
export const agentRuleCategory: NodeCategory = {
  id: 'agent-rules',
  name: 'AI 规则',
  icon: 'Shield',
  nodes: agentRuleTemplates,
};

// 导出所有 Agent 相关节点
export const allAgentNodeTemplates: NodeTemplate[] = [
  ...agentToolTemplates,
  ...agentResourceTemplates,
  ...agentRuleTemplates,
];
