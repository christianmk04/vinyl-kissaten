import { create } from 'zustand'
import type {
  SpotifyAlbum,
  SpotifyTrack,
  GameView,
  RecordSide,
  TonearmState,
  PlatterRpm,
  SpotifyPlaybackState,
} from '@/lib/types'

interface GameStore {
  // ── Auth ──────────────────────────────────────────────────────────────────
  // We use the Spotify token for the Web API only (fetching the user's saved
  // albums). All playback runs through the Web-Audio preview path, so we no
  // longer need device ids, premium gating, or the Web Playback SDK.
  spotifyToken: string | null
  // Guest mode = visitor browsing the host's pre-baked library snapshot
  // (public/library.json) with 30s previews, no Spotify account needed.
  guestMode: boolean
  setSpotifyToken: (token: string | null) => void
  setGuestMode: (v: boolean) => void

  // ── Library ───────────────────────────────────────────────────────────────
  albums: SpotifyAlbum[]
  shelvesByCategory: Record<string, SpotifyAlbum[]>
  setAlbums: (albums: SpotifyAlbum[]) => void
  setShelvesByCategory: (map: Record<string, SpotifyAlbum[]>) => void

  // ── Shelf pagination (read by HUD overlay, written by VinylLibrary) ───────
  // VinylLibrary publishes its current page so we can render a crisp HTML
  // page indicator + clickable nav buttons outside the 3D canvas. Baking
  // these into the scene as plates is too small/fuzzy after the PS1
  // pipeline, and any 3D button is inherently positional and falls out of
  // view at some camera angle.
  shelfPage: number          // 0-indexed
  shelfPageCount: number
  setShelfPage: (page: number, count: number) => void
  // VinylLibrary registers these on mount so the HTML overlay buttons (and
  // anything else outside the R3F tree) can trigger a page flip without
  // needing a direct ref to the component.
  requestPrevShelfPage: (() => void) | null
  requestNextShelfPage: (() => void) | null
  setShelfPageRequester: (
    prev: (() => void) | null,
    next: (() => void) | null,
  ) => void
  // Whether the player is currently close enough to the shelf for the nav
  // overlay to be relevant. Updated by VinylLibrary on threshold crossings
  // (with hysteresis) so the overlay doesn't poll the camera every frame.
  nearShelf: boolean
  setNearShelf: (v: boolean) => void

  // ── Library load progress (for loading screen) ────────────────────────────
  libraryLoadState: 'pending' | 'fetching' | 'processing' | 'done' | 'error'
  libraryProgress: { loaded: number; total: number }
  libraryError: string | null
  setLibraryLoadState: (s: 'pending' | 'fetching' | 'processing' | 'done' | 'error') => void
  setLibraryProgress: (p: { loaded: number; total: number }) => void
  setLibraryError: (e: string | null) => void

  // ── Game state ────────────────────────────────────────────────────────────
  view: GameView
  setView: (v: GameView) => void

  heldAlbum: SpotifyAlbum | null
  heldSide: RecordSide
  setHeldAlbum: (album: SpotifyAlbum | null) => void
  flipHeldRecord: () => void

  loadedAlbum: SpotifyAlbum | null
  loadedSide: RecordSide
  setLoadedAlbum: (album: SpotifyAlbum | null) => void
  flipLoadedRecord: () => void
  pickUpFromTurntable: () => void

  sideATracks: SpotifyTrack[]
  sideBTracks: SpotifyTrack[]
  setSideTracks: (a: SpotifyTrack[], b: SpotifyTrack[]) => void

  isPlaying: boolean
  setIsPlaying: (v: boolean) => void

  platterRpm: PlatterRpm
  setPlatterRpm: (rpm: PlatterRpm) => void

  tonearmState: TonearmState
  setTonearmState: (s: TonearmState) => void

  volume: number
  setVolume: (v: number) => void

  autoFlip: boolean
  setAutoFlip: (v: boolean) => void

  previewError: string | null
  setPreviewError: (msg: string | null) => void

  // ── Playback state ────────────────────────────────────────────────────────
  // Unified shape (originally an SDK type, now a synthesized object from
  // previewPlayer's onTrackChange) so the rest of the UI is agnostic to
  // where playback came from. NowPlaying / end-of-side detection read this.
  playbackState: SpotifyPlaybackState | null
  setPlaybackState: (s: SpotifyPlaybackState | null) => void

  // End-of-side detection
  endOfSideReached: boolean
  setEndOfSideReached: (v: boolean) => void

  // ── World ─────────────────────────────────────────────────────────────────
  timeOfDay: number
  cycleSpeed: number
  setTimeOfDay: (t: number) => void
  setCycleSpeed: (s: number) => void

  // ── UI ────────────────────────────────────────────────────────────────────
  showNowPlaying: boolean
  toggleNowPlaying: () => void

  // Mobile turntable tab — which panel is currently visible on touch devices
  // when the player is at the deck. Desktop ignores this and shows both
  // panels at once. Defaults to 'deck' so a freshly-entered turntable view
  // still shows the controls users expect.
  mobileTurntableTab: 'deck' | 'tracks'
  setMobileTurntableTab: (t: 'deck' | 'tracks') => void

  showCRTOverlay: boolean
  toggleCRTOverlay: () => void

  showBarrelDistortion: boolean
  toggleBarrelDistortion: () => void

  showFlicker: boolean
  toggleFlicker: () => void

