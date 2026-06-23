/**
 * Itinerary-expert chat message renderer.
 *
 * Replaces the generic ``parseSimpleMarkdown`` wall-of-text for
 * concierge responses with a structure-aware renderer that:
 *
 *   * Detects numbered option lists ("1. **Title** desc · 2. ...") and
 *     lays them out as option tiles with a clear visual rhythm.
 *   * Detects recommendation blocks ("My take:", "My recommendation:",
 *     "I'd recommend …") and highlights them as a soft call-out.
 *   * Renders prose with comfortable reading width, proper line-height,
 *     hierarchical bold, and bulleted / numbered lists that look like
 *     lists rather than inline sentences.
 *
 * Safe on any concierge output — when no structured patterns are
 * detected, it falls back to clean markdown rendering, so the worst
 * case is "nice typography" not "broken layout".
 *
 * Works for both streaming and finished messages because it operates
 * on the current text snapshot. During streaming the block detection
 * re-runs per delta which is cheap (regex scan over ~1-2 KB).
 */
import React, { useMemo } from 'react'
import { motion } from 'motion/react'
import Markdown from 'react-markdown'

// ── Theme tokens (from src/index.css) ────────────────────────────────────
//   --color-primary-default: #7011f6
//   grey_0 → grey_6 descending darkness
//   font-manrope is the body font
// We stick to Tailwind utility classes to inherit the existing design
// system rather than introducing bespoke CSS.

interface ItineraryAssistantMessageProps {
    text: string
    /** When true, append a blinking caret to the last text block so the
     *  user sees tokens streaming. */
    isStreaming?: boolean
    /** Typography scale — ``standard`` for chat default, ``compact`` for
     *  in-line streaming card context. */
    density?: 'standard' | 'compact'
}

const ItineraryAssistantMessage: React.FC<ItineraryAssistantMessageProps> = ({
    text,
    isStreaming = false,
    density = 'standard'
}) => {
    const blocks = useMemo(() => parseIntoBlocks(text), [text])
    if (blocks.length === 0) return null

    return (
        <div className={density === 'compact' ? 'flex flex-col gap-3' : 'flex flex-col gap-4'}>
            {blocks.map((block, i) => (
                <BlockRenderer
                    key={i}
                    block={block}
                    density={density}
                    isLastBlock={i === blocks.length - 1}
                    isStreaming={isStreaming}
                />
            ))}
        </div>
    )
}

export default ItineraryAssistantMessage

// ══════════════════════════════════════════════════════════════════════════
// Block parser
// ══════════════════════════════════════════════════════════════════════════

type Block =
    | { kind: 'prose'; text: string }
    | { kind: 'options'; intro?: string; options: OptionBlock[] }
    | { kind: 'recommendation'; label: string; text: string }

interface OptionBlock {
    index: number
    title: string
    body: string
}

/**
 * Break the message into semantic blocks.
 *
 * Strategy:
 *   1. Try to detect a single run of "1. … 2. … 3. …" options — at least
 *      two items, ideally 3+. If found, everything before the first
 *      option becomes an ``intro`` prose block, the numbered items become
 *      an ``options`` block, everything after becomes post-prose (which
 *      may itself contain a recommendation).
 *   2. Scan the remaining prose for a recommendation prefix on a
 *      sentence boundary and split it out as a ``recommendation`` block.
 *   3. Anything else stays as ``prose``.
 *
 * The parser is conservative — when the text doesn't match any pattern,
 * it returns a single prose block with the original text untouched.
 */
function parseIntoBlocks(raw: string): Block[] {
    const text = raw?.trim() ?? ''
    if (!text) return []

    const optionsMatch = extractOptionList(text)
    if (optionsMatch) {
        const blocks: Block[] = []
        if (optionsMatch.before.trim()) {
            blocks.push(...splitProseAndRecommendation(optionsMatch.before))
        }
        blocks.push({
            kind: 'options',
            options: optionsMatch.options
        })
        if (optionsMatch.after.trim()) {
            blocks.push(...splitProseAndRecommendation(optionsMatch.after))
        }
        return blocks
    }

    return splitProseAndRecommendation(text)
}

