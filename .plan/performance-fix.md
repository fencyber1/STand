# Performance Fix Plan — FenBot + Question Generation

## Problem
FenBot responses and question generation are slow due to excessive re-renders, unoptimized API patterns, and redundant I/O.

---

## FenBot Fixes

### Fix 1: Memoize parsed markdown for each message
**File:** `src/components/practice/FenBot.tsx`
**Problem:** `parseMarkdown(msg.content)` at lines 995 and 1042 re-executes for EVERY message on EVERY streaming tick (every 30ms). A 20-message conversation means 20+ parseMarkdown calls per tick.
**Fix:** Create a `useMemo`-based component `MemoizedMarkdown` that caches `parseMarkdown(text)` and only re-parses when `text` changes. Use it for both stored messages and streaming content.

### Fix 2: Wrap `sendMessage` in `useCallback`
**File:** `src/components/practice/FenBot.tsx:451`
**Problem:** `sendMessage` is a plain async function recreated every render, passed to multiple handlers.
**Fix:** Wrap in `useCallback` with proper dependencies.

### Fix 3: Debounce Firestore saves
**File:** `src/components/practice/FenBot.tsx:433-440`
**Problem:** `updateAndSave` fires a Firestore `setDoc` (writing the entire conversation) on every state change. During streaming, this means 2 full writes (user msg + assistant reply).
**Fix:** Debounce `saveFenBotConversation` by 1 second. Accumulate updates and save once after streaming completes + debounce.

### Fix 4: Debounce localStorage sync
**File:** `src/components/practice/FenBot.tsx:322-326`
**Problem:** `JSON.stringify(conversations)` runs on every state change, blocking the main thread.
**Fix:** Debounce by 500ms.

### Fix 5: Use `behavior: 'auto'` during streaming for scroll
**File:** `src/components/practice/FenBot.tsx:317-319`
**Problem:** `scrollIntoView({ behavior: 'smooth' })` fires every 30ms during streaming, creating overlapping smooth scroll animations that cause jank.
**Fix:** Use `behavior: 'auto'` when `streamingContent` is non-empty (during streaming), `smooth` otherwise.

### Fix 6: Memoize `handleKeyDown`
**File:** `src/components/practice/FenBot.tsx:723-725`
**Problem:** Plain function recreated every render, passed as `onKeyDown`.
**Fix:** Wrap in `useCallback`.

### Fix 7: Add in-memory cache for WikiImage
**File:** `src/components/practice/FenBot.tsx:147-180`
**Problem:** Each `WikiImage` component fetches Wikipedia independently with no cache. Same query fetched multiple times = wasted requests.
**Fix:** Add a module-level `Map<string, string>` cache. Check cache before fetching, store result on success.

---

## Question Generation Fixes

### Fix 8: Batch progressive generation (5 questions per API call instead of 1)
**File:** `src/services/api.ts:200-274`
**Problem:** Progressive mode always calls `generateQuestionBatch(params, 1, ...)`. For 20 questions = 20 LLM API calls. Each call takes 5-15s.
**Fix:** Change to batch 5 questions per call. For 20 questions = 4 API calls instead of 20. Keep concurrency at 5 workers = 4 parallel batches instead of 20 sequential-then-parallel calls.
- Update `generateQuestionsProgressive` to process in chunks of 5
- Update `generateQuestionBatch` prompt to handle multiple questions
- Keep first-question generation as-is for fast initial feedback

### Fix 9: Limit dedup prompt to last 5 questions
**File:** `src/services/api.ts:320-327`
**Problem:** `existingQuestions.slice(-30)` sends up to 30 prior questions in the prompt. By question 20, the prompt is massive.
**Fix:** Change `slice(-30)` to `slice(-5)`. This keeps the prompt lean while still avoiding obvious duplicates.

### Fix 10: Fix race condition on `allQuestions.push()`
**File:** `src/services/api.ts:241-258`
**Problem:** Multiple workers push to `allQuestions` without synchronization. `onBatch` spreads the array which can be stale.
**Fix:** Use a sequential queue approach — workers pull from a shared counter and push results into a results array, then merge after each batch completes. Or simpler: use a mutex/semaphore pattern with a shared index.

---

## What NOT to change
- No functionality changes
- No UI/styling changes
- No route changes
- No dependency additions
- System prompt unchanged
- API endpoints unchanged
- FenBot behavior/personality unchanged

## Verification
1. `npm run build` — ensure no type errors
2. `npm run lint` — ensure no lint errors
3. Manual test: Send a message in FenBot, verify streaming works, messages render correctly, images load
4. Manual test: Generate a quiz, verify questions appear progressively and correctly
