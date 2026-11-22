'use strict';

const PROVIDERS = ['Gemini', 'OpenAI', 'Claude', 'OpenRouter', 'Mistral', 'DeepSeek', 'Qwen', 'Groq', 'Cerebras', 'GitHub', 'xAI', 'NVIDIA', 'Custom'];
const DEFAULT_MODELS = {
  Gemini: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.5-flash-lite', 'gemini-2.0-flash'],
  OpenAI: ['gpt-4.1', 'gpt-4.1-mini', 'o3-mini', 'gpt-4o'],
  Claude: ['claude-sonnet-4-5', 'claude-opus-4-1', 'claude-3-7-sonnet-latest', 'claude-3-5-haiku-latest'],
  OpenRouter: ['anthropic/claude-sonnet-4', 'deepseek/deepseek-chat-v3-0324:free', 'qwen/qwen3-coder:free', 'mistralai/devstral-small:free'],
  Mistral: ['devstral-medium-latest', 'devstral-small-latest', 'codestral-latest', 'mistral-large-latest'],
  DeepSeek: ['deepseek-chat', 'deepseek-reasoner'],
  Qwen: ['qwen3-coder-plus', 'qwen-plus', 'qwen-turbo'],
  Groq: ['qwen/qwen3-32b', 'llama-3.3-70b-versatile', 'moonshotai/kimi-k2-instruct'],
  Cerebras: ['qwen-3-coder-480b', 'qwen-3-32b', 'llama-3.3-70b'],
  GitHub: ['gpt-4o', 'DeepSeek-R1', 'Codestral-2501', 'Meta-Llama-3.3-70B-Instruct'],
  xAI: ['grok-code-fast-1', 'grok-3', 'grok-3-mini'],
  NVIDIA: ['deepseek-ai/deepseek-r1', 'qwen/qwen2.5-coder-32b-instruct', 'moonshotai/kimi-k2-instruct'],
  Custom: ['qwen2.5-coder:14b', 'deepseek-r1:14b', 'devstral:latest']
};
const NEX_PROFILES = {
  atom: [['Groq', 'qwen/qwen3-32b'], ['Cerebras', 'qwen-3-32b'], ['Gemini', 'gemini-2.5-flash-lite'], ['OpenRouter', 'qwen/qwen3-coder:free'], ['Mistral', 'devstral-small-latest'], ['DeepSeek', 'deepseek-chat'], ['Qwen', 'qwen-turbo'], ['OpenAI', 'gpt-4.1-mini'], ['Claude', 'claude-3-5-haiku-latest'], ['GitHub', 'gpt-4o'], ['xAI', 'grok-3-mini'], ['NVIDIA', 'qwen/qwen2.5-coder-32b-instruct'], ['Custom', 'qwen2.5-coder:14b']],
  quark: [['Claude', 'claude-sonnet-4-5'], ['OpenRouter', 'anthropic/claude-sonnet-4'], ['Gemini', 'gemini-2.5-flash'], ['Mistral', 'devstral-medium-latest'], ['DeepSeek', 'deepseek-chat'], ['Qwen', 'qwen3-coder-plus'], ['OpenAI', 'gpt-4.1'], ['Cerebras', 'qwen-3-coder-480b'], ['Groq', 'qwen/qwen3-32b'], ['GitHub', 'Codestral-2501'], ['xAI', 'grok-code-fast-1'], ['NVIDIA', 'qwen/qwen2.5-coder-32b-instruct'], ['Custom', 'qwen2.5-coder:14b']],
  sel: [['Claude', 'claude-opus-4-1'], ['OpenAI', 'gpt-4.1'], ['OpenRouter', 'anthropic/claude-sonnet-4'], ['Gemini', 'gemini-2.5-pro'], ['DeepSeek', 'deepseek-reasoner'], ['Qwen', 'qwen3-coder-plus'], ['Mistral', 'codestral-latest'], ['xAI', 'grok-3'], ['Cerebras', 'qwen-3-coder-480b'], ['GitHub', 'DeepSeek-R1'], ['Groq', 'moonshotai/kimi-k2-instruct'], ['NVIDIA', 'deepseek-ai/deepseek-r1'], ['Custom', 'deepseek-r1:14b']]
};
const OPENAI_ENDPOINTS = {
  OpenAI: 'https://api.openai.com/v1/chat/completions', OpenRouter: 'https://openrouter.ai/api/v1/chat/completions',
  Mistral: 'https://api.mistral.ai/v1/chat/completions', DeepSeek: 'https://api.deepseek.com/chat/completions',
  Qwen: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions', Groq: 'https://api.groq.com/openai/v1/chat/completions',
  Cerebras: 'https://api.cerebras.ai/v1/chat/completions', GitHub: 'https://models.inference.ai.azure.com/chat/completions',
  xAI: 'https://api.x.ai/v1/chat/completions', NVIDIA: 'https://integrate.api.nvidia.com/v1/chat/completions'
};
const MODELS_ENDPOINTS = {
  OpenAI: 'https://api.openai.com/v1/models', OpenRouter: 'https://openrouter.ai/api/v1/models',
  Mistral: 'https://api.mistral.ai/v1/models', DeepSeek: 'https://api.deepseek.com/models',
  Qwen: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/models', Groq: 'https://api.groq.com/openai/v1/models',
  Cerebras: 'https://api.cerebras.ai/v1/models', GitHub: 'https://models.inference.ai.azure.com/models',
  xAI: 'https://api.x.ai/v1/models', NVIDIA: 'https://integrate.api.nvidia.com/v1/models'
};
const GEMINI_FALLBACKS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash'];
const cooldowns = new Map();

