import { NextResponse } from 'next/server'
import { services } from '@/lib/api-hub/services'

/**
 * GET /api/hub/docs
 * API documentation in OpenAPI-style format.
 *
 * Returns a JSON document describing all available endpoints,
 * their parameters, authentication requirements, and examples.
 */
export async function GET() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://your-domain.com'

    // Build OpenAPI-style paths
    const paths: Record<string, Record<string, unknown>> = {}
    const tags = [...new Set(services.map((s) => s.category))]

    for (const service of services) {
      const pathKey = service.endpoint
      if (!paths[pathKey]) {
        paths[pathKey] = {}
      }

      const operation: Record<string, unknown> = {
        tags: [service.category],
        summary: service.name,
        description: service.description,
        operationId: service.id,
        security: service.authRequired ? [{ ApiKeyAuth: [] }] : [],
        parameters: [],
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
          '401': {
            description: 'Unauthorized — invalid or missing API key',
          },
          '429': {
            description: 'Rate limit exceeded',
          },
          '500': {
            description: 'Internal server error',
          },
        },
      }

      // Add parameters
      if (service.params && service.params.length > 0) {
        if (service.method === 'GET') {
          operation.parameters = service.params.map((p) => ({
            name: p.name,
            in: p.in,
            required: p.required,
            description: p.description,
            schema: {
              type: p.type,
              default: p.default,
              enum: p.enum,
            },
          }))
        } else {
          // POST — parameters go in request body
          const properties: Record<string, unknown> = {}
          const required: string[] = []
          for (const p of service.params || []) {
            properties[p.name] = {
              type: p.type,
              description: p.description,
              default: p.default,
              enum: p.enum,
            }
            if (p.required) required.push(p.name)
          }
          operation.requestBody = {
            required: required.length > 0,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties,
                  required: required.length > 0 ? required : undefined,
                },
              },
            },
          }
        }
      }

      // Add example
      if (service.example) {
        if (operation.requestBody) {
          ;(operation.requestBody as any).content = (operation.requestBody as any).content || {}
          ;(operation.requestBody as any).content['application/json'] = (operation.requestBody as any).content['application/json'] || {}
          ;(operation.requestBody as any).content['application/json'].example =
            service.example.request
        }
        ;(operation.responses['200'] as any).content = {
          'application/json': {
            example: service.example.response,
          },
        }
      }

      paths[pathKey][service.method.toLowerCase()] = operation
    }

    const doc = {
      openapi: '3.0.0',
      info: {
        title: 'OneDev API Hub',
        version: '1.0.0',
        description:
          'Unified API gateway for OneDev developer tools. All endpoints require an API key unless marked otherwise.\n\n' +
          '## Authentication\n\n' +
          'Pass your API key via one of these headers:\n' +
          '- `Authorization: Bearer sk_od_xxx`\n' +
          '- `X-API-Key: sk_od_xxx`\n\n' +
          '## Rate Limiting\n\n' +
          'Default rate limit is 100 requests per minute per key. ' +
          'Custom limits can be set per key.\n\n' +
          'Rate limit headers are included in every response:\n' +
          '- `X-RateLimit-Limit`: Maximum requests per window\n' +
          '- `X-RateLimit-Remaining`: Remaining requests in current window\n' +
          '- `X-RateLimit-Reset`: Unix timestamp when the window resets\n',
        contact: {
          name: 'OneDev API Hub',
        },
      },
      servers: [
        {
          url: baseUrl,
          description: 'API Server',
        },
      ],
      tags: tags.map((t) => ({
        name: t,
        description: `${t.charAt(0).toUpperCase() + t.slice(1)} services`,
      })),
      components: {
        securitySchemes: {
          ApiKeyAuth: {
            type: 'apiKey',
            in: 'header',
            name: 'X-API-Key',
            description: 'API key with format: sk_od_<32 alphanumeric chars>',
          },
          BearerAuth: {
            type: 'http',
            scheme: 'bearer',
            description: 'Use: Bearer sk_od_<your-key>',
          },
        },
      },
      paths,
    }

    return NextResponse.json(doc)
  } catch (error) {
    console.error('Failed to generate API docs:', error)
    return NextResponse.json(
      { error: 'Failed to generate API documentation' },
      { status: 500 }
    )
  }
}
