'use strict';

const constants = require('./constants');

const OPENAI_ENDPOINTS = {
  OpenAI:     'https://api.openai.com/v1/chat/completions',
  OpenRouter: 'https://openrouter.ai/api/v1/chat/completions',
  Mistral:    'https://api.mistral.ai/v1/chat/completions',
  DeepSeek:   'https://api.deepseek.com/chat/completions',
  Qwen:       'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions',
  Groq:       'https://api.groq.com/openai/v1/chat/completions',
  Cerebras:   'https://api.cerebras.ai/v1/chat/completions',
  GitHub:     'https://models.inference.ai.azure.com/chat/completions',
  xAI:        'https://api.x.ai/v1/chat/completions',
  NVIDIA:     'https://integrate.api.nvidia.com/v1/chat/completions'
};

const MODELS_ENDPOINTS = {
  OpenAI:     'https://api.openai.com/v1/models',
  OpenRouter: 'https://openrouter.ai/api/v1/models',
  Mistral:    'https://api.mistral.ai/v1/models',
  DeepSeek:   'https://api.deepseek.com/models',
  Qwen:       'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/models',
  Groq:       'https://api.groq.com/openai/v1/models',
  Cerebras:   'https://api.cerebras.ai/v1/models',
  GitHub:     'https://models.inference.ai.azure.com/models',
  xAI:        'https://api.x.ai/v1/models',
  NVIDIA:     'https://integrate.api.nvidia.com/v1/models'
};

const GEMINI_FALLBACK_MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash'];
const providerCooldowns = new Map();

function markProviderCooldown(provider, reason, isHardQuota = false) {
  const durationMs = isHardQuota ? 30 * 60 * 1000 : 5 * 60 * 1000;
  providerCooldowns.set(provider, { until: Date.now() + durationMs, reason: String(reason || 'limit') });
}

function getProviderCooldown(provider) {
  const entry = providerCooldowns.get(provider);
  if (!entry) return null;
  if (Date.now() >= entry.until) { providerCooldowns.delete(provider); return null; }
  return entry;
}

function clearProviderCooldown(provider) {
  providerCooldowns.delete(provider);
}

function isQuotaOrFailoverError(err) {
  const msg = String(err?.message || err || '');
  if (err?.name === 'AbortError') return { failover: false, hardQuota: false };
  const m = /HTTP\s+(\d{3})/i.exec(msg);
  const code = m ? Number(m[1]) : 0;
  const hardRx = /(insufficient[_\s-]?(balance|quota|funds|credit)|credit[s]?\s*(exhausted|depleted|balance)|billing|payment\s*required|exceeded\s+your\s+current\s+quota|daily\s+limit|monthly\s+limit|spend\s+limit)/i;
  const softRx = /(rate[_\s-]?limit|too\s+many\s+requests|resource[_\s-]?exhausted|quota|overloaded|high\s+demand|temporarily\s+unavailable|capacity|limit\s+exceeded|tokens\s+per\s+minute|requests\s+per\s+minute)/i;

  if (code === 402 || hardRx.test(msg)) return { failover: true, hardQuota: true, reason: code ? `HTTP ${code}` : 'quota' };
  if (code === 429 || code === 503 || code === 529 || softRx.test(msg)) return { failover: true, hardQuota: false, reason: code ? `HTTP ${code}` : 'rate_limit' };
  if (code === 403 && /(quota|limit|credit|billing|exhausted|balance|disabled)/i.test(msg)) return { failover: true, hardQuota: true, reason: 'HTTP 403' };
  if (code === 404 && /(model|not\s+found|does\s+not\s+exist)/i.test(msg)) return { failover: true, hardQuota: false, reason: 'model_not_found' };
  return { failover: false, hardQuota: false };
}