function isProviderReady(provider, keys, customBaseUrl) { return provider === 'Custom' ? Boolean((customBaseUrl || '').trim()) : Boolean((keys?.[provider] || '').trim()); }
function pickModel(provider, preferred, catalog) { const cat = Array.isArray(catalog?.[provider]) ? catalog[provider] : []; if (preferred && (!cat.length || cat.includes(preferred))) return preferred; return cat[0] || (DEFAULT_MODELS[provider] || [])[0] || preferred || ''; }
function resolveProfile(profileId, keys, customBaseUrl = '', catalog = null) { for (const [p, m] of (NEX_PROFILES[profileId] || NEX_PROFILES.quark)) if (isProviderReady(p, keys, customBaseUrl)) return { provider: p, model: pickModel(p, m, catalog) }; return null; }
function isQuotaError(err) { const msg = String(err?.message || err || ''), m = /HTTP\s+(\d{3})/i.exec(msg), code = m ? Number(m[1]) : 0; const hard = code === 402 || /(insufficient|balance|credit|billing|payment\s*required|daily\s+limit)/i.test(msg); const soft = [429, 503, 529].includes(code) || /(rate.?limit|quota|too\s+many\s+requests|resource.?exhausted|overloaded|high\s+demand)/i.test(msg); return { failover: hard || soft || (code === 404 && /model/i.test(msg)), hard }; }

async function complete({ provider, model, apiKey, baseUrl, systemPrompt, messages, tools, effort, signal }) {
  if (provider === 'Gemini') return callGemini({ model, apiKey, systemPrompt, messages, tools, effort, includeEffort: true, signal });
  if (provider === 'Claude') return callClaude({ model, apiKey, systemPrompt, messages, tools, effort, includeEffort: true, signal });
  return callOpenAi({ provider, model, apiKey, baseUrl, systemPrompt, messages, tools, effort, includeEffort: true, signal });
}

async function completeWithFailover({ provider, model, profileId, keys, catalog, customBaseUrl, systemPrompt, messages, tools, effort, signal, onSwitch }) {
  const chain = [], seen = new Set();
  const push = (p, m) => { if (!p || seen.has(p) || !isProviderReady(p, keys, customBaseUrl)) return; seen.add(p); chain.push({ provider: p, model: pickModel(p, m, catalog), apiKey: (keys[p] || '').trim() || 'local', baseUrl: p === 'Custom' ? customBaseUrl : '' }); };
  if (provider) push(provider, model);
  for (const [p, m] of (NEX_PROFILES[profileId] || NEX_PROFILES.quark)) push(p, m);
  for (const p of PROVIDERS) push(p, null);
  const now = Date.now(), ordered = [...chain.filter(c => !(cooldowns.get(c.provider) > now)), ...chain.filter(c => cooldowns.get(c.provider) > now)];
  let lastErr = null;
  for (let i = 0; i < ordered.length; i++) {
    const c = ordered[i];
    if ((i > 0 || (provider && c.provider !== provider)) && onSwitch) onSwitch({ fromProvider: provider || ordered[0].provider, toProvider: c.provider, toModel: c.model });
    const safeMsgs = c.provider === 'Gemini' ? messages : messages.map(m => (m.rawParts ? { ...m, rawParts: undefined } : m));
    try { const res = await complete({ ...c, systemPrompt, messages: safeMsgs, tools, effort, signal }); cooldowns.delete(c.provider); return { ...res, usedProvider: c.provider, usedModel: c.model }; }
    catch (err) { lastErr = err; const q = isQuotaError(err); if (q.failover && i < ordered.length - 1) { cooldowns.set(c.provider, Date.now() + (q.hard ? 30 : 5) * 60000); continue; } throw err; }
  }
  throw lastErr || new Error('No configured AI provider succeeded.');
}

