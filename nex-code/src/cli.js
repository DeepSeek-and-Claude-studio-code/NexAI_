'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const readline = require('readline');
const llm = require('./llm');
const tools = require('./tools');
const { NexCodeSessionStore } = require('./sessions');

const CFG_DIR = path.join(os.homedir(), '.nex-code');
const CFG_FILE = path.join(CFG_DIR, 'config.json');
const ENC_KEY = crypto.createHash('sha256').update(`${os.hostname()}|${os.userInfo().username}|nex-code-v1`).digest();

function encrypt(plain) { if (!plain) return ''; const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', ENC_KEY, iv), e = Buffer.concat([c.update(plain, 'utf8'), c.final()]); return Buffer.concat([iv, c.getAuthTag(), e]).toString('base64'); }
function decrypt(b64) { if (!b64) return ''; try { const b = Buffer.from(b64, 'base64'), d = crypto.createDecipheriv('aes-256-gcm', ENC_KEY, b.subarray(0, 12)); d.setAuthTag(b.subarray(12, 28)); return Buffer.concat([d.update(b.subarray(28)), d.final()]).toString('utf8'); } catch (_) { return ''; } }
function loadConfig() { const def = { profile: 'quark', manualProvider: null, manualModel: null, effort: 'medium', lang: 'ru', autoApprove: false, customBaseUrl: '', keysEnc: {}, modelCatalog: {}, lastRefreshAt: 0 }; if (!fs.existsSync(CFG_FILE)) return def; try { return Object.assign(def, JSON.parse(fs.readFileSync(CFG_FILE, 'utf8'))); } catch (_) { return def; } }
function saveConfig(cfg) { fs.mkdirSync(CFG_DIR, { recursive: true }); fs.writeFileSync(CFG_FILE, JSON.stringify(cfg, null, 2), 'utf8'); }

function getKeys(cfg) {
  const envMap = { Gemini: 'GEMINI_API_KEY', OpenAI: 'OPENAI_API_KEY', Claude: 'ANTHROPIC_API_KEY', OpenRouter: 'OPENROUTER_API_KEY', Mistral: 'MISTRAL_API_KEY', DeepSeek: 'DEEPSEEK_API_KEY', Qwen: 'DASHSCOPE_API_KEY', Groq: 'GROQ_API_KEY', Cerebras: 'CEREBRAS_API_KEY', GitHub: 'GITHUB_TOKEN', xAI: 'XAI_API_KEY', NVIDIA: 'NVIDIA_API_KEY', Custom: 'CUSTOM_API_KEY' };
  const out = {};
  for (const p of llm.PROVIDERS) out[p] = decrypt((cfg.keysEnc || {})[p]) || process.env[envMap[p]] || '';
  return out;
}

function syncDesktopCompanion(state, label) { fetch('http://127.0.0.1:47800/state', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ state, label }) }).catch(() => {}); }

async function refreshModels(cfg, quiet = false) {
  const keys = getKeys(cfg); let updated = 0; cfg.modelCatalog = cfg.modelCatalog || {};
  await Promise.all(llm.PROVIDERS.map(async (p) => { if (!llm.isProviderReady(p, keys, cfg.customBaseUrl)) return; const list = await llm.fetchModels(p, keys[p], cfg.customBaseUrl); if (list.length) { cfg.modelCatalog[p] = list; updated++; } }));
  cfg.lastRefreshAt = Date.now(); saveConfig(cfg);
  if (!quiet) console.log(`\x1b[32mRefreshed models for ${updated} provider(s).\x1b[0m`);
}

