'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function generateImage({ mediaDir, provider, model, apiKey, prompt, signal }) {
  fs.mkdirSync(mediaDir, { recursive: true });
  const buffer = provider === 'OpenAI'
    ? await generateOpenAiImage(model, apiKey, prompt, signal)
    : await generateGeminiImage(model, apiKey, prompt, null, signal);

  const filePath = path.join(mediaDir, `img_${Date.now()}.png`);
  fs.writeFileSync(filePath, buffer);
  return {
    id: crypto.randomUUID(),
    isVideo: false,
    filePath,
    modelName: `${provider} · ${model}`,
    prompt,
    createdAt: Date.now()
  };
}

async function editImageWithAi({ mediaDir, provider, model, apiKey, sourcePath, instruction, signal }) {
  if (!sourcePath || !fs.existsSync(sourcePath)) throw new Error('Source photo not found.');
  fs.mkdirSync(mediaDir, { recursive: true });
  const srcBytes = fs.readFileSync(sourcePath);

  const buffer = provider === 'OpenAI'
    ? await editOpenAiImage(model, apiKey, srcBytes, instruction, signal)
    : await generateGeminiImage(model, apiKey, instruction, srcBytes, signal);

  const filePath = path.join(mediaDir, `img_ai_edit_${Date.now()}.png`);
  fs.writeFileSync(filePath, buffer);
  return {
    id: crypto.randomUUID(),
    isVideo: false,
    filePath,
    modelName: `${provider} · ${model} (AI Edit)`,
    prompt: instruction,
    createdAt: Date.now()
  };
}

async function generateGeminiImage(model, apiKey, prompt, srcBuffer, signal) {
  const parts = [];
  if (srcBuffer) {
    parts.push({ inlineData: { mimeType: 'image/png', data: srcBuffer.toString('base64') } });
  }
  parts.push({ text: prompt });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { responseModalities: ['TEXT', 'IMAGE'] }
    }),
    signal
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Gemini Image HTTP ${res.status}: ${text.slice(0, 300)}`);
  const outParts = JSON.parse(text)?.candidates?.[0]?.content?.parts || [];
  const inline = outParts.find(p => p.inlineData && p.inlineData.data);
  if (!inline) throw new Error(`Gemini did not return image data for ${model}`);
  return Buffer.from(inline.inlineData.data, 'base64');
}

async function generateOpenAiImage(model, apiKey, prompt, signal) {
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, prompt, size: '1024x1024' }),
    signal
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`OpenAI Image HTTP ${res.status}: ${text.slice(0, 300)}`);
  return parseOpenAiImage(text, signal);
}

async function editOpenAiImage(model, apiKey, srcBytes, instruction, signal) {
  const form = new FormData();
  form.append('model', model);
  form.append('prompt', instruction);
  form.append('image', new Blob([srcBytes], { type: 'image/png' }), 'source.png');
  const res = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
    signal
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`OpenAI Edit HTTP ${res.status}: ${text.slice(0, 300)}`);
  return parseOpenAiImage(text, signal);
}

async function parseOpenAiImage(text, signal) {
  const item = JSON.parse(text)?.data?.[0];
  if (item?.b64_json) return Buffer.from(item.b64_json, 'base64');
  if (item?.url) {
    const imgRes = await fetch(item.url, { signal });
    if (!imgRes.ok) throw new Error(`Image download HTTP ${imgRes.status}`);
    return Buffer.from(await imgRes.arrayBuffer());
  }
  throw new Error('OpenAI image response had no image payload');
}

async function generateVideo({ mediaDir, provider, model, apiKey, prompt, referencePath, signal }) {
  if (provider !== 'Gemini') throw new Error('Video generation is supported via Gemini API.');
  fs.mkdirSync(mediaDir, { recursive: true });
  const refBytes = referencePath && fs.existsSync(referencePath) ? fs.readFileSync(referencePath) : null;
  let buffer = null;

  const instance = { prompt };
  if (refBytes) {
    instance.image = { bytesBase64Encoded: refBytes.toString('base64'), mimeType: 'image/png' };
  }

  const lrUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:predictLongRunning`;
  const lrRes = await fetch(lrUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      instances: [instance],
      parameters: { aspectRatio: '16:9' }
    }),
    signal
  });

  if (lrRes.ok) {
    const op = await lrRes.json();
    if (op?.name) {
      for (let i = 0; i < 40; i++) {
        await sleep(3500);
        if (signal?.aborted) throw new Error('Aborted');
        const pollRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/${op.name}`, {
          headers: { 'x-goog-api-key': apiKey },
          signal
        });
        const pollText = await pollRes.text();
        if (!pollRes.ok) throw new Error(`Video poll HTTP ${pollRes.status}: ${pollText.slice(0, 250)}`);
        const poll = JSON.parse(pollText);
        if (poll.done) {
          if (poll.error) throw new Error(poll.error.message || 'Video generation failed');
          const v = poll?.response?.generateVideoResponse?.generatedSamples?.[0]?.video;
          if (v?.uri) {
            const dl = await fetch(v.uri, { headers: { 'x-goog-api-key': apiKey }, signal });
            if (!dl.ok) throw new Error(`Video download HTTP ${dl.status}`);
            buffer = Buffer.from(await dl.arrayBuffer());
          } else if (v?.bytesBase64Encoded) {
            buffer = Buffer.from(v.bytesBase64Encoded, 'base64');
          }
          break;
        }
      }
    }
  }

  if (!buffer) {
    const syncParts = [];
    if (refBytes) syncParts.push({ inlineData: { mimeType: 'image/png', data: refBytes.toString('base64') } });
    syncParts.push({ text: prompt });
    const syncUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    const syncRes = await fetch(syncUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ parts: syncParts }],
        generationConfig: { responseModalities: ['VIDEO'] }
      }),
      signal
    });
    const text = await syncRes.text();
    if (!syncRes.ok) throw new Error(`Gemini Video HTTP ${syncRes.status}: ${text.slice(0, 300)}`);
    const parts = JSON.parse(text)?.candidates?.[0]?.content?.parts || [];
    const inline = parts.find(p => p.inlineData && p.inlineData.data);
    if (!inline) throw new Error(`Gemini did not return video data for ${model}`);
    buffer = Buffer.from(inline.inlineData.data, 'base64');
  }

  const filePath = path.join(mediaDir, `vid_${Date.now()}.mp4`);
  fs.writeFileSync(filePath, buffer);
  return {
    id: crypto.randomUUID(),
    isVideo: true,
    filePath,
    modelName: `${provider} · ${model}`,
    prompt,
    createdAt: Date.now()
  };
}

module.exports = { generateImage, editImageWithAi, generateVideo };
