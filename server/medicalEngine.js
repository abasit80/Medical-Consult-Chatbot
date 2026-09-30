/**
 * MediConsult — Clinical decision support helpers
 * Educational / informational only — not a substitute for licensed care.
 */

const EMERGENCY_KEYWORDS = [
  'chest pain', 'crushing chest', 'heart attack', 'can\'t breathe', 'cannot breathe',
  'difficulty breathing', 'shortness of breath severe', 'unconscious', 'passed out',
  'stroke', 'face drooping', 'arm weakness', 'slurred speech', 'severe allergic',
  'anaphylaxis', 'suicidal', 'kill myself', 'overdose', 'seizure lasting',
  'heavy bleeding', 'bleeding won\'t stop', 'coughing blood', 'vomiting blood',
  'severe head injury', 'neck stiffness fever', 'sudden vision loss', 'severe abdominal pain',
  'pregnant bleeding', 'choking', 'blue lips', 'not waking'
];

const URGENT_KEYWORDS = [
  'high fever', 'fever 103', 'fever 104', 'persistent vomiting', 'dehydration',
  'severe pain', 'broken bone', 'fracture', 'deep cut', 'infection spreading',
  'rash with fever', 'blood in stool', 'blood in urine', 'sudden swelling',
  'eye injury', 'ear pain severe', 'migraine worst', 'dizziness severe',
  'fainting', 'palpitations', 'rapid heartbeat', 'wheezing', 'asthma attack',
  'burn', 'animal bite', 'severe headache', 'confusion', 'stiff neck'
];

const SOON_KEYWORDS = [
  'fever', 'cough', 'sore throat', 'flu', 'cold lasting', 'nausea', 'diarrhea',
  'uti', 'urinary', 'earache', 'sinus', 'rash', 'sprain', 'back pain',
  'tooth pain', 'pink eye', 'allergies worsening', 'headache lasting'
];