async function main() {
  const cfg = loadConfig(), sessionStore = new NexCodeSessionStore();
  let cwd = process.cwd(), session = sessionStore.findFreshEmpty(cwd) || sessionStore.create(cwd), autoApprove = Boolean(cfg.autoApprove);
  if (Date.now() - (cfg.lastRefreshAt || 0) > 6 * 3600 * 1000) refreshModels(cfg, true).catch(() => {});

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const askLine = (prompt) => new Promise(res => rl.question(prompt, res));
  async function confirm(question, forceAlways) {
    if (autoApprove && !forceAlways) return true;
    syncDesktopCompanion('listening', 'Жду подтверждения…');
    const ans = (await askLine(`\x1b[33m? ${question} ${forceAlways ? '[y/N]' : '[y/a(auto)/N]'}: \x1b[0m`)).trim().toLowerCase();
    if (!forceAlways && (ans === 'a' || ans === 'always' || ans === 'всегда')) { autoApprove = true; return true; }
    return ans === 'y' || ans === 'yes' || ans === 'д' || ans === 'да';
  }
  function activeTarget() {
    const keys = getKeys(cfg);
    if (cfg.manualProvider && cfg.manualModel && llm.isProviderReady(cfg.manualProvider, keys, cfg.customBaseUrl)) return { provider: cfg.manualProvider, model: cfg.manualModel };
    return llm.resolveProfile(cfg.profile, keys, cfg.customBaseUrl, cfg.modelCatalog);
  }

  const t = activeTarget();
  console.log('\x1b[1mNex Code v1.5\x1b[0m — autonomous agentic shell (13 providers + auto-failover + separate history)');
  console.log(`\x1b[90mSession: ${session.id}  ·  Folder: ${cwd}\x1b[0m`);
  console.log(`\x1b[90mModel:   ${t ? `${t.provider} / ${t.model}` : 'no API key yet (use /keys)'}  ·  Auto: ${autoApprove ? 'ON' : 'OFF'}\x1b[0m\n`);

  while (true) {
    const line = (await askLine('\x1b[36mnex-code>\x1b[0m ')).trim();
    if (!line) continue;
    if (line === '/exit' || line === '/quit') { sessionStore.save(session); syncDesktopCompanion('idle', ''); rl.close(); return; }
    if (line === '/help') { console.log('/sessions | /new | /resume <id|num> | /cd <dir> | /auto | /keys | /refresh | /profile <atom|quark|sel> | /model <Provider> <id> | /effort <low|medium|high|max> | /clear | /exit'); continue; }
    if (line === '/sessions') { sessionStore.list().slice(0, 20).forEach((s, i) => console.log(`${s.id === session.id ? '*' : ' '} [${i + 1}] ${s.id} (${s.messageCount}) ${s.title} [${s.cwd}]`)); continue; }
    if (line === '/new') { sessionStore.save(session); session = session.messages.length === 0 ? session : (sessionStore.findFreshEmpty(cwd) || sessionStore.create(cwd)); console.log(`\x1b[32mSession: ${session.id}\x1b[0m`); continue; }
    if (line.startsWith('/resume')) { const arg = line.split(/\s+/)[1], list = sessionStore.list(), hit = /^\d+$/.test(arg || '') ? list[Number(arg) - 1] : list.find(s => s.id === arg); if (!hit) { console.log('Not found.'); continue; } const loaded = sessionStore.load(hit.id); if (loaded) { session = loaded; if (loaded.cwd && fs.existsSync(loaded.cwd)) cwd = loaded.cwd; console.log(`\x1b[32mResumed ${session.id}\x1b[0m`); } continue; }
    if (line.startsWith('/cd ')) { const next = path.resolve(cwd, line.slice(4).trim()); if (fs.existsSync(next) && fs.statSync(next).isDirectory()) { cwd = next; session.cwd = cwd; sessionStore.save(session); console.log(`Folder: ${cwd}`); } else console.log(`Not found: ${next}`); continue; }
    if (line === '/auto') { autoApprove = !autoApprove; cfg.autoApprove = autoApprove; saveConfig(cfg); console.log(`Auto mode: ${autoApprove ? 'ON' : 'OFF'}`); continue; }
    if (line === '/clear') { session.messages = []; session.uiLog = []; sessionStore.save(session); console.log('Cleared.'); continue; }
    if (line === '/refresh') { await refreshModels(cfg, false); continue; }
    if (line.startsWith('/profile')) { const p = line.split(/\s+/)[1]?.toLowerCase(); if (llm.NEX_PROFILES[p]) { cfg.profile = p; cfg.manualProvider = null; cfg.manualModel = null; saveConfig(cfg); console.log(`Profile: Nex ${p}`); } continue; }
    if (line.startsWith('/effort')) { const e = line.split(/\s+/)[1]?.toLowerCase(); if (['low', 'medium', 'high', 'max'].includes(e)) { cfg.effort = e; saveConfig(cfg); console.log(`Effort: ${e}`); } continue; }
    if (line.startsWith('/model')) { const parts = line.split(/\s+/); if (parts.length >= 3 && llm.PROVIDERS.includes(parts[1])) { cfg.manualProvider = parts[1]; cfg.manualModel = parts[2]; saveConfig(cfg); console.log(`Model: ${parts[1]} / ${parts[2]}`); } continue; }
    if (line === '/keys') {
      const curKeys = getKeys(cfg);
      for (const p of llm.PROVIDERS) {
        if (p === 'Custom') { const u = (await askLine(`  Custom Base URL (${cfg.customBaseUrl || 'empty'}): `)).trim(); if (u) cfg.customBaseUrl = u; }
        const v = (await askLine(`  ${p} API Key (${curKeys[p] ? 'set, enter to keep' : 'empty'}): `)).trim(); if (v) cfg.keysEnc[p] = encrypt(v);
      }
      saveConfig(cfg); await refreshModels(cfg, false); continue;
    }

    const target = activeTarget();
    if (!target) { console.log('\x1b[33mNo API key configured. Run /keys.\x1b[0m'); continue; }
    if (!session.messages.length) session.title = line.slice(0, 48);
    session.messages.push({ role: 'user', text: line }); session.uiLog.push({ kind: 'user', text: line, ts: Date.now() });
    const sysPrompt = `You are Nex Code, an autonomous agentic shell inside ${cwd} on ${process.platform}. Use files, git, shell, web_search, and web_fetch tools freely. NEVER complete purchases without request_purchase_confirmation.`;
    let activeProv = target.provider, activeMod = target.model;
    try {
      for (let step = 0; step < 22; step++) {
        syncDesktopCompanion('thinking', `Nex Code (${step + 1})…`);
        const res = await llm.completeWithFailover({
          provider: activeProv, model: activeMod, profileId: cfg.profile, keys: getKeys(cfg), catalog: cfg.modelCatalog, customBaseUrl: cfg.customBaseUrl,
          systemPrompt: sysPrompt, messages: session.messages.slice(-36), tools: tools.TOOL_SPECS, effort: cfg.effort,
          onSwitch: ({ fromProvider, toProvider, toModel }) => { activeProv = toProvider; activeMod = toModel; console.log(`\x1b[33m⚡ ${fromProvider} limit reached → switched to ${toProvider} (${toModel})\x1b[0m`); }
        });
        activeProv = res.usedProvider || activeProv; activeMod = res.usedModel || activeMod;
        if (!res.toolCalls.length) { if (res.text) console.log('\n' + res.text + '\n'); session.messages.push({ role: 'assistant', text: res.text }); session.uiLog.push({ kind: 'assistant', text: res.text, ts: Date.now() }); break; }
        if (res.text) console.log('\x1b[90m' + res.text + '\x1b[0m');
        session.messages.push({ role: 'assistant', text: res.text, toolCalls: res.toolCalls, rawParts: res.rawParts || null });
        for (const tc of res.toolCalls) {
          const a = tc.arguments || {}; console.log(`\x1b[35m● ${tc.name}\x1b[0m(${JSON.stringify(a).slice(0, 120)})`);
          let out = '';
          try {
            if (tc.name === 'list_files') out = tools.listFiles(cwd, a.subdir, a.max_depth);
            else if (tc.name === 'glob_files') out = tools.globFiles(cwd, a.pattern);
            else if (tc.name === 'read_file') out = tools.readFile(cwd, a.path, a.start_line, a.end_line);
            else if (tc.name === 'search_files') out = tools.searchFiles(cwd, a.query, a.is_regex);
            else if (tc.name === 'git_status') out = await tools.runShell(cwd, 'git status -sb', 15000);
            else if (tc.name === 'git_diff') out = await tools.runShell(cwd, `git diff${a.path ? ` -- "${String(a.path).replace(/"/g, '\\"')}"` : ''}`, 15000);
            else if (tc.name === 'web_search') out = await tools.webSearch(a.query);
            else if (tc.name === 'web_fetch') out = await tools.webFetch(a.url);
            else if (tc.name === 'edit_file') out = (await confirm(`Edit ${a.path}?`, false)) ? tools.editFile(cwd, a.path, a.old_text, a.new_text, a.replace_all) : 'Declined.';
            else if (tc.name === 'write_file') out = (await confirm(`Write ${a.path}?`, false)) ? tools.writeFile(cwd, a.path, a.content) : 'Declined.';
            else if (tc.name === 'delete_file') out = (await confirm(`Delete ${a.path}?`, false)) ? tools.deleteFile(cwd, a.path) : 'Declined.';
            else if (tc.name === 'run_command') { const buy = tools.looksLikePurchase(a.command); out = (await confirm(buy ? `PAYMENT command: ${a.command}` : `Run: ${a.command}`, buy)) ? await tools.runShell(cwd, a.command, a.timeout_ms) : 'Declined.'; }
            else if (tc.name === 'request_purchase_confirmation') out = (await confirm(`CONFIRM PURCHASE: ${a.item_summary} (${a.amount})?`, true)) ? 'CONFIRMED' : 'CANCELLED';
            else out = `Unknown tool: ${tc.name}`;
          } catch (e) { out = `Error: ${e.message}`; }
          console.log(`\x1b[90m  → ${String(out).split('\n')[0].slice(0, 140)}\x1b[0m`);
          session.messages.push({ role: 'tool', text: String(out), toolCallId: tc.id, toolName: tc.name });
          session.uiLog.push({ kind: 'tool', tool: tc.name, output: String(out).slice(0, 500), ts: Date.now() });
        }
      }
      sessionStore.save(session);
    } catch (err) { console.error(`\x1b[31mError: ${err.message}\x1b[0m`); }
    finally { syncDesktopCompanion('idle', ''); }
  }
}

module.exports = { main };
