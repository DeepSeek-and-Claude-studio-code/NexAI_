'use strict';

const OPENAI_ENDPOINTS = {
  OpenAI: 'https://api.openai.com/v1/chat/completions',
  DeepSeek: 'https://api.deepseek.com/chat/completions',
  NVIDIA: 'https://integrate.api.nvidia.com/v1/chat/completions'
};

async function fetchJson(url, opts = {}) {
  const res = await fetch(url, opts);
  const text = await res.text();
  return { ok: res.ok, status: res.status, text };
}

async function complete({
  provider,
  model,
  apiKey,
  systemPrompt,
  messages,
  tools,
  effort,
  webSearchEnabled,
  signal
}) {
  if (provider === 'Gemini') {
    return callGemini({ model, apiKey, systemPrompt, messages, tools, effort, webSearchEnabled, includeEffort: true, signal });
  }
  if (provider === 'Claude') {
    return callClaude({ model, apiKey, systemPrompt, messages, tools, effort, includeEffort: true, signal });
  }
  return callOpenAiCompatible({ provider, model, apiKey, systemPrompt, messages, tools, effort, includeEffort: true, signal });
}

async function callGemini({ model, apiKey, systemPrompt, messages, tools, effort, webSearchEnabled, includeEffort, signal }) {
  const contents = [];
  for (const msg of messages) {
    if (msg.role === 'user') {
      const parts = [];
      if (msg.text) parts.push({ text: msg.text });
      for (const img of (msg.images || [])) {
        parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });
      }
      if (parts.length) contents.push({ role: 'user', parts });
    } else if (msg.role === 'assistant') {
      const parts = [];
      if (msg.text) parts.push({ text: msg.text });
      for (const tc of (msg.toolCalls || [])) {
        parts.push({ functionCall: { name: tc.name, args: tc.arguments || {} } });
      }
      if (parts.length) contents.push({ role: 'model', parts });
    } else if (msg.role === 'tool') {
      contents.push({
        role: 'user',
        parts: [{ functionResponse: { name: msg.toolName || 'tool', response: { result: msg.text } } }]
      });
    }
  }

  const body = { contents, generationConfig: { maxOutputTokens: 4096 } };
  if (systemPrompt) body.systemInstruction = { parts: [{ text: systemPrompt }] };
  if (includeEffort) {
    const budgets = { low: 0, medium: 1024, high: 4096, max: 8192 };
    const b = budgets[effort] || 0;
    if (b > 0) body.generationConfig.thinkingConfig = { thinkingBudget: b };
  }

  const toolsArr = [];
  if (tools && tools.length) {
    toolsArr.push({
      functionDeclarations: tools.map(t => ({
        name: t.name,
        description: t.description,
        parameters: t.parameters
      }))
    });
  } else if (webSearchEnabled) {
    toolsArr.push({ google_search: {} });
  }
  if (toolsArr.length) body.tools = toolsArr;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const res = await fetchJson(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify(body),
    signal
  });

  if (!res.ok) {
    if (includeEffort && res.status === 400 && /thinking/i.test(res.text)) {
      return callGemini({ model, apiKey, systemPrompt, messages, tools, effort, webSearchEnabled, includeEffort: false, signal });
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
      toolCalls.push({
        id: `gem_${Date.now()}_${i}`,
        name: p.functionCall.name,
        arguments: p.functionCall.args || {}
      });
    }
  }
  return { text: texts.join('\n').trim(), toolCalls };
}

async function callClaude({ model, apiKey, systemPrompt, messages, tools, effort, includeEffort, signal }) {
  const arr = [];
  for (const msg of messages) {
    if (msg.role === 'user') {
      const blocks = [];
      for (const img of (msg.images || [])) {
        blocks.push({
          type: 'image',
          source: { type: 'base64', media_type: img.mimeType, data: img.base64 }
        });
      }
      if (msg.text) blocks.push({ type: 'text', text: msg.text });
      arr.push({ role: 'user', content: blocks });
    } else if (msg.role === 'assistant') {
      const blocks = [];
      if (msg.text) blocks.push({ type: 'text', text: msg.text });
      for (const tc of (msg.toolCalls || [])) {
        blocks.push({ type: 'tool_use', id: tc.id, name: tc.name, input: tc.arguments || {} });
      }
      arr.push({ role: 'assistant', content: blocks });
    } else if (msg.role === 'tool') {
      arr.push({
        role: 'user',
        content: [{ type: 'tool_result', tool_use_id: msg.toolCallId || 'tool', content: msg.text }]
      });
    }
  }

  const maxTokens = { low: 2048, medium: 4096, high: 8192, max: 12288 }[effort] || 4096;
  const body = { model, max_tokens: maxTokens, messages: arr };
  if (systemPrompt) body.system = systemPrompt;
  if (includeEffort && (effort === 'high' || effort === 'max')) {
    body.thinking = { type: 'enabled', budget_tokens: effort === 'max' ? 6000 : 2500 };
  }
  if (tools && tools.length) {
    body.tools = tools.map(t => ({
      name: t.name,
      description: t.description,
      input_schema: t.parameters
    }));
  }

  const res = await fetchJson('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify(body),
    signal
  });

  if (!res.ok) {
    if (includeEffort && res.status === 400 && /thinking/i.test(res.text)) {
      return callClaude({ model, apiKey, systemPrompt, messages, tools, effort, includeEffort: false, signal });
    }
    throw new Error(`Claude HTTP ${res.status}: ${res.text.slice(0, 300)}`);
  }

  const data = JSON.parse(res.text);
  const texts = [];
  const toolCalls = [];
  for (const b of (data.content || [])) {
    if (b.type === 'text' && b.text) texts.push(b.text);
    if (b.type === 'tool_use') {
      toolCalls.push({ id: b.id, name: b.name, arguments: b.input || {} });
    }
  }
  return { text: texts.join('\n').trim(), toolCalls };
}

