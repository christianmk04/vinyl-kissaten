# Build: 3D Explorable Vinyl Kissaten (Tokyo Jazz Cafe)

## Project Summary

Build a first-person, walk-around 3D web experience of a warm Tokyo-style jazz kissaten where the player browses a vinyl library, picks a record off a shelf, walks it over to a turntable, places it on, and operates the player to listen to actual full tracks via the **Spotify Web Playback SDK** (Premium required). Must work on desktop (WASD + mouse-look + click) and mobile web (translucent joystick bottom-center + tap to interact + swipe-to-look).

The vibe is **Tokyo jazz kissaten** rendered in a **PS1 / PSX retro 3D aesthetic** — the Y2K era look of N64, PS1, and early PS2 games. Dark warm wood, dim amber tungsten lighting, rain on a window, cozy and quiet, but rendered with all the lo-fi quirks of late-90s console graphics. Think *Silent Hill 1*, *LSD: Dream Emulator*, *Vampire: The Masquerade — Bloodlines* if it were a jazz cafe. The contrast between the warmth of the cafe and the digital roughness of the rendering is the whole point.

**The PS1 look — non-negotiable shader/render quirks:**

These are what make it actually look retro vs. just "low-poly". They must all be implemented:

1. **Vertex snapping (vertex jitter)** — the iconic PS1 wobble. Vertices snap to a low-resolution integer grid in screen space. Implement as a custom vertex shader: after `projectionMatrix * modelViewMatrix * position`, snap the resulting clip-space position to a coarse grid (e.g. divide xy by w, multiply by ~160, floor, divide back). Causes geometry to "shimmer" as the camera moves. Strength tunable per material — stronger on environment, weaker on the held record.

2. **Affine texture mapping (no perspective correction)** — the warpy, swimmy texture distortion as surfaces angle away from camera. PS1 didn't divide UVs by w. Implement by passing texture coordinates through with `noperspective` qualifier in GLSL (or in three.js, use `flat` varying or a manual fragment-shader workaround that disables perspective interpolation on UVs).

3. **No (or minimal) texture filtering** — `magFilter: NearestFilter`, `minFilter: NearestFilter`. Pixelated, no smoothing, no mipmaps. Crunchy.

4. **Low texture resolution** — most textures **64×64 or 128×128**. Album covers as tiny thumbnails (128×128 max). Wood, fabric, paper all very low-res, often hand-drawn-feeling. This is critical — high-res textures with PS1 shaders just looks like a bug.

5. **Limited color depth + dithering** — apply a post-process pass that quantizes color to ~5-bit per channel (32 levels) with **ordered dithering** (Bayer matrix 4×4 or 8×8). This is what gives PS1 games their distinctive banded/stippled look in dark areas. Critical for our dim cafe — dark gradients will reveal the dithering beautifully.

6. **Low internal resolution** — render the 3D scene to a small framebuffer (e.g. **320×240** or **480×360**) then upscale to full screen with `NearestFilter`. Big chunky pixels. Use a render target + a fullscreen quad to upscale. UI (joystick, now-playing card) renders at native resolution on top — only the 3D world is pixelated.

7. **Per-vertex lighting (Gouraud shading)** — no per-pixel lights in the world geometry. Lighting calculated at vertices and interpolated. Use `MeshLambertMaterial` (which is per-vertex) NOT `MeshPhongMaterial` or `MeshStandardMaterial`. Gives the chunky lit-polygon look.

8. **Vertex colors over textures where possible** — many PS1 games used vertex colors instead of textures for solid-color geometry. Faster and more authentic.

9. **Heavy fog** — dense, close-falloff fog (`THREE.Fog`, not `FogExp2`) in a deep brown/black color (`#1a1410`). Hides draw distance and adds atmosphere. Falloff start ~3m, end ~12m. The cafe will feel like it dissolves into shadow at the edges.

