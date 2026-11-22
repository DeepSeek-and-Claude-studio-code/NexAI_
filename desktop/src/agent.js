'use strict';

const crypto = require('crypto');
const llm = require('./llm');
const mail = require('./mail');
const tools = require('./tools');

function buildToolSpecs({ webSearchEnabled, hasFolder }) {
  const list = [
    {
      name: 'get_system_info',
      description: 'Get desktop OS, hardware, time, and active project folder info.',
      parameters: { type: 'object', properties: {} }
    },
    {
      name: 'open_app_or_url',
      description: 'Open an application, file path, or website URL on Windows or Linux.',
      parameters: {
        type: 'object',
        properties: { target: { type: 'string', description: 'App command/name, file path, or https:// URL' } },
        required: ['target']
      }
    },
    {
      name: 'run_shell_command',
      description: 'Run a shell command in the active project folder (PowerShell on Windows, /bin/sh on Linux). Always asks user confirmation.',
      parameters: {
        type: 'object',
        properties: { command: { type: 'string', description: 'Shell command to execute' } },
        required: ['command']
      }
    },
    {
      name: 'read_clipboard',
      description: 'Read current text from the system clipboard.',
      parameters: { type: 'object', properties: {} }
    },
    {
      name: 'write_clipboard',
      description: 'Copy text to the system clipboard.',
      parameters: {
        type: 'object',
        properties: { text: { type: 'string', description: 'Text to copy to clipboard' } },
        required: ['text']
      }
    },
    {
      name: 'read_emails',
      description: 'Read recent emails from configured IMAP or Gmail OAuth inbox.',
      parameters: {
        type: 'object',
        properties: { limit: { type: 'integer', description: 'Number of emails (1-15, default 5)' } }
      }
    },
    {
      name: 'send_email',
      description: 'Send an email via configured SMTP or Gmail API.',
      parameters: {
        type: 'object',
        properties: {
          to: { type: 'string', description: 'Recipient address' },
          subject: { type: 'string', description: 'Subject line' },
          body: { type: 'string', description: 'Plain text email body' }
        },
        required: ['to', 'subject', 'body']
      }
    },
    {
      name: 'request_purchase_confirmation',
      description: 'MUST be called before any purchase, order, checkout, subscription, or payment.',
      parameters: {
        type: 'object',
        properties: {
          item_summary: { type: 'string', description: 'Item or service description' },
          amount: { type: 'string', description: 'Price and currency' }
        },
        required: ['item_summary', 'amount']
      }
    },
    {
      name: 'create_artifact',
      description: 'Create a rich artifact inside Nex: presentation (JSON slides array [{"title":"...","subtitle":"...","bullets":[...]}]), table (CSV with header row), document (Markdown), or html (standalone HTML).',
      parameters: {
        type: 'object',
        properties: {
          type: { type: 'string', description: 'presentation | table | document | html' },
          title: { type: 'string', description: 'Artifact title' },
          content: { type: 'string', description: 'Full content' }
        },
        required: ['type', 'title', 'content']
      }
    },
    {
      name: 'save_memory',
      description: 'Save a user fact or preference into local Nex memory.',
      parameters: {
        type: 'object',
        properties: { fact: { type: 'string', description: 'Fact to remember' } },
        required: ['fact']
      }
    }
  ];

  if (webSearchEnabled) {
    list.push({
      name: 'web_search',
      description: 'Search the web for up-to-date information.',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string', description: 'Search query' } },
        required: ['query']
      }
    });
  }

  if (hasFolder) {
    list.push(
      {
        name: 'list_project_files',
        description: 'List files inside the selected project working folder.',
        parameters: {
          type: 'object',
          properties: { subdir: { type: 'string', description: 'Relative subdirectory (default ".")' } }
        }
      },
      {
        name: 'read_project_file',
        description: 'Read a text file inside the active project working folder.',
        parameters: {
          type: 'object',
          properties: { file_name: { type: 'string', description: 'Relative file path inside project folder' } },
          required: ['file_name']
        }
      },
      {
        name: 'write_project_file',
        description: 'Create or overwrite a text file inside the project folder (requires user confirmation).',
        parameters: {
          type: 'object',
          properties: {
            file_name: { type: 'string', description: 'Relative file path inside project folder' },
            content: { type: 'string', description: 'Full text content' }
          },
          required: ['file_name', 'content']
        }
      },
      {
        name: 'search_project_files',
        description: 'Search text across files in the project working folder.',
        parameters: {
          type: 'object',
          properties: { query: { type: 'string', description: 'Text substring to search for' } },
          required: ['query']
        }
      }
    );
  }
  return list;
}

