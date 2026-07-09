'use client'
import { useState } from 'react'

export function ConsentScreen({ onAccept }: { onAccept: () => void }) {
  const [checked, setChecked] = useState(false)

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <h1 className="text-xl font-bold text-gray-900 mb-4">Einverständniserklärung zur Studienteilnahme</h1>

          <div className="text-sm text-gray-700 leading-relaxed space-y-4 max-h-[60vh] overflow-y-auto pr-2 border border-gray-200 rounded-xl p-4 bg-gray-50">
            <p>
              Sie sind eingeladen, an der Onlinestudie &quot;Der Search Buddy: Ein verhaltensreaktiver Pädagogischer Agent
              für personalisiertes Feedback während der Websuche&quot; teilzunehmen. Die Studie wird von Emil Bittner und
              Jakob Kessler durchgeführt und von David Elsweiler an der Universität Regensburg betreut. Wir rechnen mit
              etwa 30 Teilnehmenden. Die Datenerhebung ist vom 12.07.2026 bis 19.07.2026 geplant. Wichtige Hinweise:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Die Teilnahme ist freiwillig. Sie können jederzeit ohne Nachteile abbrechen oder Ihre Einwilligung widerrufen</li>
              <li>Eine Sitzung der Onlinestudie dauert etwa 30 Minuten</li>
              <li>Als Aufwandsentschädigung erhalten Sie einen halben Credit Point für die Lehrveranstaltung</li>
              <li>Wir erheben demografische Angaben (z. B. Alter und Geschlecht) für die Auswertung</li>
              <li>Im Rahmen der Studie können folgende Daten erhoben oder erstellt werden: Ihre Eingaben</li>
              <li>
                Aufzeichnungen und Forschungsdaten werden gemäß der DSGVO verarbeitet. Sie werden pseudonymisiert
                (mithilfe eines Codes), gespeichert, ausgewertet und nur in zusammengefasster Form veröffentlicht,
                sodass ohne den Zuordnungsschlüssel der Forschenden keine Rückschlüsse auf Ihre Person möglich sind.
              </li>
            </ul>
            <p>
              Die Alternative ist, nicht teilzunehmen. Wenn Sie Fragen zur Studie, zum Einwilligungsprozess oder zu
              Ihren Rechten als teilnehmende Person haben, wenden Sie sich bitte an David Elsweiler. Bitte lesen Sie
              die folgenden Informationen sorgfältig und nehmen Sie sich die Zeit, die Sie für Ihre Entscheidung
              brauchen.
            </p>

            <section className="space-y-1">
              <h2 className="font-semibold text-gray-900">1. Zweck und Ziel dieser Forschung</h2>
              <p>
                Der Zweck dieser Studie ist es, die bestehende Forschungslücke von rein retrospektiven oder
                generischen Suchassistenten zu schließen, indem untersucht wird, wie ein verhaltensreaktiver
                Pädagogischer Agent durch personalisiertes Echtzeit-Feedback das selbstregulierte Lernen und die
                Effizienz während einer laufenden Websuche adaptiv unterstützen kann. Das Ziel der Arbeit ist die
                Konzeption, prototypische Umsetzung und Evaluation eines digitalen „Search Buddies“, der individuelle
                Suchmuster in Echtzeit erkennt und durch pädagogisch fundiertes, die kognitive Belastung
                minimierendes Feedback den Sucherfolg und die Motivation der Nutzenden nachweisbar optimiert. Ihre
                Teilnahme unterstützt diese Forschung. Ergebnisse können in wissenschaftlichen Veröffentlichungen,
                Abschlussarbeiten oder auf Fachkonferenzen vorgestellt werden.
              </p>
            </section>

            <section className="space-y-1">
              <h2 className="font-semibold text-gray-900">2. Studienteilnahme</h2>
              <p>
                Ihre Teilnahme an dieser Onlinestudie ist freiwillig. Sie können Fragen oder Aufgaben überspringen
                und die Teilnahme jederzeit ohne Nachteile und ohne Angabe von Gründen beenden. Wenn Sie sich unwohl
                fühlen, können Sie sofort abbrechen. Die Forschenden können Ihre Teilnahme beenden, wenn dies aus
                organisatorischen Gründen, wegen ungültiger Versuchsdurchläufe oder zu Ihrem Schutz erforderlich ist.
                Die Forschenden erläutern Ihnen vor Beginn der Studie, wie bei einem vorzeitigen Abbruch mit der
                Vergütung umgegangen wird. Eine wiederholte Teilnahme an dieser Studie ist nicht vorgesehen.
              </p>
            </section>

            <section className="space-y-1">
              <h2 className="font-semibold text-gray-900">3. Studienablauf</h2>
              <p>Wenn Sie der Teilnahme zustimmen, läuft die Studie in der Regel wie folgt ab:</p>
              <ol className="list-decimal pl-5 space-y-1">
                <li>
                  Begrüßung und Einwilligung: Teilnehmer:innen erhalten eine kurze Einführung in das Studienthema
                  und erklären ihr Einverständnis zur Teilnahme und Datenerfassung.
                </li>
                <li>Recherchephase: Die Teilnehmer:innen beginnen mit der freien Recherche in der Suchoberfläche, um die Frage zu beantworten</li>
                <li>Abgabe der Entscheidung: Nach eigener Einschätzung der ausreichenden Recherche geben die Teilnehmer ihre Antwort auf die Frage ab</li>
                <li>Wiederholung: Insgesamt vier Tasks</li>
              </ol>
              <p>Falls gewünscht, können die Forschenden Ihnen direkt im Anschluss eine Teilnahmebestätigung ausstellen.</p>
            </section>

            <section className="space-y-1">
              <h2 className="font-semibold text-gray-900">4. Risiken und Nutzen</h2>
              <p>
                Nach aktuellem Kenntnisstand sind mit dieser Onlinestudie keine Risiken verbunden, die über
                alltägliche Aktivitäten hinausgehen. Trotz technischer und organisatorischer Schutzmaßnahmen kann ein
                Verlust der Vertraulichkeit oder ein unbefugter Zugriff auf Daten nicht vollständig ausgeschlossen
                werden. Sie erhalten voraussichtlich keinen direkten persönlichen Nutzen. Ihre Teilnahme unterstützt
                jedoch die Forschung zur Mensch-Computer-Interaktion.
              </p>
            </section>

            <section className="space-y-1">
              <h2 className="font-semibold text-gray-900">5. Datenschutz und Vertraulichkeit</h2>
              <p>
                In dieser Studie erheben wir, soweit erforderlich, direkt identifizierende Angaben und
                Forschungsdaten. Die Verarbeitung erfolgt auf Grundlage Ihrer Einwilligung und gemäß der
                Datenschutz-Grundverordnung (DSGVO). Sie können Auskunft über identifizierbare Daten verlangen,
                unrichtige Angaben berichtigen lassen und, soweit rechtlich möglich, die Einschränkung der
                Verarbeitung oder Löschung verlangen. Mit Ihrer Einwilligung erfassen wir Ihre Eingaben. Ergebnisse
                der Studie können in wissenschaftlichen Veröffentlichungen oder anderen Forschungsberichten
                veröffentlicht werden. Direkt identifizierende Angaben werden nur so lange gespeichert, wie es
                erforderlich ist. Danach werden sie gelöscht oder von den Forschungsdaten getrennt. Während der
                Auswertung haben nur die Forschenden und autorisierte Projektmitarbeitende Zugriff auf die Rohdaten.
                Direkt identifizierende Angaben werden getrennt gespeichert und nicht veröffentlicht. Die Daten
                werden mithilfe eines Codes pseudonymisiert und nur in zusammengefasster Form veröffentlicht, sodass
                ohne den Zuordnungsschlüssel der Forschenden keine Rückschlüsse auf Ihre Person möglich sind. Da
                keine Kontaktdaten erhoben werden, können wir Sie im Anschluss nicht zu Rückfragen, Folgestudien oder
                möglichen Datenschutzvorfällen kontaktieren.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-semibold text-gray-900">6. Nennung der Untersuchenden</h2>
              <p>Wenn Sie Fragen zur Studie oder zu Ihren Daten haben, wenden Sie sich bitte an:</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium text-gray-900">Versuchsdurchführung</h3>
                  <p>Emil Bittner (emil.bittner@stud.uni-regensburg.de)</p>
                  <p>Jakob Kessler (jakob.kessler@stud.uni-regensburg.de)</p>
                  <p>Universität Regensburg</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Versuchsleitung</h3>
                  <p>David Elsweiler</p>
                  <p>david.elsweiler@ur.de</p>
                  <p>Universität Regensburg</p>
                  <p>Universitätsstr. 31</p>
                  <p>93053 Regensburg, Germany</p>
                </div>
              </div>
            </section>
          </div>

          <label className="flex items-start gap-3 mt-6 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-1 h-4 w-4 shrink-0"
            />
            <span className="text-sm text-gray-700">
              Ich habe die Einverständniserklärung gelesen und verstanden und stimme der Teilnahme an dieser Studie
              sowie der beschriebenen Datenverarbeitung freiwillig zu.
            </span>
          </label>

          <button
            type="button"
            disabled={!checked}
            onClick={onAccept}
            className="mt-6 w-full rounded-xl bg-blue-600 text-white font-medium py-3 disabled:opacity-40 disabled:cursor-not-allowed enabled:hover:bg-blue-700 transition-colors"
          >
            Zustimmen und fortfahren
          </button>
        </div>
      </div>
    </main>
  )
}