const RECOMMENDATION_LABELS = [
    'My take',
    'My recommendation',
    'Recommendation',
    "I'd recommend",
    'I recommend',
    "I'd suggest",
    'I suggest',
    'My suggestion'
]

function splitProseAndRecommendation(text: string): Block[] {
    const trimmed = text.trim()
    if (!trimmed) return []

    // Find the earliest recommendation marker that lands at a sentence
    // boundary (start of string, or immediately after a period/newline).
    let earliest = -1
    let matchedLabel = ''
    for (const label of RECOMMENDATION_LABELS) {
        const pattern = new RegExp(`(^|[\\.\\n]\\s*)${escapeRegex(label)}\\s*[:,—-]?`, 'i')
        const m = pattern.exec(trimmed)
        if (!m) continue
        const position = m.index + m[1].length
        if (earliest === -1 || position < earliest) {
            earliest = position
            matchedLabel = label
        }
    }

    if (earliest === -1) {
        return [{ kind: 'prose', text: trimmed }]
    }

    const before = trimmed.slice(0, earliest).trim()
    // Skip past the matched label + trailing punctuation
    const afterLabel = trimmed
        .slice(earliest + matchedLabel.length)
        .replace(/^[:,\s—-]+/, '')
        .trim()

    const blocks: Block[] = []
    if (before) blocks.push({ kind: 'prose', text: before })
    if (afterLabel) {
        blocks.push({
            kind: 'recommendation',
            label: matchedLabel.replace(/'/g, '’'),
            text: afterLabel
        })
    }
    return blocks
}

/**
 * Extract a "1. … 2. … 3. …" list from the text.
 *
 * Constraints (keep parser conservative):
 *   * At least 2 numbered items.
 *   * Items must be in sequence (1, 2, 3, … — tolerate gaps no larger
 *     than 1 to survive an LLM typo).
 *   * The very first line of an option is the "title" (which is
 *     often ``**Bold**`` in our concierge); the rest until the next
 *     option marker is the "body".
 */
function extractOptionList(text: string): { before: string; options: OptionBlock[]; after: string } | null {
    // Find all "N. " markers sitting at a line start OR at the start of
    // a sentence following ". " (the concierge sometimes inlines the
    // entire option list without hard newlines).
    const marker = /(^|[\n\.\s])(\d{1,2})\.\s+/g
    const hits: Array<{ index: number; num: number; contentStart: number }> = []
    let m: RegExpExecArray | null
    while ((m = marker.exec(text)) !== null) {
        const num = Number(m[2])
        const contentStart = m.index + m[0].length
        // Require a capital letter or bold ``**`` as next non-ws char,
        // so we don't mis-fire on decimals inside prose.
        const next = text.slice(contentStart).trimStart().charAt(0)
        if (!/[A-Z*]/.test(next)) continue
        // Skip a number that's part of a markdown heading ("### 1. Foo") —
        // those are section headers, not an option list. The marker regex
        // matches the "1." because the digit sits after the space in
        // "### ", which would otherwise turn three ``### N.`` headings into
        // bogus option tiles (absorbing the bullets + trailing ``###``).
        const digitPos = m.index + m[1].length
        const lineStart = text.lastIndexOf('\n', m.index) + 1
        if (/^\s*#+\s*$/.test(text.slice(lineStart, digitPos))) continue
        hits.push({ index: m.index + (m[1].length > 0 ? 1 : 0), num, contentStart })
    }

    if (hits.length < 2) return null

    // Find the longest consecutive run starting from index 1.
    let startIdx = -1
    let endIdx = -1
    for (let i = 0; i < hits.length - 1; i++) {
        if (hits[i].num !== 1) continue
        let j = i
        while (
            j + 1 < hits.length &&
            (hits[j + 1].num === hits[j].num + 1 || hits[j + 1].num === hits[j].num)
        ) {
            j++
        }
        if (j - i >= 1 && j - i > endIdx - startIdx) {
            startIdx = i
            endIdx = j
        }
    }
    if (startIdx === -1) return null

    const run = hits.slice(startIdx, endIdx + 1)
    if (run.length < 2) return null

    const firstItem = run[0]
    const options: OptionBlock[] = run.map((hit, idx) => {
        const contentEnd = idx + 1 < run.length ? run[idx + 1].index : text.length
        const raw = text.slice(hit.contentStart, contentEnd).trim()
        const { title, body } = splitTitleAndBody(raw)
        return { index: hit.num, title, body }
    })

    // The last option's body often absorbs a trailing "My take:" /
    // "My recommendation:" paragraph because there's no item boundary
    // after it. Lift that out so it renders as a proper
    // ``RecommendationBlock`` sibling rather than a mushy tail on the
    // last tile.
    const lifted = liftTrailingRecommendation(options[options.length - 1])
    if (lifted) {
        options[options.length - 1] = lifted.option
    }

    return {
        before: text.slice(0, firstItem.index).trim(),
        options,
        after: lifted?.after ?? ''
    }
}

/**
 * If the last option's body contains a recommendation marker at a
 * sentence boundary, split it off so the caller can render it as a
 * separate block.
 */
function liftTrailingRecommendation(
    option: OptionBlock | undefined
): { option: OptionBlock; after: string } | null {
    if (!option || !option.body) return null
    let earliest = -1
    for (const label of RECOMMENDATION_LABELS) {
        const pattern = new RegExp(`[\\.\\n]\\s*${escapeRegex(label)}\\b`, 'i')
        const m = pattern.exec(option.body)
        if (!m) continue
        const position = m.index + 1 // skip the sentence-ending punctuation
        if (earliest === -1 || position < earliest) earliest = position
    }
    if (earliest === -1) return null
    const head = option.body.slice(0, earliest).trim().replace(/[\s,;—-]+$/, '')
    const tail = option.body.slice(earliest).trim()
    return {
        option: { ...option, body: head },
        after: tail
    }
}

/**
 * Split an option's raw text into a short bold title (first line or
 * first ``**Bold**`` run) and the rest as body prose.
 */
function splitTitleAndBody(raw: string): { title: string; body: string } {
    const boldRun = /^\s*\*\*([^*]+)\*\*\s*[:—-]?\s*/
    const bold = boldRun.exec(raw)
    if (bold) {
        return {
            title: bold[1].trim(),
            body: raw.slice(bold[0].length).trim()
        }
    }
    // Fall back to "first sentence" as the title.
    const firstPeriod = raw.indexOf('.')
    if (firstPeriod > 0 && firstPeriod < 80) {
        return {
            title: raw.slice(0, firstPeriod).trim(),
            body: raw.slice(firstPeriod + 1).trim()
        }
    }
    return { title: raw, body: '' }
}

function escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// ══════════════════════════════════════════════════════════════════════════
// Block renderers
// ══════════════════════════════════════════════════════════════════════════

interface BlockRendererProps {
    block: Block
    density: 'standard' | 'compact'
    isLastBlock: boolean
    isStreaming: boolean
}

const BlockRenderer: React.FC<BlockRendererProps> = ({ block, density, isLastBlock, isStreaming }) => {
    if (block.kind === 'prose') {
        return (
            <ProseBlock
                text={block.text}
                density={density}
                showCaret={isLastBlock && isStreaming}
            />
        )
    }
    if (block.kind === 'options') {
        return <OptionsBlock options={block.options} density={density} />
    }
    return <RecommendationBlock label={block.label} text={block.text} density={density} />
}

// ── Prose ────────────────────────────────────────────────────────────────

const PROSE_SIZE: Record<'standard' | 'compact', string> = {
    standard: 'text-[16px] md:text-[14px] leading-[1.65] text-grey_0',
    compact: 'text-[13px] leading-[1.55] text-grey_0'
}

// Inert marker appended to streaming text. It rides along as plain
// trailing text so react-markdown keeps it inside the final block
// (last <p> or last <li>); the renderers below swap it for the caret,
// so the cursor hugs the last line instead of dropping to its own.
const CARET_SENTINEL = '⁠⁠CARET⁠⁠'

/** Replace the sentinel (always the last text node) with the caret. */
const injectCaret = (children: React.ReactNode): React.ReactNode => {
    if (typeof children === 'string') {
        if (!children.includes(CARET_SENTINEL)) return children
        const head = children.slice(0, children.indexOf(CARET_SENTINEL))
        return (
            <>
                {head}
                <StreamingCaret />
            </>
        )
    }
    if (Array.isArray(children)) {
        return children.map((c, i) => <React.Fragment key={i}>{injectCaret(c)}</React.Fragment>)
    }
    if (React.isValidElement(children)) {
        const el = children as React.ReactElement<{ children?: React.ReactNode }>
        if (el.props?.children == null) return children
        return React.cloneElement(el, undefined, injectCaret(el.props.children))
    }
    return children
}

// Lazy (not module-init) so it can reference PROSE_MARKDOWN_COMPONENTS,
// declared further down.
const buildCaretAwareComponents = () => ({
    ...PROSE_MARKDOWN_COMPONENTS,
    p: ({ children }: { children?: React.ReactNode }) => (
        <p className="m-0">{injectCaret(children)}</p>
    ),
    li: ({ children }: { children?: React.ReactNode }) => (
        <li className="pl-1">{injectCaret(children)}</li>
    )
})

const ProseBlock: React.FC<{ text: string; density: 'standard' | 'compact'; showCaret: boolean }> = ({
    text,
    density,
    showCaret
}) => {
    const wrapClass = `font-manrope font-[400] ${PROSE_SIZE[density]} [&>*+*]:mt-2`

    if (!showCaret) {
        return (
            <div className={wrapClass}>
                <Markdown components={PROSE_MARKDOWN_COMPONENTS}>{text}</Markdown>
            </div>
        )
    }

    // Streaming: sentinel makes the caret render inside the final block.
    return (
        <div className={wrapClass}>
            <Markdown components={buildCaretAwareComponents()}>
                {text + CARET_SENTINEL}
            </Markdown>
        </div>
    )
}

const PROSE_MARKDOWN_COMPONENTS = {
    p: ({ children }: { children?: React.ReactNode }) => (
        <p className="m-0">{children}</p>
    ),
    strong: ({ children }: { children?: React.ReactNode }) => (
        <strong className="font-semibold text-grey_0">{children}</strong>
    ),
    em: ({ children }: { children?: React.ReactNode }) => (
        <em className="italic text-grey_0">{children}</em>
    ),
    a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-default underline underline-offset-2 decoration-primary-default/30 hover:decoration-primary-default"
        >
            {children}
        </a>
    ),
    ul: ({ children }: { children?: React.ReactNode }) => (
        <ul className="list-disc marker:text-primary-default/60 pl-5 space-y-1">{children}</ul>
    ),
    ol: ({ children }: { children?: React.ReactNode }) => (
        <ol className="list-decimal marker:text-primary-default/70 pl-5 space-y-1">{children}</ol>
    ),
    li: ({ children }: { children?: React.ReactNode }) => <li className="pl-1">{children}</li>,
    code: ({ children }: { children?: React.ReactNode }) => (
        <code className="px-1 py-0.5 bg-grey_5 rounded text-[12px] font-mono">{children}</code>
    ),
    h1: ({ children }: { children?: React.ReactNode }) => (
        <div className="font-semibold text-grey_0 mt-2">{children}</div>
    ),
    h2: ({ children }: { children?: React.ReactNode }) => (
        <div className="font-semibold text-grey_0 mt-2">{children}</div>
    ),
    h3: ({ children }: { children?: React.ReactNode }) => (
        <div className="font-semibold text-grey_0 mt-2">{children}</div>
    )
}

// ── Options ───────────────────────────────────────────────────────────────

const OptionsBlock: React.FC<{ options: OptionBlock[]; density: 'standard' | 'compact' }> = ({
    options,
    density
}) => {
    return (
        <div className="flex flex-col gap-2">
            {options.map((opt, i) => (
                <OptionTile key={opt.index} option={opt} index={i} density={density} />
            ))}
        </div>
    )
}

const OptionTile: React.FC<{ option: OptionBlock; index: number; density: 'standard' | 'compact' }> = ({
    option,
    index,
    density
}) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: index * 0.04 }}
            className="group relative flex gap-3 rounded-2xl bg-white border border-grey_5/60 px-3.5 py-3 hover:border-primary-default/30 transition-colors"
        >
            <NumberBadge n={option.index} />
            <div className="flex flex-col gap-1 min-w-0 flex-1">
                <span
                    className={`font-semibold text-grey_0 font-manrope ${
                        density === 'compact' ? 'text-[13px] leading-5' : 'text-[14px] leading-[1.45]'
                    }`}
                >
                    {option.title}
                </span>
                {option.body && (
                    <div
                        className={`font-manrope text-grey_1 ${
                            density === 'compact' ? 'text-[12.5px] leading-5' : 'text-[13px] leading-[1.55]'
                        } [&>*+*]:mt-1`}
                    >
                        <Markdown components={PROSE_MARKDOWN_COMPONENTS}>{option.body}</Markdown>
                    </div>
                )}
            </div>
        </motion.div>
    )
}

