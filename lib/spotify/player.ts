'use client'

import type { SpotifyPlayer, SpotifyPlaybackState } from '@/lib/types'

let player: SpotifyPlayer | null = null
let deviceId: string | null = null

export function getPlayer(): SpotifyPlayer | null {
  return player
}

export function getDeviceId(): string | null {
  return deviceId
}

export function loadSpotifySDK(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve()
    if (window.Spotify) return resolve()

    const script = document.createElement('script')
    script.src = 'https://sdk.scdn.co/spotify-player.js'
    script.async = true
    document.body.appendChild(script)

    window.onSpotifyWebPlaybackSDKReady = () => resolve()
  })
}

export async function initPlayer(
  token: string,
  onStateChange: (state: SpotifyPlaybackState | null) => void,
  onReady: (id: string) => void,
  onError: (msg: string) => void,
): Promise<SpotifyPlayer> {
  await loadSpotifySDK()

  player = new window.Spotify.Player({
    name: 'Vinyl Kissaten',
    getOAuthToken: (cb) => cb(token),
    volume: 0.8,
  })

  player.addListener('ready', (data) => {
    const d = data as { device_id: string }
    deviceId = d.device_id
    onReady(d.device_id)
  })

  player.addListener('not_ready', () => {
    deviceId = null
  })

  player.addListener('player_state_changed', (state) => {
    onStateChange(state as SpotifyPlaybackState | null)
  })

  player.addListener('initialization_error', (e) => {
    onError((e as { message: string }).message)
  })

  player.addListener('authentication_error', (e) => {
    onError((e as { message: string }).message)
  })

  player.addListener('account_error', () => {
    onError('Spotify Premium is required for Web Playback.')
  })

  await player.connect()
  return player
}

export async function playTracks(
  token: string,
  devId: string,
  uris: string[],
  positionMs = 0,
): Promise<void> {
  await fetch(
    `https://api.spotify.com/v1/me/player/play?device_id=${devId}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ uris, position_ms: positionMs }),
    },
  )
}

export async function pausePlayback(token: string): Promise<void> {
  await fetch('https://api.spotify.com/v1/me/player/pause', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function setSpotifyVolume(
  token: string,
  volumePct: number,
): Promise<void> {
  await fetch(
    `https://api.spotify.com/v1/me/player/volume?volume_percent=${Math.round(volumePct * 100)}`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    },
  )
}
