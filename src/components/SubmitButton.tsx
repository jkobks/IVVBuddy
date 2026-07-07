'use client'
import { useState } from 'react'

interface Props {
  onOpen: () => void
  onSubmit: (answerText: string) => void
  isLastTask: boolean
}

export function SubmitButton({ onOpen, onSubmit, isLastTask }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [answer, setAnswer] = useState('')

  const handleConfirm = () => {
    if (!answer.trim()) return
    onSubmit(answer.trim())
    setIsOpen(false)
    setAnswer('')
  }

  if (isOpen) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-xl p-4 z-40">
        <p className="text-sm font-semibold text-gray-800 mb-2">Deine Antwort:</p>
        <textarea
          className="w-full border border-gray-300 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-400"
          rows={3}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Schreibe deine Antwort hier…"
          autoFocus
        />
        <div className="flex gap-2 mt-3">
          <button
            onClick={handleConfirm}
            disabled={!answer.trim()}
            className="bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {isLastTask ? 'Abschicken' : 'Abschicken & weiter'}
          </button>
          <button
            onClick={() => {
              setIsOpen(false)
              setAnswer('')
            }}
            className="bg-gray-100 text-gray-700 px-5 py-2 rounded-lg text-sm hover:bg-gray-200 transition-colors"
          >
            Abbrechen
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', top: '16px', right: '16px', zIndex: 40 }}>
      <button
        onClick={() => { setIsOpen(true); onOpen() }}
        className="bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors shadow-md"
      >
        Antwort abgeben
      </button>
    </div>
  )
}