async function runAgentTurn({
  store,
  safety,
  electronShell,
  electronClipboard,
  provider,
  model,
  apiKey,
  effort,
  projectFolder,
  history,
  onStatus,
  signal
}) {
  let activeProvider = provider;
  let activeModel = model;
  let failoverNotice = '';
  const s = store.state;
  const isEn = s.lang === 'en';
  const fem = s.voice === 'f';
  const agentName = isEn ? (fem ? 'Nexi' : 'Nex') : (fem ? 'Некси' : 'Некс');

  const sysLines = [
    `You are ${agentName}, a capable AI desktop agent running on ${process.platform}.`,
    `Local date/time: ${new Date().toLocaleString()}.`,
    `Respond in ${isEn ? 'English' : 'Russian'} unless the user writes in another language.`,
    s.userName ? `User's name: ${s.userName}.` : '',
    'Strict rules:',
    '1. Never claim you performed an action unless a tool actually returned success.',
    '2. If a desktop permission is turned off, tell the user to enable it in Settings -> Access.',
    '3. NEVER pay, order, subscribe, or complete any purchase without calling request_purchase_confirmation first.',
    '4. When asked for a presentation, table/spreadsheet, structured document, or HTML page, call create_artifact.'
  ].filter(Boolean);

  if (s.memoryEnabled && s.memories.length) {
    sysLines.push('Saved user memory:\n' + s.memories.map(m => `- ${m}`).join('\n'));
  }
  if (projectFolder) {
    sysLines.push(`Active project working folder: ${projectFolder}`);
  }

  const systemPrompt = sysLines.join('\n');
  const toolSpecs = buildToolSpecs({ webSearchEnabled: s.webSearchEnabled, hasFolder: Boolean(projectFolder) });
  const working = history.slice();
  const createdArtifacts = [];
  const savedMemories = [];

  for (let step = 0; step < 8; step++) {
    onStatus('thinking', isEn ? 'Thinking…' : 'Думаю…');
    const resp = await llm.complete({
      provider,
      model,
      apiKey,
      systemPrompt,
      messages: working,
      tools: toolSpecs,
      effort,
      webSearchEnabled: s.webSearchEnabled,
      signal
    });

    if (!resp.toolCalls || !resp.toolCalls.length) {
      return {
        finalText: resp.text || (createdArtifacts.length ? (isEn ? 'Artifact created.' : 'Артефакт готов.') : ''),
        createdArtifacts,
        savedMemories
      };
    }

    working.push({ role: 'assistant', text: resp.text, toolCalls: resp.toolCalls, rawParts: resp.rawParts || null });

    for (const call of resp.toolCalls) {
      const resultText = await executeTool({
        call,
        store,
        safety,
        electronShell,
        electronClipboard,
        projectFolder,
        createdArtifacts,
        savedMemories,
        onStatus,
        isEn
      });
      working.push({ role: 'tool', text: String(resultText), toolCallId: call.id, toolName: call.name });
    }
  }

  return {
    finalText: isEn ? 'Reached maximum agent steps.' : 'Достигнут лимит шагов агента.',
    createdArtifacts,
    savedMemories
  };
}