function buildFailoverChain({ primaryProvider, primaryModel, profileId, apiKeys, modelCatalog, customBaseUrl }) {
  const chain = [];
  const seen = new Set();
  const pushCandidate = (provider, model) => {
    if (!provider || seen.has(provider)) return;
    if (!constants.isProviderReady(provider, apiKeys, customBaseUrl)) return;
    const chosen = constants.pickBestModelForProvider(provider, model, modelCatalog);
    if (!chosen) return;
    seen.add(provider);
    chain.push({
      provider,
      model: chosen,
      apiKey: (apiKeys?.[provider] || '').trim() || (provider === 'Custom' ? 'local' : ''),
      baseUrl: provider === 'Custom' ? (customBaseUrl || '').trim() : ''
    });
  };
  if (primaryProvider) pushCandidate(primaryProvider, primaryModel);
  const pid = constants.normalizeProfileId(profileId) || 'quark';
  const prof = constants.NEX_PROFILES.find(p => p.id === pid);
  if (prof && Array.isArray(prof.textRoutes)) {
    for (const [p, m] of prof.textRoutes) pushCandidate(p, m);
  }
  for (const p of constants.PROVIDERS) pushCandidate(p, null);

  const healthy = [];
  const cooled = [];
  for (const item of chain) {
    const cd = getProviderCooldown(item.provider);
    if (cd) cooled.push({ ...item, cooldownUntil: cd.until });
    else healthy.push(item);
  }
  cooled.sort((a, b) => a.cooldownUntil - b.cooldownUntil);
  return [...healthy, ...cooled];
}

async function fetchJson(url, opts = {}) {
  const res = await fetch(url, opts);
  const text = await res.text();
  return { ok: res.ok, status: res.status, text };
}

function sleepAbortable(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { const err = new Error('Aborted'); err.name = 'AbortError'; return reject(err); }
    const timer = setTimeout(() => { if (signal) signal.removeEventListener('abort', onAbort); resolve(); }, ms);
    function onAbort() { clearTimeout(timer); const err = new Error('Aborted'); err.name = 'AbortError'; reject(err); }
    if (signal) signal.addEventListener('abort', onAbort, { once: true });
  });
}

async function complete({ provider, model, apiKey, baseUrl, systemPrompt, messages, tools, effort, webSearchEnabled, signal }) {
  if (provider === 'Gemini') return callGemini({ model, apiKey, systemPrompt, messages, tools, effort, webSearchEnabled, includeEffort: true, signal });
  if (provider === 'Claude') return callClaude({ model, apiKey, systemPrompt, messages, tools, effort, includeEffort: true, signal });
  return callOpenAiCompatible({ provider, model, apiKey, baseUrl, systemPrompt, messages, tools, effort, includeEffort: true, signal });
}

async function completeWithFailover({
  provider, model, apiKey, profileId, apiKeys, modelCatalog, customBaseUrl,
  autoFailover = true, systemPrompt, messages, tools, effort, webSearchEnabled, signal, onSwitch
}) {
  const effectiveKeys = apiKeys ? { ...apiKeys } : {};
  if (provider && apiKey && !effectiveKeys[provider]) effectiveKeys[provider] = apiKey;

  const chain = autoFailover
    ? buildFailoverChain({ primaryProvider: provider, primaryModel: model, profileId, apiKeys: effectiveKeys, modelCatalog, customBaseUrl })
    : [{ provider, model, apiKey: apiKey || (provider === 'Custom' ? 'local' : ''), baseUrl: provider === 'Custom' ? (customBaseUrl || '').trim() : '' }];

  if (!chain.length) throw new Error('No API key configured for any provider.');

  let lastError = null;
  let switchedFrom = null;

  for (let i = 0; i < chain.length; i++) {
    const cand = chain[i];
    if (signal?.aborted) { const err = new Error('Aborted'); err.name = 'AbortError'; throw err; }
    if (i > 0 || (provider && cand.provider !== provider)) {
      const fromProv = switchedFrom || provider || chain[0].provider;
      switchedFrom = fromProv;
      if (onSwitch) onSwitch({ fromProvider: fromProv, toProvider: cand.provider, toModel: cand.model, reason: lastError ? String(lastError.message || '').slice(0, 120) : 'cooldown' });
    }
    const safeMessages = cand.provider === 'Gemini' ? messages : messages.map(m => (m.rawParts ? { ...m, rawParts: undefined } : m));
    try {
      const resp = await complete({
        provider: cand.provider, model: cand.model, apiKey: cand.apiKey, baseUrl: cand.baseUrl,
        systemPrompt, messages: safeMessages, tools, effort, webSearchEnabled, signal
      });
      clearProviderCooldown(cand.provider);
      return { ...resp, usedProvider: cand.provider, usedModel: cand.model, switchedFrom: (provider && cand.provider !== provider) ? provider : switchedFrom };
    } catch (err) {
      lastError = err;
      const check = isQuotaOrFailoverError(err);
      if (autoFailover && check.failover && i < chain.length - 1) {
        if (check.reason !== 'model_not_found') markProviderCooldown(cand.provider, check.reason, check.hardQuota);
        switchedFrom = switchedFrom || cand.provider;
        continue;
      }
      throw err;
    }
  }
  throw lastError || new Error('All connected AI providers failed.');
}

