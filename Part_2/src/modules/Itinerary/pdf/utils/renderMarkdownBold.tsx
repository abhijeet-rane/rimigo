import { Text } from '@react-pdf/renderer'
import type { Style } from '@react-pdf/types'
import { Fragment } from 'react'

// Tips/Visa/SIM bodies come in with `**bold**` markdown. react-pdf has
// no markdown parser — render the asterisk-wrapped runs as nested
// <Text style={{ fontWeight: 700 }}> spans so they actually look bold
// instead of showing literal asterisks. Everything else is rendered
// untouched.
const MARKER = /\*\*([^*]+)\*\*/g

export function renderMarkdownBold(text: string, boldStyle?: Style) {
    if (!text) return null
    const parts: Array<{ bold: boolean; value: string }> = []
    let lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = MARKER.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push({ bold: false, value: text.slice(lastIndex, match.index) })
        }
        parts.push({ bold: true, value: match[1] })
        lastIndex = MARKER.lastIndex
    }
    if (lastIndex < text.length) {
        parts.push({ bold: false, value: text.slice(lastIndex) })
    }
    if (parts.length === 0) return text
    return parts.map((part, i) =>
        part.bold ? (
            <Text key={i} style={boldStyle ?? { fontWeight: 700 }}>
                {part.value}
            </Text>
        ) : (
            <Fragment key={i}>{part.value}</Fragment>
        ),
    )
}
