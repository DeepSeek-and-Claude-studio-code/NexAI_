'use strict';

const PROVIDERS = ['Gemini', 'OpenAI', 'Claude', 'DeepSeek', 'NVIDIA'];

const DEFAULT_MODELS = {
  Gemini: ['gemini-4-argon', 'gemini-3.8-flash', 'gemini-3.1-pro-preview', 'gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'],
  OpenAI: ['gpt-6.2-astra', 'gpt-6.2-sol', 'gpt-6.1-terra', 'gpt-6-luna'],
  Claude: ['claude-fable-5-2', 'claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5'],
  DeepSeek: ['deepseek-v4-pro', 'deepseek-flash'],
  NVIDIA: ['deepseek-ai/deepseek-v4.1-flash', 'deepseek-ai/deepseek-v4-pro', 'deepseek-ai/deepseek-v4-flash', 'moonshotai/kimi-k2.6', 'minimaxai/minimax-m2.7', 'google/gemma-4-31b-it']
};

const NEX_PROFILES = {
  atom: [
    ['Gemini', 'gemini-3.1-flash-lite'], ['OpenAI', 'gpt-6-luna'],
    ['Claude', 'claude-haiku-5-5'], ['DeepSeek', 'deepseek-flash'], ['NVIDIA', 'google/gemma-4-31b-it']
  ],
  quark: [
    ['Claude', 'claude-sonnet-5-5'], ['Gemini', 'gemini-3.8-flash'],
    ['OpenAI', 'gpt-6.1-terra'], ['DeepSeek', 'deepseek-v4-pro'], ['NVIDIA', 'deepseek-ai/deepseek-v4.1-flash']
  ],
  sel: [
    ['Claude', 'claude-opus-5-5'], ['OpenAI', 'gpt-6.2-astra'],
    ['Gemini', 'gemini-4-argon'], ['DeepSeek', 'deepseek-v4-pro'], ['NVIDIA', 'moonshotai/kimi-k2.6']
  ]
};

const OPENAI_ENDPOINTS = {
  OpenAI: 'https://api.openai.com/v1/chat/completions',
  DeepSeek: 'https://api.deepseek.com/chat/completions',
  NVIDIA: 'https://integrate.api.nvidia.com/v1/chat/completions'
};

function resolveProfile(profileId, keys) {
  const routes = NEX_PROFILES[profileId] || NEX_PROFILES.quark;
  for (const [provider, model] of routes) {
    if ((keys[provider] || '').trim()) return { provider, model };
  }
  return null;
}

async function complete({ provider, model, apiKey, systemPrompt, messages, tools, effort }) {
  if (provider === 'Gemini') return callGemini({ model, apiKey, systemPrompt, messages, tools, effort, includeEffort: true });
  if (provider === 'Claude') return callClaude({ model, apiKey, systemPrompt, messages, tools, effort, includeEffort: true });
  return callOpenAi({ provider, model, apiKey, systemPrompt, messages, tools, effort, includeEffort: true });
}

