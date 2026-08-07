# StudyPlan AI — Build Personalized Study Plans

## Overview
Add a StudyPlan AI chatbot inside the Study Plans screen. A specialized assistant that ONLY helps users build, refine, and adjust personalized study plans.

## Architecture

### New Files
1. **`src/components/study/StudyPlanAI.tsx`** — Full-screen chat overlay with streaming AI responses
2. **`src/services/studyPlanChatService.ts`** — Firestore CRUD for study plan conversations (same pattern as `fenbotService.ts`)

### Modified Files
1. **`src/components/study/StudyPlansScreen.tsx`** — Add "Plan with AI" button, import and render `StudyPlanAI`

## Implementation Details

### 1. `studyPlanChatService.ts`
- Reuse `FenBotMessage` and conversation interfaces from `fenbotService.ts`
- Firestore collection: `studyPlanConversations`
- Exports: `loadStudyPlanConversations(uid)`, `saveStudyPlanConversation(uid, convo)`, `deleteStudyPlanConversation(id)`

### 2. `StudyPlanAI.tsx` — Chat Component
**System Prompt:**
```
You are StudyPlan AI — a specialized study planning assistant. Your ONLY function is to help users build personalized, structured study plans. You do NOT answer general knowledge questions, do homework, or discuss unrelated topics.

Your process:
1. Ask the user these questions (one at a time, or as a short batch if they prefer):
   - Goal: What subject/exam/skill are they studying for, and what's the target date?
   - Current level: What do they already know? Where are their weak points?
   - Time available: How many hours per day/week can they study, and on which days?
   - Materials: What resources do they have (textbooks, courses, notes, past papers)?
   - Learning style: Reading, practicing problems, watching videos, or teaching others?
   - Constraints: Any other commitments or deadlines?

2. Once answers are gathered, build a study plan that:
   - Breaks material into topics/modules in logical order
   - Assigns realistic time blocks (never overloaded)
   - Includes regular review/revision sessions (spaced repetition)
   - Adds checkpoints or practice tests
   - Builds in buffer days for catch-up or rest
   - Ends with final review phase before deadline

3. Present as week-by-week or day-by-day table

4. If asked something outside study planning, respond: "I'm built specifically for study planning — want help adjusting your schedule or starting a new plan instead?"

5. If user reports falling behind, revise the schedule rather than starting over.
```

**Streaming:** Same pattern as FenBot — direct fetch to `/api/generate` with SSE streaming, flush tokens to state on a timer.

**UI Structure:**
- Full-screen overlay (fixed position, z-50)
- Header with back button + "StudyPlan AI" title
- Message list with user/assistant bubbles
- Input bar at bottom with send button
- Welcome message introducing the AI
- Suggestion chips for common starting questions

**Message Rendering:**
- Use the same `parseMarkdown` helper (or import a shared version) for assistant messages
- `TwemojiText` for user messages
- Loading spinner while waiting for first token

### 3. `StudyPlansScreen.tsx` Changes
- Add state: `showAI: boolean`
- Add "Plan with AI" button (sparkles icon) next to "Create Plan" button
- Render `<StudyPlanAI open={showAI} onClose={() => setShowAI(false)} />` when `showAI` is true

## File Structure
```
src/
  components/
    study/
      StudyPlansScreen.tsx  (modified — add button + state)
      StudyPlanAI.tsx       (new — full chat overlay)
  services/
    studyPlanChatService.ts (new — Firestore CRUD)
```

## Verification
1. `npm run build` — no type errors
2. Open Study Plans screen → see "Plan with AI" button
3. Click → chat overlay opens
4. Send a message → streaming response works
5. AI asks about goal, level, time, etc.
6. AI generates a study plan in table format
7. Close → returns to study plans list
