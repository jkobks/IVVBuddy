'use client'

export function DoneScreen() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full mx-auto px-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Vielen Dank!</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            Du hast alle 4 Aufgaben abgeschlossen. Deine Antworten wurden gespeichert.
          </p>
          <p className="text-gray-600 text-sm leading-relaxed mt-4">
            Sende uns bitte eine E-Mail mit deiner Matrikelnummer, wenn du an der Studie teilgenommen hast.
          </p>
          <p className="text-gray-900 text-sm font-medium mt-2">
            emil.bittner@stud.uni-regensburg.de<br />
            jakob.kessler@stud.uni-regensburg.de
          </p>
        </div>
      </div>
    </main>
  )
}