  // ── Turntable audio/visual knobs ─────────────────────────────────────────
  brightness: number  // -1..+1  tone — peaking presence + air shelf
  pitch: number       // -1..+1  pitch fader position (scaled by pitchRange)
  pitchRange: 10 | 20 | 50  // LP1240-style pitch fader range in percent
  quartzLock: boolean // LP1240 quartz lock — bypasses pitch fader when true
  wowFlutter: number  // 0..1  LFO depth on playback rate
  setBrightness: (v: number) => void
  setPitch: (v: number) => void
  setPitchRange: (r: 10 | 20 | 50) => void
  setQuartzLock: (b: boolean) => void
  setWowFlutter: (v: number) => void

  // Shelf detail context
  activeShelfCategory: string | null
  activeShelfPage: number
  setActiveShelf: (category: string | null, page?: number) => void
  nextShelfPage: () => void
  prevShelfPage: () => void
}

export const useGameStore = create<GameStore>((set) => ({
  // ── Auth ──────────────────────────────────────────────────────────────────
  spotifyToken: null,
  guestMode: false,
  setSpotifyToken: (token) => set({ spotifyToken: token }),
  setGuestMode: (v) => set({ guestMode: v }),

  // ── Library ───────────────────────────────────────────────────────────────
  albums: [],
  shelvesByCategory: {},
  setAlbums: (albums) => set({ albums }),
  setShelvesByCategory: (map) => set({ shelvesByCategory: map }),

  shelfPage: 0,
  shelfPageCount: 0,
  setShelfPage: (page, count) => set({ shelfPage: page, shelfPageCount: count }),
  requestPrevShelfPage: null,
  requestNextShelfPage: null,
  setShelfPageRequester: (prev, next) =>
    set({ requestPrevShelfPage: prev, requestNextShelfPage: next }),
  nearShelf: false,
  setNearShelf: (v) => set({ nearShelf: v }),

  libraryLoadState: 'pending',
  libraryProgress: { loaded: 0, total: 0 },
  libraryError: null,
  setLibraryLoadState: (s) => set({ libraryLoadState: s }),
  setLibraryProgress: (p) => set({ libraryProgress: p }),
  setLibraryError: (e) => set({ libraryError: e }),

  // ── Game state ────────────────────────────────────────────────────────────
  view: 'first-person',
  setView: (v) => set({ view: v }),

  heldAlbum: null,
  heldSide: 'A',
  setHeldAlbum: (album) => set({ heldAlbum: album, heldSide: 'A' }),
  flipHeldRecord: () =>
    set((s) => ({ heldSide: s.heldSide === 'A' ? 'B' : 'A' })),

  loadedAlbum: null,
  loadedSide: 'A',
  setLoadedAlbum: (album) => set({ loadedAlbum: album, loadedSide: 'A' }),
  flipLoadedRecord: () =>
    set((s) => ({ loadedSide: s.loadedSide === 'A' ? 'B' : 'A' })),
  pickUpFromTurntable: () =>
    set((s) => ({
      heldAlbum: s.loadedAlbum,
      heldSide: s.loadedSide,
      loadedAlbum: null,
      tonearmState: 'rest' as TonearmState,
    })),

  sideATracks: [],
  sideBTracks: [],
  setSideTracks: (a, b) => set({ sideATracks: a, sideBTracks: b }),

  isPlaying: false,
  setIsPlaying: (v) => set({ isPlaying: v }),

  platterRpm: 33,
  setPlatterRpm: (rpm) => set({ platterRpm: rpm }),

  tonearmState: 'rest',
  setTonearmState: (s) => set({ tonearmState: s }),

  volume: 0.8,
  setVolume: (v) => set({ volume: v }),

  autoFlip: false,
  setAutoFlip: (v) => set({ autoFlip: v }),

  previewError: null,
  setPreviewError: (msg) => set({ previewError: msg }),

  playbackState: null,
  setPlaybackState: (s) => set({ playbackState: s }),

  endOfSideReached: false,
  setEndOfSideReached: (v) => set({ endOfSideReached: v }),

  // ── World ─────────────────────────────────────────────────────────────────
  timeOfDay: 0.65, // start at late afternoon — warm and visible
  cycleSpeed: 1,
  setTimeOfDay: (t) => set({ timeOfDay: t }),
  setCycleSpeed: (s) => set({ cycleSpeed: s }),

  // ── UI ────────────────────────────────────────────────────────────────────
  showNowPlaying: true,
  toggleNowPlaying: () => set((s) => ({ showNowPlaying: !s.showNowPlaying })),

  mobileTurntableTab: 'deck',
  setMobileTurntableTab: (t) => set({ mobileTurntableTab: t }),

  showCRTOverlay: false,
  toggleCRTOverlay: () => set((s) => ({ showCRTOverlay: !s.showCRTOverlay })),

  showBarrelDistortion: false,
  toggleBarrelDistortion: () =>
    set((s) => ({ showBarrelDistortion: !s.showBarrelDistortion })),

  showFlicker: false,
  toggleFlicker: () => set((s) => ({ showFlicker: !s.showFlicker })),

  brightness: 0,
  pitch: 0,
  pitchRange: 10,
  quartzLock: false,
  wowFlutter: 0,
  setBrightness: (v) => set({ brightness: v }),
  setPitch: (v) => set({ pitch: v }),
  setPitchRange: (r) => set({ pitchRange: r }),
  setQuartzLock: (b) => set({ quartzLock: b }),
  setWowFlutter: (v) => set({ wowFlutter: v }),

  activeShelfCategory: null,
  activeShelfPage: 0,
  setActiveShelf: (category, page = 0) =>
    set({ activeShelfCategory: category, activeShelfPage: page }),
  nextShelfPage: () => set((s) => ({ activeShelfPage: s.activeShelfPage + 1 })),
  prevShelfPage: () =>
    set((s) => ({
      activeShelfPage: Math.max(0, s.activeShelfPage - 1),
    })),
}))
