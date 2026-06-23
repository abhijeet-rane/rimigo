import { useEffect, useRef, useState, useCallback } from 'react'

const STEPS = [
    'Fetching flights & stays',
    'Comparing prices',
    'Calculating activities',
    'Building your budget',
]

const STEP_DUR = 1400
const STEP_STAGGER = 180

const initStates = (): string[] => STEPS.map(() => 'idle')

interface BudgetLoaderProps {
    loading?: boolean
    onComplete?: () => void
    fromCity?: string
    toCity?: string
}

function Indicator({ state }: { state: string }) {
    return (
        <div style={styles.ind}>
            {state !== 'done' && (
                <div
                    style={{
                        ...styles.ring,
                        borderColor: state === 'active' ? '#CECBF6' : 'var(--color-grey-4, #e0e0e0)',
                    }}
                />
            )}
            {state === 'active' && <div className="bl-spinner" style={styles.spinner} />}
            {state === 'done' && (
                <div style={styles.check}>
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                        <path
                            d="M2 6l3 3 5-5"
                            stroke="white"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </div>
            )}
        </div>
    )
}

export const BudgetLoader: React.FC<BudgetLoaderProps> = ({
    loading = true,
    onComplete,
    fromCity,
    toCity,
}) => {
    const hasCities = !!(fromCity && toCity)
    const [stepStates, setStepStates] = useState(initStates)
    const [arrived, setArrived] = useState(false)
    const [finished, setFinished] = useState(false)

    const currentRef = useRef(0)
    const resolveRef = useRef(false)
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const rafRef = useRef<number | null>(null)
    const startTimeRef = useRef<number | null>(null)
    const trackRef = useRef<HTMLDivElement>(null)
    const planeRef = useRef<HTMLSpanElement>(null)

    const trackWidth = () => (trackRef.current?.offsetWidth ?? 300) - 32

    const activate = useCallback((i: number) => {
        setStepStates(
            STEPS.map((_, idx) => (idx < i ? 'done' : idx === i ? 'active' : 'idle'))
        )
        currentRef.current = i
    }, [])

    const runFinish = useCallback(() => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current)
        if (timerRef.current) clearTimeout(timerRef.current)

        STEPS.forEach((_, i) =>
            setTimeout(
                () =>
                    setStepStates((prev) =>
                        prev.map((s, idx) => (idx <= i ? 'done' : s))
                    ),
                i * STEP_STAGGER
            )
        )

        setTimeout(() => {
            if (planeRef.current) {
                planeRef.current.style.transition = 'left 0.7s cubic-bezier(0.4,0,0.2,1)'
                planeRef.current.style.left = `${trackWidth()}px`
            }
            setArrived(true)
        }, STEPS.length * STEP_STAGGER + 100)

        setTimeout(() => {
            setFinished(true)
            onComplete?.()
        }, STEPS.length * STEP_STAGGER + 700)
    }, [onComplete])

    const scheduleNextRef = useRef<(() => void) | null>(null)

    const scheduleNext = useCallback(() => {
        timerRef.current = setTimeout(() => {
            const cur = currentRef.current
            const isLast = cur === STEPS.length - 1

            if (resolveRef.current && isLast) {
                runFinish()
                return
            }

            const next = isLast ? 0 : cur + 1

            if (next === 0) {
                setStepStates(initStates())
                setTimeout(() => {
                    activate(0)
                    scheduleNextRef.current?.()
                }, 300)
            } else {
                activate(next)
                scheduleNextRef.current?.()
            }
        }, STEP_DUR)
    }, [activate, runFinish])

    scheduleNextRef.current = scheduleNext

    const oscillatePlane = useCallback(() => {
        if (!startTimeRef.current) startTimeRef.current = performance.now()
        const elapsed = (performance.now() - startTimeRef.current) / 1000
        const t = (Math.sin((elapsed * Math.PI) / 1.75) + 1) / 2
        const x = t * trackWidth()
        if (planeRef.current) {
            planeRef.current.style.left = `${x}px`
        }
        rafRef.current = requestAnimationFrame(oscillatePlane)
    }, [])

    useEffect(() => {
        activate(0)
        rafRef.current = requestAnimationFrame(oscillatePlane)
        scheduleNext()
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current)
            if (timerRef.current) clearTimeout(timerRef.current)
        }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!loading && !resolveRef.current) {
            resolveRef.current = true
            if (currentRef.current === STEPS.length - 1) {
                if (timerRef.current) clearTimeout(timerRef.current)
                setTimeout(runFinish, 400)
            }
        }
    }, [loading, runFinish])

    return (
        <div style={styles.wrap}>
            <div style={styles.inner}>
                {/* Track */}
                <div ref={trackRef} style={styles.track}>
                    <div style={styles.trackBg} />
                    <div className="bl-shimmer" style={styles.shimmer} />
                    <div style={styles.depDot} />
                    <div
                        style={{
                            ...styles.destDot,
                            background: arrived ? '#7011F6' : 'var(--color-grey-4, #e0e0e0)',
                        }}
                    />
                    {hasCities && (
                        <>
                            <span style={{ ...styles.cityLbl, left: 0, color: '#7011F6' }}>
                                {fromCity}
                            </span>
                            <span
                                style={{
                                    ...styles.cityLbl,
                                    right: 0,
                                    color: arrived ? '#7011F6' : 'var(--color-grey-3, #aeaeae)',
                                    transition: 'color 0.4s',
                                }}
                            >
                                {toCity}
                            </span>
                        </>
                    )}
                    <span
                        ref={planeRef}
                        className="bl-plane"
                        style={{
                            ...styles.plane,
                            left: 0,
                        }}
                    >
                        ✈️
                    </span>
                </div>

                <p className="font-red-hat-display" style={styles.title}>
                    Calculating your trip budget
                </p>
                <p className="font-manrope" style={styles.sub}>
                    {'Comparing prices across providers\nfor the best deals'}
                </p>

                {/* Steps */}
                <div style={styles.steps}>
                    {STEPS.map((label, i) => {
                        const state = stepStates[i]
                        const visible = state !== 'idle'
                        return (
                            <div
                                key={i}
                                style={{
                                    ...styles.step,
                                    opacity: visible ? 1 : 0,
                                    transform: visible ? 'translateY(0)' : 'translateY(5px)',
                                    transition: 'opacity 0.3s ease, transform 0.3s ease',
                                    borderBottom: 'none',
                                }}
                            >
                                <Indicator state={state} />
                                <span
                                    className="font-manrope"
                                    style={{
                                        ...styles.stepLabel,
                                        color:
                                            state === 'active'
                                                ? 'var(--color-grey-0, #101010)'
                                                : 'var(--color-grey-2, #747474)',
                                        fontWeight: state === 'active' ? 500 : 400,
                                    }}
                                >
                                    {label}
                                </span>
                            </div>
                        )
                    })}
                </div>

                <p
                    className="font-manrope"
                    style={{
                        ...styles.doneMsg,
                        opacity: finished ? 1 : 0,
                        transform: finished ? 'translateY(0)' : 'translateY(4px)',
                    }}
                >
                    Budget ready — loading results
                </p>
            </div>

            <style>{`
                @keyframes bl-bob     { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-9px)} }
                @keyframes bl-spin    { to{transform:rotate(360deg)} }
                @keyframes bl-shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
                .bl-plane   { animation: bl-bob     2.4s ease-in-out infinite; }
                .bl-spinner { animation: bl-spin    0.7s linear     infinite; }
                .bl-shimmer { animation: bl-shimmer 1.8s linear     infinite; }
            `}</style>
        </div>
    )
}