async function callGemini({ model, apiKey, systemPrompt, messages, tools, effort, includeEffort }) {
  const contents = [];
  for (const m of messages) {
    if (m.role === 'user') contents.push({ role: 'user', parts: [{ text: m.text }] });
    else if (m.role === 'assistant') {
      const parts = [];
      if (m.text) parts.push({ text: m.text });
      for (const tc of (m.toolCalls || [])) parts.push({ functionCall: { name: tc.name, args: tc.arguments || {} } });
      if (parts.length) contents.push({ role: 'model', parts });
    } else if (m.role === 'tool') {
      contents.push({ role: 'user', parts: [{ functionResponse: { name: m.toolName, response: { result: m.text } } }] });
    }
  }
  const body = {
    contents,
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: { maxOutputTokens: 4096 },
    tools: [{ functionDeclarations: tools.map(t => ({ name: t.name, description: t.description, parameters: t.parameters })) }]
  };
  if (includeEffort) {
    const b = { low: 0, medium: 1024, high: 4096, max: 8192 }[effort] || 0;
    if (b > 0) body.generationConfig.thinkingConfig = { thinkingBudget: b };
  }
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify(body)
  });
  const text = await res.text();
  if (!res.ok) {
    if (includeEffort && res.status === 400 && /thinking/i.test(text)) {
      return callGemini({ model, apiKey, systemPrompt, messages, tools, effort, includeEffort: false });
    }
    throw new Error(`Gemini HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  const parts = JSON.parse(text)?.candidates?.[0]?.content?.parts || [];
  const texts = [];
  const toolCalls = [];
  parts.forEach((p, idx) => {
    if (p.thought) return;
    if (p.text) texts.push(p.text);
    if (p.functionCall) toolCalls.push({ id: `gem_${Date.now()}_${idx}`, name: p.functionCall.name, arguments: p.functionCall.args || {} });
  });
  return { text: texts.join('\n').trim(), toolCalls };
}

async function callClaude({ model, apiKey, systemPrompt, messages, tools, effort, includeEffort }) {
  const arr = [];
  for (const m of messages) {
    if (m.role === 'user') arr.push({ role: 'user', content: m.text });
    else if (m.role === 'assistant') {
      const blocks = [];
      if (m.text) blocks.push({ type: 'text', text: m.text });
      for (const tc of (m.toolCalls || [])) blocks.push({ type: 'tool_use', id: tc.id, name: tc.name, input: tc.arguments || {} });
      arr.push({ role: 'assistant', content: blocks });
    } else if (m.role === 'tool') {
      arr.push({ role: 'user', content: [{ type: 'tool_result', tool_use_id: m.toolCallId, content: m.text }] });
    }
  }
  const body = {
    model,
    max_tokens: { low: 2048, medium: 4096, high: 8192, max: 12288 }[effort] || 4096,
    system: systemPrompt,
    messages: arr,
    tools: tools.map(t => ({ name: t.name, description: t.description, input_schema: t.parameters }))
  };
  if (includeEffort && (effort === 'high' || effort === 'max')) {
    body.thinking = { type: 'enabled', budget_tokens: effort === 'max' ? 6000 : 2500 };
  }
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify(body)
  });
  const text = await res.text();
  if (!res.ok) {
    if (includeEffort && res.status === 400 && /thinking/i.test(text)) {
      return callClaude({ model, apiKey, systemPrompt, messages, tools, effort, includeEffort: false });
    }
    throw new Error(`Claude HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  const content = JSON.parse(text).content || [];
  const texts = [];
  const toolCalls = [];
  for (const b of content) {
    if (b.type === 'text' && b.text) texts.push(b.text);
    if (b.type === 'tool_use') toolCalls.push({ id: b.id, name: b.name, arguments: b.input || {} });
  }
  return { text: texts.join('\n').trim(), toolCalls };
}

async function callOpenAi({ provider, model, apiKey, systemPrompt, messages, tools, effort, includeEffort }) {
  const url = OPENAI_ENDPOINTS[provider];
  if (!url) throw new Error(`Unknown provider: ${provider}`);
  const arr = [{ role: 'system', content: systemPrompt }];
  for (const m of messages) {
    if (m.role === 'user') arr.push({ role: 'user', content: m.text });
    else if (m.role === 'assistant') {
      const o = { role: 'assistant', content: m.text || null };
      if (m.toolCalls?.length) {
        o.tool_calls = m.toolCalls.map(tc => ({
          id: tc.id, type: 'function', function: { name: tc.name, arguments: JSON.stringify(tc.arguments || {}) }
        }));
      }
      arr.push(o);
    } else if (m.role === 'tool') {
      arr.push({ role: 'tool', tool_call_id: m.toolCallId, content: m.text });
    }
  }
  const body = {
    model,
    messages: arr,
    tools: tools.map(t => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.parameters } }))
  };
  if (includeEffort && provider === 'OpenAI') body.reasoning_effort = effort === 'max' ? 'high' : effort;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body)
  });
  const text = await res.text();
  if (!res.ok) {
    if (includeEffort && res.status === 400 && /reasoning_effort/i.test(text)) {
      return callOpenAi({ provider, model, apiKey, systemPrompt, messages, tools, effort, includeEffort: false });
    }
    throw new Error(`${provider} HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  const msg = JSON.parse(text)?.choices?.[0]?.message;
  const toolCalls = (msg?.tool_calls || []).map((tc, idx) => {
    let args = {};
    try { args = JSON.parse(tc.function?.arguments || '{}'); } catch (_) {}
    return { id: tc.id || `oa_${idx}`, name: tc.function?.name, arguments: args };
  });
  return { text: String(msg?.content || '').trim(), toolCalls };
}

module.exports = { PROVIDERS, DEFAULT_MODELS, NEX_PROFILES, resolveProfile, complete };
