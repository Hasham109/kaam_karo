# Kaam Karo — Claude Code ke liye Prompts

Is file mein woh prompts hain jo aap Claude Code mein **copy-paste** karenge. Prompts English mein hain, kyunke Claude Code English mein sab se achha kaam karta hai. Har prompt ke upar Roman Urdu mein likha hai ke yeh **kab** use karna hai.

---

## 0. Pehli dafa setup (sirf ek baar)

1. Ek khaali folder banayein, masalan `kaam-karo`, aur is kit ki **saari files** us mein daal dein:
   - `CLAUDE.md`
   - `PROMPTS.md`
   - `.claude/agents/` (17 agents)
   - `.claude/commands/` (6 commands)
   - `docs/`
   - `coordination/`
2. Us folder mein terminal kholein aur yeh chalayein:
   ```
   git init
   git add .
   git commit -m "chore: project docs and Claude Code kit"
   claude
   ```
3. Claude Code khulne ke baad `/agents` likhein. 17 agents nazar aane chahiye, jaise `platform-devops`, `booking-quotes`, `bug-hunter`. Agar nazar na aayein to Claude Code band kar ke dobara kholein.
4. `.claude/` folder ki files `.gitignore` mein **na** daalein. Yeh project ka hissa hain.

> Note: `.claude/` aur `coordination/` naam ke folders kai computers par chhupe hote hain. File explorer mein "show hidden files" on kar lein.

---

## 1. Kickoff prompt (bilkul pehla prompt)

**Kab:** sab se pehle, jab Claude Code pehli dafa khule.

```
You are A00, the Orchestrator for the Kaam Karo project. Read CLAUDE.md fully.
Then skim (headings only, use Grep) docs/BLUEPRINT.md, docs/architecture.md and docs/implementation.md
so you know where things are. Do not read them end to end.

Then do Phase 0 from docs/implementation.md §6:
- T0.1: coordination/ files are already seeded. Verify they match §3 templates and fix gaps.
- T0.2: build docs/requirements/REQUIREMENTS.md from implementation.md §5. Expand each ID range into
  individual requirements with one testable acceptance criterion each, citing BP § and D-numbers.
  Every Blueprint section §1–§87 must map to at least one requirement or be marked "informational".
  Do NOT add requirements that have no Blueprint section or owner decision behind them.
- T0.3: DECISIONS.md and CONFLICTS.md are seeded. Verify them against architecture.md §21–§22.
- Delegate T0.4 to the security-reviewer subagent (write docs/security/permission-policy.md;
  it writes only under docs/security/) and T0.5 to the qa-tester subagent.

Use a todo list. When done, give me a short summary in simple Roman Urdu: what was created,
how many requirements, and any questions you need me to answer (with options).
Commit with message "docs: phase 0 requirements and policies".
```

---

## 2. Project scaffolding (Phase 2 shuru)

**Kab:** Phase 0 complete hone ke baad.

```
/start-task T2.1
```

Phir:

```
/start-task T0.6
```

> T0.6 Urdu ka test hai. Agar Nastaliq font sasti phone par theek na dikhe to Claude aapko batayega, aur stack ka faisla dobara kholna pare ga.

Agar slash command kaam na kare to yeh lambi shakal use karein:

```
Act as A00. Task T2.1 from docs/implementation.md §6.
Delegate it to the platform-devops subagent with: the task text, acceptance criteria,
CLAUDE.md stack (D-001), repository layout from CLAUDE.md, and IMPL §7.4 CI guards.
Scaffold: pnpm + Turborepo monorepo, apps/customer and apps/partner (Expo, TypeScript),
apps/admin (Next.js), services/api (NestJS + Prisma + PostgreSQL/PostGIS),
packages/platform, packages/i18n, packages/ui, contracts/, tests/e2e/.
Add docker-compose for Postgres+PostGIS and Redis for local dev.
Every package must build, lint, typecheck and run one passing test.
Then run qa-tester. Update the "Commands" section in CLAUDE.md with the real commands.
Report to me in simple Roman Urdu.
```

---

## 3. Har task ke liye (rozana ka kaam)

**Kab:** har naya task shuru karte waqt. Tasks ki tarteeb `docs/implementation.md` §10 aur `coordination/TASKS.md` mein hai.

```
/start-task T2.4
```