function buildGeminiContents(messages) {
  const contents = [];
  for (const msg of messages) {
    if (msg.role === 'user') {
      const parts = [];
      if (msg.text) parts.push({ text: msg.text });
      for (const img of (msg.images || [])) parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });
      if (parts.length) contents.push({ role: 'user', parts });
    } else if (msg.role === 'assistant') {
      if (Array.isArray(msg.rawParts) && msg.rawParts.length > 0) {
        contents.push({ role: 'model', parts: msg.rawParts });
      } else {
        const parts = [];
        if (msg.text) parts.push({ text: msg.text });
        for (const tc of (msg.toolCalls || [])) {
          const part = { functionCall: { name: tc.name, args: tc.arguments || {} } };
          if (tc.thoughtSignature) part.thoughtSignature = tc.thoughtSignature;
          parts.push(part);
        }
        if (parts.length) contents.push({ role: 'model', parts });
      }
    } else if (msg.role === 'tool') {
      const fnRespPart = { functionResponse: { name: msg.toolName || 'tool', response: { result: msg.text } } };
      const prev = contents[contents.length - 1];
      if (prev && prev.role === 'user' && Array.isArray(prev.parts) && prev.parts.every(p => p.functionResponse)) prev.parts.push(fnRespPart);
      else contents.push({ role: 'user', parts: [fnRespPart] });
    }
  }
  return contents;
}

async function callGemini({ model, apiKey, systemPrompt, messages, tools, effort, webSearchEnabled, includeEffort, signal, retryIndex = 0, usedFallback = false }) {
  const contents = buildGeminiContents(messages);
  const body = { contents, generationConfig: { maxOutputTokens: 4096 } };
  if (systemPrompt) body.systemInstruction = { parts: [{ text: systemPrompt }] };
  if (includeEffort) {
    const b = { low: 0, medium: 1024, high: 4096, max: 8192 }[effort] || 0;
    if (b > 0) body.generationConfig.thinkingConfig = { thinkingBudget: b };
  }
  const toolsArr = [];
  if (tools && tools.length) toolsArr.push({ functionDeclarations: tools.map(t => ({ name: t.name, description: t.description, parameters: t.parameters })) });
  else if (webSearchEnabled) toolsArr.push({ google_search: {} });
  if (toolsArr.length) body.tools = toolsArr;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const res = await fetchJson(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey }, body: JSON.stringify(body), signal });

  if (!res.ok) {
    if (includeEffort && res.status === 400 && /thinking/i.test(res.text) && !/thought_signature/i.test(res.text)) {
      return callGemini({ model, apiKey, systemPrompt, messages, tools, effort, webSearchEnabled, includeEffort: false, signal, retryIndex, usedFallback });
    }
    if (res.status === 503) {
      if (retryIndex < 1) {
        await sleepAbortable(1200, signal);
        return callGemini({ model, apiKey, systemPrompt, messages, tools, effort, webSearchEnabled, includeEffort, signal, retryIndex: retryIndex + 1, usedFallback });
      }
      if (!usedFallback) {
        const fb = GEMINI_FALLBACK_MODELS.find(m => m !== model);
        if (fb) return callGemini({ model: fb, apiKey, systemPrompt, messages, tools, effort, webSearchEnabled, includeEffort, signal, retryIndex: 0, usedFallback: true });
      }
    }
    throw new Error(`Gemini HTTP ${res.status}: ${res.text.slice(0, 300)}`);
  }

  const data = JSON.parse(res.text);
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const texts = [];
  const toolCalls = [];
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (p.thought) continue;
    if (typeof p.text === 'string' && p.text) texts.push(p.text);
    if (p.functionCall) {
      toolCalls.push({ id: `gem_${Date.now()}_${i}`, name: p.functionCall.name, arguments: p.functionCall.args || {}, thoughtSignature: p.thoughtSignature || p.thought_signature || null });
    }
  }
  return { text: texts.join('\n').trim(), toolCalls, rawParts: parts };
}