const LAB_PATTERNS = [
  { re: /hba1c\s*[:=]?\s*(\d+\.?\d*)/i, name: 'HbA1c', unit: '%', interpret: (v) => {
    const n = parseFloat(v);
    if (n >= 6.5) return { flag: 'high', note: 'Suggests diabetes range — confirm with a clinician.' };
    if (n >= 5.7) return { flag: 'elevated', note: 'Prediabetes range — lifestyle review recommended.' };
    return { flag: 'normal', note: 'Within typical non-diabetic range.' };
  }},
  { re: /(?:fasting\s+)?(?:blood\s+)?glucose|fbs|fbg\s*[:=]?\s*(\d+)/i, name: 'Glucose', unit: 'mg/dL', interpret: (v) => {
    const n = parseFloat(v);
    if (n >= 126) return { flag: 'high', note: 'Fasting glucose in diabetic range if confirmed.' };
    if (n >= 100) return { flag: 'elevated', note: 'Impaired fasting glucose range.' };
    if (n < 70) return { flag: 'low', note: 'Possible hypoglycemia — seek care if symptomatic.' };
    return { flag: 'normal', note: 'Typical fasting range.' };
  }},
  { re: /(?:total\s+)?cholesterol\s*[:=]?\s*(\d+)/i, name: 'Total Cholesterol', unit: 'mg/dL', interpret: (v) => {
    const n = parseFloat(v);
    if (n >= 240) return { flag: 'high', note: 'High cholesterol — discuss with your doctor.' };
    if (n >= 200) return { flag: 'elevated', note: 'Borderline high.' };
    return { flag: 'normal', note: 'Desirable range for many adults.' };
  }},
  { re: /ldl\s*[:=]?\s*(\d+)/i, name: 'LDL', unit: 'mg/dL', interpret: (v) => {
    const n = parseFloat(v);
    if (n >= 160) return { flag: 'high', note: 'High LDL — cardiovascular risk discussion advised.' };
    if (n >= 130) return { flag: 'elevated', note: 'Borderline high LDL.' };
    return { flag: 'normal', note: 'Often considered acceptable / optimal depending on risk.' };
  }},
  { re: /hdl\s*[:=]?\s*(\d+)/i, name: 'HDL', unit: 'mg/dL', interpret: (v) => {
    const n = parseFloat(v);
    if (n < 40) return { flag: 'low', note: 'Low HDL — lifestyle and clinician review helpful.' };
    if (n >= 60) return { flag: 'favorable', note: 'Favorable HDL level.' };
    return { flag: 'normal', note: 'Acceptable HDL for many adults.' };
  }},
  { re: /triglycerides?\s*[:=]?\s*(\d+)/i, name: 'Triglycerides', unit: 'mg/dL', interpret: (v) => {
    const n = parseFloat(v);
    if (n >= 500) return { flag: 'very_high', note: 'Very high — urgent clinical review recommended.' };
    if (n >= 200) return { flag: 'high', note: 'High triglycerides.' };
    if (n >= 150) return { flag: 'elevated', note: 'Borderline high.' };
    return { flag: 'normal', note: 'Normal range.' };
  }},
  { re: /(?:hemoglobin|hb|hgb)\s*[:=]?\s*(\d+\.?\d*)/i, name: 'Hemoglobin', unit: 'g/dL', interpret: (v) => {
    const n = parseFloat(v);
    if (n < 12) return { flag: 'low', note: 'May indicate anemia — clinical correlation needed.' };
    if (n > 17.5) return { flag: 'high', note: 'Elevated hemoglobin — discuss causes with clinician.' };
    return { flag: 'normal', note: 'Often within typical adult ranges (varies by sex/lab).' };
  }},
  { re: /wbc|white\s+blood\s+cells?\s*[:=]?\s*(\d+\.?\d*)/i, name: 'WBC', unit: '×10³/µL', interpret: (v) => {
    const n = parseFloat(v);
    if (n > 11) return { flag: 'elevated', note: 'May suggest infection/inflammation.' };
    if (n < 4) return { flag: 'low', note: 'Low WBC — clinician follow-up if persistent.' };
    return { flag: 'normal', note: 'Typical range for many labs.' };
  }},
  { re: /creatinine\s*[:=]?\s*(\d+\.?\d*)/i, name: 'Creatinine', unit: 'mg/dL', interpret: (v) => {
    const n = parseFloat(v);
    if (n > 1.3) return { flag: 'elevated', note: 'May indicate reduced kidney function — confirm with clinician.' };
    return { flag: 'normal', note: 'Often within common reference ranges.' };
  }},
  { re: /(?:blood\s+)?pressure|bp\s*[:=]?\s*(\d+)\s*\/\s*(\d+)/i, name: 'Blood Pressure', unit: 'mmHg', interpret: (s, d) => {
    const sys = parseFloat(s);
    const dia = parseFloat(d);
    if (sys >= 180 || dia >= 120) return { flag: 'crisis', note: 'Hypertensive crisis range — seek emergency care if symptomatic.' };
    if (sys >= 140 || dia >= 90) return { flag: 'high', note: 'Hypertension range — medical follow-up advised.' };
    if (sys >= 130 || dia >= 80) return { flag: 'elevated', note: 'Elevated / stage 1 range depending on guidelines.' };
    return { flag: 'normal', note: 'Within common target ranges for many adults.' };
  }},
  { re: /tsh\s*[:=]?\s*(\d+\.?\d*)/i, name: 'TSH', unit: 'mIU/L', interpret: (v) => {
    const n = parseFloat(v);
    if (n > 4.5) return { flag: 'elevated', note: 'May suggest hypothyroidism — clinical correlation needed.' };
    if (n < 0.4) return { flag: 'low', note: 'May suggest hyperthyroidism — discuss with clinician.' };
    return { flag: 'normal', note: 'Often within typical reference.' };
  }},
];

function detectUrgency(text) {
  const lower = (text || '').toLowerCase();
  const redFlags = [];

  for (const kw of EMERGENCY_KEYWORDS) {
    if (lower.includes(kw)) redFlags.push(kw);
  }
  if (redFlags.length) {
    return {
      level: 'emergency',
      score: 10,
      redFlags,
      action: 'Call emergency services (911 / local ER) now. Do not wait for chatbot guidance.',
      label: 'Emergency'
    };
  }

  const urgentHits = URGENT_KEYWORDS.filter((kw) => lower.includes(kw));
  if (urgentHits.length) {
    return {
      level: 'urgent',
      score: 7 + Math.min(urgentHits.length, 2),
      redFlags: urgentHits,
      action: 'Seek urgent care or same-day clinical evaluation. If symptoms worsen, go to the ER.',
      label: 'Urgent'
    };
  }

  const soonHits = SOON_KEYWORDS.filter((kw) => lower.includes(kw));
  if (soonHits.length) {
    return {
      level: 'soon',
      score: 4 + Math.min(soonHits.length, 2),
      redFlags: [],
      action: 'Schedule a primary care visit within 24–72 hours. Monitor symptoms closely.',
      label: 'See soon'
    };
  }

  return {
    level: 'routine',
    score: 2,
    redFlags: [],
    action: 'Suitable for primary care / telehealth advice. Continue monitoring and self-care.',
    label: 'Routine / Primary'
  };
}