const styles: Record<string, React.CSSProperties> = {
    wrap: {
        minHeight: 460,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    inner: {
        width: 300,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
    },
    track: {
        width: '100%',
        position: 'relative',
        height: 64,
        marginBottom: 28,
    },
    trackBg: {
        position: 'absolute',
        bottom: 12,
        left: 0,
        right: 0,
        height: 1,
        background: 'var(--color-grey-4, #e0e0e0)',
    },
    shimmer: {
        position: 'absolute',
        bottom: 10,
        left: 0,
        right: 0,
        height: 5,
        borderRadius: 3,
        background:
            'linear-gradient(90deg, transparent 0%, #7011F6 40%, #AB72FB 60%, transparent 100%)',
        backgroundSize: '200% 100%',
        opacity: 0.55,
    },
    depDot: {
        position: 'absolute',
        bottom: 8,
        left: 0,
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: '#7011F6',
    },
    destDot: {
        position: 'absolute',
        bottom: 8,
        right: 0,
        width: 8,
        height: 8,
        borderRadius: '50%',
        transition: 'background 0.4s',
    },
    cityLbl: {
        position: 'absolute',
        bottom: -16,
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: '.05em',
    },
    plane: {
        position: 'absolute',
        bottom: 3,
        fontSize: 26,
        lineHeight: 1,
    },
    title: {
        fontSize: 16,
        fontWeight: 700,
        color: 'var(--color-grey-0, #101010)',
        margin: '0 0 5px',
        textAlign: 'center',
        letterSpacing: '-.01em',
    },
    sub: {
        fontSize: 12,
        color: 'var(--color-grey-3, #aeaeae)',
        margin: '0 0 26px',
        textAlign: 'center',
        lineHeight: 1.6,
        whiteSpace: 'pre-line',
    },
    steps: { width: '100%' },
    step: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '8px 0',
    },
    stepLabel: {
        flex: 1,
        fontSize: 13,
        transition: 'color 0.3s, font-weight 0.3s',
    },
    ind: {
        width: 20,
        height: 20,
        borderRadius: '50%',
        flexShrink: 0,
        position: 'relative',
    },
    ring: {
        position: 'absolute',
        inset: 0,
        borderRadius: '50%',
        border: '1.5px solid',
        transition: 'border-color 0.3s',
    },
    spinner: {
        position: 'absolute',
        inset: 0,
        borderRadius: '50%',
        border: '1.5px solid transparent',
        borderTopColor: '#7011F6',
    },
    check: {
        position: 'absolute',
        inset: 0,
        borderRadius: '50%',
        background: '#7011F6',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    doneMsg: {
        marginTop: 18,
        fontSize: 12,
        color: '#7011F6',
        fontWeight: 500,
        textAlign: 'center',
        transition: 'opacity 0.4s ease, transform 0.4s ease',
    },
}
