# Vinyl Kissaten

A first-person 3D web experience of a Tokyo jazz listening café, rendered in an authentic PS1/PSX retro aesthetic. Browse your Spotify library as physical vinyl records on shelves, carry them to a turntable, and drop the needle to play.

---

## Setup

```bash
pnpm install
pnpm dev
```

Access the dev server at **`http://127.0.0.1:3000`** — not `http://localhost:3000`. See the Spotify note below for why this matters.

---

## Environment Variables

Copy `.env.local.example` to `.env.local` and fill in:

```env
NEXT_PUBLIC_SPOTIFY_CLIENT_ID=your_client_id_here
NEXT_PUBLIC_REDIRECT_URI=http://127.0.0.1:3000/api/spotify/callback
```

---

## Spotify App Configuration

1. Go to [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
2. Create an app (or use an existing one)
3. In **Edit Settings → Redirect URIs**, add exactly:
   ```
   http://127.0.0.1:3000/api/spotify/callback
   ```
4. Required scopes (already configured in auth flow):
   ```
   streaming
   user-read-email
   user-read-private
   user-library-read
   user-read-playback-state
   user-modify-playback-state
   ```

---

## Controls

### Desktop
| Key / Action | Effect |
|---|---|
| `WASD` / Arrow keys | Move |
| Mouse | Look (click canvas first to lock pointer) |
| `Shift` | Walk slowly |
| `E` / Left-click | Interact with focused object |
| `F` / Right-click | Flip held record |
| `Tab` | Toggle now-playing card |
| `Esc` | Exit turntable view / release pointer lock |

### Mobile
| Gesture | Effect |
|---|---|
| Left-side joystick | Move |
| Right-side drag | Look |
| Tap highlighted object | Interact |
| Two-finger tap | Toggle now-playing card |
| Two-finger tap on held record | Flip record |

---

## Gameplay Flow

1. Sign in with Spotify (Premium, full tracks) **or** enter as guest (30s previews from a baked snapshot — see [Guest Mode](#public-access-guest-mode))
2. Walk to the vinyl shelves on the back wall
3. Press `E` near a shelf to pick up a record (Side A facing)
4. Press `F` to flip to Side B if desired
5. Walk to the turntable (right wall)
6. Press `E` to place the record on the platter
7. In the turntable top-down view, click/drag the tonearm to the record
8. Lower it onto the groove to start playback
9. When Side A ends, the tonearm lifts automatically — press `F` to flip and continue

---

## Public Access (Guest Mode)

Spotify locks signed-in playback behind two walls — a Premium requirement and a 25-user development-mode allowlist — which makes the deployed URL useless to anyone not on the host's allowlist with a Premium account. Guest Mode is the workaround.

### How it works
1. The host runs `pnpm snapshot` once to bake their saved-album library into `public/library.json`. The script:
   - Pulls all your saved albums + track lists from Spotify
   - Looks up each track on **Deezer's free public API** to grab a 30-second preview MP3 URL (Spotify removed `preview_url` from their API in late 2024)
   - Writes the consolidated snapshot to `public/library.json`
2. The auth gate detects the snapshot and shows a second button: **ENTER AS GUEST**.
3. Guests browse the host's shelves and hear 30-second previews — no Spotify account, no Premium, no allowlist.
4. The host can still sign in with Spotify for their own full-track playback experience.

### Refreshing the snapshot
```bash
# 1. Run the dev app and sign in with Spotify
pnpm dev

# 2. Open devtools → Application → Local Storage → http://127.0.0.1:3000
#    Copy the value of `spotify_access_token`

# 3. Run the snapshot
SPOTIFY_TOKEN=BQ...your_token... pnpm snapshot
```

The snapshot is committed to the repo and shipped as a static asset, so re-run it whenever your library meaningfully changes. The output is typically a few hundred KB to ~2 MB depending on library size.

### Tracks without previews
Some tracks won't match anything on Deezer (very obscure releases, some live recordings, region-locked titles). Those tracks appear in the cafe but stay silent when the needle drops. The snapshot script reports the hit rate at the end.

---

## Important Spotify Notes

### Premium Required (signed-in mode only)
The Spotify Web Playback SDK requires a Premium account. Free accounts will see an error when the device tries to initialize. **Guest mode bypasses this entirely** — preview playback runs through Web Audio with no SDK involvement.

### Development Mode User Allowlist (signed-in mode only)
In development mode, your Spotify app can only be used by up to **25 users** who have been explicitly added in the developer dashboard under **Users and Access**. To open the app to the public, either apply for **Extended Quota Mode** in the dashboard, or just rely on Guest Mode (recommended for hobby deploys).

### localhost vs 127.0.0.1 (Important — April 2025)
As of April 2025, Spotify no longer accepts `localhost` in redirect URIs. You **must**:
- Set redirect URI to `http://127.0.0.1:3000/api/spotify/callback` (not localhost)
- Access the dev server at `http://127.0.0.1:3000` (not `http://localhost:3000`)

The `pnpm dev` command is pre-configured to bind to `127.0.0.1` via `--hostname 127.0.0.1`.

### iOS Safari Autoplay Quirk
Mobile browsers require a user gesture before they can start audio. The app waits for a tap/click anywhere on the page before initializing the audio engine. If music doesn't play on iOS, tap once first.

---

## Audio Files

All ambient audio in `/public/audio/` must be replaced with CC0-licensed files before use. See `CREDITS.md` for recommended sources and attributions.

The following placeholder files exist and must be replaced:
- `rain.mp3` — looping rain / window ambience
- `chatter.mp3` — quiet café ambient chatter
- `espresso.mp3` — espresso machine burst (one-shot)
- `footsteps_wood.mp3` — single wood floor footstep
- `needle_drop.mp3` — vinyl needle crackle on drop
- `needle_lift.mp3` — soft pop on needle lift
- `switch_click.mp3` — toggle switch click
- `record_flip.mp3` — paper rustle + vinyl tap

---

## Deployment (Vercel)

```bash
vercel deploy
```

Add your environment variables in the Vercel dashboard. Update the Spotify redirect URI to your production URL:
```
https://your-domain.vercel.app/api/spotify/callback
```

---

## PS1 Render Pipeline

The visual pipeline runs at 320×240 internal resolution and applies:
1. **Vertex snapping** — clip-space xy snapped to a coarse grid (the iconic PS1 wobble)
2. **Affine texture mapping** — no perspective correction on UVs (the swimming distortion)
3. **NearestFilter textures** — no smoothing, fully pixelated, ≤128×128
4. **Color quantization + Bayer dithering** — 5-bit per channel with 4×4 ordered dither
5. **Gouraud shading** — per-vertex lighting via `MeshLambertMaterial`
6. **No anti-aliasing** — jaggy edges everywhere
7. **Dense warm fog** — falloff 3–12m

Optional (off by default, toggle in ⚙ CFG menu):
- CRT scanlines
- Barrel distortion
- Screen flicker
