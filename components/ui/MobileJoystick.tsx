'use client'

export default function MobileJoystick() {
  return (
    <div
      id="joystick-zone"
      style={{
        position: 'fixed',
        bottom: '40px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '120px',
        height: '120px',
        zIndex: 60,
        pointerEvents: 'none',
      }}
    >
      {/* Joystick ring */}
      <div
        id="joystick-origin"
        style={{
          position: 'absolute',
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          background: 'rgba(232, 213, 168, 0.12)',
          border: '1px solid rgba(232, 213, 168, 0.25)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Thumb */}
        <div
          id="joystick-thumb"
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: 'rgba(255, 181, 107, 0.35)',
            border: '1px solid rgba(255, 181, 107, 0.5)',
            transition: 'transform 0.05s',
            willChange: 'transform',
          }}
        />
      </div>
    </div>
  )
}
