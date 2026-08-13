import { mockNeeds, type Need } from '../data/mockNeeds';

const API_BASE = '/api';

export type UserRole = 'coordinator' | 'volunteer';

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  skills: string | null;
  createdAt?: string;
};

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function fetchJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    ...options,
  });

  const data = (await res.json().catch(() => ({}))) as { error?: string } & T;

  if (!res.ok) {
    throw new ApiError(res.status, data.error || `Request failed: ${res.status}`);
  }

  return data;
}

export async function getOpenNeeds(params?: { state?: string }): Promise<Need[]> {
  try {
    const search = new URLSearchParams();
    if (params?.state) search.set('state', params.state);
    const qs = search.toString();
    return await fetchJson<Need[]>(`/needs${qs ? `?${qs}` : ''}`);
  } catch (err) {
    // Offline / API-down fallback so the shell stays usable during local setup
    if (err instanceof ApiError && err.status >= 500) {
      return params?.state
        ? mockNeeds.filter((n) => n.state === params.state)
        : mockNeeds;
    }
    if (err instanceof TypeError) {
      return params?.state
        ? mockNeeds.filter((n) => n.state === params.state)
        : mockNeeds;
    }
    throw err;
  }
}

export async function getHealth(): Promise<{ status: string; database: string } | null> {
  try {
    return await fetchJson('/health');
  } catch {
    return null;
  }
}

export async function getMe(): Promise<AuthUser | null> {
  try {
    const data = await fetchJson<{ user: AuthUser }>('/auth/me');
    return data.user;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null;
    throw err;
  }
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const data = await fetchJson<{ user: AuthUser }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return data.user;
}

export async function register(input: {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
  skills?: string[];
}): Promise<AuthUser> {
  const data = await fetchJson<{ user: AuthUser }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return data.user;
}

export async function logout(): Promise<void> {
  await fetchJson<{ ok: boolean }>('/auth/logout', { method: 'POST' });
}

export type MatchRow = {
  id: string;
  need_id: string;
  volunteer_id: string;
  score: number | null;
  rationale: string;
  created_at: string;
  need_title?: string;
  urgency?: string;
  skills_needed?: string;
  need_state?: string | null;
  volunteer_name: string;
  volunteer_skills: string | null;
  volunteer_email?: string;
};

export async function createNeed(input: {
  title: string;
  description: string;
  urgency: string;
  skillsNeeded: string[];
  state: string;
}): Promise<Need & { matches?: MatchRow[] }> {
  return fetchJson('/needs', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function getMatches(params?: {
  needId?: string;
  volunteerId?: string;
}): Promise<MatchRow[]> {
  const search = new URLSearchParams();
  if (params?.needId) search.set('needId', params.needId);
  if (params?.volunteerId) search.set('volunteerId', params.volunteerId);
  const qs = search.toString();
  return fetchJson(`/matches${qs ? `?${qs}` : ''}`);
}

export async function refreshMyMatches(): Promise<{
  matches: MatchRow[];
  embedded: boolean;
  warning: string | null;
}> {
  return fetchJson('/matches/refresh-mine', { method: 'POST' });
}

export async function updateProfile(input: {
  fullName?: string;
  skills?: string;
}): Promise<AuthUser> {
  const data = await fetchJson<{ user: AuthUser }>('/auth/me', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  return data.user;
}

export async function updateSkills(skills: string[]): Promise<{
  user: AuthUser;
  embedded: boolean;
  warning: string | null;
}> {
  return fetchJson('/auth/skills', {
    method: 'PUT',
    body: JSON.stringify({ skills }),
  });
}

export async function deleteAccount(password: string): Promise<void> {
  await fetchJson<{ ok: boolean }>('/auth/me', {
    method: 'DELETE',
    body: JSON.stringify({ password }),
  });
}

export type ChatMessagePayload = {
  role: 'user' | 'assistant';
  content: string;
};

export type ChatResponse = {
  reply: string;
  suggestedSkills: string[];
  needsUsed: Array<{
    id: string;
    title: string;
    urgency: string;
    skills_needed: string;
  }>;
};

export async function sendWhereIFitChat(
  messages: ChatMessagePayload[]
): Promise<ChatResponse> {
  return fetchJson('/chat', {
    method: 'POST',
    body: JSON.stringify({ messages }),
  });
}

export type ApplicationStatus = 'pending' | 'approved' | 'rejected';

export type ApplicationRow = {
  id: string;
  need_id: string;
  volunteer_id: string;
  status: ApplicationStatus;
  created_at: string;
  updated_at: string;
  need_title: string;
  urgency: string;
  skills_needed: string;
  need_state?: string | null;
  need_description?: string;
  volunteer_name: string;
  volunteer_email?: string;
  volunteer_skills: string | null;
};

export async function getApplications(params?: {
  status?: ApplicationStatus;
}): Promise<ApplicationRow[]> {
  const search = new URLSearchParams();
  if (params?.status) search.set('status', params.status);
  const qs = search.toString();
  return fetchJson(`/applications${qs ? `?${qs}` : ''}`);
}

export async function applyToNeed(needId: string): Promise<ApplicationRow> {
  return fetchJson('/applications', {
    method: 'POST',
    body: JSON.stringify({ needId }),
  });
}

export async function updateApplicationStatus(
  id: string,
  status: 'approved' | 'rejected'
): Promise<ApplicationRow> {
  return fetchJson(`/applications/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}