function extractSymptoms(text) {
  const symptomBank = [
    'fever', 'cough', 'headache', 'nausea', 'vomiting', 'diarrhea', 'fatigue',
    'dizziness', 'chest pain', 'shortness of breath', 'sore throat', 'rash',
    'back pain', 'abdominal pain', 'joint pain', 'muscle ache', 'chills',
    'runny nose', 'congestion', 'ear pain', 'urinary burning', 'swelling',
    'palpitations', 'blurred vision', 'insomnia', 'anxiety', 'depression'
  ];
  const lower = (text || '').toLowerCase();
  return symptomBank.filter((s) => lower.includes(s));
}

function buildRuleBasedReply(userMessage, profile = {}) {
  const urgency = detectUrgency(userMessage);
  const symptoms = extractSymptoms(userMessage);
  const name = profile.full_name ? profile.full_name.split(' ')[0] : 'there';
  const contextBits = [];

  if (profile.allergies) contextBits.push(`Known allergies on file: ${profile.allergies}.`);
  if (profile.chronic_conditions) contextBits.push(`Chronic conditions noted: ${profile.chronic_conditions}.`);
  if (profile.blood_group) contextBits.push(`Blood group: ${profile.blood_group}.`);

  let disposition = '';
  if (urgency.level === 'emergency') {
    disposition = `## 🚨 Emergency triage\n\n**This may be an emergency.** ${urgency.action}\n\nWhile waiting for help: stay calm, note the time symptoms started, and do not drive yourself if unstable.`;
  } else if (urgency.level === 'urgent') {
    disposition = `## ⚡ Urgent care recommended\n\n${urgency.action}\n\nShare onset, severity (1–10), and any new neurological, cardiac, or breathing symptoms with the clinician.`;
  } else if (urgency.level === 'soon') {
    disposition = `## Primary care — see soon\n\n${urgency.action}`;
  } else {
    disposition = `## Primary consultation\n\n${urgency.action}`;
  }

  const symptomLine = symptoms.length
    ? `I noted these symptoms: **${symptoms.join(', ')}**.`
    : 'Thanks for sharing your concern — I can help organize next steps.';

  const advice = generateAdvice(userMessage, symptoms, urgency.level);
  const questions = followUpQuestions(symptoms, urgency.level);

  const reply = [
    `Hi ${name} — I'm your MediConsult assistant.`,
    '',
    disposition,
    '',
    symptomLine,
    contextBits.length ? `\n_${contextBits.join(' ')}_` : '',
    '',
    '### Guidance',
    advice,
    '',
    '### Helpful details to share next',
    questions.map((q, i) => `${i + 1}. ${q}`).join('\n'),
    '',
    '---',
    '_This is informational support only and **not** a diagnosis or prescription. For emergencies, call local emergency services._'
  ].filter(Boolean).join('\n');

  return { reply, urgency, symptoms };
}

async function buildConsultantReply(userMessage, profile = {}, history = [], consultationType = 'primary') {
  const openaiService = require('./openaiService');
  const urgency = detectUrgency(userMessage);
  const symptoms = extractSymptoms(userMessage);

  if (!openaiService.isConfigured()) {
    throw new Error('Assistant is not configured. Please add an API key in server/.env and restart.');
  }

  let reply = await openaiService.consultWithChatGPT({
    userMessage,
    profile,
    history,
    consultationType,
    urgencyHint: urgency
  });

  if (urgency.level === 'emergency' && !/emergency services|911|ER|call local emergency/i.test(reply)) {
    reply = `## 🚨 Emergency triage\n\n**This may be an emergency.** ${urgency.action}\n\n---\n\n${reply}`;
  }

  return { reply, urgency, symptoms, provider: 'chatgpt' };
}

