export interface ConverterToolOption {
  name: string
  label: string
  type: 'select' | 'input'
  choices?: { value: string; label: string }[]
  default?: string
}

export interface ConverterTool {
  id: string
  name: string
  icon: string
  description: string
  endpoint: string
  inputLabel: string
  outputLabel: string
  bidirectional?: boolean
  options?: ConverterToolOption[]
}

export const converterTools: ConverterTool[] = [
  {
    id: 'json-yaml',
    name: 'JSON ↔ YAML',
    icon: '📄',
    description: 'Chuyển đổi giữa JSON và YAML format',
    endpoint: '/api/converter/json-yaml',
    inputLabel: 'JSON',
    outputLabel: 'YAML',
    bidirectional: true,
  },
  {
    id: 'json-xml',
    name: 'JSON ↔ XML',
    icon: '🔗',
    description: 'Chuyển đổi giữa JSON và XML format',
    endpoint: '/api/converter/json-xml',
    inputLabel: 'JSON',
    outputLabel: 'XML',
    bidirectional: true,
  },
  {
    id: 'json-csv',
    name: 'JSON ↔ CSV',
    icon: '📊',
    description: 'Chuyển đổi giữa JSON và CSV format',
    endpoint: '/api/converter/json-csv',
    inputLabel: 'JSON',
    outputLabel: 'CSV',
    bidirectional: true,
  },
  {
    id: 'base64',
    name: 'Base64',
    icon: '🔐',
    description: 'Encode và decode Base64 string',
    endpoint: '/api/converter/base64',
    inputLabel: 'Input',
    outputLabel: 'Output',
    bidirectional: true,
    options: [
      {
        name: 'mode',
        label: 'Mode',
        type: 'select',
        default: 'encode',
        choices: [
          { value: 'encode', label: 'Encode' },
          { value: 'decode', label: 'Decode' },
        ],
      },
    ],
  },
  {
    id: 'jwt',
    name: 'JWT Decoder',
    icon: '🔑',
    description: 'Giải mã JWT token thành header, payload, signature',
    endpoint: '/api/converter/jwt',
    inputLabel: 'JWT Token',
    outputLabel: 'Decoded',
  },
  {
    id: 'hash',
    name: 'Hash Generator',
    icon: '#️⃣',
    description: 'Tạo hash MD5, SHA1, SHA256, SHA512',
    endpoint: '/api/converter/hash',
    inputLabel: 'Input Text',
    outputLabel: 'Hash',
    options: [
      {
        name: 'algorithm',
        label: 'Algorithm',
        type: 'select',
        default: 'sha256',
        choices: [
          { value: 'md5', label: 'MD5' },
          { value: 'sha1', label: 'SHA-1' },
          { value: 'sha256', label: 'SHA-256' },
          { value: 'sha512', label: 'SHA-512' },
        ],
      },
    ],
  },
  {
    id: 'uuid',
    name: 'UUID Generator',
    icon: '🆔',
    description: 'Tạo UUID v4 ngẫu nhiên',
    endpoint: '/api/converter/uuid',
    inputLabel: 'Count',
    outputLabel: 'UUIDs',
    options: [
      {
        name: 'version',
        label: 'Version',
        type: 'select',
        default: 'v4',
        choices: [
          { value: 'v4', label: 'UUID v4 (Random)' },
          { value: 'v7', label: 'UUID v7 (Time-based)' },
        ],
      },
      {
        name: 'count',
        label: 'Số lượng',
        type: 'input',
        default: '1',
      },
      {
        name: 'uppercase',
        label: 'Uppercase',
        type: 'select',
        default: 'false',
        choices: [
          { value: 'false', label: 'No' },
          { value: 'true', label: 'Yes' },
        ],
      },
    ],
  },
  {
    id: 'url',
    name: 'URL Encode/Decode',
    icon: '🌐',
    description: 'Encode và decode URL/URI components',
    endpoint: '/api/converter/url',
    inputLabel: 'Input',
    outputLabel: 'Output',
    bidirectional: true,
    options: [
      {
        name: 'mode',
        label: 'Mode',
        type: 'select',
        default: 'encode',
        choices: [
          { value: 'encode', label: 'Encode' },
          { value: 'decode', label: 'Decode' },
        ],
      },
    ],
  },
  {
    id: 'timestamp',
    name: 'Timestamp Converter',
    icon: '⏰',
    description: 'Chuyển đổi Unix timestamp ↔ DateTime',
    endpoint: '/api/converter/timestamp',
    inputLabel: 'Input',
    outputLabel: 'Output',
    bidirectional: true,
    options: [
      {
        name: 'mode',
        label: 'Mode',
        type: 'select',
        default: 'toDate',
        choices: [
          { value: 'toDate', label: 'Timestamp → DateTime' },
          { value: 'toTimestamp', label: 'DateTime → Timestamp' },
        ],
      },
      {
        name: 'unit',
        label: 'Đơn vị Timestamp',
        type: 'select',
        default: 'seconds',
        choices: [
          { value: 'seconds', label: 'Seconds' },
          { value: 'milliseconds', label: 'Milliseconds' },
        ],
      },
    ],
  },
  {
    id: 'qr',
    name: 'QR Generator',
    icon: '📱',
    description: 'Tạo QR code từ text hoặc URL',
    endpoint: '/api/converter/qr',
    inputLabel: 'Text / URL',
    outputLabel: 'QR Code',
    options: [
      {
        name: 'size',
        label: 'Size (px)',
        type: 'select',
        default: '256',
        choices: [
          { value: '128', label: '128 × 128' },
          { value: '256', label: '256 × 256' },
          { value: '512', label: '512 × 512' },
          { value: '1024', label: '1024 × 1024' },
        ],
      },
      {
        name: 'errorCorrectionLevel',
        label: 'Error Correction',
        type: 'select',
        default: 'M',
        choices: [
          { value: 'L', label: 'Low (7%)' },
          { value: 'M', label: 'Medium (15%)' },
          { value: 'Q', label: 'Quartile (25%)' },
          { value: 'H', label: 'High (30%)' },
        ],
      },
    ],
  },
]

export const getToolById = (id: string): ConverterTool | undefined =>
  converterTools.find((t) => t.id === id)
