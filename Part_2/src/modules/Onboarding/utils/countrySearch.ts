import { countryCodes } from '@/utils/country-code'

export type Country = (typeof countryCodes)[number]

export const fuzzyScore = (name: string, term: string): number | null => {
    const n = name.toLowerCase()
    let i = 0
    let score = 0
    let prevIdx = -1
    let firstIdx = -1
    for (const ch of term) {
        const idx = n.indexOf(ch, i)
        if (idx === -1) return null
        if (firstIdx === -1) firstIdx = idx
        if (prevIdx !== -1 && idx === prevIdx + 1) score -= 5
        if (idx === 0 || n[idx - 1] === ' ' || n[idx - 1] === '-') score -= 3
        score += idx - i
        prevIdx = idx
        i = idx + 1
    }
    return score + firstIdx
}

export const filterCountries = (q: string): Country[] => {
    const raw = q.trim().toLowerCase()
    if (!raw) return countryCodes
    const digitTerm = raw.replace(/^\+/, '')
    if (/^\d+$/.test(digitTerm)) {
        return countryCodes.filter((c) => c.code.replace('+', '').includes(digitTerm))
    }
    const scored: { c: Country; s: number }[] = []
    for (const c of countryCodes) {
        const s = fuzzyScore(c.name, raw)
        if (s !== null) scored.push({ c, s })
    }
    scored.sort((a, b) => a.s - b.s)
    return scored.map((x) => x.c)
}