10. **No anti-aliasing** — `antialias: false` on the renderer. Jaggy edges are correct.

**Geometry guidelines:**
- **Very low tri counts** — patron figure ~250–400 tris (like the reference image you sent), chair ~80 tris, table ~40 tris, turntable ~400 tris (still the hero), full room well under 8k tris
- **Visible polygon edges everywhere** — no smooth shading, `flatShading: true` on most materials
- **Boxy, blocky proportions** — characters with rectangular torsos, cylindrical limbs, simple cube heads with painted-on faces (textures, not geometry)
- **No bevels, no rounded corners** — sharp 90° angles on furniture

**Texturing guidelines:**
- Hand-painted, slightly grimy look
- Faces, labels, signage — painted directly onto textures, not modelled
- Wood grain = a 64×64 hand-painted-looking texture, repeated and stretched (the affine warping will sell it)
- Album covers = real Spotify album art, but **downsampled hard to 128×128 with nearest-neighbor** — they should look like late-90s game item icons
- Patron clothing — flat painted textures with chunky pixel detail, like the reference

**Color palette** — same warm kissaten palette as before, but the dithering will quantize it into bands. Set these as the *intent* knowing the post-process will degrade them authentically:
  - Deep warm brown `#3a2418` (wood)
  - Soft cream `#e8d5a8` (lampshades, paper)
  - Amber glow `#ffb56b` (lamp light)
  - Burgundy `#5c1f24` (chairs)
  - Forest green `#2d4a3a` (booth seating)
  - Muted teal `#3a5a6b` (night window)
  - Deep brown-black `#1a1410` (fog, shadows)

**Optional but recommended retro extras:**
- **CRT scanline overlay** — very subtle, faint horizontal lines + slight barrel distortion at screen edges. Toggle in settings (some users hate it). Off by default on mobile.
- **Subtle screen flicker** — extremely subtle brightness oscillation (~1% over 8Hz), can be toggled.
- **Loading transitions** — when changing views (entering shelf-detail, top-down turntable), do a quick PS1-style fade-to-black with a 2-frame delay. No fancy easing.

**What this means for the held record + top-down turntable view:**
- The held record sleeve in your hand: full PS1 treatment, vertex-jittered, affine-warped album art on the front
- The top-down turntable view: still PS1-rendered. Don't break the aesthetic for the "fancy operating panel" — the chunky pixelated controls are part of the charm. The buttons and knobs are blocky 3D meshes with hand-painted icon textures.

**Reference touchstones to match:**
- *Silent Hill 1* (the fog, the dimness, the dread-but-cozy)
- *LSD: Dream Emulator* (the dreamlike low-fi spaces)
- *Persona 1/2* on PS1 (interior scenes)
- *Hylics* / *Paratopic* / *Lunacid* (modern PS1-revival indie games)
- The character reference image provided — that exact level of geometric chunkiness and texture quality for the patrons

**Lighting still matters** — even within the PS1 constraints, the cafe should feel warm. Use vertex colors to fake "warm light pooling under the lamps." Bake some warmth into the wood textures themselves. Per-vertex lighting from the lamps adds the rest.

---

## Tech Stack (decided)

- **Next.js 14 (App Router) + TypeScript**
- **React Three Fiber** (`@react-three/fiber`) + **drei** helpers (`@react-three/drei`)
- **Rapier** physics via `@react-three/rapier` for collision (walls, furniture)
- **Zustand** for game state (player position, held record, current view, now-playing, day/night phase)
- **Tailwind CSS** for the 2D UI overlays (joystick, interaction prompts, now-playing card, turntable top-down view)
- **Spotify Web Playback SDK** (loaded via `<Script>` tag) + **Authorization Code with PKCE** flow for auth
- **Howler.js** for ambient audio (cafe chatter, rain, espresso machine, needle drop SFX)
- **GLTF/GLB** for any custom models; otherwise build geometry procedurally with primitives + good materials