async function callOpenAiCompatible({ provider, model, apiKey, systemPrompt, messages, tools, effort, includeEffort, signal }) {
  const url = OPENAI_ENDPOINTS[provider];
  if (!url) throw new Error(`Unknown provider: ${provider}`);
  const arr = [];
  if (systemPrompt) arr.push({ role: 'system', content: systemPrompt });
  for (const msg of messages) {
    if (msg.role === 'user') {
      if (!msg.images || !msg.images.length) {
        arr.push({ role: 'user', content: msg.text });
      } else {
        const content = [];
        if (msg.text) content.push({ type: 'text', text: msg.text });
        for (const img of msg.images) {
          content.push({ type: 'image_url', image_url: { url: `data:${img.mimeType};base64,${img.base64}` } });
        }
        arr.push({ role: 'user', content });
      }
    } else if (msg.role === 'assistant') {
      const obj = { role: 'assistant', content: msg.text || null };
      if (msg.toolCalls && msg.toolCalls.length) {
        obj.tool_calls = msg.toolCalls.map(tc => ({
          id: tc.id,
          type: 'function',
          function: { name: tc.name, arguments: JSON.stringify(tc.arguments || {}) }
        }));
      }
      arr.push(obj);
    } else if (msg.role === 'tool') {
      arr.push({ role: 'tool', tool_call_id: msg.toolCallId || 'tool', content: msg.text });
    }
  }

  const body = { model, messages: arr };
  if (includeEffort && provider === 'OpenAI') {
    body.reasoning_effort = effort === 'max' ? 'high' : effort;
  }
  if (tools && tools.length) {
    body.tools = tools.map(t => ({
      type: 'function',
      function: { name: t.name, description: t.description, parameters: t.parameters }
    }));
  }

  const res = await fetchJson(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
    signal
  });

  if (!res.ok) {
    if (includeEffort && res.status === 400 && /reasoning_effort/i.test(res.text)) {
      return callOpenAiCompatible({ provider, model, apiKey, systemPrompt, messages, tools, effort, includeEffort: false, signal });
    }
    throw new Error(`${provider} HTTP ${res.status}: ${res.text.slice(0, 300)}`);
  }

  const data = JSON.parse(res.text);
  const message = data?.choices?.[0]?.message;
  if (!message) throw new Error(`Empty ${provider} response`);
  const toolCalls = (message.tool_calls || []).map((tc, idx) => {
    let args = {};
    try { args = JSON.parse(tc.function?.arguments || '{}'); } catch (_) {}
    return { id: tc.id || `oa_${idx}`, name: tc.function?.name, arguments: args };
  });
  return { text: String(message.content || '').trim(), toolCalls };
}

async function fetchModels(provider, apiKey) {
  if (!apiKey) return [];
  if (provider === 'Gemini') {
    const res = await fetchJson('https://generativelanguage.googleapis.com/v1beta/models?pageSize=100', {
      headers: { 'x-goog-api-key': apiKey }
    });
    if (!res.ok) return [];
    const arr = JSON.parse(res.text).models || [];
    return arr.map(m => String(m.name || '').replace(/^models\//, '')).filter(n => n.startsWith('gemini'));
  }
  if (provider === 'Claude') {
    const res = await fetchJson('https://api.anthropic.com/v1/models', {
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' }
    });
    if (!res.ok) return [];
    return (JSON.parse(res.text).data || []).map(m => m.id).filter(Boolean);
  }
  const map = {
    OpenAI: 'https://api.openai.com/v1/models',
    DeepSeek: 'https://api.deepseek.com/models',
    NVIDIA: 'https://integrate.api.nvidia.com/v1/models'
  };
  const url = map[provider];
  if (!url) return [];
  const res = await fetchJson(url, { headers: { Authorization: `Bearer ${apiKey}` } });
  if (!res.ok) return [];
  let ids = (JSON.parse(res.text).data || []).map(m => m.id).filter(Boolean);
  if (provider === 'NVIDIA') {
    ids = ids.filter(id => /(deepseek|gemma|kimi|minimax)/i.test(id));
  }
  return ids;
}

module.exports = { complete, fetchModels };
