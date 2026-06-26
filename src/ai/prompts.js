/* ============================================================
   prompts.js — tiny, token-efficient prompts. Each prompt is kept
   short on purpose; the model returns ≤120 words. Hindi questions
   get Hindi explanations, English get English.
   ============================================================ */

// Shared system prelude is reused to save tokens across calls.
export const SYSTEM = 'You are a concise SSC exam tutor. Answer in under 120 words. Match the question\'s language (Hindi or English). Be factual, no filler.';

export function explainPrompt(q, chosen) {
  const optList = q.options.map((o, i) => `${String.fromCharCode(65+i)}) ${o}`).join('\n');
  const chosenTxt = chosen == null ? '(unattempted)' : String.fromCharCode(65+chosen);
  return `Q: ${q.stem}\n${optList}\nCorrect: ${String.fromCharCode(65+q.answer)} | Chosen: ${chosenTxt}\nExplain WHY the correct answer is right and the key distractor is wrong. Topic: ${q.topic}.`;
}

export function followupPrompt(q, question) {
  return `Earlier Q (correct ${String.fromCharCode(65+q.answer)}): ${q.stem}\nDoubt: ${question}\nClarify briefly.`;
}

export function generationPrompt({ subject, topic, label, labelHi, skill, difficulty, count = 1 }) {
  const subjectLabel = subject === 'hi' ? 'Hindi' : subject === 'en' ? 'English' : 'mixed';
  return `Generate ${count} SSC JHT Paper 1 MCQ question(s) for subject ${subjectLabel}.
Topic: ${label} (${labelHi || label}).
Skill: ${skill || 'general'}.
Difficulty: ${difficulty || 3}/5.
Return ONLY valid JSON array. Each item must have:
id, topic, skill, difficulty, lang, source, stem, options, answer, explain, tags.
Constraints:
- Exactly 4 options per question.
- answer is 0-3.
- Keep explanations short and exam-oriented.
- Make distractors plausible and aligned to SSC JHT patterns.
- Use PYQ-style traps where appropriate.
- If subject is Hindi, write stem/options/explain in Hindi.
- If subject is English, write them in English.
- source must be "AI-GENERATED".
- tags should be an array of 2-4 short strings.
- No markdown, no code fences, no extra commentary.`;
}
