import { NodeCategory, NodeTemplate } from '../types/workflow';
import { scraperNodeTemplates, scraperNodeCategory } from './scraperNodeTemplates';
import { 
  agentToolTemplates, 
  agentResourceTemplates, 
  agentRuleTemplates,
  agentToolCategory,
  agentResourceCategory,
  agentRuleCategory,
} from './agentNodeTemplates';

// Node templates for the sidebar - using icon names from lucide-react
export const nodeTemplates: NodeTemplate[] = [
  // ==================== 触发器节点 ====================
  {
    type: 'trigger',
    nodeType: { type: 'Trigger', trigger_type: 'Webhook' },
    label: 'Webhook',
    description: '接收HTTP请求触发工作流',
    icon: 'Webhook',
    color: '#10b981',
    defaultConfig: { method: 'POST', path: '/webhook' },
    inputs: [],
    outputs: [
      { id: 'body', name: '请求体', data_type: 'Object' },
      { id: 'headers', name: '请求头', data_type: 'Object' },
      { id: 'query', name: '查询参数', data_type: 'Object' },
    ],
  },
  {
    type: 'trigger',
    nodeType: { type: 'Trigger', trigger_type: 'Schedule' },
    label: '定时触发',
    description: '按计划定时执行工作流',
    icon: 'Clock',
    color: '#10b981',
    defaultConfig: { cron: '0 * * * *' },
    inputs: [],
    outputs: [{ id: 'output', name: '触发时间', data_type: 'Object' }],
  },
  {
    type: 'trigger',
    nodeType: { type: 'Trigger', trigger_type: 'Manual' },
    label: '手动触发',
    description: '手动启动工作流',
    icon: 'Play',
    color: '#10b981',
    defaultConfig: { variables: {} },
    inputs: [],
    outputs: [{ id: 'output', name: '输入数据', data_type: 'Object' }],
  },

  // ==================== 数据获取节点 ====================
  {
    type: 'action',
    nodeType: { type: 'Action', action_type: 'Http' },
    label: 'HTTP请求',
    description: '发送HTTP请求到外部API',
    icon: 'Globe',
    color: '#3b82f6',
    defaultConfig: { method: 'GET', url: '', headers: {}, body: '' },
    inputs: [{ id: 'input', name: '输入', data_type: 'Any' }],
    outputs: [
      { id: 'response', name: '响应数据', data_type: 'Object' },
      { id: 'status', name: '状态码', data_type: 'Number' },
    ],
  },
  {
    type: 'action',
    nodeType: { type: 'Action', action_type: 'Integration' },
    label: '网页爬虫',
    description: '抓取网页数据，支持预设模板',
    icon: 'Bug',
    color: '#3b82f6',
    defaultConfig: { 
      template: 'custom',
      url: '',
      selector: '',
      // 预设模板配置
      templates: {
        baidu_hot: {
          name: '百度热搜榜',
          url: 'https://top.baidu.com/board?tab=realtime',
          description: '获取百度实时热搜榜单',
        },
        weibo_hot: {
          name: '微博热搜',
          url: 'https://weibo.com/hot/search',
          description: '获取微博热搜榜单',
        },
      },
    },
    inputs: [{ id: 'input', name: '配置', data_type: 'Object' }],
    outputs: [
      { id: 'data', name: '抓取数据', data_type: 'Array' },
      { id: 'raw', name: '原始HTML', data_type: 'String' },
    ],
  },

  // ==================== AI 节点 ====================
  {
    type: 'ai',
    nodeType: { type: 'AI', ai_type: 'TextGeneration' },
    label: 'LLM文本生成',
    description: '使用大语言模型生成文本',
    icon: 'Bot',
    color: '#8b5cf6',
    defaultConfig: { 
      modelId: '', 
      systemPrompt: '', 
      prompt: '', 
      temperature: 0.7,
      maxTokens: 2048,
    },
    inputs: [
      { id: 'input', name: '输入数据', data_type: 'Any' },
      { id: 'context', name: '上下文', data_type: 'String' },
    ],
    outputs: [
      { id: 'text', name: '生成文本', data_type: 'String' },
      { id: 'usage', name: 'Token用量', data_type: 'Object' },
    ],
  },
  {
    type: 'ai',
    nodeType: { type: 'AI', ai_type: 'Agent' },
    label: 'AI Agent',
    description: '自主决策、调用工具、完成复杂任务',
    icon: 'Bot',
    color: '#8b5cf6',
    defaultConfig: { 
      modelId: '', 
      systemPrompt: '你是一个智能助手，可以使用工具来完成任务。', 
      userPrompt: '',
      maxSteps: 10,
    },
    inputs: [
      { id: 'tools', name: '工具', data_type: 'Array' },
      { id: 'resources', name: '资源', data_type: 'Array' },
      { id: 'rules', name: '规则', data_type: 'Array' },
    ],
    outputs: [
      { id: 'text', name: '文本输出', data_type: 'String' },
      { id: 'files', name: '文件输出', data_type: 'Array' },
      { id: 'steps', name: '执行步骤', data_type: 'Array' },
    ],
  },
  {
    type: 'ai',
    nodeType: { type: 'AI', ai_type: 'Classification' },
    label: 'AI分类',
    description: '使用AI对内容进行分类',
    icon: 'Tags',
    color: '#8b5cf6',
    defaultConfig: { modelId: '', categories: [], instructions: '' },
    inputs: [{ id: 'input', name: '待分类内容', data_type: 'String' }],
    outputs: [
      { id: 'category', name: '分类结果', data_type: 'String' },
      { id: 'confidence', name: '置信度', data_type: 'Number' },
    ],
  },

  // ==================== 数据处理节点 ====================
  // JSON处理器 - 动态输出端口
  {
    type: 'jsonProcessor',
    nodeType: { type: 'Action', action_type: 'JsonProcessor' as any },
    label: 'JSON处理器',
    description: '从JSON中提取字段，支持自定义多个输出端口',
    icon: 'Split',
    color: '#8b5cf6',
    defaultConfig: { 
      outputFields: [
        { id: 'field_1', name: '字段1', path: '', description: '' },
      ],
    },
    inputs: [{ id: 'json', name: 'JSON输入', data_type: 'Any', dataType: 'Any', required: true, multiple: false, description: '要处理的JSON数据' }],
    outputs: [
      { id: 'field_1', name: '字段1', data_type: 'Any', dataType: 'Any', required: false, multiple: false },
    ],
  },
  {
    type: 'action',
    nodeType: { type: 'Action', action_type: 'Integration' },
    label: '文本处理',
    description: '文本拼接、替换、分割等操作',
    icon: 'Type',
    color: '#f59e0b',
    defaultConfig: { 
      operation: 'template', // template, split, join, replace
      template: '',
    },
    inputs: [{ id: 'input', name: '输入文本', data_type: 'String' }],
    outputs: [{ id: 'output', name: '处理结果', data_type: 'String' }],
  },
  {
    type: 'action',
    nodeType: { type: 'Action', action_type: 'Integration' },
    label: '数据合并',
    description: '合并多个数据源',
    icon: 'Merge',
    color: '#f59e0b',
    defaultConfig: { mode: 'object' }, // object, array, concat
    inputs: [
      { id: 'input1', name: '数据源1', data_type: 'Any' },
      { id: 'input2', name: '数据源2', data_type: 'Any' },
      { id: 'input3', name: '数据源3', data_type: 'Any' },
    ],
    outputs: [{ id: 'merged', name: '合并结果', data_type: 'Any' }],
  },

  // ==================== 逻辑控制节点 ====================
  {
    type: 'condition',
    nodeType: { type: 'Condition', condition_type: 'If' },
    label: '条件判断',
    description: '根据条件分支执行',
    icon: 'GitBranch',
    color: '#f59e0b',
    defaultConfig: { condition: '' },
    inputs: [{ id: 'input', name: '输入', data_type: 'Any' }],
    outputs: [
      { id: 'true', name: '条件为真', data_type: 'Any' },
      { id: 'false', name: '条件为假', data_type: 'Any' },
    ],
  },
  {
    type: 'condition',
    nodeType: { type: 'Condition', condition_type: 'Switch' },
    label: 'Switch分支',
    description: '多条件分支选择',
    icon: 'Route',
    color: '#f59e0b',
    defaultConfig: { cases: [] },
    inputs: [{ id: 'input', name: '输入', data_type: 'Any' }],
    outputs: [
      { id: 'case1', name: '分支1', data_type: 'Any' },
      { id: 'case2', name: '分支2', data_type: 'Any' },
      { id: 'case3', name: '分支3', data_type: 'Any' },
      { id: 'default', name: '默认', data_type: 'Any' },
    ],
  },
  {
    type: 'loop',
    nodeType: { type: 'Loop', loop_type: 'ForEach' },
    label: '循环遍历',
    description: '遍历数组中的每个元素',
    icon: 'Repeat',
    color: '#ec4899',
    defaultConfig: {},
    inputs: [{ id: 'array', name: '数组', data_type: 'Array' }],
    outputs: [
      { id: 'item', name: '当前元素', data_type: 'Any' },
      { id: 'index', name: '索引', data_type: 'Number' },
      { id: 'done', name: '完成', data_type: 'Array' },
    ],
  },
  {
    type: 'loop',
    nodeType: { type: 'Loop', loop_type: 'While' },
    label: 'While循环',
    description: '条件满足时持续执行',
    icon: 'RefreshCw',
    color: '#ec4899',
    defaultConfig: { condition: '', maxIterations: 100 },
    inputs: [{ id: 'input', name: '输入', data_type: 'Any' }],
    outputs: [
      { id: 'loop', name: '循环体', data_type: 'Any' },
      { id: 'done', name: '完成', data_type: 'Any' },
    ],
  },

  // ==================== 自定义节点 ====================
  {
    type: 'custom',
    nodeType: { type: 'Custom', config: { language: 'javascript', code: '', dependencies: [] } },
    label: '代码节点',
    description: '执行自定义JavaScript/Python代码',
    icon: 'Code',
    color: '#6366f1',
    defaultConfig: { 
      language: 'javascript', 
      code: '// 输入数据在 input 变量中\n// 返回值将作为输出\nreturn input;',
    },
    inputs: [{ id: 'input', name: '输入', data_type: 'Any' }],
    outputs: [{ id: 'output', name: '输出', data_type: 'Any' }],
  },

  // ==================== 输出节点 ====================
  {
    type: 'output',
    nodeType: { type: 'Action', action_type: 'Output' },
    label: '输出节点',
    description: '智能显示文本、图片、文件等各类数据',
    icon: 'Monitor',
    color: '#06b6d4',
    defaultConfig: { 
      format: 'auto', // auto, json, text, image, file
    },
    inputs: [{ id: 'input', name: '输入', data_type: 'Any' }],
    outputs: [],
  },
  {
    type: 'display',
    nodeType: { type: 'Action', action_type: 'Display' },
    label: '显示文字',
    description: '在画布上直接显示文本数据（旧版）',
    icon: 'MessageSquare',
    color: '#06b6d4',
    defaultConfig: { 
      format: 'auto',
      showTokens: true,
    },
    inputs: [{ id: 'input', name: '输入数据', data_type: 'Any' }],
    outputs: [{ id: 'output', name: '透传', data_type: 'Any' }],
  },
  {
    type: 'action',
    nodeType: { type: 'Action', action_type: 'Integration' },
    label: '日志输出',
    description: '输出调试日志',
    icon: 'Terminal',
    color: '#6b7280',
    defaultConfig: { level: 'info' },
    inputs: [{ id: 'message', name: '日志内容', data_type: 'Any' }],
    outputs: [{ id: 'pass', name: '透传', data_type: 'Any' }],
  },
];