Use `pnpm`. Set up ESLint + Prettier. Strict TS.

---

## File Structure

```
/app
  /api/spotify/callback/route.ts    # PKCE token exchange
  layout.tsx
  page.tsx                          # mounts <Cafe />
/components
  /cafe
    Cafe.tsx                        # main R3F <Canvas>
    Room.tsx                        # walls, floor, ceiling, window with rain
    Lighting.tsx                    # tungsten lamps, day/night rig
    DustMotes.tsx                   # particle system in light beams
    RainWindow.tsx                  # animated raindrops on glass shader
  /shelves
    VinylLibrary.tsx                # the wall of shelves
    Shelf.tsx                       # one shelf, holds N albums
    AlbumSpine.tsx                  # what you see on the shelf
    AlbumDetail.tsx                 # zoomed-in album when picking from shelf
  /turntable
    TurntableTable.tsx              # the table + turntable mesh in 3D
    TurntableTopDown.tsx            # the top-down 2D-ish operating view (HTML overlay + canvas)
    Tonearm.tsx                     # interactive tonearm
    Platter.tsx                     # spinning platter + record
  /patrons
    Patron.tsx                      # silent NPC, idle animation, sips coffee
  /controls
    DesktopControls.tsx             # PointerLockControls + WASD
    MobileControls.tsx              # joystick + look-drag + tap
    InteractionRaycaster.tsx        # what am I looking at? show prompt
  /ui
    InteractionPrompt.tsx           # "Press E / Tap to inspect"
    NowPlaying.tsx                  # album art + title + scrubber
    SpotifyAuthGate.tsx             # login screen if not authed
    LoadingScreen.tsx
/lib
  /spotify
    auth.ts                         # PKCE helpers
    player.ts                       # Web Playback SDK wrapper
    library.ts                      # fetch user's saved albums
  /game
    store.ts                        # Zustand
    interactions.ts                 # interaction registry
    dayNight.ts                     # cycle logic
/public
  /models                           # any .glb files
  /textures                         # wood, fabric, paper sleeves
  /audio                            # rain.mp3, chatter.mp3, espresso.mp3, needle-drop.mp3, needle-lift.mp3
```

---

## Controls

### Desktop
- **WASD / arrows**: move
- **Mouse**: look (PointerLock on click-to-start)
- **Shift**: walk slowly (for ambience)
- **E or Left-click**: interact with whatever the center reticle is on
- **Esc**: release pointer lock / exit current zoomed view
- **Tab**: toggle now-playing card

### Mobile (touch)
- **Translucent joystick, bottom-center**: ~120px diameter, 40% opacity, glassmorphic. Drag thumbstick to move. Snap back on release.
- **Right half of screen — drag**: look around
- **Tap on highlighted object**: interact (object glows softly when reticle/center is on it)
- **Two-finger tap**: toggle now-playing card

