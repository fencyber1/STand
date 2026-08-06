# Screen Padding Fix — Prevent Cards Touching Screen Edges

## Problem
18 screens have `max-w-2xl mx-auto` on their outermost container with **no horizontal padding**, causing cards/content to touch the screen edges. Dashboard uses `px-4 py-4 lg:px-6 lg:py-6` and looks correct.

## Fix
Add `px-4` to the outermost container div of each affected screen. Simple, consistent, no logic changes.

## Screens to Fix (18 total)

| # | Screen | File | Current className | New className |
|---|--------|------|-------------------|---------------|
| 1 | HomeScreen | `src/components/practice/HomeScreen.tsx` | `max-w-2xl mx-auto` | `max-w-2xl mx-auto px-4` |
| 2 | ExamSetupScreen | `src/components/practice/ExamSetupScreen.tsx` | `max-w-2xl mx-auto` | `max-w-2xl mx-auto px-4` |
| 3 | HistoryScreen | `src/components/history/HistoryScreen.tsx` | `max-w-2xl mx-auto` | `max-w-2xl mx-auto px-4` |
| 4 | BookmarksScreen | `src/components/practice/BookmarksScreen.tsx` | `max-w-2xl mx-auto` | `max-w-2xl mx-auto px-4` |
| 5 | SearchScreen | `src/components/practice/SearchScreen.tsx` | `max-w-2xl mx-auto` | `max-w-2xl mx-auto px-4` |
| 6 | ProgressScreen | `src/components/practice/ProgressScreen.tsx` | `max-w-2xl mx-auto` | `max-w-2xl mx-auto px-4` |
| 7 | AchievementsScreen | `src/components/achievements/AchievementsScreen.tsx` | `max-w-2xl mx-auto` | `max-w-2xl mx-auto px-4` |
| 8 | WeakAreasScreen | `src/components/practice/WeakAreasScreen.tsx` | `max-w-2xl mx-auto` | `max-w-2xl mx-auto px-4` |
| 9 | SessionCompareScreen | `src/components/practice/SessionCompareScreen.tsx` | `max-w-2xl mx-auto` | `max-w-2xl mx-auto px-4` |
| 10 | StudyGroupsScreen | `src/components/groups/StudyGroupsScreen.tsx` | `max-w-2xl mx-auto space-y-6` | `max-w-2xl mx-auto px-4 space-y-6` |
| 11 | MultiplayerLobbyScreen | `src/components/multiplayer/MultiplayerLobbyScreen.tsx` | `max-w-lg mx-auto space-y-6` | `max-w-lg mx-auto px-4 space-y-6` |
| 12 | StudyPlansScreen | `src/components/study/StudyPlansScreen.tsx` | `max-w-2xl mx-auto` | `max-w-2xl mx-auto px-4` |
| 13 | StatusScreen | `src/components/social/StatusScreen.tsx` | `max-w-2xl mx-auto` | `max-w-2xl mx-auto px-4` |
| 14 | ProfileScreen | `src/components/profile/ProfileScreen.tsx` | `max-w-2xl mx-auto space-y-6` | `max-w-2xl mx-auto px-4 space-y-6` |
| 15 | SettingsScreen | `src/components/settings/SettingsScreen.tsx` | `max-w-2xl mx-auto space-y-6 pb-8` | `max-w-2xl mx-auto px-4 space-y-6 pb-8` |
| 16 | PrivacySettingsScreen | `src/components/settings/PrivacySettingsScreen.tsx` | `max-w-2xl mx-auto space-y-6 pb-8` | `max-w-2xl mx-auto px-4 space-y-6 pb-8` |
| 17 | AboutScreen | `src/components/settings/AboutScreen.tsx` | `max-w-2xl mx-auto space-y-8 pb-12` | `max-w-2xl mx-auto px-4 space-y-8 pb-12` |
| 18 | ImportQuestionsScreen | `src/components/import/ImportQuestionsScreen.tsx` | `max-w-2xl mx-auto` | `max-w-2xl mx-auto px-4` |

## NOT touching
- DashboardScreen — already correct
- FenBot — already correct
- FriendsScreen — already has `p-4`
- FeedScreen — already has `p-4`
- All chat screens (ChatScreen, GroupChatScreen) — separate full-screen layouts

## Verification
- `npm run build` — no type errors
- Visually check each screen on mobile viewport — cards should have breathing room from edges
