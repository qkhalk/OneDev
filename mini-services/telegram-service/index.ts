/**
 * Telegram Bot Service for Multi-Server SSH Dashboard (Multi-User)
 *
 * Runs on port 3004
 * Uses long polling to receive Telegram updates
 * Executes SSH commands directly using ssh2
 * Supports per-user server isolation and OTP delivery
 *
 * Multi-User Design:
 * - Loads ALL enabled Telegram configs from the dashboard
 * - Maps Telegram user IDs → dashboard users
 * - Each Telegram user can only see/control their own dashboard user's servers
 * - Uses SERVICE_KEY for service-to-service authentication
 */

import { Client, ConnectConfig } from "ssh2";

// ============ Types ============

interface Server {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  authType: string;
  password: string | null;
  privateKey: string | null;
  group: string;
  tags: string;
  status: string;
  lastChecked: string | null;
  os: string | null;
  createdAt: string;
  updatedAt: string;
}

interface UserTelegramConfig {
  id: string;
  botToken: string;
  chatId: string | null;
  enabled: boolean;
  allowUsers: number[];
  userId: string; // Dashboard user ID
  user: {
    id: string;
    username: string;
    displayName: string;
    isActive: boolean;
  };
}

interface TelegramMessage {
  message_id: number;
  from?: {
    id: number;
    is_bot: boolean;
    first_name: string;
    username?: string;
  };
  chat: {
    id: number;
    type: string;
  };
  text?: string;
  date: number;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

interface SSHResult {
  serverName: string;
  serverHost: string;
  success: boolean;
  output: string;
  error?: string;
  exitCode?: number;
}

// ============ Constants ============

const PORT = 3004;
const MAIN_APP_URL = "http://localhost:3000";
const SERVICE_KEY = process.env.SERVICE_KEY || "sk_nextssh_ebbc15231e5590c3d72c022969c4d63f";
const POLL_INTERVAL = 2000;
const CONFIG_RETRY_INTERVAL = 30000;
const COMMAND_TIMEOUT = 30000;

// ============ State ============

let botToken: string | null = null;
let botEnabled = false;
let lastUpdateId = 0;
let pollingActive = false;
let configLoaded = false;
let pollingPromise: Promise<void> | null = null;

// Multi-user: Map telegramUserId → UserTelegramConfig
const telegramUserMap = new Map<number, UserTelegramConfig>();

// All enabled configs
let allConfigs: UserTelegramConfig[] = [];

// ============ Utility Functions ============

function log(level: "INFO" | "WARN" | "ERROR" | "DEBUG", message: string) {
  // Sensitive: do not log full server configs (decrypted SSH passwords/keys).
  // Only log identifiers (server IDs, commands, status).
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level}] ${message}`);
}

function serviceHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "X-Service-Key": SERVICE_KEY,
  };
}

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...serviceHeaders(),
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText} for ${url}`);
  }

  return response.json() as Promise<T>;
}

