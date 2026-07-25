/**
 * Service Registry — catalog of all API services available through the API Hub.
 * Used by /api/hub/services and /api/hub/docs endpoints.
 */

export interface ApiParam {
  name: string
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  required: boolean
  description: string
  default?: string | number | boolean
  enum?: string[]
  in: 'query' | 'body' | 'path'
}

export interface ApiExample {
  request: Record<string, unknown>
  response: Record<string, unknown>
}

export interface ApiService {
  id: string
  name: string
  endpoint: string
  description: string
  method: 'GET' | 'POST'
  authRequired: boolean
  rateLimit?: number
  category: 'converter' | 'shortener' | 'monitor' | 'utility'
  params?: ApiParam[]
  example?: ApiExample
}

export const services: ApiService[] = [
  // ==================== Converter Services ====================
  {
    id: 'json-yaml',
    name: 'JSON to YAML',
    endpoint: '/api/converter/json-yaml',
    description: 'Convert JSON data to YAML format',
    method: 'POST',
    authRequired: true,
    category: 'converter',
    params: [
      {
        name: 'json',
        type: 'string',
        required: true,
        description: 'JSON string to convert',
        in: 'body',
      },
    ],
    example: {
      request: { json: '{"name":"John","age":30}' },
      response: { yaml: 'name: John\nage: 30\n' },
    },
  },
  {
    id: 'json-xml',
    name: 'JSON to XML',
    endpoint: '/api/converter/json-xml',
    description: 'Convert JSON data to XML format',
    method: 'POST',
    authRequired: true,
    category: 'converter',
    params: [
      {
        name: 'json',
        type: 'string',
        required: true,
        description: 'JSON string to convert',
        in: 'body',
      },
    ],
    example: {
      request: { json: '{"name":"John","age":30}' },
      response: { xml: '<root><name>John</name><age>30</age></root>' },
    },
  },
  {
    id: 'json-csv',
    name: 'JSON to CSV',
    endpoint: '/api/converter/json-csv',
    description: 'Convert JSON array to CSV format',
    method: 'POST',
    authRequired: true,
    category: 'converter',
    params: [
      {
        name: 'json',
        type: 'string',
        required: true,
        description: 'JSON array to convert',
        in: 'body',
      },
    ],
    example: {
      request: { json: '[{"name":"John","age":30},{"name":"Jane","age":25}]' },
      response: { csv: 'name,age\nJohn,30\nJane,25\n' },
    },
  },
  {
    id: 'base64-encode',
    name: 'Base64 Encode',
    endpoint: '/api/converter/base64',
    description: 'Encode text to Base64 format',
    method: 'POST',
    authRequired: true,
    category: 'converter',
    params: [
      {
        name: 'action',
        type: 'string',
        required: false,
        description: 'encode or decode',
        default: 'encode',
        enum: ['encode', 'decode'],
        in: 'body',
      },
      {
        name: 'text',
        type: 'string',
        required: true,
        description: 'Text to encode/decode',
        in: 'body',
      },
    ],
    example: {
      request: { action: 'encode', text: 'Hello World' },
      response: { result: 'SGVsbG8gV29ybGQ=' },
    },
  },
  {
    id: 'hash',
    name: 'Hash Generator',
    endpoint: '/api/converter/hash',
    description: 'Generate hash (md5, sha1, sha256, sha512) from text',
    method: 'POST',
    authRequired: true,
    category: 'converter',
    params: [
      {
        name: 'text',
        type: 'string',
        required: true,
        description: 'Text to hash',
        in: 'body',
      },
      {
        name: 'algorithm',
        type: 'string',
        required: false,
        description: 'Hash algorithm',
        default: 'sha256',
        enum: ['md5', 'sha1', 'sha256', 'sha512'],
        in: 'body',
      },
    ],
    example: {
      request: { text: 'Hello World', algorithm: 'sha256' },
      response: {
        hash: 'a591a6d40bf420404a011713cf0417f5bec14e7c5c8dc0bb1f1cc1d7b21b0e93',
      },
    },
  },
  {
    id: 'jwt-decode',
    name: 'JWT Decoder',
    endpoint: '/api/converter/jwt',
    description: 'Decode a JWT token and view its header and payload',
    method: 'POST',
    authRequired: true,
    category: 'converter',
    params: [
      {
        name: 'token',
        type: 'string',
        required: true,
        description: 'JWT token to decode',
        in: 'body',
      },
    ],
    example: {
      request: {
        token: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0In0.signature',
      },
      response: {
        header: { alg: 'HS256' },
        payload: { sub: '1234' },
      },
    },
  },
  {
    id: 'timestamp',
    name: 'Timestamp Converter',
    endpoint: '/api/converter/timestamp',
    description: 'Convert between Unix timestamps and human-readable dates',
    method: 'POST',
    authRequired: true,
    category: 'converter',
    params: [
      {
        name: 'timestamp',
        type: 'number',
        required: false,
        description: 'Unix timestamp to convert',
        in: 'body',
      },
      {
        name: 'date',
        type: 'string',
        required: false,
        description: 'Date string to convert to timestamp',
        in: 'body',
      },
    ],
    example: {
      request: { timestamp: 1700000000 },
      response: {
        utc: 'Tue Nov 14 2023 22:13:20 GMT+0000',
        local: '2023-11-14T22:13:20.000Z',
      },
    },
  },
  {
    id: 'url-encode',
    name: 'URL Encode/Decode',
    endpoint: '/api/converter/url',
    description: 'Encode or decode URL strings',
    method: 'POST',
    authRequired: true,
    category: 'converter',
    params: [
      {
        name: 'action',
        type: 'string',
        required: false,
        description: 'encode or decode',
        default: 'encode',
        enum: ['encode', 'decode'],
        in: 'body',
      },
      {
        name: 'text',
        type: 'string',
        required: true,
        description: 'Text to encode/decode',
        in: 'body',
      },
    ],
    example: {
      request: { action: 'encode', text: 'hello world' },
      response: { result: 'hello%20world' },
    },
  },
  {
    id: 'uuid',
    name: 'UUID Generator',
    endpoint: '/api/converter/uuid',
    description: 'Generate random UUIDs (v4)',
    method: 'GET',
    authRequired: true,
    category: 'converter',
    params: [
      {
        name: 'count',
        type: 'number',
        required: false,
        description: 'Number of UUIDs to generate',
        default: 1,
        in: 'query',
      },
    ],
    example: {
      request: { count: 1 },
      response: { uuids: ['550e8400-e29b-41d4-a716-446655440000'] },
    },
  },

  // ==================== Shortener Services ====================
  {
    id: 'shorten',
    name: 'Shorten URL',
    endpoint: '/api/shortener',
    description: 'Create a short link from a long URL',
    method: 'POST',
    authRequired: true,
    category: 'shortener',
    params: [
      {
        name: 'url',
        type: 'string',
        required: true,
        description: 'The long URL to shorten',
        in: 'body',
      },
      {
        name: 'alias',
        type: 'string',
        required: false,
        description: 'Custom alias for the short link',
        in: 'body',
      },
      {
        name: 'password',
        type: 'string',
        required: false,
        description: 'Password to protect the link',
        in: 'body',
      },
      {
        name: 'expiresAt',
        type: 'string',
        required: false,
        description: 'Expiration date (ISO 8601)',
        in: 'body',
      },
    ],
    example: {
      request: { url: 'https://example.com/very/long/path' },
      response: {
        shortUrl: 'https://onedev.app/abc123',
        alias: 'abc123',
      },
    },
  },

  // ==================== Monitor Services ====================
  {
    id: 'check-url',
    name: 'Check URL Status',
    endpoint: '/api/monitor/check',
    description: 'Check if a URL is up and measure response time',
    method: 'POST',
    authRequired: true,
    category: 'monitor',
    params: [
      {
        name: 'url',
        type: 'string',
        required: true,
        description: 'URL to check',
        in: 'body',
      },
      {
        name: 'timeout',
        type: 'number',
        required: false,
        description: 'Timeout in seconds',
        default: 10,
        in: 'body',
      },
    ],
    example: {
      request: { url: 'https://example.com', timeout: 10 },
      response: {
        status: 'up',
        statusCode: 200,
        responseTime: 245,
      },
    },
  },
]

/**
 * Get a service by ID.
 */
export function getServiceById(id: string): ApiService | undefined {
  return services.find((s) => s.id === id)
}

/**
 * Get all services in a category.
 */
export function getServicesByCategory(category: ApiService['category']): ApiService[] {
  return services.filter((s) => s.category === category)
}

/**
 * Get all unique categories.
 */
export function getCategories(): string[] {
  return [...new Set(services.map((s) => s.category))]
}
