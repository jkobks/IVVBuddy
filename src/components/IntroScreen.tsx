'use client'
import type { Condition } from '@/types'

interface Props {
  condition: Condition
  onContinue: () => void
}

export function IntroScreen({ condition, onContinue }: Props) {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="max-w-xl w-full mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <h1 className="text-xl font-bold text-gray-900 mb-4">So läuft&apos;s ab</h1>

          <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
            <p>
              Du bekommst gleich <strong>4 Aufgaben</strong> nacheinander. Zu jeder Aufgabe gibt es ein kurzes
              Szenario und eine Frage. Du recherchierst frei über die eingebaute Suche — genau wie bei einer
              normalen Websuche — und öffnest Ergebnisse, so oft und so lange du möchtest.
            </p>
            <p>
              Wenn du das Gefühl hast, genug recherchiert zu haben, gibst du deine Antwort über das Formular ab
              und es geht mit der nächsten Aufgabe weiter.
            </p>

            {condition === 'buddy' ? (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
                <p className="font-medium text-blue-900">Dein Search Buddy</p>
                <p className="text-blue-800">
                  Während du suchst, meldet sich unten rechts gelegentlich dein Search Buddy mit einem kurzen,
                  situativen Tipp — zum Beispiel wenn du sehr schnell entscheidest oder immer auf dasselbe Ergebnis
                  klickst. Die Hinweise verschwinden von selbst nach ein paar Sekunden. Du kannst sie lesen oder
                  ignorieren und ganz normal weitersuchen.
                </p>
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <p className="text-gray-700">
                  Die Suchoberfläche funktioniert wie eine normale Suchmaschine, ohne zusätzliche Hinweise oder
                  Einblendungen. Recherchiere einfach wie gewohnt.
                </p>
              </div>
            )}

            <p className="text-xs text-gray-400">
              Es gibt kein richtig oder falsch — uns interessiert, wie du an die Recherche herangehst.
            </p>
          </div>

          <button
            type="button"
            onClick={onContinue}
            className="mt-6 w-full rounded-xl bg-blue-600 text-white font-medium py-3 hover:bg-blue-700 transition-colors"
          >
            Los geht&apos;s
          </button>
        </div>
      </div>
    </main>
  )
}