Task khatam hone par:

```
/handoff T2.4
```

Phir commit karein:

```
Commit the work for T2.4 on a branch named t2.4-<short-name> with a clear message
that lists the requirement IDs. Then merge to main only if QA PASS (and SEC PASS when needed).
```

> **Tip:** har task ke baad Claude Code mein `/clear` likh dein. Purani baatein context se hat jati hain aur Claude tez aur theek kaam karta hai. Sab zaroori yaadein `coordination/` files mein mehfooz hain.

---

## 4. Do teen kaam ek saath (parallel)

**Kab:** jab kaam ek doosre par depend na karte hon, jaise Phase 3 mein T3.1, T3.2 aur T3.3.

```
Act as A00. Tasks T3.1 (location-maps), T3.2 (media) and T3.3 (ai-intake-voice) have no
dependency on each other. Check their dependencies are DONE, then run the three subagents
in parallel. Each must stay inside its own paths (IMPL §2.3) and write its own handoff.
After all three finish, run qa-tester on each, resolve any CONTRACT CHANGE requests in
coordination/handoffs/REQUESTS.md, update the board, and report to me in simple Roman Urdu.
```

---

## 5. Har session ki shuruat

**Kab:** jab bhi aap agle din ya break ke baad kaam shuru karein.

```
/sync
```

---

## 6. Jab aap koi faisla karein

**Kab:** jab Claude aap se koi sawal poochhe (D-xxx) aur aap jawab dein.

```
/decision D-017: rating rule applies after at least 5 ratings, worker gets 14 days to improve after each warning
```

> Aap Roman Urdu mein bhi likh sakte hain. Claude usay English mein darj karega. Matlab mein shak hua to pehle aap se ek chhota sawal poochhega.

---

## 7. Jab aapko khud koi bug nazar aaye

**Kab:** app chalate hue aapko koi ghalti dikhe.

```
I found a bug. What I did: <steps>. What I expected: <expected>. What happened: <actual>.
Screen/area: <e.g. Partner App, Pay company screen>.
Use the bug-hunter subagent: reproduce it, write a failing regression test, add it to
coordination/BUGS.md with severity and owner agent (IMPL §7), then have the owner subagent fix it.
Verify with qa-tester. Do not weaken or skip any test. Tell me the result in simple Roman Urdu.
```

Misaal:

```
I found a bug. What I did: logged in as a provider with Rs. 600 unpaid commission and opened
an accepted booking. Expected: "Start job" is refused with the Pay company message (D-021).
What happened: the job started. Screen: Partner App job execution.
Use the bug-hunter subagent ... (rest as above)
```

---

## 8. Har phase ke akhir mein

**Kab:** jab kisi phase ke saare tasks DONE ho jayein.

```
/bug-sweep 3
/phase-gate 3
```

---

## 9. Jab Claude kuch apni taraf se bana de (hallucination check)

**Kab:** jab aapko lage ke Claude ne koi aisi cheez banayi jo aapne ya blueprint ne nahi maangi thi.

```
Audit the last task's diff against the sources of truth. For every new behaviour, endpoint,
field, config value, screen element or dependency, show the requirement ID and the BP § or
D-number that justifies it. List anything without a citation, any hard-coded business value,
and any vendor or library not allowed by CLAUDE.md. Then remove or move those items to
coordination/OPEN_QUESTIONS.md, keeping the build green. Report in simple Roman Urdu.
```

---

## 10. Achhi aadatein (tips)

- **Ek waqt mein ek task.** Bara prompt "poori app bana do" kabhi na dein. Hamesha task ID ke saath kaam karwayein.
- **Har task ke baad commit.** Kuch kharab ho jaye to pichle commit par wapas ja sakte hain.
- **`/clear` istemal karein** har task ke baad.
- **Bare ya risky kaam se pehle plan mangwayein:** "First show me the plan in simple Roman Urdu, do not write code yet." Plan pasand aaye to "go ahead" likh dein.
- **Test kabhi skip na karwayein.** Agar Claude kahe "test hata deta hoon", to mana kar dein.
- **Secrets:** Google Maps key, SMS key waghera kabhi chat mein paste na karein. Sirf `.env` file mein rakhein, jo git mein nahi jati.
- **Asal phone par test karein.** Urdu screens ko sasti Android phone par zaroor dekhein.
