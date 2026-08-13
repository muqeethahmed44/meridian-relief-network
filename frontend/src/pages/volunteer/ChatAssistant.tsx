import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, sendWhereIFitChat, updateSkills } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { FormStatus } from '../../components/FormStatus';
import { parseSkills } from '../../data/skillsCatalog';
import { LIMITS, validateChatMessage } from '../../lib/validation';

type Message = {
  id: string;
  role: 'assistant' | 'user';
  text: string;
};

function buildStarter(skills: string | null | undefined): Message[] {
  const list = parseSkills(skills);
  const skillsLine = list.length
    ? `I can see skills already on your profile: ${list.join(', ')}. Tell me what else you enjoy or have available, and I’ll suggest catalog skills that fit open needs by state.`
    : 'Tell me what you can offer — tools, languages, experience, or when you’re free — and I’ll ask a few questions, then suggest skills from our catalog.';

  return [
    {
      id: 'starter',
      role: 'assistant',
      text: `I’m your Where I Fit guide. I’ll only use currently open Meridian Relief needs, ask about your interests, and suggest skills from a fixed catalog so matching stays consistent.\n\n${skillsLine}`,
    },
  ];
}

export function ChatAssistant() {
  const { user, refresh } = useAuth();
  const [messages, setMessages] = useState<Message[]>(() => buildStarter(user?.skills));
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [savingSkills, setSavingSkills] = useState(false);
  const [suggestedSkills, setSuggestedSkills] = useState<string[]>([]);
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].id === 'starter') {
        return buildStarter(user?.skills);
      }
      return prev;
    });
  }, [user?.skills]);

  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, sending]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const validationError = validateChatMessage(input);
    if (validationError) {
      setError(validationError);
      return;
    }

    const trimmed = input.trim();
    setError(null);
    setSuccess(null);
    setSending(true);

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      text: trimmed,
    };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');

    try {
      const history = nextMessages
        .filter((m) => m.id !== 'starter' || m.role === 'user')
        .map((m) => ({
          role: m.role,
          content: m.text,
        }));

      const payload = [
        { role: 'assistant' as const, content: nextMessages[0].text },
        ...history.filter((m) => m.content !== nextMessages[0].text),
      ];

      const result = await sendWhereIFitChat(payload);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: result.reply,
        },
      ]);
      if (result.suggestedSkills?.length) {
        setSuggestedSkills(result.suggestedSkills);
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Could not reach the assistant. Please try again.'
      );
    } finally {
      setSending(false);
    }
  }

  async function addSuggestedToProfile() {
    if (!suggestedSkills.length) return;
    setSavingSkills(true);
    setError(null);
    setSuccess(null);
    try {
      const existing = parseSkills(user?.skills);
      const merged = [...new Set([...existing, ...suggestedSkills])];
      const result = await updateSkills(merged);
      await refresh();
      setSuccess(
        result.warning ||
          (result.embedded
            ? 'Suggested skills added. Coordinators will see updated skill rankings when reviewing applications.'
            : 'Suggested skills added to your profile.')
      );
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Could not save suggested skills. Try Account profile.'
      );
    } finally {
      setSavingSkills(false);
    }
  }

  return (
    <>
      <h1 className="page-title">Ask where I can help</h1>
      <p className="page-lead">
        A guardrailed guide grounded in open chapter needs. Suggestions use the same skill catalog
        as your profile so applications and coordinator reviews stay consistent.
      </p>

      <div className="chat-shell">
        <div className="chat-thread" aria-live="polite" ref={threadRef}>
          {messages.map((message) => (
            <div key={message.id} className={`bubble ${message.role}`}>
              {message.text}
            </div>
          ))}
          {sending ? <div className="bubble assistant muted">Thinking…</div> : null}
        </div>
        <form className="chat-compose" onSubmit={handleSubmit} noValidate>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="I have a truck and I’m free Mondays — where do I fit?"
            aria-label="Message the assistant"
            required
            maxLength={LIMITS.chatMessage.max}
            disabled={sending}
          />
          <button type="submit" className="btn btn-primary" disabled={sending || !input.trim()}>
            {sending ? 'Sending…' : 'Send'}
          </button>
        </form>
      </div>

      <div style={{ marginTop: '0.75rem' }}>
        <FormStatus error={error} success={success} />
        <p className="field-hint">
          {input.trim().length}/{LIMITS.chatMessage.max}
        </p>
      </div>

      {suggestedSkills.length ? (
        <section className="panel" style={{ marginTop: '1rem' }}>
          <div className="section-head">
            <div>
              <h2>Skills to add on your profile</h2>
              <p>These labels match the catalog — add them so ranking can find you.</p>
            </div>
            <div className="cta-row">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void addSuggestedToProfile()}
                disabled={savingSkills}
              >
                {savingSkills ? 'Adding…' : 'Add to my profile'}
              </button>
              <Link className="btn btn-ghost" to="/volunteer/profile">
                Open Account
              </Link>
            </div>
          </div>
          <ul className="skills-suggest-list">
            {suggestedSkills.map((skill) => (
              <li key={skill}>
                <span className="chip">{skill}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
