# Anchored Summary

## Goal
- Fix bugs preventing Google sign-in/up on mobile without affecting other functionality.

## Constraints & Preferences
- Make minimal, targeted edits; keep all other auth flows intact.
- TypeScript must still compile (`tsc --noEmit` passes).
- No project lint config present (ESLint config not found), so rely on tsc only.

## Progress
### Done
- Read `src/contexts/AuthContext.tsx`, `src/services/firebase.ts`, and `src/components/auth/{Login,Register}Screen.tsx` to trace the Google sign-in flow.
- Identified two bugs.
- Fixed both bugs (edits below).

### In Progress
- (none)

### Blocked
- (none)

## Key Decisions
- Chose to log redirect-result errors rather than add UI surface, since sign-in screens already use local error state and `AuthContext` exposes no redirect-error channel without widening scope.

## Next Steps
- (none; fix complete.)

## Critical Context
- Mobile flow uses `signInWithRedirect` after `isMobile` detection; desktop uses `signInWithPopup` with redirect fallback.
- `getRedirectResult(auth)` runs in `AuthProvider` `useEffect` and previously swallowed all errors.

## Relevant Files
- src/contexts/AuthContext.tsx
- src/services/firebase.ts
- src/components/auth/LoginScreen.tsx
- src/components/auth/RegisterScreen.tsx

## Changes Made
- `src/contexts/AuthContext.tsx`:
  - `getRedirectResult(auth)` now logs errors instead of `.catch(() => {})`.
  - `isMobile` detection now guards against missing `navigator`/`window` and adds generic `Mobile`/`Tablet` user-agent tokens; used only by `loginWithGoogle`.
