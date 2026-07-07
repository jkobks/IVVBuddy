'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'

const Avatar = dynamic(() => import('react-avataaars').then(m => m.Avatar), { ssr: false })

const ENTER_MS = 400
const LEAVE_MS = 300
const DISMISS_MS = 8000

// bubble phase: 'hidden' | 'entering' | 'leaving'
export function SearchBuddy({ message, visible }) {
  const [bubblePhase, setBubblePhase] = useState('hidden')
  const autoTimer = useRef(null)
  const leaveTimer = useRef(null)

  const startLeave = useCallback(() => {
    clearTimeout(autoTimer.current)
    setBubblePhase('leaving')
    leaveTimer.current = setTimeout(() => setBubblePhase('hidden'), LEAVE_MS)
  }, [])

  useEffect(() => {
    clearTimeout(autoTimer.current)
    clearTimeout(leaveTimer.current)

    if (!visible) {
      setBubblePhase('hidden')
      return
    }

    setBubblePhase('entering')
    autoTimer.current = setTimeout(startLeave, DISMISS_MS)

    return () => {
      clearTimeout(autoTimer.current)
      clearTimeout(leaveTimer.current)
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
        .sb-enter {
          transform-origin: bottom right;
          animation: sb-pop-in ${ENTER_MS}ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        .sb-leave {
          transform-origin: bottom right;
          animation: sb-fade-out ${LEAVE_MS}ms ease forwards;
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
              boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
              border: '1.5px solid #e5e7eb',
              padding: '14px 36px 14px 16px',
              width: '300px',
              position: 'relative',
            }}>
              <button
                onClick={startLeave}
                aria-label="Schließen"
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  width: '18px',
                  height: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#9ca3af',
                  fontSize: '11px',
                  borderRadius: '50%',
                  padding: 0,
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
              <p style={{ margin: 0, fontSize: '14px', color: '#374151', lineHeight: '1.6' }}>
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
          className="rounded-full"
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
