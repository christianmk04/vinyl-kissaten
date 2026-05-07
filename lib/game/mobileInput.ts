// Shared mobile input state.
//
// The joystick widget (MobileJoystick) writes here and the player-movement
// hook (MobileControls → usePlayerMovement) reads here every frame. We use a
// plain mutable object instead of a Zustand slice because the joystick
// updates at touch frequency (often 60–120 Hz) and we don't want a React
// render cycle on every tick — the consumer only needs the latest value at
// the next animation frame.
//
// x and y are normalized to the unit disc (-1..1 per axis), with y up
// reading negative (matching screen-touch convention where the finger
// pulling up on the screen produces a negative y delta).
export const mobileInput = {
  joystick: { x: 0, y: 0 },
}

export function resetMobileInput() {
  mobileInput.joystick.x = 0
  mobileInput.joystick.y = 0
}