async function callGemini({ model, apiKey, systemPrompt, messages, tools, effort, includeEffort, signal, retryIndex = 0, usedFallback = false }) {
  const contents = [];
  for (const m of messages) {
    if (m.role === 'user') contents.push({ role: 'user', parts: [{ text: m.text }] });
    else if (m.role === 'assistant') {
      if (Array.isArray(m.rawParts) && m.rawParts.length) contents.push({ role: 'model', parts: m.rawParts });
      else { const parts = []; if (m.text) parts.push({ text: m.text }); for (const tc of (m.toolCalls || [])) { const p = { functionCall: { name: tc.name, args: tc.arguments || {} } }; if (tc.thoughtSignature) p.thoughtSignature = tc.thoughtSignature; parts.push(p); } if (parts.length) contents.push({ role: 'model', parts }); }
    } else if (m.role === 'tool') {
      const fn = { functionResponse: { name: m.toolName || 'tool', response: { result: m.text } } }, prev = contents[contents.length - 1];
      if (prev && prev.role === 'user' && Array.isArray(prev.parts) && prev.parts.every(p => p.functionResponse)) prev.parts.push(fn);
      else contents.push({ role: 'user', parts: [fn] });
    }
  }
  const body = { contents, systemInstruction: { parts: [{ text: systemPrompt }] }, generationConfig: { maxOutputTokens: 4096 }, tools: [{ functionDeclarations: tools.map(t => ({ name: t.name, description: t.description, parameters: t.parameters })) }] };
  if (includeEffort) { const b = { low: 0, medium: 1024, high: 4096, max: 8192 }[effort] || 0; if (b > 0) body.generationConfig.thinkingConfig = { thinkingBudget: b }; }
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey }, body: JSON.stringify(body), signal });
  const text = await res.text();
  if (!res.ok) {
    if (includeEffort && res.status === 400 && /thinking/i.test(text) && !/thought_signature/i.test(text)) return callGemini({ model, apiKey, systemPrompt, messages, tools, effort, includeEffort: false, signal, retryIndex, usedFallback });
    if (res.status === 503 && retryIndex < 1) { await new Promise(r => setTimeout(r, 1200)); return callGemini({ model, apiKey, systemPrompt, messages, tools, effort, includeEffort, signal, retryIndex: retryIndex + 1, usedFallback }); }
    if (res.status === 503 && !usedFallback) { const fb = GEMINI_FALLBACKS.find(x => x !== model); if (fb) return callGemini({ model: fb, apiKey, systemPrompt, messages, tools, effort, includeEffort, signal, retryIndex: 0, usedFallback: true }); }
    throw new Error(`Gemini HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  const parts = JSON.parse(text)?.candidates?.[0]?.content?.parts || [], texts = [], toolCalls = [];
  parts.forEach((p, idx) => { if (p.thought) return; if (p.text) texts.push(p.text); if (p.functionCall) toolCalls.push({ id: `gem_${Date.now()}_${idx}`, name: p.functionCall.name, arguments: p.functionCall.args || {}, thoughtSignature: p.thoughtSignature || p.thought_signature || null }); });
  return { text: texts.join('\n').trim(), toolCalls, rawParts: parts };
}

async function callClaude({ model, apiKey, systemPrompt, messages, tools, effort, includeEffort, signal }) {
  const arr = [];
  for (const m of messages) {
    if (m.role === 'user') arr.push({ role: 'user', content: [{ type: 'text', text: m.text }] });
    else if (m.role === 'assistant') { const b = []; if (m.text) b.push({ type: 'text', text: m.text }); for (const tc of (m.toolCalls || [])) b.push({ type: 'tool_use', id: tc.id, name: tc.name, input: tc.arguments || {} }); arr.push({ role: 'assistant', content: b }); }
    else if (m.role === 'tool') { const blk = { type: 'tool_result', tool_use_id: m.toolCallId || 'tool', content: m.text }, prev = arr[arr.length - 1]; if (prev && prev.role === 'user' && Array.isArray(prev.content) && prev.content.every(x => x.type === 'tool_result')) prev.content.push(blk); else arr.push({ role: 'user', content: [blk] }); }
  }
  const body = { model, max_tokens: 8192, system: systemPrompt, messages: arr, tools: tools.map(t => ({ name: t.name, description: t.description, input_schema: t.parameters })) };
  if (includeEffort && (effort === 'high' || effort === 'max')) body.thinking = { type: 'enabled', budget_tokens: effort === 'max' ? 5000 : 2000 };
  const res = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' }, body: JSON.stringify(body), signal });
  const text = await res.text();
  if (!res.ok) { if (includeEffort && res.status === 400 && /thinking/i.test(text)) return callClaude({ model, apiKey, systemPrompt, messages, tools, effort, includeEffort: false, signal }); throw new Error(`Claude HTTP ${res.status}: ${text.slice(0, 300)}`); }
  const data = JSON.parse(text), texts = [], toolCalls = [];
  for (const b of (data.content || [])) { if (b.type === 'text') texts.push(b.text); if (b.type === 'tool_use') toolCalls.push({ id: b.id, name: b.name, arguments: b.input || {} }); }
  return { text: texts.join('\n').trim(), toolCalls };
}

async function callOpenAi({ provider, model, apiKey, baseUrl, systemPrompt, messages, tools, effort, includeEffort, signal }) {
  const url = provider === 'Custom' ? (String(baseUrl || '').replace(/\/+$/, '').endsWith('/chat/completions') ? baseUrl : `${String(baseUrl || '').replace(/\/+$/, '')}/chat/completions`) : OPENAI_ENDPOINTS[provider];
  if (!url) throw new Error(`No endpoint for ${provider}`);
  const arr = [{ role: 'system', content: systemPrompt }];
  for (const m of messages) {
    if (m.role === 'user') arr.push({ role: 'user', content: m.text });
    else if (m.role === 'assistant') { const o = { role: 'assistant', content: m.text || null }; if (m.toolCalls?.length) o.tool_calls = m.toolCalls.map(tc => ({ id: tc.id, type: 'function', function: { name: tc.name, arguments: JSON.stringify(tc.arguments || {}) } })); arr.push(o); }
    else if (m.role === 'tool') arr.push({ role: 'tool', tool_call_id: m.toolCallId || 'tool', content: m.text });
  }
  const body = { model, messages: arr, tools: tools.map(t => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.parameters } })) };
  if (includeEffort && provider === 'OpenAI') body.reasoning_effort = effort === 'max' ? 'high' : effort;
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey || 'local'}` };
  if (provider === 'OpenRouter') { headers['HTTP-Referer'] = 'https://nex.assistant.local'; headers['X-Title'] = 'Nex Code'; }
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal });
  const text = await res.text();
  if (!res.ok) { if (includeEffort && res.status === 400 && /reasoning_effort/i.test(text)) return callOpenAi({ provider, model, apiKey, baseUrl, systemPrompt, messages, tools, effort, includeEffort: false, signal }); throw new Error(`${provider} HTTP ${res.status}: ${text.slice(0, 300)}`); }
  const msg = JSON.parse(text)?.choices?.[0]?.message;
  const toolCalls = (msg?.tool_calls || []).map((tc, i) => { let args = {}; try { args = JSON.parse(tc.function?.arguments || '{}'); } catch (_) {} return { id: tc.id || `oa_${i}`, name: tc.function?.name, arguments: args }; });
  return { text: String(msg?.content || '').trim(), toolCalls };
}