async function callClaude({ model, apiKey, systemPrompt, messages, tools, effort, includeEffort, signal }) {
  const arr = [];
  for (const msg of messages) {
    if (msg.role === 'user') {
      const blocks = [];
      for (const img of (msg.images || [])) blocks.push({ type: 'image', source: { type: 'base64', media_type: img.mimeType, data: img.base64 } });
      if (msg.text) blocks.push({ type: 'text', text: msg.text });
      arr.push({ role: 'user', content: blocks });
    } else if (msg.role === 'assistant') {
      const blocks = [];
      if (msg.text) blocks.push({ type: 'text', text: msg.text });
      for (const tc of (msg.toolCalls || [])) blocks.push({ type: 'tool_use', id: tc.id, name: tc.name, input: tc.arguments || {} });
      arr.push({ role: 'assistant', content: blocks });
    } else if (msg.role === 'tool') {
      const block = { type: 'tool_result', tool_use_id: msg.toolCallId || 'tool', content: msg.text };
      const prev = arr[arr.length - 1];
      if (prev && prev.role === 'user' && Array.isArray(prev.content) && prev.content.every(b => b.type === 'tool_result')) prev.content.push(block);
      else arr.push({ role: 'user', content: [block] });
    }
  }
  const maxTokens = { low: 2048, medium: 4096, high: 8192, max: 12288 }[effort] || 4096;
  const body = { model, max_tokens: maxTokens, messages: arr };
  if (systemPrompt) body.system = systemPrompt;
  if (includeEffort && (effort === 'high' || effort === 'max')) body.thinking = { type: 'enabled', budget_tokens: effort === 'max' ? 6000 : 2500 };
  if (tools && tools.length) body.tools = tools.map(t => ({ name: t.name, description: t.description, input_schema: t.parameters }));

  const res = await fetchJson('https://api.anthropic.com/v1/messages', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' }, body: JSON.stringify(body), signal
  });
  if (!res.ok) {
    if (includeEffort && res.status === 400 && /thinking/i.test(res.text)) return callClaude({ model, apiKey, systemPrompt, messages, tools, effort, includeEffort: false, signal });
    throw new Error(`Claude HTTP ${res.status}: ${res.text.slice(0, 300)}`);
  }
  const data = JSON.parse(res.text);
  const texts = [];
  const toolCalls = [];
  for (const b of (data.content || [])) {
    if (b.type === 'text' && b.text) texts.push(b.text);
    if (b.type === 'tool_use') toolCalls.push({ id: b.id, name: b.name, arguments: b.input || {} });
  }
  return { text: texts.join('\n').trim(), toolCalls };
}

function resolveOpenAiUrl(provider, baseUrl) {
  if (provider === 'Custom') {
    const clean = String(baseUrl || '').trim().replace(/\/+$/, '');
    if (!clean) throw new Error('Custom Base URL is not set in Settings -> AI.');
    return /\/chat\/completions$/i.test(clean) ? clean : `${clean}/chat/completions`;
  }
  const url = OPENAI_ENDPOINTS[provider];
  if (!url) throw new Error(`Unknown provider: ${provider}`);
  return url;
}

