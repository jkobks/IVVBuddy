function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)
}

export function jaccardSimilarity(a: string, b: string): number {
  const tokensA = tokenize(a)
  const tokensB = tokenize(b)
  if (tokensA.length === 0 && tokensB.length === 0) return 0

  const mapA: Record<string, true> = {}
  const mapB: Record<string, true> = {}
  for (let i = 0; i < tokensA.length; i++) mapA[tokensA[i]] = true
  for (let i = 0; i < tokensB.length; i++) mapB[tokensB[i]] = true

  const keysA = Object.keys(mapA)
  const sizeA = keysA.length
  const sizeB = Object.keys(mapB).length

  let intersection = 0
  for (let i = 0; i < keysA.length; i++) {
    if (mapB[keysA[i]]) intersection++
  }

  const union = sizeA + sizeB - intersection
  return union === 0 ? 0 : intersection / union
}