async function telegramAPI(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
  if (!botToken) {
    throw new Error("Bot token not configured");
  }

  const url = `https://api.telegram.org/bot${botToken}/${method}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  const data = await response.json() as { ok: boolean; description?: string; result?: unknown };

  if (!data.ok) {
    throw new Error(`Telegram API error: ${data.description || "Unknown error"}`);
  }

  return data.result;
}

async function sendMessage(chatId: number, text: string, options?: { parse_mode?: string }): Promise<void> {
  try {
    await telegramAPI("sendMessage", {
      chat_id: chatId,
      text,
      parse_mode: options?.parse_mode || "HTML",
      disable_web_page_preview: true,
    });
  } catch (error) {
    log("ERROR", `Failed to send message to ${chatId}: ${error}`);
  }
}

/**
 * Find which dashboard user a Telegram user belongs to.
 * Returns the UserTelegramConfig or null if not authorized.
 */
function findConfigForTelegramUser(telegramUserId: number): UserTelegramConfig | null {
  return telegramUserMap.get(telegramUserId) || null;
}

// ============ Config Management ============

async function loadAllConfigs(): Promise<boolean> {
  try {
    const data = await fetchJSON<{ configs: UserTelegramConfig[] }>(
      `${MAIN_APP_URL}/api/service/telegram-configs`
    );

    if (!data.configs || data.configs.length === 0) {
      log("WARN", "No enabled Telegram configs found. Waiting for configuration...");
      return false;
    }

    allConfigs = data.configs;

    // Clear and rebuild the telegram user → config map
    telegramUserMap.clear();

    // Use the first config's bot token (all users share the same bot in the common setup)
    // If different users have different bots, we'd need multiple polling loops
    const firstConfig = allConfigs[0];

    if (firstConfig.botToken && firstConfig.botToken !== botToken) {
      botToken = firstConfig.botToken;
      log("INFO", `Bot token updated`);
    }

    botEnabled = true;
    configLoaded = true;

    // Build the map: telegramUserId → config
    for (const config of allConfigs) {
      if (!config.user.isActive) continue; // Skip disabled users

      for (const telegramUserId of config.allowUsers) {
        telegramUserMap.set(telegramUserId, config);
      }
    }

    log("INFO", `Config loaded: ${allConfigs.length} config(s), ${telegramUserMap.size} Telegram user(s) mapped`);
    return true;
  } catch (error) {
    log("ERROR", `Failed to load configs: ${error}`);
    return false;
  }
}

// ============ Server & SSH Functions ============

async function fetchServers(userId: string): Promise<Server[]> {
  try {
    const data = await fetchJSON<{ servers: Server[] }>(
      `${MAIN_APP_URL}/api/service/servers?userId=${userId}`
    );
    return data.servers || [];
  } catch (error) {
    log("ERROR", `Failed to fetch servers for user ${userId}: ${error}`);
    return [];
  }
}

function findServer(servers: Server[], query: string): Server | undefined {
  const byId = servers.find((s) => s.id === query);
  if (byId) return byId;

  const byName = servers.find((s) => s.name.toLowerCase() === query.toLowerCase());
  if (byName) return byName;

  const byPartial = servers.find((s) =>
    s.name.toLowerCase().includes(query.toLowerCase())
  );
  return byPartial;
}

function executeSSHCommand(server: Server, command: string): Promise<SSHResult> {
  return new Promise((resolve) => {
    const conn = new Client();
    let stdout = "";
    let stderr = "";
    let exitCode: number | undefined;

    const timeout = setTimeout(() => {
      conn.end();
      resolve({
        serverName: server.name,
        serverHost: server.host,
        success: false,
        output: "Command timed out",
        exitCode: -1,
      });
    }, COMMAND_TIMEOUT);

    conn.on("ready", () => {
      conn.exec(command, (err, stream) => {
        if (err) {
          clearTimeout(timeout);
          conn.end();
          resolve({
            serverName: server.name,
            serverHost: server.host,
            success: false,
            output: err.message,
          });
          return;
        }

        stream.on("data", (data: Buffer) => {
          stdout += data.toString();
        });

        stream.stderr.on("data", (data: Buffer) => {
          stderr += data.toString();
        });

        stream.on("close", (code: number | null) => {
          clearTimeout(timeout);
          exitCode = code ?? undefined;
          conn.end();
          resolve({
            serverName: server.name,
            serverHost: server.host,
            success: code === 0,
            output: stdout || stderr,
            error: stderr || undefined,
            exitCode,
          });
        });
      });
    });

    conn.on("error", (err) => {
      clearTimeout(timeout);
      resolve({
        serverName: server.name,
        serverHost: server.host,
        success: false,
        output: `Connection failed: ${err.message}`,
      });
    });

    const sshConfig: ConnectConfig = {
      host: server.host,
      port: server.port,
      username: server.username,
      readyTimeout: 15000,
    };

    if (server.authType === "key" && server.privateKey) {
      sshConfig.privateKey = server.privateKey;
    } else if (server.password) {
      sshConfig.password = server.password;
    }

    conn.connect(sshConfig);
  });
}

// ============ Command Handlers ============

async function handleStart(chatId: number, from: TelegramMessage["from"], config: UserTelegramConfig): Promise<void> {
  const userName = from?.first_name || "User";
  const text = `👋 Hello <b>${escapeHTML(userName)}</b>!\n\n` +
    `Welcome to the <b>SSH Dashboard Bot</b> (User: ${escapeHTML(config.user.displayName)}).\n\n` +
    `Available commands:\n` +
    `/servers - List your servers\n` +
    `/status - Check your server statuses\n` +
    `/run &lt;server&gt; &lt;command&gt; - Run command on a server\n` +
    `/runall &lt;command&gt; - Run command on all your servers\n` +
    `/otp - Request an OTP code\n` +
    `/help - Show detailed help`;

  await sendMessage(chatId, text);
}

async function handleServers(chatId: number, config: UserTelegramConfig): Promise<void> {
  try {
    const servers = await fetchServers(config.userId);

    if (servers.length === 0) {
      await sendMessage(chatId, "📋 No servers configured for your account.");
      return;
    }

    let text = `📋 <b>Your Servers</b> (${config.user.displayName})\n\n`;

    for (const server of servers) {
      const statusEmoji = server.status === "online" ? "🟢" : server.status === "offline" ? "🔴" : "⚪";
      text += `${statusEmoji} <b>${escapeHTML(server.name)}</b>\n`;
      text += `   Host: <code>${escapeHTML(server.host)}:${server.port}</code>\n`;
      text += `   User: ${escapeHTML(server.username)} | Group: ${escapeHTML(server.group)}\n\n`;
    }

    if (text.length > 4000) {
      const chunks = splitMessage(text, 4000);
      for (const chunk of chunks) {
        await sendMessage(chatId, chunk);
      }
    } else {
      await sendMessage(chatId, text);
    }
  } catch (error) {
    log("ERROR", `Failed to handle /servers: ${error}`);
    await sendMessage(chatId, "❌ Failed to fetch server list.");
  }
}

async function handleStatus(chatId: number, config: UserTelegramConfig): Promise<void> {
  try {
    const servers = await fetchServers(config.userId);

    if (servers.length === 0) {
      await sendMessage(chatId, "📋 No servers configured for your account.");
      return;
    }

    let text = `📊 <b>Server Status</b> (${config.user.displayName})\n\n`;
    let onlineCount = 0;
    let offlineCount = 0;
    let unknownCount = 0;

    for (const server of servers) {
      const statusEmoji = server.status === "online" ? "🟢" : server.status === "offline" ? "🔴" : "⚪";
      const statusText = server.status === "online" ? "Online" : server.status === "offline" ? "Offline" : "Unknown";
      text += `${statusEmoji} <b>${escapeHTML(server.name)}</b> - ${statusText}\n`;

      if (server.lastChecked) {
        text += `   Last checked: ${new Date(server.lastChecked).toLocaleString()}\n`;
      }

      if (server.os) {
        text += `   OS: ${escapeHTML(server.os)}\n`;
      }

      text += "\n";

      if (server.status === "online") onlineCount++;
      else if (server.status === "offline") offlineCount++;
      else unknownCount++;
    }

    text += `━━━━━━━━━━━━━━━\n`;
    text += `Total: ${servers.length} | 🟢 ${onlineCount} | 🔴 ${offlineCount} | ⚪ ${unknownCount}`;

    await sendMessage(chatId, text);
  } catch (error) {
    log("ERROR", `Failed to handle /status: ${error}`);
    await sendMessage(chatId, "❌ Failed to fetch server status.");
  }
}

async function handleRun(chatId: number, args: string, config: UserTelegramConfig): Promise<void> {
  if (!args.trim()) {
    await sendMessage(chatId, "⚠️ Usage: <code>/run &lt;server_name_or_id&gt; &lt;command&gt;</code>");
    return;
  }

  const parts = args.trim().split(/\s+/);
  const serverQuery = parts[0];
  const command = parts.slice(1).join(" ");

  if (!command) {
    await sendMessage(chatId, "⚠️ Usage: <code>/run &lt;server_name_or_id&gt; &lt;command&gt;</code>");
    return;
  }

  try {
    const servers = await fetchServers(config.userId);
    const server = findServer(servers, serverQuery);

    if (!server) {
      await sendMessage(chatId, `❌ Server <code>${escapeHTML(serverQuery)}</code> not found in your account.\nUse /servers to see your servers.`);
      return;
    }

    await sendMessage(chatId, `⏳ Running command on <b>${escapeHTML(server.name)}</b>...\n<code>${escapeHTML(command)}</code>`);

    const result = await executeSSHCommand(server, command);

    let text = `🖥 <b>${escapeHTML(result.serverName)}</b> (${escapeHTML(result.serverHost)})\n`;
    text += `Command: <code>${escapeHTML(command)}</code>\n`;
    text += `Status: ${result.success ? "✅ Success" : "❌ Failed"}${result.exitCode !== undefined ? ` (exit: ${result.exitCode})` : ""}\n\n`;

    if (result.output) {
      const output = result.output.length > 3000 ? result.output.substring(0, 3000) + "\n... (truncated)" : result.output;
      text += `<pre>${escapeHTML(output)}</pre>`;
    }

    await sendMessage(chatId, text);
    await logCommand(command, [server.id], "single", config.userId);
  } catch (error) {
    log("ERROR", `Failed to handle /run: ${error}`);
    await sendMessage(chatId, `❌ Error executing command: ${error}`);
  }
}

async function handleRunAll(chatId: number, args: string, config: UserTelegramConfig): Promise<void> {
  if (!args.trim()) {
    await sendMessage(chatId, "⚠️ Usage: <code>/runall &lt;command&gt;</code>");
    return;
  }

  const command = args.trim();

  try {
    const servers = await fetchServers(config.userId);

    if (servers.length === 0) {
      await sendMessage(chatId, "📋 No servers configured for your account.");
      return;
    }

    await sendMessage(chatId, `⏳ Running command on <b>${servers.length}</b> servers...\n<code>${escapeHTML(command)}</code>`);

    const results = await Promise.all(
      servers.map((server) => executeSSHCommand(server, command))
    );

    let text = `🖥 <b>Command Results</b> (${servers.length} servers)\n`;
    text += `Command: <code>${escapeHTML(command)}</code>\n\n`;

    let successCount = 0;
    let failCount = 0;

    for (const result of results) {
      const icon = result.success ? "✅" : "❌";
      text += `${icon} <b>${escapeHTML(result.serverName)}</b> (${escapeHTML(result.serverHost)})\n`;

      if (result.output) {
        const output = result.output.length > 500 ? result.output.substring(0, 500) + "..." : result.output;
        text += `<pre>${escapeHTML(output)}</pre>\n`;
      }

      text += "\n";

      if (result.success) successCount++;
      else failCount++;
    }

    text += `━━━━━━━━━━━━━━━\n`;
    text += `✅ ${successCount} succeeded | ❌ ${failCount} failed`;

    if (text.length > 4000) {
      const chunks = splitMessage(text, 4000);
      for (const chunk of chunks) {
        await sendMessage(chatId, chunk);
      }
    } else {
      await sendMessage(chatId, text);
    }

    await logCommand(command, servers.map((s) => s.id), "broadcast", config.userId);
  } catch (error) {
    log("ERROR", `Failed to handle /runall: ${error}`);
    await sendMessage(chatId, `❌ Error executing command: ${error}`);
  }
}

// ── OTP Command Handler ────────────────────────────────────────────────────

async function handleOTP(chatId: number, from: TelegramMessage["from"], config: UserTelegramConfig): Promise<void> {
  const userId = from?.id || 0;
  const userName = from?.first_name || "User";

  log("INFO", `OTP request from ${userName} (${userId}) for dashboard user ${config.user.displayName}`);

  // Generate a 6-digit OTP
  const otpCode = String(Math.floor(100000 + Math.random() * 900000));

  // Send the OTP to the requesting user
  const text = `🔐 <b>Your OTP Code</b>\n\n` +
    `Account: <b>${escapeHTML(config.user.displayName)}</b>\n` +
    `Code: <code>${otpCode}</code>\n\n` +
    `This code expires in 5 minutes.\n` +
    `Use this code in the SSH Dashboard to verify your action.\n\n` +
    `⚠️ If you did not request this code, please ignore this message.`;

  await sendMessage(chatId, text);

  // Store the OTP via the dashboard API (scoped to the dashboard user)
  try {
    await fetchJSON(`${MAIN_APP_URL}/api/auth/otp/internal`, {
      method: "POST",
      body: JSON.stringify({
        code: otpCode,
        purpose: "telegram_config",
        chatId: String(chatId),
        userId: config.userId,
      }),
    });
  } catch (error) {
    log("WARN", `Failed to store OTP via API: ${error}. OTP is still delivered via Telegram.`);
  }

  log("INFO", `OTP sent to chat ${chatId} for user ${config.user.displayName}`);
}

async function handleHelp(chatId: number): Promise<void> {
  const text = `📖 <b>SSH Dashboard Bot - Help</b>\n\n` +
    `<b>/start</b> - Welcome message\n` +
    `<b>/servers</b> - List your servers\n` +
    `<b>/status</b> - Check status of your servers\n` +
    `<b>/run &lt;server&gt; &lt;command&gt;</b> - Run a command on a specific server\n` +
    `   Example: <code>/run web1 uptime</code>\n` +
    `   Example: <code>/run web1 df -h</code>\n` +
    `<b>/runall &lt;command&gt;</b> - Run a command on ALL your servers\n` +
    `   Example: <code>/runall uptime</code>\n` +
    `<b>/otp</b> - Request an OTP code for dashboard verification\n` +
    `<b>/help</b> - Show this help message\n\n` +
    `🔐 <b>Security:</b>\n` +
    `• Each Telegram user is mapped to a dashboard account\n` +
    `• You can only see and control your own servers\n` +
    `• OTP codes are required for sensitive dashboard operations\n` +
    `• OTP codes expire after 5 minutes`;

  await sendMessage(chatId, text);
}

// ============ Logging ============

async function logCommand(command: string, serverIds: string[], mode: string, userId: string): Promise<void> {
  try {
    // Use the service endpoint or internal API with service key
    await fetch(`${MAIN_APP_URL}/api/command-history`, {
      method: "POST",
      headers: serviceHeaders(),
      body: JSON.stringify({
        command,
        serverIds: JSON.stringify(serverIds),
        mode,
        executedBy: "telegram",
        userId,
      }),
    });
  } catch (error) {
    log("WARN", `Failed to log command to history: ${error}`);
  }
}

// ============ Telegram Polling ============

async function getUpdates(): Promise<TelegramUpdate[]> {
  try {
    const result = await telegramAPI("getUpdates", {
      offset: lastUpdateId + 1,
      timeout: 30,
      allowed_updates: ["message"],
    });

    return (result as TelegramUpdate[]) || [];
  } catch (error) {
    log("ERROR", `Failed to get updates: ${error}`);
    return [];
  }
}

async function processUpdate(update: TelegramUpdate): Promise<void> {
  // The bot does not persist message history; messages are only relayed in real time
  // to the requesting user. Sensitive data (OTP codes, command output) is never logged
  // to disk or broadcast to other users.
  if (!update.message || !update.message.text) {
    return;
  }

  const { message } = update;
  const chatId = message.chat.id;
  const text = message.text;
  const from = message.from;

  const userName = from?.username || from?.first_name || "Unknown";
  const telegramUserId = from?.id || 0;
  log("INFO", `Message from ${userName} (${telegramUserId}): ${text}`);

  // Find which dashboard user this Telegram user belongs to
  const config = findConfigForTelegramUser(telegramUserId);

  if (!config) {
    log("WARN", `Unauthorized access attempt from user ${telegramUserId} (${userName})`);
    await sendMessage(chatId, "🚫 Unauthorized. Your Telegram user ID is not in any allowed list.\n\nContact the admin to get access.");
    return;
  }

  if (!config.user.isActive) {
    log("WARN", `Disabled dashboard user access from ${telegramUserId} (${userName})`);
    await sendMessage(chatId, "🚫 Your dashboard account has been disabled. Contact the admin.");
    return;
  }

  const commandMatch = text.match(/^\/(\w+)(?:@\w+)?(?:\s+(.*))?$/s);
  if (!commandMatch) return;

  const command = commandMatch[1].toLowerCase();
  const args = commandMatch[2] || "";

  try {
    switch (command) {
      case "start":
        await handleStart(chatId, from, config);
        break;
      case "servers":
        await handleServers(chatId, config);
        break;
      case "status":
        await handleStatus(chatId, config);
        break;
      case "run":
        await handleRun(chatId, args, config);
        break;
      case "runall":
        await handleRunAll(chatId, args, config);
        break;
      case "otp":
        await handleOTP(chatId, from, config);
        break;
      case "help":
        await handleHelp(chatId);
        break;
      default:
        await sendMessage(chatId, `❓ Unknown command: /${command}\nUse /help to see available commands.`);
    }
  } catch (error) {
    log("ERROR", `Error handling command /${command}: ${error}`);
    await sendMessage(chatId, `❌ Internal error processing /${command}`);
  }
}

async function startPolling(): Promise<void> {
  if (pollingActive) return;

  pollingActive = true;

  log("INFO", "Starting Telegram bot polling...");

  pollingPromise = (async () => {
    while (pollingActive && botEnabled && botToken) {
      try {
        const updates = await getUpdates();

        for (const update of updates) {
          if (update.update_id >= lastUpdateId) {
            lastUpdateId = update.update_id;
          }

          await processUpdate(update);
        }
      } catch (error) {
        log("ERROR", `Polling error: ${error}`);
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }

    pollingActive = false;
    log("INFO", "Polling stopped.");
  })();
}

// ============ HTML Helpers ============

function escapeHTML(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function splitMessage(text: string, maxLength: number): string[] {
  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > maxLength) {
    let splitIndex = remaining.lastIndexOf("\n", maxLength);
    if (splitIndex === -1 || splitIndex < maxLength * 0.5) {
      splitIndex = maxLength;
    }

    chunks.push(remaining.substring(0, splitIndex));
    remaining = remaining.substring(splitIndex);
  }

  if (remaining.length > 0) {
    chunks.push(remaining);
  }

  return chunks;
}

// ============ HTTP Server (for health check, reload, and OTP) ============

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    // Health check endpoint
    if (url.pathname === "/health" && req.method === "GET") {
      return Response.json({
        status: "ok",
        service: "telegram-service",
        port: PORT,
        botEnabled,
        configLoaded,
        pollingActive,
        mappedUsers: telegramUserMap.size,
        configCount: allConfigs.length,
      });
    }

    // Reload config endpoint
    if (url.pathname === "/api/reload-config" && req.method === "POST") {
      log("INFO", "Received reload-config request");

      const wasEnabled = botEnabled;
      const success = await loadAllConfigs();

      if (success && !wasEnabled && botEnabled) {
        startPolling();
      } else if (!success && pollingActive) {
        pollingActive = false;
      }

      return Response.json({
        success,
        botEnabled,
        pollingActive,
        mappedUsers: telegramUserMap.size,
      });
    }

    // Internal OTP endpoint - allows the dashboard to deliver OTP via Telegram
    if (url.pathname === "/api/send-otp" && req.method === "POST") {
      try {
        const body = await req.json() as { code: string; purpose: string; chatIds?: string[] };
        const { code, purpose, chatIds } = body;

        if (!code || !purpose) {
          return Response.json({ error: "code and purpose are required" }, { status: 400 });
        }

        if (!chatIds || chatIds.length === 0) {
          return Response.json({ error: "No target chat IDs provided" }, { status: 400 });
        }

        const purposeLabels: Record<string, string> = {
          password_change: "Password Change",
          telegram_config: "Telegram Config Save",
          login_2fa: "Login Verification",
        };

        const label = purposeLabels[purpose] || purpose;
        const message = `🔐 <b>OTP Verification</b>\n\n` +
          `Purpose: <b>${label}</b>\n` +
          `Code: <code>${code}</code>\n\n` +
          `This code expires in 5 minutes.\n` +
          `If you did not request this, please ignore this message.`;

        let sentCount = 0;
        for (const id of chatIds) {
          try {
            await telegramAPI("sendMessage", {
              chat_id: id,
              text: message,
              parse_mode: "HTML",
            });
            sentCount++;
          } catch (err) {
            log("ERROR", `Failed to send OTP to chat ${id}: ${err}`);
          }
        }

        return Response.json({ success: sentCount > 0, sentCount });
      } catch (error) {
        log("ERROR", `OTP send error: ${error}`);
        return Response.json({ error: "Failed to send OTP" }, { status: 500 });
      }
    }

    return Response.json({ error: "Not found" }, { status: 404 });
  },
});

log("INFO", `Telegram Service HTTP server running on port ${PORT}`);

// ============ Main Startup ============

process.on("uncaughtException", (error) => {
  log("ERROR", `Uncaught exception: ${error}`);
});

process.on("unhandledRejection", (reason) => {
  log("ERROR", `Unhandled rejection: ${reason}`);
});

loadAllConfigs().then((success) => {
  if (success) {
    log("INFO", "Config loaded successfully! Starting polling...");
    startPolling();
  } else {
    log("INFO", "Initial config load failed. Will retry periodically...");
  }
}).catch((error) => {
  log("ERROR", `Initial config load error: ${error}`);
});

setInterval(async () => {
  try {
    const oldToken = botToken;
    const wasEnabled = botEnabled;

    const success = await loadAllConfigs();

    if (success) {
      if (oldToken !== botToken || (!wasEnabled && botEnabled)) {
        log("INFO", "Config changed, restarting polling...");
        pollingActive = false;
        setTimeout(() => {
          startPolling();
        }, 2000);
      } else if (wasEnabled && !botEnabled) {
        log("INFO", "Bot disabled, stopping polling...");
        pollingActive = false;
      }
    }
  } catch (error) {
    log("ERROR", `Config reload error: ${error}`);
  }
}, CONFIG_RETRY_INTERVAL);

setInterval(() => {
  log("DEBUG", `Service alive | enabled=${botEnabled} | config=${configLoaded} | polling=${pollingActive} | mappedUsers=${telegramUserMap.size}`);
}, 60000);

log("INFO", "Telegram Service fully initialized (Multi-User)");
