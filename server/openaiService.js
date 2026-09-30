const OpenAI = require('openai');

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

let client;

function getApiKey() {
  return (process.env.OPENAI_API_KEY || '').trim();
}

function getClient() {
  const apiKey = getApiKey();
  if (!apiKey || apiKey === 'your-openai-api-key-here' || !apiKey.startsWith('sk-')) {
    return null;
  }
  if (!client) {
    client = new OpenAI({ apiKey });
  }
  return client;
}

function isConfigured() {
  return Boolean(getClient());
}

const SYSTEM_CONSULT = `You are MediConsult, a live medical information chatbot.

Personality:
- Warm, clear, conversational — like a knowledgeable clinician explaining things to a patient.
- Answer the user's actual question directly. Do not use canned/template replies.
- Adapt every answer to what they just said and the conversation history.

Clinical rules:
- You are NOT a licensed doctor and must not claim to diagnose or prescribe.
- Give practical, evidence-informed guidance for primary and urgent-basis concerns.
- If signs of emergency appear (crushing chest pain, severe breathlessness, stroke signs, anaphylaxis, uncontrolled bleeding, suicidal thoughts, etc.), lead with: call local emergency services now.
- State a triage vibe naturally: routine / see soon / urgent care / emergency.
- Ask brief follow-ups only when they improve the next answer.
- Use light markdown when helpful. Prefer short paragraphs and bullets over rigid templates.
- Use the patient's profile (allergies, conditions) when relevant.
- Never invent lab values or findings the user did not share.
- End with one short disclaimer line.`;

const SYSTEM_REPORT = `You are MediConsult's live report-review chatbot.

- Read the pasted report/lab text and explain it in plain language for a patient.
- Call out notable values, what they often mean, and practical next steps.
- Say that lab reference ranges vary and a clinician must confirm.
- Suggest triage (routine / soon / urgent / emergency) when warranted.
- Do not diagnose or prescribe.
- Structure with markdown: ## Report review, ### Findings, ### Recommendations.
- End with a brief disclaimer.
- If text is empty/unusable, say what to paste next.`;

async function chatCompletion({ system, messages, temperature = 0.55 }) {
  const openai = getClient();
  if (!openai) {
    throw new Error('OPENAI_API_KEY is missing or invalid. Add a real sk- key in server/.env');
  }

  const response = await openai.chat.completions.create({
    model: MODEL,
    temperature,
    messages: [
      { role: 'system', content: system },
      ...messages
    ]
  });

  const text = response.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('Empty response from ChatGPT');
  return text;
}

async function consultWithChatGPT({ userMessage, profile = {}, history = [], consultationType = 'primary', urgencyHint }) {
  const name = profile.full_name ? profile.full_name.split(' ')[0] : 'there';
  const profileLines = [
    profile.allergies ? `Allergies: ${profile.allergies}` : null,
    profile.chronic_conditions ? `Chronic conditions: ${profile.chronic_conditions}` : null,
    profile.blood_group ? `Blood group: ${profile.blood_group}` : null,
    profile.gender ? `Gender: ${profile.gender}` : null,
    profile.date_of_birth ? `Date of birth: ${profile.date_of_birth}` : null
  ].filter(Boolean);

  const context = [
    `Patient first name: ${name}`,
    `Consultation mode: ${consultationType}`,
    profileLines.length ? `Profile:\n- ${profileLines.join('\n- ')}` : 'Profile: limited',
    urgencyHint
      ? `Internal safety hint (do not ignore if emergency): ${urgencyHint.level} — ${urgencyHint.action}`
      : null,
    'Respond as a live chatbot turn. Answer this specific message; do not paste a generic template.'
  ].filter(Boolean).join('\n');

  // Build chat history excluding the latest user message (added separately)
  const prior = (history || [])
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content).slice(0, 4000)
    }));

  // Drop trailing duplicate of current user message if present
  while (prior.length && prior[prior.length - 1].role === 'user' && prior[prior.length - 1].content === userMessage) {
    prior.pop();
  }

  // Keep last 10 turns for context
  const trimmed = prior.slice(-10);
  trimmed.push({ role: 'user', content: userMessage });

  return chatCompletion({
    system: `${SYSTEM_CONSULT}\n\n${context}`,
    messages: trimmed,
    temperature: 0.6
  });
}

async function reviewReportWithChatGPT({ text, reportType = 'general', urgencyHint }) {
  const prompt = [
    `Report type: ${reportType}`,
    urgencyHint ? `Internal safety hint: ${urgencyHint.level} — ${urgencyHint.action}` : null,
    '',
    'Report text:',
    '```',
    String(text).slice(0, 12000),
    '```',
    '',
    'Write a live, specific review of THIS report — not a generic template.'
  ].filter(Boolean).join('\n');

  return chatCompletion({
    system: SYSTEM_REPORT,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.35
  });
}

module.exports = {
  isConfigured,
  consultWithChatGPT,
  reviewReportWithChatGPT,
  MODEL,
  getApiKey
};
