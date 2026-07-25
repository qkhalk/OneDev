/**
 * Workflow Engine — Executes workflow node graphs.
 * Supports: http, delay, condition, variable, message, keyboard, ai, database, loop, schedule.
 */

import { prisma } from '@/lib/db'

// ─── Types ────────────────────────────────────────────────────────────

export interface WorkflowNode {
  id: string
  type: 'http' | 'delay' | 'condition' | 'variable' | 'database' | 'ai' | 'message' | 'keyboard' | 'loop' | 'schedule'
  data: Record<string, any>
  position: { x: number; y: number }
}

export interface WorkflowEdge {
  source: string
  target: string
  sourceHandle?: string
}

export interface ExecutionContext {
  botId: string
  workflowId: string
  message: {
    text: string
    chatId: number
    userId: number
    username?: string
    type: string
  }
  variables: Record<string, any>
  steps: Array<{ nodeId: string; status: string; output?: any; error?: string }>
}

// ─── Workflow Engine ──────────────────────────────────────────────────

const MAX_EXECUTION_TIME_MS = 30_000 // 30 seconds timeout

export class WorkflowEngine {
  /**
   * Execute a workflow by ID with an incoming message.
   */
  async execute(workflowId: string, message: any): Promise<ExecutionContext> {
    const startTime = Date.now()

    // Load workflow
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
      include: { bot: true },
    })

    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`)
    }

    if (!workflow.enabled) {
      throw new Error(`Workflow ${workflowId} is disabled`)
    }

    // Parse nodes and edges
    const nodes: WorkflowNode[] = JSON.parse(workflow.nodes || '[]')
    const edges: WorkflowEdge[] = JSON.parse(workflow.edges || '[]')

    // Build execution context
    const ctx: ExecutionContext = {
      botId: workflow.botId,
      workflowId,
      message: {
        text: message.text || '',
        chatId: message.chatId || 0,
        userId: message.userId || 0,
        username: message.username,
        type: message.type || 'message',
      },
      variables: {},
      steps: [],
    }

    // Create execution record
    const execution = await prisma.execution.create({
      data: {
        workflowId,
        status: 'running',
        input: JSON.stringify(message),
      },
    })

    try {
      // Execute with timeout
      await this.executeWithTimeout(ctx, nodes, edges, startTime)

      // Update execution record — success
      await prisma.execution.update({
        where: { id: execution.id },
        data: {
          status: 'completed',
          output: JSON.stringify(ctx.variables),
          duration: Date.now() - startTime,
        },
      })
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)

      // Update execution record — failure
      await prisma.execution.update({
        where: { id: execution.id },
        data: {
          status: 'failed',
          error: errorMsg,
          output: JSON.stringify(ctx.variables),
          duration: Date.now() - startTime,
        },
      })

      console.error(`[Engine] Workflow ${workflowId} failed:`, errorMsg)
    }

    return ctx
  }

  /**
   * Execute workflow graph with timeout protection.
   */
  private async executeWithTimeout(
    ctx: ExecutionContext,
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    startTime: number
  ): Promise<void> {
    // Find entry nodes (nodes with no incoming edges, or schedule/trigger nodes)
    const entryNodes = this.findEntryNodes(nodes, edges)

    if (entryNodes.length === 0 && nodes.length > 0) {
      // If no clear entry, use first node
      entryNodes.push(nodes[0])
    }

    // Execute from each entry node, following edges
    const visited = new Set<string>()
    for (const entryNode of entryNodes) {
      await this.executeNodeRecursive(entryNode, ctx, nodes, edges, visited, startTime)
    }
  }

  /**
   * Find entry nodes (no incoming edges or trigger-type nodes).
   */
  private findEntryNodes(nodes: WorkflowNode[], edges: WorkflowEdge[]): WorkflowNode[] {
    const targetIds = new Set(edges.map((e) => e.target))
    const entryNodes = nodes.filter((n) => !targetIds.has(n.id))

    // If there are trigger-type nodes, prioritize them
    const triggerTypes = ['schedule']
    const triggerNodes = entryNodes.filter((n) => triggerTypes.includes(n.type))

    return triggerNodes.length > 0 ? triggerNodes : entryNodes
  }

  /**
   * Recursively execute a node and its successors.
   */
  private async executeNodeRecursive(
    node: WorkflowNode,
    ctx: ExecutionContext,
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    visited: Set<string>,
    startTime: number
  ): Promise<void> {
    // Check timeout
    if (Date.now() - startTime > MAX_EXECUTION_TIME_MS) {
      throw new Error('Workflow execution timeout (30s)')
    }

    // Prevent infinite loops
    if (visited.has(node.id)) {
      return
    }
    visited.add(node.id)

    // Execute the node
    const result = await this.executeNode(node, ctx)

    // Find next nodes based on edges
    let nextEdges = edges.filter((e) => e.source === node.id)

    // For condition nodes, filter by handle
    if (node.type === 'condition') {
      const conditionResult = result === true
      nextEdges = nextEdges.filter((e) => {
        if (conditionResult) {
          return !e.sourceHandle || e.sourceHandle === 'true'
        } else {
          return !e.sourceHandle || e.sourceHandle === 'false'
        }
      })
    }

    // Execute next nodes
    for (const edge of nextEdges) {
      const nextNode = nodes.find((n) => n.id === edge.target)
      if (nextNode) {
        await this.executeNodeRecursive(nextNode, ctx, nodes, edges, visited, startTime)
      }
    }
  }

  /**
   * Execute a single node.
   */
  async executeNode(node: WorkflowNode, ctx: ExecutionContext): Promise<any> {
    const step = { nodeId: node.id, status: 'running' }
    ctx.steps.push(step)

    try {
      let result: any

      switch (node.type) {
        case 'http':
          result = await this.executeHttp(node, ctx)
          break
        case 'delay':
          await this.executeDelay(node, ctx)
          result = { delayed: true }
          break
        case 'condition':
          result = await this.executeCondition(node, ctx)
          break
        case 'variable':
          await this.executeVariable(node, ctx)
          result = { variableSet: true }
          break
        case 'message':
          await this.executeMessage(node, ctx)
          result = { messageSent: true }
          break
        case 'keyboard':
          await this.executeKeyboard(node, ctx)
          result = { keyboardSent: true }
          break
        case 'ai':
          result = await this.executeAI(node, ctx)
          break
        case 'database':
          result = await this.executeDatabase(node, ctx)
          break
        case 'loop':
          result = await this.executeLoop(node, ctx)
          break
        case 'schedule':
          result = { scheduled: true }
          break
        default:
          throw new Error(`Unknown node type: ${node.type}`)
      }

      step.status = 'completed'
      ;(step as any).output = result
      return result
    } catch (err) {
      step.status = 'failed'
      ;(step as any).error = err instanceof Error ? err.message : String(err)
      throw err
    }
  }

  // ─── Node Executors ──────────────────────────────────────────────────

  /**
   * HTTP Request node — fetch URL and store response.
   */
  private async executeHttp(node: WorkflowNode, ctx: ExecutionContext): Promise<any> {
    const { method = 'GET', url, headers = '{}', body = '', variableName = 'httpResponse', timeout = 10000 } = node.data

    if (!url) {
      throw new Error('HTTP node: url is required')
    }

    // Replace variables in URL
    const resolvedUrl = this.resolveVariables(url, ctx)

    const parsedHeaders = JSON.parse(headers || '{}')
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const fetchOptions: RequestInit = {
        method,
        headers: parsedHeaders,
        signal: controller.signal,
      }

      if (method !== 'GET' && body) {
        fetchOptions.body = this.resolveVariables(body, ctx)
      }

      const response = await fetch(resolvedUrl, fetchOptions)
      const responseText = await response.text()

      let responseData: any
      try {
        responseData = JSON.parse(responseText)
      } catch {
        responseData = responseText
      }

      const result = {
        status: response.status,
        ok: response.ok,
        data: responseData,
        headers: Object.fromEntries(response.headers.entries()),
      }

      // Store in variable
      ctx.variables[variableName] = result

      return result
    } finally {
      clearTimeout(timeoutId)
    }
  }

  /**
   * Delay node — sleep for ms.
   */
  private async executeDelay(node: WorkflowNode, ctx: ExecutionContext): Promise<void> {
    const ms = Number(node.data.ms) || 1000
    await new Promise((resolve) => setTimeout(resolve, Math.min(ms, 10000))) // max 10s per delay
  }

  /**
   * Condition node — compare variable and return boolean.
   */
  private async executeCondition(node: WorkflowNode, ctx: ExecutionContext): Promise<boolean> {
    const { variable, operator = '==', value } = node.data

    const varValue = this.getVariable(variable, ctx)
    const compareValue = this.resolveVariables(value, ctx)

    let result: boolean

    switch (operator) {
      case '==':
        result = String(varValue) === String(compareValue)
        break
      case '!=':
        result = String(varValue) !== String(compareValue)
        break
      case '>':
        result = Number(varValue) > Number(compareValue)
        break
      case '<':
        result = Number(varValue) < Number(compareValue)
        break
      case '>=':
        result = Number(varValue) >= Number(compareValue)
        break
      case '<=':
        result = Number(varValue) <= Number(compareValue)
        break
      case 'contains':
        result = String(varValue).includes(String(compareValue))
        break
      case 'startsWith':
        result = String(varValue).startsWith(String(compareValue))
        break
      case 'endsWith':
        result = String(varValue).endsWith(String(compareValue))
        break
      default:
        result = false
    }

    return result
  }

  /**
   * Variable node — set/update a variable.
   */
  private async executeVariable(node: WorkflowNode, ctx: ExecutionContext): Promise<void> {
    const { name, value, type = 'string' } = node.data

    if (!name) {
      throw new Error('Variable node: name is required')
    }

    const resolvedValue = this.resolveVariables(value, ctx)

    let parsedValue: any = resolvedValue
    switch (type) {
      case 'number':
        parsedValue = Number(resolvedValue)
        break
      case 'boolean':
        parsedValue = resolvedValue === 'true' || resolvedValue as any === true
        break
      case 'json':
        try {
          parsedValue = JSON.parse(resolvedValue)
        } catch {
          parsedValue = resolvedValue
        }
        break
    }

    ctx.variables[name] = parsedValue
  }

  /**
   * Message node — send a Telegram message.
   */
  private async executeMessage(node: WorkflowNode, ctx: ExecutionContext): Promise<void> {
    const { text = '', parseMode = 'HTML' } = node.data

    if (!text) {
      throw new Error('Message node: text is required')
    }

    const resolvedText = this.resolveVariables(text, ctx)

    // Send via Telegram API
    await this.sendTelegramMessage(ctx.botId, ctx.message.chatId, resolvedText, parseMode)
  }

  /**
   * Keyboard node — send inline keyboard.
   */
  private async executeKeyboard(node: WorkflowNode, ctx: ExecutionContext): Promise<void> {
    const { text = '', buttons = '[]' } = node.data

    const resolvedText = this.resolveVariables(text, ctx)
    const parsedButtons = JSON.parse(buttons || '[]')

    // Build inline_keyboard format
    const inlineKeyboard = parsedButtons.map((row: any[]) =>
      row.map((btn: any) => ({
        text: this.resolveVariables(btn.text || btn.label || 'Button', ctx),
        callback_data: btn.callback_data || btn.data || btn.value || 'noop',
        url: btn.url || undefined,
      }))
    )

    await this.sendTelegramMessage(ctx.botId, ctx.message.chatId, resolvedText, 'HTML', {
      reply_markup: { inline_keyboard: inlineKeyboard },
    })
  }

  /**
   * AI node — call AI API (placeholder/mock).
   */
  private async executeAI(node: WorkflowNode, ctx: ExecutionContext): Promise<string> {
    const {
      provider = 'openai',
      model = 'gpt-4o-mini',
      prompt = '',
      systemPrompt = '',
      apiKey = '',
      variableName = 'aiResponse',
      temperature = 0.7,
    } = node.data

    if (!prompt) {
      throw new Error('AI node: prompt is required')
    }

    const resolvedPrompt = this.resolveVariables(prompt, ctx)
    const resolvedSystemPrompt = this.resolveVariables(systemPrompt, ctx)

    let result: string

    if (apiKey) {
      // Real API call
      try {
        if (provider === 'openai') {
          result = await this.callOpenAI(apiKey, model, resolvedPrompt, resolvedSystemPrompt, temperature)
        } else if (provider === 'anthropic') {
          result = await this.callAnthropic(apiKey, model, resolvedPrompt, resolvedSystemPrompt, temperature)
        } else {
          result = `[AI Mock] Provider "${provider}" not implemented. Prompt: ${resolvedPrompt}`
        }
      } catch (err) {
        result = `[AI Error] ${err instanceof Error ? err.message : String(err)}`
      }
    } else {
      // Mock response when no API key
      result = `[AI Mock] No API key provided. Prompt was: "${resolvedPrompt}"`
    }

    ctx.variables[variableName] = result
    return result
  }

  /**
   * Database node — safe SELECT query.
   */
  private async executeDatabase(node: WorkflowNode, ctx: ExecutionContext): Promise<any> {
    const { query = '', variableName = 'dbResult' } = node.data

    if (!query) {
      throw new Error('Database node: query is required')
    }

    // Safety: only allow SELECT queries
    const normalizedQuery = query.trim().toUpperCase()
    if (!normalizedQuery.startsWith('SELECT')) {
      throw new Error('Database node: only SELECT queries are allowed')
    }

    // Check for dangerous keywords
    const dangerous = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'CREATE', 'PRAGMA']
    for (const kw of dangerous) {
      if (normalizedQuery.includes(kw)) {
        throw new Error(`Database node: ${kw} statements are not allowed`)
      }
    }

    // Execute raw query
    const resolvedQuery = this.resolveVariables(query, ctx)
    const results = await prisma.$queryRawUnsafe(resolvedQuery)

    ctx.variables[variableName] = results
    return results
  }

  /**
   * Loop node — iterate array variable (placeholder, executes once).
   */
  private async executeLoop(node: WorkflowNode, ctx: ExecutionContext): Promise<any> {
    const { arrayVariable = '', itemVariable = 'item', indexVariable = 'index' } = node.data

    const arr = ctx.variables[arrayVariable]
    if (!Array.isArray(arr)) {
      return { looped: false, reason: 'Variable is not an array' }
    }

    // Note: actual iteration happens via edges in the graph
    // This node just validates and sets up loop context
    return { looped: true, count: arr.length }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────

  /**
   * Resolve {{variable}} placeholders in a string.
   */
  private resolveVariables(text: string, ctx: ExecutionContext): string {
    if (typeof text !== 'string') return text

    return text.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
      const value = this.getVariable(path, ctx)
      if (value === undefined || value === null) return match
      if (typeof value === 'object') return JSON.stringify(value)
      return String(value)
    })
  }

  /**
   * Get a variable value by path (supports dot notation).
   */
  private getVariable(path: string, ctx: ExecutionContext): any {
    if (!path) return undefined

    // Built-in variables
    if (path === 'message.text') return ctx.message.text
    if (path === 'message.chatId') return ctx.message.chatId
    if (path === 'message.userId') return ctx.message.userId
    if (path === 'message.username') return ctx.message.username
    if (path === 'message.type') return ctx.message.type

    // Custom variables (supports dot notation)
    const parts = path.split('.')
    let value: any = ctx.variables

    for (const part of parts) {
      if (value === undefined || value === null) return undefined
      value = value[part]
    }

    return value
  }

  /**
   * Send a Telegram message via Bot API.
   */
  private async sendTelegramMessage(
    botId: string,
    chatId: number,
    text: string,
    parseMode?: string,
    extra?: Record<string, any>
  ): Promise<void> {
    const bot = await prisma.bot.findUnique({ where: { id: botId } })
    if (!bot) {
      throw new Error(`Bot ${botId} not found`)
    }

    const url = `https://api.telegram.org/bot${bot.token}/sendMessage`
    const body: any = {
      chat_id: chatId,
      text,
      ...extra,
    }

    if (parseMode) {
      body.parse_mode = parseMode
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Telegram API error: ${response.status} ${errorText}`)
    }
  }

  /**
   * Call OpenAI Chat Completions API.
   */
  private async callOpenAI(
    apiKey: string,
    model: string,
    prompt: string,
    systemPrompt: string,
    temperature: number
  ): Promise<string> {
    const messages: any[] = []
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt })
    }
    messages.push({ role: 'user', content: prompt })

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenAI API error: ${response.status} ${error}`)
    }

    const data = await response.json()
    return data.choices?.[0]?.message?.content || ''
  }

  /**
   * Call Anthropic Messages API.
   */
  private async callAnthropic(
    apiKey: string,
    model: string,
    prompt: string,
    systemPrompt: string,
    temperature: number
  ): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        system: systemPrompt || undefined,
        messages: [{ role: 'user', content: prompt }],
        temperature,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Anthropic API error: ${response.status} ${error}`)
    }

    const data = await response.json()
    return data.content?.[0]?.text || ''
  }
}

// Singleton instance
export const engine = new WorkflowEngine()