async function callOpenAiCompatible({ provider, model, apiKey, baseUrl, systemPrompt, messages, tools, effort, includeEffort, signal }) {
  const url = resolveOpenAiUrl(provider, baseUrl);
  const arr = [];
  if (systemPrompt) arr.push({ role: 'system', content: systemPrompt });
  for (const msg of messages) {
    if (msg.role === 'user') {
      if (!msg.images || !msg.images.length) arr.push({ role: 'user', content: msg.text });
      else {
        const content = [];
        if (msg.text) content.push({ type: 'text', text: msg.text });
        for (const img of msg.images) content.push({ type: 'image_url', image_url: { url: `data:${img.mimeType};base64,${img.base64}` } });
        arr.push({ role: 'user', content });
      }
    } else if (msg.role === 'assistant') {
      const obj = { role: 'assistant', content: msg.text || null };
      if (msg.toolCalls && msg.toolCalls.length) {
        obj.tool_calls = msg.toolCalls.map(tc => ({ id: tc.id, type: 'function', function: { name: tc.name, arguments: JSON.stringify(tc.arguments || {}) } }));
      }
      arr.push(obj);
    } else if (msg.role === 'tool') {
      arr.push({ role: 'tool', tool_call_id: msg.toolCallId || 'tool', content: msg.text });
    }
  }
  const body = { model, messages: arr };
  if (includeEffort && provider === 'OpenAI') body.reasoning_effort = effort === 'max' ? 'high' : effort;
  if (tools && tools.length) body.tools = tools.map(t => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.parameters } }));

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey || 'local'}` };
  if (provider === 'OpenRouter') { headers['HTTP-Referer'] = 'https://nex.assistant.local'; headers['X-Title'] = 'Nex Assistant'; }
  const res = await fetchJson(url, { method: 'POST', headers, body: JSON.stringify(body), signal });
  if (!res.ok) {
    if (includeEffort && res.status === 400 && /reasoning_effort/i.test(res.text)) {
      return callOpenAiCompatible({ provider, model, apiKey, baseUrl, systemPrompt, messages, tools, effort, includeEffort: false, signal });
    }
    throw new Error(`${provider} HTTP ${res.status}: ${res.text.slice(0, 300)}`);
  }
  const message = JSON.parse(res.text)?.choices?.[0]?.message;
  if (!message) throw new Error(`Empty ${provider} response`);
  const toolCalls = (message.tool_calls || []).map((tc, idx) => {
    let args = {};
    try { args = JSON.parse(tc.function?.arguments || '{}'); } catch (_) {}
    return { id: tc.id || `oa_${idx}`, name: tc.function?.name, arguments: args };
  });
  return { text: String(message.content || '').trim(), toolCalls };
}

function filterChatModels(provider, rawIds) {
  const skipRx = /(embed|embedding|whisper|tts|audio|speech|moderation|dall-e|imagen|veo|realtime|transcribe|rerank)/i;
  let ids = Array.from(new Set(rawIds.filter(Boolean))).filter(id => !skipRx.test(id));
  if (provider === 'Gemini') ids = ids.filter(id => id.startsWith('gemini'));
  else if (provider === 'NVIDIA') ids = ids.filter(id => /(deepseek|qwen|gemma|kimi|minimax|llama|mistral|codestral|devstral)/i.test(id));
  else if (provider === 'OpenRouter') {
    const prio = ids.filter(id => /(claude|gpt-4|gpt-5|o3|o4|gemini|deepseek|qwen|codestral|devstral|mistral|grok|kimi|llama-3\.3|:free)/i.test(id));
    ids = (prio.length ? prio : ids).slice(0, 80);
  }
  return ids.slice(0, 80);
}

async function fetchModels(provider, apiKey, customBaseUrl = '') {
  if (provider === 'Custom') {
    const clean = String(customBaseUrl || '').trim().replace(/\/+$/, '');
    if (!clean) return [];
    const url = /\/models$/i.test(clean) ? clean : `${clean.replace(/\/chat\/completions$/i, '')}/models`;
    const res = await fetchJson(url, { headers: { Authorization: `Bearer ${apiKey || 'local'}` } });
    if (!res.ok) return [];
    const parsed = JSON.parse(res.text);
    const list = Array.isArray(parsed) ? parsed : (parsed.data || parsed.models || []);
    return list.map(m => m.id || m.name).filter(Boolean).slice(0, 60);
  }
  if (!apiKey) return [];
  if (provider === 'Gemini') {
    const res = await fetchJson('https://generativelanguage.googleapis.com/v1beta/models?pageSize=100', { headers: { 'x-goog-api-key': apiKey } });
    if (!res.ok) return [];
    return filterChatModels('Gemini', (JSON.parse(res.text).models || []).map(m => String(m.name || '').replace(/^models\//, '')));
  }
  if (provider === 'Claude') {
    const res = await fetchJson('https://api.anthropic.com/v1/models', { headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' } });
    if (!res.ok) return [];
    return filterChatModels('Claude', (JSON.parse(res.text).data || []).map(m => m.id));
  }
  const url = MODELS_ENDPOINTS[provider];
  if (!url) return [];
  const res = await fetchJson(url, { headers: { Authorization: `Bearer ${apiKey}` } });
  if (!res.ok) return [];
  const parsed = JSON.parse(res.text);
  const raw = Array.isArray(parsed) ? parsed : (parsed.data || parsed.models || []);
  return filterChatModels(provider, raw.map(m => m.id || m.name));
}

async function transcribeAudio({ geminiKey, openaiKey, groqKey, geminiModels, audioBase64, mimeType, lang, wakeCheck }) {
  if (!audioBase64) return { ok: false, text: '', error: 'Empty audio' };
  const cleanMime = String(mimeType || 'audio/webm').split(';')[0].trim() || 'audio/webm';

  if (geminiKey) {
    const langName = lang === 'en' ? 'English' : 'Russian';
    const prompt = wakeCheck
      ? `Transcribe this short ${langName} audio clip verbatim. The speaker may say the assistant wake word "Некс" (or "Некси" / "Nex" / "Nexi"). Return ONLY the exact spoken words without quotes or explanation. If there is only noise or silence, return an empty string.`
      : `Transcribe this ${langName} voice command verbatim. Preserve the exact words spoken. Return ONLY the spoken text, no quotes or commentary. If silent, return empty string.`;

    const candidates = Array.from(new Set([
      ...(Array.isArray(geminiModels) ? geminiModels.filter(m => /flash/i.test(m) && !/tts|image/i.test(m)) : []),
      'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.5-flash-lite'
    ])).slice(0, 4);

    let lastErr = '';
    for (const model of candidates) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
      const res = await fetchJson(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiKey },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ inlineData: { mimeType: cleanMime, data: audioBase64 } }, { text: prompt }] }],
          generationConfig: { maxOutputTokens: wakeCheck ? 80 : 512, temperature: 0 }
        })
      });
      if (res.ok) {
        const text = (JSON.parse(res.text)?.candidates?.[0]?.content?.parts || [])
          .filter(p => typeof p.text === 'string' && !p.thought).map(p => p.text).join(' ')
          .replace(/^["«»'“”]+|["«»'“”]+$/g, '').trim();
        return { ok: true, text };
      }
      lastErr = `Gemini STT HTTP ${res.status}: ${res.text.slice(0, 180)}`;
      if (![400, 404, 429, 503].includes(res.status)) break;
    }
    if (!openaiKey && !groqKey) return { ok: false, text: '', error: lastErr || 'Gemini STT failed' };
  }

  const sttProviders = [];
  if (groqKey) sttProviders.push({ url: 'https://api.groq.com/openai/v1/audio/transcriptions', key: groqKey, model: 'whisper-large-v3-turbo' });
  if (openaiKey) sttProviders.push({ url: 'https://api.openai.com/v1/audio/transcriptions', key: openaiKey, model: 'whisper-1' });
  for (const sp of sttProviders) {
    const form = new FormData();
    form.append('model', sp.model);
    form.append('language', lang === 'en' ? 'en' : 'ru');
    form.append('prompt', lang === 'en' ? 'Nex, Nexi' : 'Некс, Некси');
    form.append('file', new Blob([Buffer.from(audioBase64, 'base64')], { type: cleanMime }), 'voice.webm');
    const res = await fetch(sp.url, { method: 'POST', headers: { Authorization: `Bearer ${sp.key}` }, body: form });
    const text = await res.text();
    if (res.ok) return { ok: true, text: String(JSON.parse(text).text || '').trim() };
  }
  return { ok: false, text: '', error: 'Add a Gemini, Groq, or OpenAI API key in Settings -> AI for voice input.' };
}

module.exports = {
  complete, completeWithFailover, fetchModels, transcribeAudio, buildGeminiContents,
  buildFailoverChain, isQuotaOrFailoverError, markProviderCooldown, getProviderCooldown, clearProviderCooldown
};
