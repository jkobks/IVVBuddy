export interface Task {
  id: string
  scenario: string
  question: string
}

export const TASKS: Task[] = [
  {
    id: 'kollagen',
    scenario: 'Eine Bekannte erzählt dir, sie nehme seit drei Monaten Kollagen-Pulver weil es angeblich Falten reduziert. Du bist skeptisch.',
    question: 'Gibt es wissenschaftliche Belege dafür? Würdest du es ihr empfehlen?',
  },
  {
    id: 'apfelessig',
    scenario: 'Ein Freund will Apfelessig pur trinken, weil er gehört hat, das helfe beim Abnehmen.',
    question: 'Was würdest du ihm raten?',
  },
  {
    id: 'zucker',
    scenario: 'In deiner Familie diskutiert man ob Zucker Kinder hyperaktiv macht. Deine Tante ist überzeugt davon, dein Cousin hält es für einen Mythos.',
    question: 'Wer hat eher recht?',
  },
  {
    id: 'blaulicht',
    scenario: 'Du überlegst dir eine Blaulichtfilter-Brille zu kaufen weil du viel am Bildschirm arbeitest. Ein Kollege sagt das sei rausgeworfenes Geld.',
    question: 'Lohnt sich die Anschaffung?',
  },
]

export function shuffleTasks(): Task[] {
  const arr = [...TASKS]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export function getTaskById(id: string): Task | undefined {
  return TASKS.find((t) => t.id === id)
}
