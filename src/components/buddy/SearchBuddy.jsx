'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'

const Avatar = dynamic(() => import('react-avataaars').then(m => m.Avatar), { ssr: false })

const ENTER_MS = 400
const LEAVE_MS = 300
const DISMISS_MS = 8000
const GLOW_MS = 2200

// A trigger's sound can end up playing well after the click/keypress that
// caused it (it now waits for tab focus — see BuddyContainer), by which point
// the browser's autoplay policy no longer treats it as tied to a user
// gesture and silently blocks a freshly created AudioContext. Unlocking one
// eagerly on the page's first real interaction and reusing it sidesteps that.
let sharedAudioContext = null
let unlockListenersAttached = false

function unlockSharedAudioContext() {
  const Ctx = window.AudioContext || window.webkitAudioContext
  if (!Ctx) return
  if (!sharedAudioContext) sharedAudioContext = new Ctx()
  if (sharedAudioContext.state === 'suspended') sharedAudioContext.resume().catch(() => {})
}

function ensureAudioUnlockListeners() {
  if (typeof window === 'undefined' || unlockListenersAttached) return
  unlockListenersAttached = true
  ;['pointerdown', 'keydown'].forEach((type) =>
    document.addEventListener(type, unlockSharedAudioContext, { once: true, capture: true })
  )
}

// Short, gentle two-note "pop" chime synthesized on the fly — no audio asset needed.
function playPopSound() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    const isShared = !!sharedAudioContext
    const ctx = sharedAudioContext ?? new Ctx()
    if (ctx.state === 'suspended') ctx.resume()
    const now = ctx.currentTime

    const notes = [
      { freq: 880, start: 0, dur: 0.12 },
      { freq: 1320, start: 0.09, dur: 0.16 },
    ]

    notes.forEach(({ freq, start, dur }) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0, now + start)
      gain.gain.linearRampToValueAtTime(0.18, now + start + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + start)
      osc.stop(now + start + dur + 0.02)
    })

    // Only tear down one-off fallback contexts (unlock never happened in time) —
    // the shared, pre-unlocked context stays alive for the next intervention.
    if (!isShared) {
      setTimeout(() => ctx.close(), (notes.at(-1).start + notes.at(-1).dur + 0.3) * 1000)
    }
  } catch {
    // Audio unsupported or blocked by autoplay policy — fail silently.
  }
}

// bubble phase: 'hidden' | 'entering' | 'leaving'
export function SearchBuddy({ message, visible }) {
  const [bubblePhase, setBubblePhase] = useState('hidden')
  const [glowing, setGlowing] = useState(false)
  const autoTimer = useRef(null)
  const leaveTimer = useRef(null)
  const glowTimer = useRef(null)

  useEffect(() => {
    ensureAudioUnlockListeners()
  }, [])

  const startLeave = useCallback(() => {
    clearTimeout(autoTimer.current)
    setBubblePhase('leaving')
    leaveTimer.current = setTimeout(() => setBubblePhase('hidden'), LEAVE_MS)
  }, [])

  useEffect(() => {
    clearTimeout(autoTimer.current)
    clearTimeout(leaveTimer.current)
    clearTimeout(glowTimer.current)

    if (!visible) {
      setBubblePhase('hidden')
      setGlowing(false)
      return
    }

    setBubblePhase('entering')
    playPopSound()
    setGlowing(true)
    glowTimer.current = setTimeout(() => setGlowing(false), GLOW_MS)
    autoTimer.current = setTimeout(startLeave, DISMISS_MS)

    return () => {
      clearTimeout(autoTimer.current)
      clearTimeout(leaveTimer.current)
      clearTimeout(glowTimer.current)
    }
  }, [visible, message, startLeave])

  const isLeaving = bubblePhase === 'leaving'
  const showBubble = bubblePhase !== 'hidden'

  return (
    <>
      <style>{`
        @keyframes sb-pop-in {
          0%   { opacity: 0; transform: scale(0.05) rotate(-6deg); }
          60%  { opacity: 1; transform: scale(1.1) rotate(2deg); }
          80%  { transform: scale(0.95) rotate(-1deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
        @keyframes sb-fade-out {
          from { opacity: 1; transform: scale(1); }
          to   { opacity: 0; transform: scale(0.85); }
        }
        @keyframes sb-glow-ring {
          0%   { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.55); }
          70%  { box-shadow: 0 0 0 22px rgba(59, 130, 246, 0); }
          100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
        }
        @keyframes sb-avatar-bounce {
          0%, 100% { transform: translateY(0) scale(1); }
          25%      { transform: translateY(-10px) scale(1.04); }
          50%      { transform: translateY(0) scale(1); }
          75%      { transform: translateY(-4px) scale(1.02); }
        }
        .sb-enter {
          transform-origin: bottom right;
          animation: sb-pop-in ${ENTER_MS}ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        .sb-leave {
          transform-origin: bottom right;
          animation: sb-fade-out ${LEAVE_MS}ms ease forwards;
        }
        .sb-glow {
          border-radius: 50%;
          animation: sb-glow-ring 1.1s ease-out 2, sb-avatar-bounce 0.6s ease-in-out 1;
        }
      `}</style>

      <div style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 50,
      }}>
        {/* Speech bubble — diagonal up-left from avatar */}
        {showBubble && (
          <div
            className={isLeaving ? 'sb-leave' : 'sb-enter'}
            style={{
              position: 'absolute',
              bottom: '230px',
              right: '180px',
            }}
          >
            <div style={{
              background: '#fff',
              borderRadius: '16px',
              boxShadow: glowing
                ? '0 10px 36px rgba(59,130,246,0.35), 0 8px 32px rgba(0,0,0,0.18)'
                : '0 8px 32px rgba(0,0,0,0.18)',
              border: glowing ? '2px solid #93c5fd' : '2px solid #e5e7eb',
              padding: '20px 44px 20px 22px',
              width: '400px',
              position: 'relative',
              transition: 'box-shadow 0.4s ease, border-color 0.4s ease',
            }}>
              <button
                onClick={startLeave}
                aria-label="Schließen"
                style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  width: '22px',
                  height: '22px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#9ca3af',
                  fontSize: '13px',
                  borderRadius: '50%',
                  padding: 0,
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
              <p style={{ margin: 0, fontSize: '18px', color: '#374151', lineHeight: '1.6' }}>
                {message}
              </p>
            </div>
            {/* Arrow pointing diagonally down-right toward avatar */}
            <div style={{
              position: 'absolute',
              bottom: '-7px',
              right: '-7px',
              width: '14px',
              height: '14px',
              background: '#fff',
              border: '1.5px solid #e5e7eb',
              borderTop: 'none',
              borderLeft: 'none',
              transform: 'rotate(45deg)',
            }} />
          </div>
        )}

        {/* Avatar — always visible */}
        <Avatar
          className={glowing ? 'rounded-full sb-glow' : 'rounded-full'}
          size="260px"
          options={{
            style: 'circle',
            top: 'shortHair',
            hairColor: 'brown',
            eyes: 'default',
            eyebrow: 'raised',
            mouth: 'twinkle',
            clothes: 'hoodie',
            clothesColor: 'blue',
            skin: 'light',
          }}
        />
      </div>
    </>
  )
}
