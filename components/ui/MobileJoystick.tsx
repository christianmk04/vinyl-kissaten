'use client'

export default function MobileJoystick() {
  function onInteract() {
    document.dispatchEvent(new CustomEvent('mobile-interact'))
  }

  return (
    <>
      {/* Left zone: joystick */}
      <div
        id="joystick-zone"
        style={{
          position: 'fixed',
          bottom: '30px',
          left: '30px',
          width: '130px',
          height: '130px',
          zIndex: 60,
          pointerEvents: 'none',
        }}
      >
        <div
          id="joystick-origin"
          style={{
            position: 'absolute',
            width: '130px',
            height: '130px',
            borderRadius: '50%',
            background: 'rgba(232, 213, 168, 0.08)',
            border: '1px solid rgba(232, 213, 168, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            id="joystick-thumb"
            style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              background: 'rgba(255, 181, 107, 0.4)',
              border: '2px solid rgba(255, 181, 107, 0.7)',
              transition: 'transform 0.05s',
              willChange: 'transform',
            }}
          />
        </div>
      </div>

      {/* Right bottom: interact button */}
      <button
        id="interact-btn"
        onPointerDown={(e) => { e.preventDefault(); onInteract() }}
        style={{
          position: 'fixed',
          bottom: '40px',
          right: '40px',
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'rgba(255, 181, 107, 0.15)',
          border: '2px solid rgba(255, 181, 107, 0.5)',
          color: '#e8d5a8',
          fontFamily: 'Courier New, monospace',
          fontSize: '11px',
          letterSpacing: '0.05em',
          cursor: 'pointer',
          zIndex: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          touchAction: 'none',
        }}
      >
        ACT
      </button>

      {/* Right zone label */}
      <div style={{
        position: 'fixed',
        bottom: '30px',
        right: '120px',
        fontFamily: 'Courier New, monospace',
        fontSize: '9px',
        color: 'rgba(138, 112, 96, 0.5)',
        letterSpacing: '0.1em',
        pointerEvents: 'none',
        zIndex: 60,
      }}>
        DRAG RIGHT SIDE TO LOOK
      </div>
    </>
  )
}