async function executeTool({
  call,
  store,
  safety,
  electronShell,
  electronClipboard,
  projectFolder,
  createdArtifacts,
  savedMemories,
  onStatus,
  isEn
}) {
  const perms = store.state.permissions || {};
  const args = call.arguments || {};

  try {
    switch (call.name) {
      case 'get_system_info':
        return tools.getSystemInfo(projectFolder);

      case 'open_app_or_url': {
        if (!perms.apps) return 'Permission denied: Apps & URLs access is disabled in Settings -> Access.';
        const target = String(args.target || '');
        if (safety.looksLikePurchase(target)) {
          onStatus('listening', isEn ? 'Waiting for confirmation…' : 'Жду подтверждения…');
          const ok = await safety.requestConfirmation({
            title: isEn ? 'Purchase confirmation required' : 'Нужно подтверждение покупки',
            details: isEn ? `Open "${target}"?` : `Открыть «${target}»?`,
            isPurchase: true
          });
          if (!ok) return 'User declined opening purchase/checkout target.';
        }
        onStatus('working', isEn ? `Opening ${target}…` : `Открываю ${target}…`);
        return await tools.openAppOrUrl(target, electronShell);
      }

      case 'run_shell_command': {
        if (!perms.shell) return 'Permission denied: Terminal command execution is disabled in Settings -> Access.';
        const cmd = String(args.command || '');
        const isPurchase = safety.looksLikePurchase(cmd);
        onStatus('listening', isEn ? 'Waiting for confirmation…' : 'Жду подтверждения…');
        const ok = await safety.requestConfirmation({
          title: isPurchase
            ? (isEn ? 'Purchase confirmation required' : 'Нужно подтверждение покупки')
            : (isEn ? 'Confirm terminal command' : 'Подтверди запуск команды'),
          details: cmd,
          isPurchase
        });
        if (!ok) return 'User declined running shell command.';
        onStatus('working', isEn ? 'Running command…' : 'Выполняю команду…');
        return await tools.runShellCommand(cmd, projectFolder);
      }

      case 'read_clipboard':
        if (!perms.clipboard) return 'Permission denied: Clipboard access is disabled in Settings -> Access.';
        return electronClipboard.readText() || '(clipboard is empty)';

      case 'write_clipboard':
        if (!perms.clipboard) return 'Permission denied: Clipboard access is disabled in Settings -> Access.';
        electronClipboard.writeText(String(args.text || ''));
        return 'Copied to clipboard.';

      case 'read_emails':
        if (!perms.mail) return 'Permission denied: Mail access is disabled in Settings -> Access.';
        onStatus('working', isEn ? 'Reading inbox…' : 'Читаю почту…');
        {
          const list = await mail.readInbox(store.getDecryptedMailConfig(), args.limit || 5);
          if (!list.length) return 'Inbox is empty.';
          return list.map(e => `From: ${e.from}\nSubject: ${e.subject}\nDate: ${e.date}\nPreview: ${e.snippet}`).join('\n\n');
        }

      case 'send_email': {
        if (!perms.mail) return 'Permission denied: Mail access is disabled in Settings -> Access.';
        const isPurchase = safety.looksLikePurchase(`${args.subject} ${args.body}`);
        if (isPurchase || store.state.confirmSensitiveActions) {
          onStatus('listening', isEn ? 'Waiting for confirmation…' : 'Жду подтверждения…');
          const ok = await safety.requestConfirmation({
            title: isPurchase
              ? (isEn ? 'Purchase confirmation required' : 'Нужно подтверждение покупки')
              : (isEn ? 'Confirm sending email' : 'Подтвердить отправку письма'),
            details: `To: ${args.to}\nSubject: ${args.subject}\n\n${args.body}`,
            isPurchase
          });
          if (!ok) return 'User declined sending email.';
        }
        onStatus('working', isEn ? 'Sending email…' : 'Отправляю письмо…');
        return await mail.sendEmail(store.getDecryptedMailConfig(), args);
      }

      case 'request_purchase_confirmation': {
        onStatus('listening', isEn ? 'Waiting for confirmation…' : 'Жду подтверждения…');
        const ok = await safety.requestConfirmation({
          title: isEn ? 'Purchase confirmation required' : 'Нужно подтверждение покупки',
          details: `${args.item_summary} — ${args.amount}`,
          isPurchase: true
        });
        return ok
          ? `CONFIRMED: User explicitly approved purchase (${args.item_summary}, ${args.amount}).`
          : 'CANCELLED: User declined purchase. Do not proceed.';
      }

      case 'create_artifact': {
        const type = ['presentation', 'table', 'document', 'html'].includes(String(args.type || '').toLowerCase())
          ? String(args.type).toLowerCase()
          : 'document';
        const art = {
          id: crypto.randomUUID(),
          type,
          title: String(args.title || 'Artifact'),
          content: String(args.content || ''),
          createdAt: Date.now()
        };
        createdArtifacts.push(art);
        return `Artifact '${art.title}' (${art.type}) created.`;
      }

      case 'save_memory': {
        const fact = String(args.fact || '').trim();
        if (fact && store.state.memoryAutoSave) {
          savedMemories.push(fact);
          return `Saved to memory: ${fact}`;
        }
        return 'Memory auto-save is disabled or fact is empty.';
      }

      case 'web_search':
        onStatus('working', isEn ? 'Searching the web…' : 'Ищу в интернете…');
        return await tools.webSearch(args.query || '');

      case 'list_project_files':
        if (!perms.files) return 'Permission denied: Project folder access is disabled in Settings -> Access.';
        onStatus('working', isEn ? 'Reading project folder…' : 'Читаю папку проекта…');
        return tools.listProjectFiles(projectFolder, args.subdir || '.');

      case 'read_project_file':
        if (!perms.files) return 'Permission denied: Project folder access is disabled in Settings -> Access.';
        onStatus('working', isEn ? `Reading ${args.file_name}…` : `Читаю ${args.file_name}…`);
        return tools.readProjectFile(projectFolder, args.file_name);

      case 'write_project_file': {
        if (!perms.files) return 'Permission denied: Project folder access is disabled in Settings -> Access.';
        onStatus('listening', isEn ? 'Waiting for confirmation…' : 'Жду подтверждения…');
        const ok = await safety.requestConfirmation({
          title: isEn ? 'Confirm file write' : 'Подтвердить запись файла',
          details: isEn
            ? `Write "${args.file_name}" (${String(args.content || '').length} chars)?`
            : `Записать файл «${args.file_name}» (${String(args.content || '').length} симв.)?`,
          isPurchase: false
        });
        if (!ok) return 'User declined writing file.';
        onStatus('working', isEn ? `Writing ${args.file_name}…` : `Записываю ${args.file_name}…`);
        return tools.writeProjectFile(projectFolder, args.file_name, args.content);
      }

      case 'search_project_files':
        if (!perms.files) return 'Permission denied: Project folder access is disabled in Settings -> Access.';
        onStatus('working', isEn ? 'Searching files…' : 'Ищу в файлах…');
        return tools.searchProjectFiles(projectFolder, args.query);

      default:
        return `Unknown tool: ${call.name}`;
    }
  } catch (err) {
    return `Tool error (${call.name}): ${err.message}`;
  }
}

module.exports = { runAgentTurn };
