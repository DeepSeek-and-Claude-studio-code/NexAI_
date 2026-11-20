'use strict';

const PROVIDERS = ['Gemini', 'OpenAI', 'Claude', 'DeepSeek', 'NVIDIA'];

const DEFAULT_MODELS = {
  Gemini: [
    'gemini-4-argon',
    'gemini-3.8-flash',
    'gemini-3.1-pro-preview',
    'gemini-3.6-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite'
  ],
  OpenAI: [
    'gpt-6.2-astra',
    'gpt-6.2-sol',
    'gpt-6.1-terra',
    'gpt-6-luna'
  ],
  Claude: [
    'claude-fable-5-2',
    'claude-opus-5-5',
    'claude-sonnet-5-5',
    'claude-haiku-5-5'
  ],
  DeepSeek: [
    'deepseek-v4-pro',
    'deepseek-flash'
  ],
  NVIDIA: [
    'deepseek-ai/deepseek-v4.1-flash',
    'deepseek-ai/deepseek-v4-pro',
    'deepseek-ai/deepseek-v4-flash',
    'moonshotai/kimi-k2.6',
    'minimaxai/minimax-m2.7',
    'google/gemma-4-31b-it'
  ]
};

const IMAGE_MODELS = {
  Gemini: [
    'gemini-nano-banana-2.1',
    'gemini-3.1-flash-image',
    'gemini-3.1-flash-lite-image',
    'gemini-3-pro-image'
  ],
  OpenAI: [
    'gpt-image-2.6-sunburst',
    'gpt-image-2.6-flare',
    'gpt-image-2.5-sunburst',
    'gpt-image-2.5-flare'
  ]
};

const VIDEO_MODELS = {
  Gemini: ['gemini-omni-1.1-flash']
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
      ['Gemini', 'gemini-3.1-flash-lite'],
      ['OpenAI', 'gpt-6-luna'],
      ['Claude', 'claude-haiku-5-5'],
      ['DeepSeek', 'deepseek-flash'],
      ['NVIDIA', 'google/gemma-4-31b-it']
    ]
  },
  {
    id: 'quark',
    title: 'Nex Quark',
    descRu: 'Золотая середина: ум и скорость',
    descEn: 'The sweet spot: smart and fast',
    isMedia: false,
    textRoutes: [
      ['Claude', 'claude-sonnet-5-5'],
      ['Gemini', 'gemini-3.8-flash'],
      ['OpenAI', 'gpt-6.1-terra'],
      ['DeepSeek', 'deepseek-v4-pro'],
      ['NVIDIA', 'deepseek-ai/deepseek-v4.1-flash']
    ]
  },
  {
    id: 'sel',
    title: 'Nex Sel',
    descRu: 'Самый сильный для сложных задач',
    descEn: 'The strongest for complex tasks',
    isMedia: false,
    textRoutes: [
      ['Claude', 'claude-opus-5-5'],
      ['OpenAI', 'gpt-6.2-astra'],
      ['Gemini', 'gemini-4-argon'],
      ['DeepSeek', 'deepseek-v4-pro'],
      ['NVIDIA', 'moonshotai/kimi-k2.6']
    ]
  },
  {
    id: 'foton',
    title: 'Nex Foton',
    descRu: 'Картинки, фото и видео',
    descEn: 'Images, photo & video',
    isMedia: true,
    imageRoutes: [
      ['Gemini', 'gemini-nano-banana-2.1'],
      ['OpenAI', 'gpt-image-2.6-sunburst']
    ],
    videoRoutes: [
      ['Gemini', 'gemini-omni-1.1-flash']
    ]
  }
];

function normalizeProfileId(id) {
  if (!id) return null;
  const map = { etude: 'atom', lite: 'atom', ballad: 'quark', bal: 'quark', symphony: 'sel', max: 'sel', canvas: 'foton', studio: 'foton' };
  const mapped = map[String(id).toLowerCase()] || String(id).toLowerCase();
  return NEX_PROFILES.some(p => p.id === mapped) ? mapped : null;
}

function resolveProfileText(profileId, apiKeys) {
  const pid = normalizeProfileId(profileId);
  const prof = NEX_PROFILES.find(p => p.id === pid);
  if (!prof || prof.isMedia) return null;
  for (const [provider, model] of prof.textRoutes) {
    if ((apiKeys[provider] || '').trim()) return { provider, model };
  }
  return null;
}

function resolveProfileMedia(profileId, mode, apiKeys) {
  const pid = normalizeProfileId(profileId);
  const prof = NEX_PROFILES.find(p => p.id === pid);
  if (!prof || !prof.isMedia) return null;
  const routes = mode === 'video' ? prof.videoRoutes : prof.imageRoutes;
  for (const [provider, model] of routes) {
    if ((apiKeys[provider] || '').trim()) return { provider, model };
  }
  return null;
}

module.exports = {
  PROVIDERS,
  DEFAULT_MODELS,
  IMAGE_MODELS,
  VIDEO_MODELS,
  EFFORTS,
  NEX_PROFILES,
  normalizeProfileId,
  resolveProfileText,
  resolveProfileMedia
};