const NumberBadge: React.FC<{ n: number }> = ({ n }) => (
    <span
        aria-hidden="true"
        className="shrink-0 mt-0.5 w-6 h-6 rounded-full bg-primary-default/10 text-primary-default flex items-center justify-center text-[11px] font-semibold font-manrope"
    >
        {n}
    </span>
)

// ── Recommendation ───────────────────────────────────────────────────────

const RecommendationBlock: React.FC<{
    label: string
    text: string
    density: 'standard' | 'compact'
}> = ({ label, text, density }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="flex gap-3 rounded-2xl bg-primary-default/[0.05] border border-primary-default/15 px-3.5 py-3"
        >
            <RecommendationGlyph />
            <div className="flex flex-col gap-1 min-w-0 flex-1">
                <span className="text-[11px] font-semibold tracking-wide uppercase text-primary-default font-manrope">
                    {label}
                </span>
                <div
                    className={`font-manrope text-grey_0 ${
                        density === 'compact' ? 'text-[13px] leading-5' : 'text-[14px] leading-[1.55]'
                    } [&>*+*]:mt-1`}
                >
                    <Markdown components={PROSE_MARKDOWN_COMPONENTS}>{text}</Markdown>
                </div>
            </div>
        </motion.div>
    )
}

const RecommendationGlyph: React.FC = () => (
    <span
        aria-hidden="true"
        className="shrink-0 mt-0.5 w-6 h-6 rounded-full bg-primary-default flex items-center justify-center text-white"
    >
        <svg viewBox="0 0 12 12" className="w-3 h-3" fill="currentColor">
            <path d="M6 1 L7.4 4.2 L10.8 4.6 L8.2 6.9 L9 10.3 L6 8.4 L3 10.3 L3.8 6.9 L1.2 4.6 L4.6 4.2 Z" />
        </svg>
    </span>
)

// ── Streaming caret ──────────────────────────────────────────────────────

const StreamingCaret: React.FC = () => (
    <motion.span
        aria-hidden="true"
        className="inline-block w-[2px] h-[14px] ml-0.5 mb-[-2px] align-middle bg-primary-default rounded-[1px]"
        animate={{ opacity: [1, 0.25, 1] }}
        transition={{ repeat: Infinity, duration: 0.9, ease: 'easeInOut' }}
    />
)
