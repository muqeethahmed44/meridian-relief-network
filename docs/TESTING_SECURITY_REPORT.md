# Meridian Relief Network — Testing & Security Report

**Product:** Meridian Relief Network (POC)  
**Version:** 0.2.0  
**Date:** August 10, 2026  
**Scope:** Manual and integration verification of auth, portals, apply/approve, skill catalog, state filtering, chat, embeddings, and account deletion.

---

## 1. Complete testing checklist

| # | Feature / scenario | Result | Notes |
| --- | --- | --- | --- |
| 1 | Register / login / logout | Pass | Session cookie; role-based redirect |
| 2 | Role gates (`RequireAuth`) | Pass | Volunteer blocked from coordinator routes (and reverse) |
| 3 | Skill catalog + sample openings | Pass | Field → skill pick; chips with × remove |
| 4 | Save volunteer skills | Pass | Skills persist if embedding fails; warning shown |
| 5 | Needs by state + Apply | Pass | TX / LA / MS / AL / FL; Apply → Pending |
| 6 | Overview Apply | Pass | Same applications API as By state |
| 7 | Ask where I fit (chat) | Pass | Catalog-only suggestions; Add to profile |
| 8 | My matches + Refresh | Pass | Approved placements; pending listed separately |
| 9 | Post need (state + catalog skills) | Pass | State required; unknown skills rejected |
| 10 | Coordinator open needs + state filter | Pass | Pending badges sync with applications |
| 11 | Approve / Reject application | Pass | Approved item appears in volunteer My matches |
| 12 | Suggested skill rankings | Pass | Reference only; aligned skill overlap shown |
| 13 | Coordinator dashboard pending count | Pass | Counts pending applications |
| 14 | Delete account | Pass | Password + type DELETE; session cleared |
| 15 | API health / DB | Pass | `/api/health` OK when Postgres is up |
| 16 | Mobile primary nav toggle | Pass | Expand / collapse works |

**Verification method:** Browser walkthroughs (coordinator + volunteer personas), API health checks, TypeScript (`tsc --noEmit`), and role-gated route checks. Embedding and chat paths require `OPENAI_API_KEY`.

---

## 2. Bugs found and fixed

| Issue | Symptom | Resolution |
| --- | --- | --- |
| Hero contrast failure | Landing copy unreadable when hero image failed | Solid coastal gradient fallback + stronger overlay |
| Mock needs not loading | Empty need lists on API 500 / network error | `getOpenNeeds` falls back to `mockNeeds` |
| Session loss on API restart | Auth wiped whenever backend restarted | Postgres session store (`connect-pg-simple`) |
| Skills lost when embed failed | Profile save failed if OpenAI embedding errored | Persist skills first; embedding best-effort + warning |
| Matching vocabulary drift | Free-text synonyms/typos hurt ranking quality | Controlled skill catalog; chat filtered to same labels |
| Invisible Refresh button | Light `btn-secondary` on light page | Dark `btn-dark` for Refresh / Review CTAs |
| Wrong My matches semantics | Showed embedding top-3 instead of approvals | My matches = approved applications only |
| Portal desync (state / apps) | Coordinator lagged volunteer state + apply flow | Shared state filters, pending counts, approve UI, aligned skills |

---

## 3. Security vulnerabilities identified and resolved

| Risk | Severity | Mitigation implemented |
| --- | --- | --- |
| Plaintext / weak passwords | High | bcrypt (cost 10); min length 8; `password_hash` never returned to client |
| Session / XSS cookie theft | High | `httpOnly` cookie `mrn.sid`; `sameSite=lax`; required `SESSION_SECRET` |
| Cross-origin API abuse | Medium | CORS allowlist via `CORS_ORIGIN` with credentials |
| Broken access control | High | `requireAuth` / `requireRole`; volunteers see only their applications |
| SQL injection | High | Parameterized `pg` queries only |
| Destructive account delete | High | Password re-check + confirm `DELETE`; session destroy + cookie clear |
| Arbitrary skill / state injection | Medium | Catalog `serializeSkills`; Gulf state allowlist validation |
| Secrets in repo or client | High | Root `.env` gitignored; OpenAI key server-only; `.env.example` placeholders |
| LLM prompt abuse / data leak | Medium | Chat guardrails; grounded in open needs; refuses passwords / emergency advice |

### Residual POC risks (accepted for demo)

- No CSRF tokens (`sameSite=lax` reduces risk for local POC).  
- No login / API rate limiting.  
- Shared demo password (`password123`).  
- `secure` cookie flag only when `NODE_ENV=production`.  
- No formal penetration test in this POC cycle.

---

## 4. Accessibility features added

| Area | Implementation |
| --- | --- |
| Landmark labels | Primary, Coordinator, and Volunteer nav use `aria-label` |
| Live regions | Form/page status, chat thread, and skill chips use `aria-live="polite"` |
| Toggle state | Skill options: `aria-pressed`; menus: `aria-expanded` / `aria-haspopup` |
| Icon buttons | Skill remove control: `aria-label="Remove {skill}"` |
| Modals | Delete-account dialog: `aria-modal` + `aria-labelledby` |
| Forms | Visible labels; disabled while submitting; validation / status messages |
| Filters | State dropdowns labeled (`aria-label` / field labels) |
| Mobile nav | Toggle with `aria-controls` and `aria-expanded` |
| Decorative UI | Brand mark, chevron, spinner marked `aria-hidden` |

---

*End of report — Meridian Relief Network POC v0.2.0*