Detect touch via `('ontouchstart' in window)` + viewport width. Render the correct control component. Both should feel smooth — lerp camera rotation, accelerate/decelerate movement (don't snap).

**Movement feel**: walking speed ~1.6 m/s. Slight head-bob when moving. Footstep audio on wood (subtle). Eye height 1.65m.

---

## The Cafe (Scene Design)

Approx **8m × 10m** room, ceiling 3m. One long wall has the **vinyl library** (3–4 shelves stacked, each holding ~15–25 albums). The **adjacent wall** (perpendicular, so you naturally walk the record over) has the **turntable on a wooden console table** with a tube amp, a small lamp, and a leather chair.

Other elements:
- **Bar counter** at the back with an espresso machine (steam particle effect occasionally)
- **2–3 small tables** with chairs, where silent patrons sit
- **Large window** on one wall showing rain streaks + a blurred neon street outside (animated shader)
- **Hanging tungsten pendant lights** with visible volumetric cones
- **Bookshelf with jazz books, a ceramic cat, a small plant** for set dressing
- **Wooden floor** with subtle plank texture, slightly reflective near the lamps
- **Persian-style rug** under the listening chair

### Lighting (critical for vibe)
- Base ambient: very low, warm (~2400K). Use `AmbientLight` at low intensity.
- 3–4 **point lights** as pendant lamps, color `#ffb56b`. Shadows are expensive on PS1-style hardware-faking — use **baked shadow blobs** (a dark texture quad on the floor under each lamp) instead of real `castShadow` for most lamps. One real shadow-casting light max, on the turntable.
- All lights use **per-vertex (Gouraud) computation** via `MeshLambertMaterial`. No `MeshStandardMaterial` anywhere in the world.
- **Volumetric god-rays** from pendants — fake them with simple cone meshes using additive blending and a low-res gradient texture. Don't use drei's `SpotLight` volumetric prop (too modern-looking for PS1).
- **Post-processing chain (in order)**:
  1. Render scene to low-res target (320×240 or 480×360)
  2. Color quantization + ordered dithering (custom shader pass)
  3. Optional: subtle scanline overlay
  4. Nearest-neighbor upscale to screen
  - **No bloom, no chromatic aberration, no vignette, no film grain** — these are modern effects that fight the PS1 look. The dithering and low resolution carry the mood.
- **Day/night cycle** (slow, ~6 min full cycle by default — make configurable). Window light shifts: dusk amber → night blue → pre-dawn purple. Pendant lamps stay constant; only window/exterior changes. Add a tiny "time of day" indicator in a corner of the now-playing card.

### Atmosphere
- **Dust motes**: ~80–120 small **cube sprites** (keep counts low — PS1 hardware couldn't handle hundreds of particles) drifting slowly in the volumetric light cones, mask by light proximity. Each mote is a flat camera-facing quad with a tiny 4×4 white pixel texture.
- **Rain on window**: stylized — a low-res animated texture (not a shader). Pre-render a 64×128 looping rain animation as a sprite sheet, apply to the window quad with `NearestFilter`. Affine warping on the window pane will distort it authentically.
- **Subtle camera sway** when standing still (very gentle breathing motion, ±0.3°). The vertex jitter will already add involuntary "movement" — don't fight it.
- **Wood floor**: low-res 64×64 wood plank texture, tiled, with `NearestFilter`. Affine warping does the heavy lifting visually.
- **Rug**: a 128×128 hand-painted Persian-pattern texture on a flat quad. Embrace the chunky pixels.

---

## Patrons (Silent NPCs)

2–3 patrons seated. Each:
- **Low-poly stylized figure** — blocky body (~300 tris), simple faceted head, no facial features (or just two dot eyes). Think *Animal Crossing* without the cuteness, more *Florence* or *A Short Hike* in tone.
- Each in a different muted-color outfit from the palette (burgundy coat, forest green sweater, charcoal jacket)
- Idle animation loop: occasional sip from cup, slight sway, page-turn (use simple bone rig or just rotate child meshes — no need for full skinned mesh)
- One has a newspaper, one has a coffee, one just sits looking at the rain
- They never speak or react to the player — they're set dressing for loneliness/coziness

---

## Spotify Integration

### Auth Flow (Authorization Code with PKCE — no client secret needed in browser)

1. On first load (or when "Sign in with Spotify" is clicked), redirect to Spotify authorize endpoint with scopes:
   ```
   streaming user-read-email user-read-private user-library-read user-read-playback-state user-modify-playback-state
   ```
2. Callback at `/api/spotify/callback` exchanges the code + verifier for an access token.
3. Store access token + refresh token in `httpOnly` cookies. Refresh proactively before expiry.
4. Show a **`<SpotifyAuthGate />`** modal in the cafe UI before the player can interact with vinyl. Style it to match the kissaten (wood-textured card, amber accent button).

### Library Loading

- On auth, call `GET /v1/me/albums?limit=50` (paginate) to fetch user's saved albums.
- Map albums to physical shelf slots. **Each shelf is a "genre" or "category"** if available, otherwise just chunks of 20. Show shelf labels as small printed cards taped to the shelf edge.
- Each `AlbumSpine` displays the album's art on the spine (procedurally — render the cover image as a texture on the spine's narrow face with the artist + title rendered as text down the spine using `<Text>` from drei).
- When the user clicks/taps a shelf, transition to **shelf-detail view**: smooth camera dolly + a horizontal grid of album covers floating in front of the shelf (12 at a time, scroll/swipe for more). Tap an album to "pick it up."

### Picking Up + Carrying

- When picked, the album becomes a 3D record sleeve held in front of the camera (lower-right, slightly tilted, like holding it in your hand).
- HUD shows: `← Back to shelf` and `Walk to turntable to play`
- Camera shows a subtle hand/album silhouette holding the record
- Movement is unchanged but the held album sways gently with steps

### Placing on Turntable

- When near the turntable (proximity trigger), prompt: "Press E / Tap to place record"
- Animation: hand lowers album to platter, sleeve fades out, vinyl appears on platter
- Auto-transition into the **top-down turntable view**

### Top-Down Turntable View (the operating panel)

This is the centerpiece interaction. Reference the **Audio-Technica AT-LP120X** layout.

Render as a near-top-down camera angle (~75° pitch, slight perspective) with HTML overlay controls. Or render fully in R3F with raycast-clickable 3D buttons — pick whichever feels more tactile. I'd lean **fully 3D with clickable meshes** for immersion, with a subtle vignette and the rest of the cafe blurred behind.

Interactive elements:
- **Power switch** (toggles platter spin)
- **Start/Stop button** (begins/halts rotation independent of power, like the real LP120X)
- **33/45 RPM toggle** (visual only — affects spin speed of the platter mesh)
- **Tonearm** — draggable. Lift it off the rest, swing it over the record, lower it. Lowering on the lead-in groove **starts playback via Spotify SDK**. Lifting it pauses/stops.
- **Pitch fader** (slider on the side) — visual + slight audio pitch effect via Web Audio if possible (Spotify SDK doesn't expose pitch, so this is cosmetic + maybe applies a `playbackRate`-like feel via a small chorus/detune effect on a pass-through node — or just acknowledge it's cosmetic in a tooltip)
- **Cueing lever** (raises/lowers tonearm slowly)
- **Anti-skate dial** (cosmetic, rotates)
- **Volume knob** — rotates, controls Spotify SDK volume (0–1)
- **Tone/EQ knobs** (cosmetic warmth)

Interaction details:
- **Hover state**: knob/button glows faintly amber
- **SFX**: needle-drop crackle, needle-lift soft pop, switch click, knob detents
- When tonearm lowers onto record, play a 1.5s vinyl crackle SFX layered under the Spotify track for the first few seconds (then fade out to 10% — keep a tiny crackle bed for vibe)
- **Exit**: button or Esc to stand back up; camera pulls back to first-person

### A-Side / B-Side Mechanic

Albums in real life have two sides. Lean into this. Spotify's API doesn't expose "side A vs side B" natively, so we **simulate it** intelligently:

**Side splitting logic** (`lib/spotify/sides.ts`):
- Fetch the album's full tracklist via `GET /v1/albums/{id}`
- Split the tracklist roughly in half by **cumulative duration**, not track count (more authentic — real vinyl sides are time-balanced, ~18–22 min each)
- If the album has explicit disc info (`disc_number` field), respect it — disc 1 = Side A, disc 2 = Side B (or A/B per disc for double LPs)
- For very short albums (<25 min total), treat the whole thing as Side A and Side B is empty — show "This single only has an A-side" when flipped

**Picking up a record** now shows the album with a visible side label ("A" or "B") on the sleeve corner. Default is Side A.

**Flipping mechanic — two contexts where flipping is possible:**

1. **While holding the record (before placing on turntable):**
   - Desktop: **F key** to flip, OR right-click the held record
   - Mobile: **two-finger tap on the held record**, OR a small "Flip" button appears in the held-record HUD
   - Animation: the record sleeve does a smooth ~0.6s rotation flip in the player's hand (rotateY 180°), with a soft paper-rustle SFX
   - The "A"/"B" label updates after the flip
   - The held-record HUD shows the side's tracklist on hover/long-press

2. **Mid-playback on the turntable** (the satisfying one):
   - When Side A finishes (or the user wants to switch), they need to physically interact:
     - **Lift the tonearm** (back to rest position) — Spotify pauses
     - A subtle prompt appears: "Flip record? [F / tap]"
     - On flip: tonearm lifts fully, vinyl mesh does a quick flip animation on the platter (lifts ~5cm, rotates 180° on its X axis, lands back down) — ~1s total, with a soft "tup" sound on landing
     - Side label on the visible record updates
     - User then lowers the tonearm again to start Side B
   - **Auto-flip option** in a small "preferences" corner of the turntable view: toggle "Auto-flip when side ends" (off by default — the manual ritual is the point)
   - When Side A's last track ends, if auto-flip is off: tonearm auto-lifts and returns to rest (mimicking real auto-return turntables), and the flip prompt appears

**Now-playing card** shows: `Side A · Track 3 of 5` (or B). Subtle but it sells the vinyl illusion.

**Visual detail on the platter**: when a record is loaded, the visible vinyl has a faint **center label** showing the album art in a circular crop. When flipped, it shows a slightly different tinted version (real B-sides often had different label colors) — a small touch but it sells it.

### Side-aware playback (Spotify SDK wiring)

- When user lowers tonearm: call `player.play()` with the URI list of **just the current side's tracks**, in order
- The SDK handles track-to-track transitions within the side
- Listen for `player_state_changed`. When the queue empties (Side A's last track finishes):
  - Auto-lift tonearm animation
  - Show flip prompt
  - Do not auto-advance to Side B unless the auto-flip preference is on

### Now Playing

- Persistent card, bottom-left desktop / top mobile, glassmorphic dark wood texture
- Album art, track title, artist, scrubber, time
- **Side indicator**: small `A` or `B` badge in the corner, plus `Track X of Y` for the current side
- Updates from Spotify SDK `player_state_changed` event
- Toggle visibility with Tab (desktop) / two-finger tap (mobile)

---

## Audio Layering (Howler)

- `rain.mp3` — loop at 0.4 volume always
- `chatter.mp3` — loop at 0.25 volume, ducks to 0.08 when vinyl plays
- `espresso.mp3` — random one-shot every 30–90s at 0.3 volume
- `footsteps_wood.mp3` — triggered on movement, 0.2 volume, randomized pitch ±5%
- `needle_drop.mp3`, `needle_lift.mp3`, `switch_click.mp3` — UI SFX
- `record_flip.mp3` — soft paper-rustle + vinyl-tap, ~0.4s, played on flip animation
- All ambient audio fades in over 2s on scene load

---

## State Management (Zustand store shape)

```ts
{
  // Auth
  spotifyToken: string | null
  spotifyDeviceId: string | null
  isPremium: boolean | null

  // Library
  albums: Album[]
  shelvesByCategory: Record<string, Album[]>

  // Game state
  view: 'first-person' | 'shelf-detail' | 'turntable-top-down'
  heldAlbum: Album | null
  heldSide: 'A' | 'B'            // which side is showing on the held record
  loadedAlbum: Album | null      // on the platter
  loadedSide: 'A' | 'B'          // which side is currently up on the platter
  sideATracks: SpotifyTrack[]    // computed from album by side-split logic
  sideBTracks: SpotifyTrack[]
  isPlaying: boolean
  platterRpm: 33 | 45
  tonearmState: 'rest' | 'cued' | 'playing'
  volume: number                 // 0..1
  autoFlip: boolean              // user preference, default false

  // World
  timeOfDay: number              // 0..1 (0=midnight, 0.5=noon)
  cycleSpeed: number             // multiplier

  // Actions...
}
```

---

## Performance Targets

- **60fps on M1 MacBook Air, 30fps on a 2022 mid-range Android**
- Use `<Instances>` for repeated geometry (album spines, chair legs, etc.)
- Use baked lightmaps where possible for static geometry; dynamic lights only on interactive areas
- Texture budget: 2K max for hero objects, 512–1024 for set dressing
- LOD on patrons
- Lazy-load the top-down turntable view assets
- Compress audio to 96kbps mono for ambient loops

---

## What to Build First (suggested order)

1. **Scaffolding**: Next.js + R3F + a single empty room with PointerLockControls + WASD movement, walls with collision
2. **PS1 render pipeline**: low-res render target + nearest-neighbor upscale + color quantization/dither shader + vertex-snap shader + affine UV shader. Get one textured cube rendering with the full retro look before building anything else. **If this doesn't look authentically PS1 yet, fix it before moving on.** Everything depends on this foundation.
3. **Mobile controls**: joystick + look-drag, branched cleanly from desktop
4. **Lighting + atmosphere pass**: get the kissaten *vibe* with PS1 rendering applied. Fog dialed in, lamps placed, baked shadow blobs.
5. **Furniture + window + rain sprite**
6. **Shelves with placeholder albums** (hardcoded array, no Spotify yet) + pick-up mechanic
7. **Turntable 3D model + top-down view + tonearm drag**
8. **Spotify auth + library load + replace placeholders** (downsample album art to 128×128 with nearest-neighbor on load)
9. **Spotify Web Playback SDK wired to tonearm-down → play, with side-aware tracklists**
10. **A/B side flip mechanic** (held + on-platter) and end-of-side detection
11. **Patrons + ambient audio + day/night**
12. **Polish: dust motes, head-bob, SFX, optional CRT/scanline toggle**

Build a deployable preview after step 6, again after step 9, again at the end.

---

## Things I'm Trusting You to Decide

- Exact model proportions and floor plan — make it feel right
- Whether to use a GLB for the turntable or build it from primitives (primitives + good materials probably wins)
- Shader complexity for rain — start simple, layer detail
- Mobile vs. desktop UI density tradeoffs

---

## Things to Avoid

- Don't make the cafe feel like an empty Unity tutorial. Clutter, warmth, asymmetry.
- Don't use harsh white lighting anywhere.
- Don't make the joystick opaque or take up too much screen.
- Don't auto-play music on load — the user **must** lower the tonearm. The whole point is the ritual.
- Don't show generic "Loading..." — write loading copy in keeping with the vibe ("Tuning the amp...", "Closing the blinds...", "Letting the rain in...")

---

## Deliverables

- Working Next.js app, deployable to Vercel
- README with: setup, Spotify app config steps (redirect URI, required scopes), env vars, controls reference
- A short note in the README about: Premium requirement, Spotify app Development Mode 25-user allowlist (and how to apply for Extended Quota Mode for public release), and the SDK's autoplay browser quirks (especially iOS Safari needing a user-gesture tap)
- **Important Spotify gotcha to document in the README**: as of April 2025, Spotify no longer accepts `localhost` in redirect URIs. Local development MUST use `http://127.0.0.1:3000/api/spotify/callback` (explicit loopback IP). Tell the user to access the dev server at `http://127.0.0.1:3000`, not `http://localhost:3000` — they look identical but Spotify treats them as different hosts and callback will fail. If needed, configure `pnpm dev` to bind to 127.0.0.1 explicitly.
- All audio sources licensed CC0 or noted in a CREDITS.md

Begin.
