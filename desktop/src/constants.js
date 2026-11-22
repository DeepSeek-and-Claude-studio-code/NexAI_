'use strict';

const PROVIDERS = [
  'Gemini',
  'OpenAI',
  'Claude',
  'OpenRouter',
  'Mistral',
  'DeepSeek',
  'Qwen',
  'Groq',
  'Cerebras',
  'GitHub',
  'xAI',
  'NVIDIA',
  'Custom'
];

const PROVIDER_META = {
  Gemini:     { hint: 'Google AI Studio (AIza…)', codingNote: 'Большой контекст, мультимодальность' },
  OpenAI:     { hint: 'platform.openai.com (sk-…)', codingNote: 'GPT / o-серия для архитектуры' },
  Claude:     { hint: 'console.anthropic.com (sk-ant-…)', codingNote: 'Топ для сложного кода и рефакторинга' },
  OpenRouter: { hint: 'openrouter.ai (sk-or-…)', codingNote: '1 ключ = сотни моделей + бесплатные :free' },
  Mistral:    { hint: 'console.mistral.ai', codingNote: 'Codestral & Devstral специально под код' },
  DeepSeek:   { hint: 'platform.deepseek.com (sk-…)', codingNote: 'Дешёвый и сильный кодинг + reasoning' },
  Qwen:       { hint: 'Alibaba DashScope International', codingNote: 'Qwen3 Coder — силён в больших проектах' },
  Groq:       { hint: 'console.groq.com (gsk_…)', codingNote: 'Сверхбыстрый вывод (есть бесплатный лимит)' },
  Cerebras:   { hint: 'cloud.cerebras.ai (csk-…)', codingNote: 'Рекордная скорость для агентных циклов' },
  GitHub:     { hint: 'GitHub PAT (ghp_ / github_pat_)', codingNote: 'Бесплатный доступ через аккаунт GitHub' },
  xAI:        { hint: 'console.x.ai (xai-…)', codingNote: 'Grok Code & Grok Reasoning' },
  NVIDIA:     { hint: 'build.nvidia.com (nvapi-…)', codingNote: 'DeepSeek, Kimi, Gemma, MiniMax' },
  Custom:     { hint: 'Любой OpenAI-совместимый API / Ollama', codingNote: 'Задай Base URL ниже (ключ опционален для локальных)' }
};

const DEFAULT_MODELS = {
  Gemini: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.5-flash-lite', 'gemini-2.0-flash'],
  OpenAI: ['gpt-4.1', 'gpt-4.1-mini', 'o3-mini', 'gpt-4o'],
  Claude: ['claude-sonnet-4-5', 'claude-opus-4-1', 'claude-3-7-sonnet-latest', 'claude-3-5-haiku-latest'],
  OpenRouter: [
    'anthropic/claude-sonnet-4',
    'deepseek/deepseek-chat-v3-0324:free',
    'qwen/qwen3-coder:free',
    'openai/gpt-4.1',
    'mistralai/devstral-small:free',
    'google/gemini-2.5-flash'
  ],
  Mistral: ['devstral-medium-latest', 'devstral-small-latest', 'codestral-latest', 'mistral-large-latest'],
  DeepSeek: ['deepseek-chat', 'deepseek-reasoner'],
  Qwen: ['qwen3-coder-plus', 'qwen-plus', 'qwen-turbo'],
  Groq: ['qwen/qwen3-32b', 'llama-3.3-70b-versatile', 'moonshotai/kimi-k2-instruct'],
  Cerebras: ['qwen-3-coder-480b', 'qwen-3-32b', 'llama-3.3-70b'],
  GitHub: ['gpt-4o', 'DeepSeek-R1', 'Codestral-2501', 'Meta-Llama-3.3-70B-Instruct'],
  xAI: ['grok-code-fast-1', 'grok-3', 'grok-3-mini'],
  NVIDIA: ['deepseek-ai/deepseek-r1', 'qwen/qwen2.5-coder-32b-instruct', 'moonshotai/kimi-k2-instruct', 'google/gemma-3-27b-it'],
  Custom: ['qwen2.5-coder:14b', 'deepseek-r1:14b', 'devstral:latest']
};

const IMAGE_MODELS = {
  Gemini: ['gemini-2.5-flash-image', 'gemini-2.0-flash-exp-image-generation'],
  OpenAI: ['gpt-image-1']
};

const VIDEO_MODELS = {
  Gemini: ['veo-2.0-generate-001']
};

const EFFORTS = [
  { id: 'low', ru: 'Низкое', en: 'Low' },
  { id: 'medium', ru: 'Среднее', en: 'Medium' },
  { id: 'high', ru: 'Высокое', en: 'High' },
  { id: 'max', ru: 'Максимальное', en: 'Maximum' }
];

