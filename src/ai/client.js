/* ============================================================
   client.js — Cloudflare Workers AI, cached forever, neuron-capped.
   Design (token efficiency is the priority):
     1. Every request key is hashed (q.id + intent). If it's in the
        IndexedDB cache, return instantly — ZERO tokens.
     2. If not cached, check today's neuron usage against the user's
        daily cap. If over, throw 'cap-reached' (UI shows meter).
     3. Call Cloudflare with the smallest viable model. Estimate
        neurons used (~ input+output tokens for the model) and store.
   Requires the user to paste a Cloudflare API token + Account ID in
   Settings. If absent, AI is disabled — app still works (static
   explanations from questions.js).
   ============================================================ */

import { kvGet, kvSet, cacheGet, cacheSet, upsertGeneratedQuestion, allGeneratedQuestions } from '../store/local.js';
import { SYSTEM, explainPrompt, followupPrompt, generationPrompt } from './prompts.js';

// Small/cheap models first. llama-3-8b is a good quality/cost balance;
// the app picks the first configured model the user set, else default.
const DEFAULT_MODEL = '@cf/meta/llama-3-8b-instruct';

function dKey() { return 'neurons-' + new Date().toISOString().slice(0,10); }

async function usageToday() {
  return (await kvGet(dKey(), 0)) || 0;
}
async function addUsage(n) {
  const cur = await usageToday();
  await kvSet(dKey(), cur + n);
  return cur + n;
}

// Rough neuron estimate from token counts (~ 1 neuron per 2 tokens for
// small instruct models on Cloudflare's billing — intentionally conservative).
function estimateNeurons(textIn, textOut) {
  const tin = Math.ceil(textIn.length / 4);
  const tout = Math.ceil(textOut.length / 4);
  return Math.ceil((tin + tout) / 2);
}

async function getConfig() {
  const [accountId, token, model] = await Promise.all([
    kvGet('cf_account', ''),
    kvGet('cf_token', ''),
    kvGet('cf_model', DEFAULT_MODEL),
  ]);
  if (!accountId || !token) return null;
  return { accountId, token, model };
}

async function callCloudflare(messages, model) {
  const cfg = await getConfig();
  const url = `https://api.cloudflare.com/client/v4/accounts/${cfg.accountId}/ai/run/${model}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${cfg.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages, max_tokens: 220, temperature: 0.3 }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`CF ${res.status}: ${t.slice(0,200)}`);
  }
  const data = await res.json();
  return data?.result?.response || '';
}

/**
 * Get an explanation for a question. Cache-first, cap-guarded.
 * Returns { text, source: 'cache'|'ai'|'static' }.
 */
export async function explain(q, chosen) {
  // 1. static fallback always available (offline, 0 tokens)
  const staticExpl = q.explain || null;

  const cfg = await getConfig();
  if (!cfg) return { text: staticExpl || '(Enable AI in Settings for explanations.)', source: 'static' };

  const key = `expl:${q.id}:${chosen ?? 'na'}`;
  const hit = await cacheGet(key);
  if (hit) return { text: hit, source: 'cache' };

  // 2. cap guard
  const cap = (await kvGet('neuron_cap', 8000)) || 8000;
  if ((await usageToday()) >= cap) {
    return { text: staticExpl || 'Daily AI limit reached. Static explanation shown.', source: 'static' };
  }

  // 3. call
  try {
    const prompt = explainPrompt(q, chosen);
    const out = await callCloudflare([
      { role: 'system', content: SYSTEM },
      { role: 'user', content: prompt },
    ], cfg.model);
    const text = (out || '').trim() || staticExpl;
    await cacheSet(key, text);
    await addUsage(estimateNeurons(prompt, text));
    return { text, source: 'ai' };
  } catch (e) {
    return { text: staticExpl || ('AI error: ' + e.message), source: 'static' };
  }
}

/** Follow-up doubt — never cached (question varies). Cap-guarded. */
export async function followup(q, doubt) {
  const cfg = await getConfig();
  if (!cfg) return { text: 'Enable AI in Settings.', source: 'static' };
  const cap = (await kvGet('neuron_cap', 8000)) || 8000;
  if ((await usageToday()) >= cap) return { text: 'Daily limit reached.', source: 'static' };
  try {
    const prompt = followupPrompt(q, doubt);
    const out = await callCloudflare([
      { role: 'system', content: SYSTEM },
      { role: 'user', content: prompt },
    ], cfg.model);
    await addUsage(estimateNeurons(prompt, out || ''));
    return { text: (out || '').trim(), source: 'ai' };
  } catch (e) {
    return { text: 'AI error: ' + e.message, source: 'static' };
  }
}

export async function getUsage() {
  const cap = (await kvGet('neuron_cap', 8000)) || 8000;
  return { used: await usageToday(), cap };
}

function genKey(meta) {
  return `gen:${meta.subject || 'any'}:${meta.topic || 'any'}:${meta.skill || 'any'}:${meta.difficulty || 'any'}`;
}

function safeJsonParse(text) {
  const raw = String(text || '').trim();
  const start = raw.indexOf('[');
  const end = raw.lastIndexOf(']');
  const slice = start >= 0 && end >= start ? raw.slice(start, end + 1) : raw;
  try { return JSON.parse(slice); } catch { return null; }
}

function normalizeGeneratedQuestion(q, meta, index = 0) {
  const topic = q.topic || meta.topic;
  const difficulty = Number(q.difficulty || meta.difficulty || 3);
  const answer = Number(q.answer);
  return {
    id: q.id || `${meta.topic || 'gen'}-${Date.now().toString(36)}-${index}`,
    topic,
    skill: q.skill || meta.skill || null,
    difficulty,
    lang: q.lang || meta.subject || 'en',
    source: q.source || 'AI-GENERATED',
    stem: q.stem || '',
    options: Array.isArray(q.options) ? q.options.slice(0, 4) : [],
    answer: Number.isInteger(answer) && answer >= 0 && answer <= 3 ? answer : 0,
    explain: q.explain || '',
    tags: Array.isArray(q.tags) ? q.tags : [],
    generated: true,
  };
}

async function callWithCache(messages, model, cacheKey) {
  const hit = await cacheGet(cacheKey);
  if (hit) return hit;
  const out = await callCloudflare(messages, model);
  await cacheSet(cacheKey, out);
  return out;
}

export async function generateQuestions(meta, count = 1) {
  const cfg = await getConfig();
  if (!cfg) return { questions: [], source: 'static' };
  const key = genKey(meta);
  const prompt = generationPrompt({ ...meta, count });
  try {
    const out = await callWithCache([
      { role: 'system', content: SYSTEM },
      { role: 'user', content: prompt },
    ], cfg.model, `${key}:${count}`);
    const parsed = safeJsonParse(out);
    if (!Array.isArray(parsed)) return { questions: [], source: 'static' };
    const questions = parsed.map((q, i) => normalizeGeneratedQuestion(q, meta, i)).filter(q => q.stem && q.options.length === 4);
    for (const q of questions) await upsertGeneratedQuestion(q);
    return { questions, source: 'ai' };
  } catch {
    return { questions: [], source: 'static' };
  }
}

export async function getGeneratedBank() {
  return allGeneratedQuestions();
}