// Group nodes by category
export const nodeCategories: NodeCategory[] = [
  {
    id: 'triggers',
    name: '触发器',
    icon: 'Zap',
    nodes: nodeTemplates.filter(n => n.type === 'trigger'),
  },
  {
    id: 'data',
    name: '数据获取',
    icon: 'Download',
    nodes: nodeTemplates.filter(n => 
      n.type === 'action' && 
      ['HTTP请求', '网页爬虫'].includes(n.label)
    ),
  },
  // 网页爬虫分类
  scraperNodeCategory,
  {
    id: 'ai',
    name: 'AI节点',
    icon: 'Bot',
    nodes: nodeTemplates.filter(n => n.type === 'ai'),
  },
  // Agent 工具分类（声明性节点，不执行）
  agentToolCategory,
  // Agent 资源分类
  agentResourceCategory,
  // Agent 规则分类
  agentRuleCategory,
  {
    id: 'transform',
    name: '数据处理',
    icon: 'Shuffle',
    nodes: nodeTemplates.filter(n => 
      n.type === 'action' && 
      ['文本处理', '数据合并'].includes(n.label) ||
      n.type === 'jsonProcessor'
    ),
  },
  {
    id: 'logic',
    name: '逻辑控制',
    icon: 'GitBranch',
    nodes: nodeTemplates.filter(n => n.type === 'condition' || n.type === 'loop'),
  },
  {
    id: 'output',
    name: '输出',
    icon: 'FileOutput',
    nodes: nodeTemplates.filter(n => 
      n.type === 'display' ||
      n.type === 'output' ||
      (n.type === 'action' && ['日志输出'].includes(n.label))
    ),
  },
  {
    id: 'custom',
    name: '自定义',
    icon: 'Code',
    nodes: nodeTemplates.filter(n => n.type === 'custom'),
  },
];

// 导出所有节点模板（包括爬虫节点和 Agent 节点）
export const allNodeTemplates: NodeTemplate[] = [
  ...nodeTemplates,
  ...scraperNodeTemplates,
  ...agentToolTemplates,
  ...agentResourceTemplates,
  ...agentRuleTemplates,
];
