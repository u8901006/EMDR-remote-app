# MindSync EMDR - Technical Handover Documentation

**To:** Antigravity Team  
**Date:** Current  
**Subject:** Application Architecture & Codebase Overview

## 1. Project Overview

MindSync EMDR is a remote therapy tool designed to facilitate Eye Movement Desensitization and Reprocessing (EMDR) sessions. It features real-time synchronization between a Therapist and a Client, bilateral visual/audio stimulation, AI-assisted clinical tools, and basic computer vision for client monitoring.

### Key Features
*   **Bilateral Stimulation (BLS):** synchronized visual and audio movement (Linear, Sine, Figure-8, Random).
*   **Remote Sync:** State mirroring between Therapist and Client views.
*   **AI Assistant:** Integrated Google Gemini API for generating grounding scripts and session notes.
*   **Safety Monitor:** Webcam-based motion detection to alert the therapist if a client freezes (dissociates).

---

## 2. Architecture & Tech Stack

The application is built as a **Client-Side Single Page Application (SPA)**.

*   **Framework:** React 19 (via CDN imports/ES Modules).
*   **Styling:** Tailwind CSS (via CDN).
*   **Routing:** React Router DOM.
*   **AI:** Google GenAI SDK (`@google/genai`).
*   **Icons:** Lucide React.
*   **Build System:** None (Native ES Modules + `index.html` loader for this prototype phase).

### Data Flow Strategy
Currently, the app uses a **Serverless / Local-First** approach for the prototype:
1.  **State Sync:** Uses the browser's `BroadcastChannel` API.
    *   *Constraint:* This currently restricts the "Remote" functionality to tabs within the same browser instance.
    *   *Roadmap:* Needs migration to WebSockets (Socket.io) or WebRTC for true cross-device usage.
2.  **Audio:** Uses the native `Web Audio API` for precise timing and stereo panning.
3.  **Vision:** Uses native `Canvas API` pixel manipulation for frame differencing (motion detection).

---

## 3. Directory Structure & Key Files

Although the file structure is flat (root level), the logical separation is as follows:

### Entry Points
*   `index.html`: Bootstraps Tailwind and Import Maps.
*   `index.tsx`: React entry point.
*   `App.tsx`: Main Router configuration.
*   `metadata.json`: Application permissions and config.

### Core Logic (The "Engine")
*   **`hooks/useBroadcastSession.ts`**:
    *   The heartbeat of the app.
    *   Manages `EMDRSettings` state.
    *   Handles the `BroadcastChannel` logic (sending/receiving `SYNC_SETTINGS` and `CLIENT_STATUS`).
    *   *Note:* Handles "stale closure" issues using `useRef` to ensure late-joining clients get current settings.
*   **`components/EMDRCanvas.tsx`**:
    *   Handles the visual animation loop via `requestAnimationFrame`.
    *   Handles the **Audio Engine**. It calculates the derivative of the movement curve to trigger sound exactly at the left/right peaks.
*   **`components/EyeTracker.tsx`**:
    *   Captures webcam stream.
    *   Performs frame differencing (current frame vs. previous frame) on a hidden canvas.
    *   Calculates a `motionScore`. If the score drops below a threshold (calculated via `freezeSensitivity`) for ~2 seconds, it flags the client as `isFrozen`.

### UI Components
*   **`components/TherapistControls.tsx`**: The control panel. Modifies state and broadcasts changes.
*   **`components/AIAssistant.tsx`**: Chat interface connecting to `services/gemini.ts`.
*   **`pages/ClientSession.tsx`**: The receiver view. Handles fullscreen logic and idle mouse hiding.

---

## 4. Deep Dive: Critical Subsystems

### A. The Synchronization Protocol (`useBroadcastSession.ts`)
The app uses a Master/Slave model where the **Therapist** is the source of truth for `EMDRSettings`.
1.  **Therapist** updates settings -> `postMessage('SYNC_SETTINGS')`.
2.  **Client** receives message -> Updates local state -> Canvas re-renders.
3.  **Client** detects motion/freeze -> `postMessage('CLIENT_STATUS')`.
4.  **Therapist** receives message -> Updates UI indicator.

### B. The Audio-Visual Sync (`EMDRCanvas.tsx`)
To ensure the "beep" happens exactly when the ball hits the edge:
*   We do not use `setInterval`.
*   Inside the `requestAnimationFrame` loop, we track `timeRef`.
*   We calculate the derivative (Math.cos) of the position function (Math.sin).
*   When the derivative crosses Zero:
    *   Positive to Negative = Right Peak.
    *   Negative to Positive = Left Peak.
*   This ensures audio never drifts from the visual animation, regardless of frame rate.

### C. Client Monitoring (`EyeTracker.tsx`)
Instead of heavy ML libraries (MediaPipe/TF.js), we use a lightweight algorithm for performance:
1.  Downscale video frame to 64x48px.
2.  Compare pixel brightness against the previous frame.
3.  `Freeze Sensitivity` setting adjusts the threshold.
    *   High Sensitivity = Even micro-movements might trigger "Frozen" (Strict).
    *   Low Sensitivity = Requires absolute stillness to trigger "Frozen".

---

## 5. Moving to Production (Antigravity Tasks)

To transition this from a prototype to a production SaaS, the following steps are recommended:

1.  **Replace BroadcastChannel:**
    *   Implement a WebSocket server (Node.js/Socket.io or Firebase Realtime Database).
    *   Replace `useBroadcastSession` with a WebSocket hook that joins a `roomId`.
2.  **Secure API Keys:**
    *   Move the `process.env.API_KEY` for Gemini to a backend proxy function (Next.js API route or Express) to prevent leaking credentials to the client.
3.  **P2P Video:**
    *   Integrate WebRTC (e.g., LiveKit or Twilio Video) to allow the Therapist to *see* the client's face within the app, rather than just receiving "frozen" status alerts.
4.  **Performance:**
    *   The current `EyeTracker` runs on the main thread. Move the image processing logic to a **Web Worker** to prevent any UI jank on low-end devices.

---

## 6. Environment Variables

*   `API_KEY`: Required for Google GenAI features.