function generateAdvice(text, symptoms, level) {
  const lower = text.toLowerCase();
  const tips = [];

  if (level === 'emergency') {
    return 'Prioritize emergency evaluation over home remedies. Bring a medication list and allergy information if available.';
  }

  if (symptoms.includes('fever') || lower.includes('fever')) {
    tips.push('Hydrate, rest, and track temperature every 4–6 hours. Seek care sooner if fever is very high, lasts >3 days, or comes with stiff neck / rash / confusion.');
  }
  if (symptoms.includes('cough') || symptoms.includes('sore throat')) {
    tips.push('Warm fluids, honey (if age-appropriate), humidifier, and throat lozenges may ease symptoms. Watch for breathing difficulty or high fever.');
  }
  if (symptoms.includes('nausea') || symptoms.includes('vomiting') || symptoms.includes('diarrhea')) {
    tips.push('Use small frequent sips of oral rehydration fluids. Avoid heavy / greasy meals. Seek care if you cannot keep fluids down or see blood.');
  }
  if (symptoms.includes('headache')) {
    tips.push('Rest in a dark quiet room, hydrate, and consider OTC analgesics only if safe for you. Sudden “worst headache of life” needs emergency care.');
  }
  if (symptoms.includes('back pain') || symptoms.includes('joint pain') || symptoms.includes('muscle ache')) {
    tips.push('Relative rest, ice/heat as tolerated, and gentle mobility. Red flags: numbness, incontinence, fever with back pain — seek urgent evaluation.');
  }
  if (symptoms.includes('anxiety') || symptoms.includes('insomnia')) {
    tips.push('Breathing exercises, consistent sleep schedule, and limiting caffeine can help short-term. Persistent distress warrants professional mental health support.');
  }
  if (lower.includes('report') || lower.includes('lab') || lower.includes('blood')) {
    tips.push('You can upload lab/imaging text under **Report Review** for a structured plain-language walkthrough of common markers.');
  }

  if (!tips.length) {
    tips.push('Describe onset, duration, severity (1–10), what makes it better/worse, and any medications tried. That helps refine primary vs urgent guidance.');
    tips.push('General self-care: rest, hydration, nutritious meals, and avoid alcohol/tobacco while recovering.');
  }

  return tips.map((t) => `• ${t}`).join('\n');
}

function followUpQuestions(symptoms, level) {
  if (level === 'emergency') {
    return ['Are you somewhere safe with someone who can call emergency services?', 'Any known heart, lung, or bleeding disorders?'];
  }
  const qs = [
    'When did symptoms start, and have they gotten better, worse, or stayed the same?',
    'On a scale of 1–10, how severe is the worst symptom right now?'
  ];
  if (symptoms.includes('fever')) qs.push('What is the highest temperature measured, and was it oral/axillary?');
  if (symptoms.includes('chest pain') || symptoms.includes('shortness of breath')) {
    qs.push('Does pain radiate to arm/jaw, or occur with exertion?');
  }
  qs.push('Any new medications, recent travel, or known exposures?');
  return qs.slice(0, 4);
}

