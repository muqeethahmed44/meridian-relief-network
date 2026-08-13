import { query } from '../db/pool.js';
import { createEmbedding, embeddingToSql } from './embeddings.js';
import {
  catalogForPrompt,
  filterSuggestedSkills,
} from '../data/skillsCatalog.js';

const CHAT_MODEL = 'gpt-4o-mini';
const MAX_HISTORY = 16;
const MAX_CONTEXT_NEEDS = 8;

function buildSystemPrompt() {
  return `You are Meridian Relief Network's "Where I Fit" volunteer guide for Gulf Coast disaster relief.

Your ONLY job:
1) Help the volunteer understand where they can fit among CURRENTLY OPEN needs.
2) Ask short, friendly clarifying questions about interests, tools, languages, physical ability, availability, and experience.
3) By the end of the conversation, recommend concrete skills they should add on their Account profile (My skills).

Hard rules (guardrails):
- Stay strictly on "where I fit" / volunteer skills / open needs. Refuse unrelated topics politely and steer back.
- Ground every opportunity suggestion ONLY in the OPEN NEEDS CONTEXT provided. Never invent needs, chapters, or locations.
- If context is empty, say no open needs are available right now and still help them pick skills for their profile.
- Do not give medical, legal, financial, or emergency advice. For life-threatening emergencies, tell them to call local emergency services.
- Do not ask for passwords, payment info, or sensitive IDs.
- Keep replies concise (usually 2–5 short paragraphs or a short Q&A). Ask one or two questions at a time.
- CRITICAL: Suggest skills ONLY from the SKILL CATALOG below. Copy labels exactly — never invent synonyms, free-text skills, or alternate spellings.
- When you have enough signal, clearly list "Skills to add on your profile:" as bullet points using exact catalog labels only.
- You may also mention which open needs those skills would help with, citing need titles from context only.

SKILL CATALOG (choose only from these):
${catalogForPrompt()}

Tone: practical, warm, urgent-but-calm disaster-relief coordinator.`;
}

async function loadOpenNeeds() {
  const { rows } = await query(
    `SELECT id, title, description, urgency, skills_needed, state, created_at,
            (skills_embedding IS NOT NULL) AS has_embedding
     FROM needs
     ORDER BY
       CASE urgency
         WHEN 'critical' THEN 1
         WHEN 'high' THEN 2
         WHEN 'moderate' THEN 3
         WHEN 'low' THEN 4
       END,
       created_at DESC
     LIMIT 40`
  );
  return rows;
}

async function retrieveRelevantNeeds(userText, allNeeds) {
  if (!allNeeds.length) return [];

  const withEmbeddings = allNeeds.filter((n) => n.has_embedding);
  if (!withEmbeddings.length || !process.env.OPENAI_API_KEY) {
    return allNeeds.slice(0, MAX_CONTEXT_NEEDS);
  }

  try {
    const vector = await createEmbedding(userText);
    const { rows } = await query(
      `SELECT id, title, description, urgency, skills_needed, state,
              1 - (skills_embedding <=> $1::vector) AS score
       FROM needs
       WHERE skills_embedding IS NOT NULL
       ORDER BY skills_embedding <=> $1::vector
       LIMIT $2`,
      [embeddingToSql(vector), MAX_CONTEXT_NEEDS]
    );
    return rows;
  } catch (err) {
    console.error('RAG retrieve failed, falling back to recent needs', err);
    return allNeeds.slice(0, MAX_CONTEXT_NEEDS);
  }
}

function formatNeedsContext(needs) {
  if (!needs.length) {
    return 'No open needs are currently available in the database.';
  }

  return needs
    .map((n, i) => {
      const score =
        n.score != null ? ` | similarity ${Math.round(Number(n.score) * 100)}%` : '';
      return [
        `${i + 1}. [${n.urgency}] ${n.title}${score}`,
        `   State: ${n.state || 'unspecified'}`,
        `   Skills needed: ${n.skills_needed}`,
        `   Description: ${n.description}`,
      ].join('\n');
    })
    .join('\n');
}

function normalizeHistory(messages) {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter(
      (m) =>
        m &&
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string' &&
        m.content.trim()
    )
    .slice(-MAX_HISTORY)
    .map((m) => ({
      role: m.role,
      content: m.content.trim().slice(0, 2000),
    }));
}

function extractSuggestedSkills(reply) {
  const match = reply.match(
    /skills to add(?: on your profile)?\s*:?\s*([\s\S]*?)(?:\n\n|$)/i
  );
  if (!match) return [];

  const raw = match[1]
    .split('\n')
    .map((line) => line.replace(/^[-*•\d.)\s]+/, '').trim())
    .filter((line) => line.length >= 2 && line.length <= 120)
    .slice(0, 12);

  return filterSuggestedSkills(raw);
}

export async function runWhereIFitChat({ messages, volunteer }) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const history = normalizeHistory(messages);
  if (!history.length || history[history.length - 1].role !== 'user') {
    throw new Error('A user message is required');
  }

  const latestUser = history[history.length - 1].content;
  const allNeeds = await loadOpenNeeds();
  const relevant = await retrieveRelevantNeeds(latestUser, allNeeds);
  const needsContext = formatNeedsContext(relevant);

  const volunteerBlock = volunteer
    ? `Volunteer profile:
- Name: ${volunteer.fullName || 'Volunteer'}
- Current skills on profile: ${volunteer.skills || '(none yet)'}
- Role: ${volunteer.role}`
    : 'Volunteer profile: (not provided)';

  const openaiMessages = [
    { role: 'system', content: buildSystemPrompt() },
    {
      role: 'system',
      content: `${volunteerBlock}

OPEN NEEDS CONTEXT (only cite these):
${needsContext}`,
    },
    ...history,
  ];

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: CHAT_MODEL,
      temperature: 0.4,
      max_tokens: 700,
      messages: openaiMessages,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI chat failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  const reply = data.choices?.[0]?.message?.content?.trim();
  if (!reply) {
    throw new Error('Empty response from OpenAI');
  }

  return {
    reply,
    suggestedSkills: extractSuggestedSkills(reply),
    needsUsed: relevant.map((n) => ({
      id: n.id,
      title: n.title,
      urgency: n.urgency,
      skills_needed: n.skills_needed,
    })),
  };
}