const NEX_PROFILES = [
  {
    id: 'atom',
    title: 'Nex Atom',
    descRu: 'Быстрые ответы и простые задачи',
    descEn: 'Fast answers and simple tasks',
    isMedia: false,
    textRoutes: [
      ['Groq', 'qwen/qwen3-32b'],
      ['Cerebras', 'qwen-3-32b'],
      ['Gemini', 'gemini-2.5-flash-lite'],
      ['OpenRouter', 'qwen/qwen3-coder:free'],
      ['Mistral', 'devstral-small-latest'],
      ['DeepSeek', 'deepseek-chat'],
      ['Qwen', 'qwen-turbo'],
      ['OpenAI', 'gpt-4.1-mini'],
      ['Claude', 'claude-3-5-haiku-latest'],
      ['GitHub', 'gpt-4o'],
      ['xAI', 'grok-3-mini'],
      ['NVIDIA', 'google/gemma-3-27b-it'],
      ['Custom', 'qwen2.5-coder:14b']
    ]
  },
  {
    id: 'quark',
    title: 'Nex Quark',
    descRu: 'Золотая середина: ум, код и скорость',
    descEn: 'The sweet spot: smart, coding & speed',
    isMedia: false,
    textRoutes: [
      ['Claude', 'claude-sonnet-4-5'],
      ['OpenRouter', 'anthropic/claude-sonnet-4'],
      ['Gemini', 'gemini-2.5-flash'],
      ['Mistral', 'devstral-medium-latest'],
      ['DeepSeek', 'deepseek-chat'],
      ['Qwen', 'qwen3-coder-plus'],
      ['OpenAI', 'gpt-4.1'],
      ['Cerebras', 'qwen-3-coder-480b'],
      ['Groq', 'qwen/qwen3-32b'],
      ['GitHub', 'Codestral-2501'],
      ['xAI', 'grok-code-fast-1'],
      ['NVIDIA', 'qwen/qwen2.5-coder-32b-instruct'],
      ['Custom', 'qwen2.5-coder:14b']
    ]
  },
  {
    id: 'sel',
    title: 'Nex Sel',
    descRu: 'Самый сильный для сложного кода и задач',
    descEn: 'The strongest for complex coding & tasks',
    isMedia: false,
    textRoutes: [
      ['Claude', 'claude-opus-4-1'],
      ['OpenAI', 'gpt-4.1'],
      ['OpenRouter', 'anthropic/claude-sonnet-4'],
      ['Gemini', 'gemini-2.5-pro'],
      ['DeepSeek', 'deepseek-reasoner'],
      ['Qwen', 'qwen3-coder-plus'],
      ['Mistral', 'codestral-latest'],
      ['xAI', 'grok-3'],
      ['Cerebras', 'qwen-3-coder-480b'],
      ['GitHub', 'DeepSeek-R1'],
      ['Groq', 'moonshotai/kimi-k2-instruct'],
      ['NVIDIA', 'deepseek-ai/deepseek-r1'],
      ['Custom', 'deepseek-r1:14b']
    ]
  },
  {
    id: 'foton',
    title: 'Nex Foton',
    descRu: 'Картинки, фото и видео',
    descEn: 'Images, photo & video',
    isMedia: true,
    imageRoutes: [
      ['Gemini', 'gemini-2.5-flash-image'],
      ['OpenAI', 'gpt-image-1']
    ],
    videoRoutes: [
      ['Gemini', 'veo-2.0-generate-001']
    ]
  }
];

function isProviderReady(provider, apiKeys, customBaseUrl) {
  if (provider === 'Custom') return Boolean((customBaseUrl || '').trim());
  return Boolean((apiKeys?.[provider] || '').trim());
}

function pickBestModelForProvider(provider, preferredModel, modelCatalog) {
  const cat = Array.isArray(modelCatalog?.[provider]) ? modelCatalog[provider] : [];
  if (preferredModel) {
    if (!cat.length || cat.includes(preferredModel)) return preferredModel;
    const base = preferredModel.split(':')[0].split('-').slice(0, 2).join('-').toLowerCase();
    const similar = cat.find(m => m.toLowerCase().includes(base));
    if (similar) return similar;
  }
  if (cat.length) return cat[0];
  return (DEFAULT_MODELS[provider] || [])[0] || preferredModel || '';
}

function normalizeProfileId(id) {
  if (!id) return null;
  const map = { etude: 'atom', lite: 'atom', ballad: 'quark', bal: 'quark', symphony: 'sel', max: 'sel', canvas: 'foton', studio: 'foton' };
  const mapped = map[String(id).toLowerCase()] || String(id).toLowerCase();
  return NEX_PROFILES.some(p => p.id === mapped) ? mapped : null;
}

function resolveProfileText(profileId, apiKeys, customBaseUrl = '', modelCatalog = null) {
  const pid = normalizeProfileId(profileId);
  const prof = NEX_PROFILES.find(p => p.id === pid);
  if (!prof || prof.isMedia) return null;
  for (const [provider, model] of prof.textRoutes) {
    if (isProviderReady(provider, apiKeys, customBaseUrl)) {
      return { provider, model: pickBestModelForProvider(provider, model, modelCatalog) };
    }
  }
  return null;
}

function resolveProfileMedia(profileId, mode, apiKeys) {
  const pid = normalizeProfileId(profileId);
  const prof = NEX_PROFILES.find(p => p.id === pid);
  if (!prof || !prof.isMedia) return null;
  const routes = mode === 'video' ? prof.videoRoutes : prof.imageRoutes;
  for (const [provider, model] of routes) {
    if ((apiKeys?.[provider] || '').trim()) return { provider, model };
  }
  return null;
}

module.exports = {
  PROVIDERS, PROVIDER_META, DEFAULT_MODELS, IMAGE_MODELS, VIDEO_MODELS, EFFORTS, NEX_PROFILES,
  isProviderReady, pickBestModelForProvider, normalizeProfileId, resolveProfileText, resolveProfileMedia
};
