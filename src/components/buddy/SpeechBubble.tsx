'use client'

interface Props {
  message: string
  onDismiss: () => void
}

export function SpeechBubble({ message, onDismiss }: Props) {
  return (
    <div className="relative animate-fade-in-up">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 w-64">
        <button
          onClick={onDismiss}
          aria-label="Schließen"
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 text-xs w-5 h-5 flex items-center justify-center rounded-full hover:bg-gray-100"
        >
          ✕
        </button>
        <p className="text-sm text-gray-700 leading-relaxed pr-4">{message}</p>
      </div>
      {/* Arrow pointing right toward avatar */}
      <div className="absolute top-1/2 -right-2 -translate-y-1/2 w-4 h-4 bg-white border-r border-t border-gray-100 rotate-45" />
    </div>
  )
}
