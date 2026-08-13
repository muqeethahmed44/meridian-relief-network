const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMS = 1536;

export function embeddingToSql(vector) {
  return `[${vector.join(',')}]`;
}

export async function createEmbedding(text) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const input = String(text || '').trim();
  if (!input) {
    throw new Error('Cannot embed empty text');
  }

  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI embeddings failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  const vector = data.data?.[0]?.embedding;
  if (!Array.isArray(vector) || vector.length !== EMBEDDING_DIMS) {
    throw new Error('Unexpected embedding response from OpenAI');
  }

  return vector;
}

export { EMBEDDING_MODEL, EMBEDDING_DIMS };
