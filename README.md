# AR Mirror — Shal Lit Moments

Three interactive AI/AR mirror experiences built with **MERN**, **Three.js**, **MediaPipe**, and **GLSL shaders**.

## Mirrors

### 1. Soul Echo
Your body leaves ghostly trails — each echo rendered in a different art style (sketch → watercolor → x-ray skeleton → dissolving particles). Wave slowly to see the cascade.

### 2. Four of a Kind
Four people stand before the mirror — each assigned Fire, Water, Earth, or Lightning by position. Movement and expressions drive elemental particles; after 90 seconds a shareable artwork and QR code appear. No score, no win/lose.

### 3. Shatter Game
Your reflection is glass. Move fast to crack it, hold still to heal. Survive as long as possible before the mirror shatters.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite |
| 3D / Shaders | Three.js + GLSL |
| AI Tracking | MediaPipe (Pose, Face, Segmentation, Blendshapes) |
| Game State | Zustand |
| Backend | Node.js + Express + MongoDB |

## Quick Start

```bash
npm run install:all
npm run dev
```

- **Frontend:** http://localhost:5173
- **Backend:** http://localhost:5000

## Controls

| Mirror | Interaction |
|--------|-------------|
| Soul Echo | Move body slowly — watch art-style echoes trail behind |
| Four of a Kind | Move, pose, smile together — elements combine; artwork at 90s |
| Shatter Game | Fast movement cracks mirror · stillness heals · 40 cracks = game over |

## Project Structure

```
client/src/
├── components/ARMirror/
│   ├── mirrors/          SmileStrike, FourOfAKind, ShatterGame
│   └── shared/           Effects, shaders, utilities
├── themes/themes.js      Mirror definitions
└── pages/                ThemeSelection, MirrorGame
```
