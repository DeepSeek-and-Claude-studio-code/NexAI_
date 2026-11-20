'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const readline = require('readline');
const llm = require('./llm');
const tools = require('./tools');

const CFG_DIR = path.join(os.homedir(), '.nex-code');
const CFG_FILE = path.join(CFG_DIR, 'config.json');
const ENC_KEY = crypto.createHash('sha256').update(`${os.hostname()}|${os.userInfo().username}|nex-code-v1`).digest();

function encrypt(plain) {
  if (!plain) return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENC_KEY, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), enc]).toString('base64');
}

function decrypt(b64) {
  if (!b64) return '';
  try {
    const buf = Buffer.from(b64, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-gcm', ENC_KEY, buf.subarray(0, 12));
    decipher.setAuthTag(buf.subarray(12, 28));
    return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString('utf8');
  } catch (_) {
    return '';
  }
}

function loadConfig() {
  const def = { profile: 'quark', manualProvider: null, manualModel: null, effort: 'medium', lang: 'ru', keysEnc: {} };
  if (!fs.existsSync(CFG_FILE)) return def;
  try { return Object.assign(def, JSON.parse(fs.readFileSync(CFG_FILE, 'utf8'))); } catch (_) { return def; }
}

function saveConfig(cfg) {
  fs.mkdirSync(CFG_DIR, { recursive: true });
  fs.writeFileSync(CFG_FILE, JSON.stringify(cfg, null, 2), 'utf8');
}

function getKeys(cfg) {
  const out = {};
  for (const p of llm.PROVIDERS) {
    const envName = { Gemini: 'GEMINI_API_KEY', OpenAI: 'OPENAI_API_KEY', Claude: 'ANTHROPIC_API_KEY', DeepSeek: 'DEEPSEEK_API_KEY', NVIDIA: 'NVIDIA_API_KEY' }[p];
    out[p] = decrypt((cfg.keysEnc || {})[p]) || process.env[envName] || '';
  }
  return out;
}

function syncDesktopCompanion(state, label) {
  fetch('http://127.0.0.1:47800/state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state, label })
  }).catch(() => {});
}

