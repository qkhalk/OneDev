/**
 * Node Types Registry — Metadata for all available workflow node types.
 * Used by the frontend to render the node palette and by the engine for validation.
 */

export interface NodeTypeDefinition {
  type: string
  name: string
  icon: string
  color: string
  inputs: number
  outputs: number
  description: string
  category: 'action' | 'logic' | 'data' | 'flow'
  defaultData: Record<string, any>
}

export const nodeTypes: NodeTypeDefinition[] = [
  {
    type: 'message',
    name: 'Gửi tin nhắn',
    icon: 'Send',
    color: '#3B82F6',
    inputs: 1,
    outputs: 1,
    description: 'Gửi tin nhắn văn bản đến chat',
    category: 'action',
    defaultData: {
      text: '',
      parseMode: 'HTML',
    },
  },
  {
    type: 'http',
    name: 'HTTP Request',
    icon: 'Globe',
    color: '#10B981',
    inputs: 1,
    outputs: 1,
    description: 'Gọi API HTTP GET/POST',
    category: 'action',
    defaultData: {
      method: 'GET',
      url: '',
      headers: '{}',
      body: '',
      variableName: 'httpResponse',
      timeout: 10000,
    },
  },
  {
    type: 'condition',
    name: 'Điều kiện',
    icon: 'GitBranch',
    color: '#F59E0B',
    inputs: 1,
    outputs: 2,
    description: 'Rẽ nhánh if/else dựa trên biến',
    category: 'logic',
    defaultData: {
      variable: '',
      operator: '==',
      value: '',
    },
  },
  {
    type: 'delay',
    name: 'Chờ',
    icon: 'Clock',
    color: '#8B5CF6',
    inputs: 1,
    outputs: 1,
    description: 'Tạm dừng workflow (ms)',
    category: 'flow',
    defaultData: {
      ms: 1000,
    },
  },
  {
    type: 'variable',
    name: 'Biến',
    icon: 'Box',
    color: '#EC4899',
    inputs: 1,
    outputs: 1,
    description: 'Set hoặc cập nhật biến',
    category: 'data',
    defaultData: {
      name: '',
      value: '',
      type: 'string',
    },
  },
  {
    type: 'ai',
    name: 'AI',
    icon: 'Sparkles',
    color: '#6366F1',
    inputs: 1,
    outputs: 1,
    description: 'Gọi AI API (ChatGPT/Claude)',
    category: 'action',
    defaultData: {
      provider: 'openai',
      model: 'gpt-4o-mini',
      prompt: '',
      systemPrompt: '',
      apiKey: '',
      variableName: 'aiResponse',
      temperature: 0.7,
    },
  },
  {
    type: 'keyboard',
    name: 'Keyboard',
    icon: 'Grid',
    color: '#14B8A6',
    inputs: 1,
    outputs: 1,
    description: 'Gửi inline keyboard',
    category: 'action',
    defaultData: {
      text: '',
      buttons: '[]',
    },
  },
  {
    type: 'database',
    name: 'Database',
    icon: 'Database',
    color: '#F97316',
    inputs: 1,
    outputs: 1,
    description: 'Truy vấn SQLite (SELECT only)',
    category: 'data',
    defaultData: {
      query: '',
      variableName: 'dbResult',
    },
  },
  {
    type: 'loop',
    name: 'Vòng lặp',
    icon: 'Repeat',
    color: '#06B6D4',
    inputs: 1,
    outputs: 1,
    description: 'Lặp qua mảng biến',
    category: 'flow',
    defaultData: {
      arrayVariable: '',
      itemVariable: 'item',
      indexVariable: 'index',
    },
  },
  {
    type: 'schedule',
    name: 'Lịch trình',
    icon: 'Calendar',
    color: '#84CC16',
    inputs: 0,
    outputs: 1,
    description: 'Trigger theo cron schedule',
    category: 'flow',
    defaultData: {
      cron: '0 * * * *',
    },
  },
]

// Helper: get node type definition by type
export function getNodeType(type: string): NodeTypeDefinition | undefined {
  return nodeTypes.find((n) => n.type === type)
}

// Helper: get all valid node types
export function getValidNodeTypes(): string[] {
  return nodeTypes.map((n) => n.type)
}