function reviewReportTextRules(rawText, reportType = 'general') {
  const text = (rawText || '').trim();
  if (!text) {
    return {
      summary: 'No readable text was provided. Paste lab values or upload a text-based report.',
      findings: [],
      recommendations: ['Re-upload a clearer text extract or paste key values (e.g., Glucose: 98, HbA1c: 5.4).'],
      riskFlags: [],
      urgency: detectUrgency(''),
      provider: 'rules'
    };
  }

  const findings = [];
  const riskFlags = [];

  for (const pattern of LAB_PATTERNS) {
    const match = text.match(pattern.re);
    if (!match) continue;
    let interpretation;
    let displayValue;
    if (pattern.name === 'Blood Pressure') {
      interpretation = pattern.interpret(match[1], match[2]);
      displayValue = `${match[1]}/${match[2]} ${pattern.unit}`;
    } else {
      interpretation = pattern.interpret(match[1]);
      displayValue = `${match[1]} ${pattern.unit}`;
    }
    findings.push({
      marker: pattern.name,
      value: displayValue,
      flag: interpretation.flag,
      note: interpretation.note
    });
    if (['high', 'low', 'elevated', 'very_high', 'crisis'].includes(interpretation.flag)) {
      riskFlags.push(`${pattern.name}: ${interpretation.flag} (${displayValue})`);
    }
  }

  const urgency = detectUrgency(
    riskFlags.join(' ') + ' ' + (findings.some((f) => f.flag === 'crisis') ? 'emergency hypertensive' : '')
  );

  if (findings.some((f) => f.flag === 'crisis' || f.flag === 'very_high')) {
    urgency.level = 'emergency';
    urgency.label = 'Emergency';
    urgency.action = 'Critical values detected in the report text — contact emergency / on-call care immediately.';
  } else if (riskFlags.length >= 2) {
    urgency.level = urgency.level === 'routine' ? 'soon' : urgency.level;
    urgency.action = 'Multiple abnormal markers — schedule clinician review soon with the full report.';
  }

  const summaryParts = [
    `Reviewed ${reportType.replace('_', ' ')} content (${text.length} characters).`,
    findings.length
      ? `Extracted ${findings.length} recognizable marker(s).`
      : 'No standard numeric markers matched — providing general report-reading guidance.',
    riskFlags.length
      ? `${riskFlags.length} item(s) flagged for clinical attention.`
      : 'No high-risk numeric flags from the built-in marker set.'
  ];

  const recommendations = [
    'Bring the original report to your clinician for definitive interpretation — lab reference ranges vary.',
    'Ask about trends over time, not only single values.',
    findings.length
      ? 'Discuss flagged markers, medications, and lifestyle factors that may affect results.'
      : 'If this is imaging/pathology prose, ask your ordering physician to explain impression & follow-up.',
  ];

  if (urgency.level === 'emergency' || urgency.level === 'urgent') {
    recommendations.unshift(urgency.action);
  }

  const findingsMd = findings.length
    ? findings.map((f) => `• **${f.marker}** — ${f.value} _(${f.flag})_ — ${f.note}`).join('\n')
    : '• No structured lab markers detected in the pasted text.';

  const aiSummary = [
    '## Report review',
    summaryParts.join(' '),
    '',
    '### Findings',
    findingsMd,
    '',
    '### Recommendations',
    recommendations.map((r) => `• ${r}`).join('\n'),
    '',
    `**Triage suggestion:** ${urgency.label} — ${urgency.action}`,
    '',
    '_Informational only. Not a medical diagnosis._'
  ].join('\n');

  return {
    summary: summaryParts.join(' '),
    findings,
    recommendations,
    riskFlags,
    urgency,
    aiSummary,
    provider: 'rules'
  };
}

async function reviewReportText(rawText, reportType = 'general') {
  const openaiService = require('./openaiService');
  const local = reviewReportTextRules(rawText, reportType);

  if (!String(rawText || '').trim()) return local;

  if (!openaiService.isConfigured()) {
    throw new Error('Assistant is not configured. Please add an API key in server/.env and restart.');
  }

  const aiSummary = await openaiService.reviewReportWithChatGPT({
    text: rawText,
    reportType,
    urgencyHint: local.urgency
  });

  return {
    ...local,
    summary: local.summary,
    aiSummary,
    provider: 'chatgpt'
  };
}

function welcomeMessage(consultationType = 'primary') {
  if (consultationType === 'urgent') {
    return `Hi — I'm MediConsult, your medical assistant.\n\nTell me what's going on (symptoms, when they started, how bad they feel). I'll reply with clear guidance.\n\nIf this is **chest pain, severe breathing trouble, stroke signs, heavy bleeding, or a severe allergic reaction**, call emergency services now.`;
  }
  if (consultationType === 'report_review') {
    return `Hi — paste or upload your lab/report text and I'll review it in plain language.\n\nAlways confirm with your clinician.`;
  }
  return `Hi — I'm **MediConsult**, your medical information assistant.\n\nAsk anything about symptoms, self-care, when to seek care, or paste report details. I'll answer in real time based on this conversation.\n\nWhat would you like to talk about?`;
}

module.exports = {
  detectUrgency,
  extractSymptoms,
  buildConsultantReply,
  reviewReportText,
  welcomeMessage
};