async function main() {
  const cfg = loadConfig();
  const cwd = process.cwd();
  const history = [];
  let autoApproveSession = false;

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const askLine = (prompt) => new Promise(res => rl.question(prompt, res));

  async function confirm(question, forceAlways) {
    if (autoApproveSession && !forceAlways) return true;
    syncDesktopCompanion('listening', 'Жду подтверждения…');
    const opts = forceAlways ? '[y/N]' : '[y/a(always in session)/N]';
    const ans = (await askLine(`\x1b[33m? ${question} ${opts}: \x1b[0m`)).trim().toLowerCase();
    if (!forceAlways && (ans === 'a' || ans === 'always' || ans === 'всегда')) {
      autoApproveSession = true;
      return true;
    }
    return ans === 'y' || ans === 'yes' || ans === 'д' || ans === 'да';
  }

  function activeTarget() {
    const keys = getKeys(cfg);
    if (cfg.manualProvider && cfg.manualModel && keys[cfg.manualProvider]) {
      return { provider: cfg.manualProvider, model: cfg.manualModel, apiKey: keys[cfg.manualProvider] };
    }
    const r = llm.resolveProfile(cfg.profile, keys);
    if (!r) return null;
    return { provider: r.provider, model: r.model, apiKey: keys[r.provider] };
  }

  function printBanner() {
    const t = activeTarget();
    console.log('\x1b[1mNex Code\x1b[0m — terminal AI agent (Windows & Linux)');
    console.log(`\x1b[90mFolder: ${cwd}\x1b[0m`);
    console.log(`\x1b[90mModel:  ${t ? `${t.provider} / ${t.model}` : 'no API key yet (use /keys)'}  ·  Effort: ${cfg.effort}\x1b[0m`);
    console.log('\x1b[90mType a task or /help. Purchases ALWAYS require explicit confirmation.\x1b[0m\n');
  }

  printBanner();

  while (true) {
    const line = (await askLine('\x1b[36m>\x1b[0m ')).trim();
    if (!line) continue;

    if (line === '/exit' || line === '/quit') {
      syncDesktopCompanion('idle', '');
      rl.close();
      return;
    }
    if (line === '/help') {
      console.log([
        '/help                  Show commands',
        '/keys                  Add or update API keys (Gemini, OpenAI, Claude, DeepSeek, NVIDIA)',
        '/profile <atom|quark|sel>  Select Nex auto-profile',
        '/model <Provider> <model-id>      Select specific provider & model',
        '/effort <low|medium|high|max>     Set reasoning effort',
        '/folder                Show working directory',
        '/clear                 Clear conversation history',
        '/exit                  Quit Nex Code'
      ].join('\n'));
      continue;
    }
    if (line === '/folder') { console.log(cwd); continue; }
    if (line === '/clear') { history.length = 0; console.log('\x1b[90mHistory cleared.\x1b[0m'); continue; }
    if (line.startsWith('/profile')) {
      const p = line.split(/\s+/)[1]?.toLowerCase();
      if (llm.NEX_PROFILES[p]) {
        cfg.profile = p; cfg.manualProvider = null; cfg.manualModel = null; saveConfig(cfg);
        console.log(`Profile set to Nex ${p}`);
      } else console.log('Usage: /profile <atom|quark|sel>');
      continue;
    }
    if (line.startsWith('/effort')) {
      const e = line.split(/\s+/)[1]?.toLowerCase();
      if (['low', 'medium', 'high', 'max'].includes(e)) {
        cfg.effort = e; saveConfig(cfg); console.log(`Effort set to ${e}`);
      } else console.log('Usage: /effort <low|medium|high|max>');
      continue;
    }
    if (line.startsWith('/model')) {
      const parts = line.split(/\s+/);
      if (parts.length >= 3 && llm.PROVIDERS.includes(parts[1])) {
        cfg.manualProvider = parts[1]; cfg.manualModel = parts[2]; saveConfig(cfg);
        console.log(`Model set to ${parts[1]} / ${parts[2]}`);
      } else {
        const t = activeTarget();
        console.log(t ? `Active: ${t.provider} / ${t.model}` : 'No active key. Usage: /model <Provider> <model-id>');
      }
      continue;
    }
    if (line === '/keys') {
      for (const p of llm.PROVIDERS) {
        const cur = getKeys(cfg)[p] ? '(set, enter to keep)' : '(empty)';
        const v = (await askLine(`  ${p} API Key ${cur}: `)).trim();
        if (v) { cfg.keysEnc[p] = encrypt(v); }
      }
      saveConfig(cfg);
      console.log('\x1b[32mKeys saved encrypted in ~/.nex-code/config.json\x1b[0m');
      continue;
    }

    const target = activeTarget();
    if (!target) {
      console.log('\x1b[33mNo API key configured. Run /keys or set GEMINI_API_KEY / ANTHROPIC_API_KEY / OPENAI_API_KEY.\x1b[0m');
      continue;
    }

    history.push({ role: 'user', text: line });
    const sysPrompt = [
      `You are Nex Code, an expert terminal coding agent operating in ${cwd} on ${process.platform}.`,
      'Use your tools to inspect files, make precise edits, and run tests.',
      'NEVER execute or complete any purchase, order, or payment without calling request_purchase_confirmation first.'
    ].join('\n');

    try {
      for (let step = 0; step < 10; step++) {
        syncDesktopCompanion('thinking', 'Nex Code думает…');
        const res = await llm.complete({
          provider: target.provider,
          model: target.model,
          apiKey: target.apiKey,
          systemPrompt: sysPrompt,
          messages: history.slice(-30),
          tools: tools.TOOL_SPECS,
          effort: cfg.effort
        });

        if (!res.toolCalls.length) {
          if (res.text) console.log('\n' + res.text + '\n');
          history.push({ role: 'assistant', text: res.text });
          break;
        }

        if (res.text) console.log('\x1b[90m' + res.text + '\x1b[0m');
        history.push({ role: 'assistant', text: res.text, toolCalls: res.toolCalls });

        for (const tc of res.toolCalls) {
          const a = tc.arguments || {};
          console.log(`\x1b[35m● ${tc.name}\x1b[0m(${JSON.stringify(a).slice(0, 120)})`);
          let out = '';
          try {
            if (tc.name === 'list_files') {
              syncDesktopCompanion('working', 'Читаю папку…');
              out = tools.listFiles(cwd, a.subdir);
            } else if (tc.name === 'read_file') {
              syncDesktopCompanion('working', `Читаю ${a.path}…`);
              out = tools.readFile(cwd, a.path, a.start_line, a.end_line);
            } else if (tc.name === 'search_files') {
              syncDesktopCompanion('working', 'Ищу в файлах…');
              out = tools.searchFiles(cwd, a.query);
            } else if (tc.name === 'edit_file') {
              const ok = await confirm(`Apply edit to ${a.path}?`, false);
              out = ok ? tools.editFile(cwd, a.path, a.old_text, a.new_text) : 'User declined edit.';
            } else if (tc.name === 'write_file') {
              const ok = await confirm(`Write file ${a.path} (${String(a.content || '').length} bytes)?`, false);
              out = ok ? tools.writeFile(cwd, a.path, a.content) : 'User declined write.';
            } else if (tc.name === 'run_command') {
              const isBuy = tools.looksLikePurchase(a.command);
              const ok = await confirm(
                isBuy ? `PURCHASE / PAYMENT command: ${a.command}` : `Run command: ${a.command}`,
                isBuy
              );
              if (ok) {
                syncDesktopCompanion('working', 'Выполняю команду…');
                out = await tools.runShell(cwd, a.command);
              } else {
                out = 'User declined command execution.';
              }
            } else if (tc.name === 'request_purchase_confirmation') {
              const ok = await confirm(`CONFIRM PURCHASE: ${a.item_summary} (${a.amount})?`, true);
              out = ok ? 'CONFIRMED by user.' : 'CANCELLED by user. Do not pay.';
            } else {
              out = `Unknown tool: ${tc.name}`;
            }
          } catch (e) {
            out = `Error: ${e.message}`;
          }
          console.log(`\x1b[90m  → ${out.split('\n')[0].slice(0, 140)}\x1b[0m`);
          history.push({ role: 'tool', text: out, toolCallId: tc.id, toolName: tc.name });
        }
      }
    } catch (err) {
      console.error(`\x1b[31mError: ${err.message}\x1b[0m`);
    } finally {
      syncDesktopCompanion('idle', '');
    }
  }
}

module.exports = { main };