async function fetchModels(provider, apiKey, customBaseUrl = '') {
  try {
    if (provider === 'Custom') { const c = String(customBaseUrl || '').trim().replace(/\/+$/, ''); if (!c) return []; const r = await fetch(`${c.replace(/\/chat\/completions$/i, '')}/models`, { headers: { Authorization: `Bearer ${apiKey || 'local'}` } }); if (!r.ok) return []; const d = await r.json(); return (Array.isArray(d) ? d : (d.data || d.models || [])).map(m => m.id || m.name).filter(Boolean).slice(0, 60); }
    if (!apiKey) return [];
    if (provider === 'Gemini') { const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=100', { headers: { 'x-goog-api-key': apiKey } }); return r.ok ? ((await r.json()).models || []).map(m => String(m.name || '').replace(/^models\//, '')).filter(n => n.startsWith('gemini')).slice(0, 60) : []; }
    if (provider === 'Claude') { const r = await fetch('https://api.anthropic.com/v1/models', { headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' } }); return r.ok ? ((await r.json()).data || []).map(m => m.id).filter(Boolean).slice(0, 60) : []; }
    const url = MODELS_ENDPOINTS[provider]; if (!url) return [];
    const r = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } }); if (!r.ok) return [];
    const d = await r.json(); return (Array.isArray(d) ? d : (d.data || d.models || [])).map(m => m.id || m.name).filter(Boolean).slice(0, 80);
  } catch (_) { return []; }
}

module.exports = { PROVIDERS, DEFAULT_MODELS, NEX_PROFILES, isProviderReady, resolveProfile, complete, completeWithFailover, fetchModels };
