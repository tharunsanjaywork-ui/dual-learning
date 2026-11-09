# CHANGELOG: PHASE 2 (FIX + POLISH) — DUALZONE (FOCUS SANCTUARY)

## Phase A: Chat Layout & Mobile Viewport Polish
- **Fixed Height Column & WhatsApp Layout**:
  - Chat screen converted to a rigid column: `[Top Bar] [Chat Header] [Message List] [Composer]`.
  - Added `body.in-chat` class and CSS to lock background scrolling on chat routes.
  - Removed reserved `pb-20` on mobile when `isInChat === true` in `src/layouts/MessengerLayout.jsx`.
  - Added `interactive-widget=resizes-content` to `index.html` viewport meta and `visualViewport` listener in `MessengerLayout.jsx` so headers and composers are never pushed offscreen when virtual keyboards open.
- **WhatsApp-Style 1-Row Mobile Composer**:
  - Auto-growing textarea up to 5 lines (~128px) with `break-anywhere`.
  - Mobile composer formatted into a single row: `[Emoji] [Textarea] [Attach] [Send/Mic]`.
  - Bottom sheet attachment menu (`src/components/chat/AttachBottomSheet.jsx`) with Photo/Video, Document, Location, and GIF picker.
  - Floating `ScrollToBottomButton.jsx` with unread counter.
  - Grouped `DateSeparator.jsx` ("Today", "Yesterday", or formatted dates).

## Phase B: Media Messages & Fullscreen Viewer
- **Shared Components**:
  - Extracted shared `src/components/chat/MessageBubble.jsx` used by both `ChatPage.jsx` and `GroupChatPage.jsx`.
  - Created `src/components/chat/MediaMessage.jsx` with reserved aspect ratios, skeleton shimmer, and Cloudinary auto-optimization (`f_auto,q_auto,w_800`).
  - Created `src/components/chat/VoiceNotePlayer.jsx` featuring real interactive waveform seeking, 1x/1.5x/2x speed toggle, and a fix for Chromium's WebM `duration === Infinity` metadata bug.
  - Created `src/components/chat/MediaViewerModal.jsx` featuring double-tap/pinch zoom, swipe-down to dismiss, and Android physical back button handling via `window.history.pushState` and `popstate`.

## Phase C: WebRTC Voice Calls
- **Remote Audio Fix**:
  - Corrected remote `<audio>` tag in `src/components/CallScreen.jsx`: removed `display: none` (which caused mobile browsers to silence playback), applying off-screen styling with `position: fixed; opacity: 0; pointerEvents: none`, `autoPlay`, `playsInline`, and `muted={false}`.
- **Speakerphone & Gain Boost**:
  - Implemented Web Audio API routing with `GainNode` (boosting output to 2.5x on speaker mode) and `setSinkId` device routing where supported.
- **Signaling & Candidate Queueing**:
  - Added ICE candidate queueing in `CallScreen.jsx` so candidates arriving prior to `setRemoteDescription` are queued and flushed immediately upon completion.
  - Upgraded `src/lib/webrtc.js` with STUN and TURN server support via `VITE_TURN_URL`, `VITE_TURN_USERNAME`, and `VITE_TURN_CREDENTIAL`.
- **Ringtone & Liveness**:
  - Created `src/lib/ringtone.js` synthesizing standard dual-frequency telephone rings via Web Audio API with zero external audio assets and instant start/stop.
  - Added 2.5s liveness heartbeat pinging (`callerAliveAt` / `calleeAliveAt`) with automatic disconnect if partner heartbeat is lost for > 10s.
  - Bound call teardown to `beforeunload`, `pagehide`, and `dz_panic_switch`.

## Phase D: Ephemeral Stories
- **24-Hour Expiration & Optimistic Write Fix**:
  - Fixed fatal bug in `src/pages/messenger/StoriesPage.jsx` where newly created stories with pending `createdAt: serverTimestamp()` evaluated to `0`, causing immediate deletion. Now verifies `data.createdAt` existence before running the expiration check.
- **Audience Filtering**:
  - Added 3-tier audience selector: Everyone (`everyone`), Followers (`followers`), and Close Friends (`close_friends`) with viewer-side filtering.
- **Viewer List & Interactions**:
  - Added hold-to-pause and tap left/right story navigation.
  - Added author viewer modal displaying avatar and username of users who viewed the story.
- **Profile Stories Count**:
  - Fixed `src/pages/messenger/ProfilePage.jsx` from hardcoded `0` to real-time query of active stories within 24h, linking to `/messenger/stories`.

## Phase E: Storage Usage & Secrets Hygiene
- **StorageMonitor Fix**:
  - Fixed `src/components/StorageMonitor.jsx` to read active percentage (`data.percentage ?? data.primary?.percentage ?? 0`) rather than undefined.
- **Cloudinary Centralization**:
  - Centralized Firestore counter in `system/storageStats` with atomic increments, returning top-level percentage and primary/secondary breakdowns.
  - Centralized failover threshold at 95% of 25GB quota.
- **Notification Server Endpoint**:
  - Added `/api/storage-usage` to `notification-server/server.js` serving cached usage metrics.
- **Credential Security**:
  - Removed `VITE_CLOUDINARY_API_SECRET` from `.env.example`. Unsigned uploads now securely use cloud name and upload preset.

## Phase F: Study Zone Content & Verification
- **Verified Video Catalog**:
  - Created `scripts/verify-videos.mjs` verifying YouTube video IDs via the YouTube oEmbed API.
  - Replaced all 15 invalid/404 dummy video IDs in `src/data/videos.js` with 100% verified educational lectures across JEE Mains, JEE Advanced, NEET, and CA Foundation.
  - Removed all fabricated view count strings.
- **New Watch Page & CA Category**:
  - Created `src/pages/study/WatchPage.jsx` (`/study/watch/:id`) with embedded YouTube player, syllabus recommendations, and auto-saving study notes.
  - Added CA Foundation category to `SubjectPage.jsx` and `StudyHome.jsx`.
  - Added CSS snap carousel (`snap-x snap-mandatory`) to `StudyHome.jsx`.

## Phase G: Covert Chatbot Gateway
- **Sanctuary AI Study Assistant (`/study/chatbot`)**:
  - Replaced abrupt `SwitchModal` with full-screen, purple-themed AI Study Tutor chat interface.
  - Input secretly tests password using `switchToMessenger(password)`. If authenticated, seamlessly transitions to `/switching` -> `/messenger`.
  - If input is not the password, provides contextual academic explanations for Physics, Chemistry, Mathematics, Biology, and CA topics, preserving the secrecy invariant 100%.

## Phase H: Remaining Fixes & Polish
- **Wallpaper Fix**:
  - Fixed `SettingsPage.jsx` storing `"[object Object]"` by extracting `result.secure_url`.
- **Dynamic Subject Progress**:
  - Replaced hardcoded `40%` in `SubjectPage.jsx` with dynamic calculation from `storage.getVideosWatched()`.
- **Offline Notes Download**:
  - Wired functional note summary download in `NotesPage.jsx`.
- **Proposed Firestore Security Rules**:
  - Created `firestore.rules.proposed` with granular collection-level authorization rules.

