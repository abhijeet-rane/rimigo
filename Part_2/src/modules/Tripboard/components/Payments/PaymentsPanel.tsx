import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
    X,
    Loader2,
    CreditCard,
    ExternalLink,
    AlertCircle,
    Copy
} from 'lucide-react'
import { toast } from 'sonner'
import { useIsMobile } from '@/hooks/use-mobile'
import { useTripPaymentLinks } from '@/hooks/useTripPaymentLinks'
import { useTripCustomerPayments } from '@/hooks/useTripCustomerPayments'
import type {
    CustomerPayment,
    CustomerPaymentStatus
} from '@/api/paymentLinkAPI/customerPaymentsAPI'

interface PaymentsPanelProps {
    isOpen: boolean
    tripId: string
    onClose: () => void
}

const STATUS_STYLES: Record<CustomerPaymentStatus, string> = {
    Success: 'bg-emerald-50 text-emerald-700',
    Pending: 'bg-amber-50 text-amber-700',
    Failed: 'bg-rose-50 text-rose-700',
    Dropped: 'bg-grey-5 text-grey-2'
}

function formatAmount(amount: number, currency: string = 'INR') {
    try {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency,
            maximumFractionDigits: 2
        }).format(amount)
    } catch {
        return `${amount} ${currency}`
    }
}

function formatDate(value?: string | null) {
    if (!value) return '—'
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })
}

export default function PaymentsPanel({ isOpen, tripId, onClose }: PaymentsPanelProps) {
    const isMobile = useIsMobile()
    const { latestActiveLink } = useTripPaymentLinks(tripId, isOpen)
    const { data, isLoading, isError, refetch } = useTripCustomerPayments(tripId, isOpen)

    useEffect(() => {
        if (!isOpen) return
        const prev = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = prev
        }
    }, [isOpen])

    if (!isOpen) return null

    const payments = data?.results ?? []
    const totalCount = data?.count ?? 0
    const successPayments = payments.filter((p) => p.payment_status === 'Success')
    const pendingPayments = payments.filter((p) => p.payment_status === 'Pending')
    const totalPaid = successPayments.reduce((sum, p) => sum + (p.payment_amount || 0), 0)
    const currency = payments[0]?.payment_currency || 'INR'

    const subtitle =
        totalCount === 0
            ? 'No payments recorded'
            : `${totalCount} ${totalCount === 1 ? 'payment' : 'payments'} · ${formatAmount(totalPaid, currency)} received`

    const handleCopyPaymentLink = async () => {
        if (!latestActiveLink) return
        try {
            await navigator.clipboard.writeText(latestActiveLink.payment_url)
            toast.success('Payment link copied')
        } catch {
            toast.error('Failed to copy')
        }
    }

    const panel = (
        <AnimatePresence>
            <motion.div
                key="overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 bg-black/40 z-[150]"
            />
            <motion.aside
                key="panel"
                initial={isMobile ? { y: '100%' } : { x: '100%' }}
                animate={isMobile ? { y: 0 } : { x: 0 }}
                exit={isMobile ? { y: '100%' } : { x: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                drag={isMobile ? 'y' : false}
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0, bottom: 0.4 }}
                onDragEnd={(_, info) => {
                    if (isMobile && (info.offset.y > 120 || info.velocity.y > 500)) {
                        onClose()
                    }
                }}
                className={
                    isMobile
                        ? 'fixed left-0 right-0 bottom-0 z-[151] max-h-[90vh] h-[85vh] bg-natural-white shadow-2xl flex flex-col rounded-t-2xl'
                        : 'fixed top-0 right-0 bottom-0 z-[151] w-full sm:w-[420px] bg-natural-white shadow-2xl flex flex-col'
                }
            >
                {isMobile && (
                    <div className="pt-2 pb-1 flex justify-center shrink-0">
                        <div className="w-10 h-1 rounded-full bg-grey-4" aria-hidden />
                    </div>
                )}

                {/* Header — mirrors VersionsPanel: icon tile + title + subtitle + close */}
                <div className="px-5 py-4 border-b border-feature-card-border flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-primary-default/10 flex items-center justify-center shrink-0">
                            <CreditCard className="w-4 h-4 text-primary-default" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-[16px] font-semibold font-manrope text-grey-0 truncate">
                                Payments
                            </h2>
                            <p className="text-[12px] text-grey-1 font-manrope">
                                {subtitle}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-full hover:bg-grey-5 transition-colors"
                        aria-label="Close"
                    >
                        <X className="w-4 h-4 text-grey-1" />
                    </button>
                </div>

                {/* Latest payment link card — matches the "latest version" card from VersionsPanel */}
                {latestActiveLink && (
                    <div className="px-5 py-3 border-b border-feature-card-border">
                        <div className="rounded-xl border border-primary-default/30 bg-natural-white overflow-hidden shadow-[0_2px_12px_rgba(99,72,255,0.08)]">
                            <div className="h-1 bg-gradient-to-r from-primary-default via-violet-500 to-indigo-400" />
                            <div className="px-3.5 py-2.5 flex items-center gap-2 border-b border-feature-card-border/60 bg-primary-default/[0.04]">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-primary-default bg-primary-default/10 px-2 py-0.5 rounded-full font-manrope">
                                    Latest link
                                </span>
                                <span className="ml-auto text-[12px] text-grey-1 font-manrope tabular-nums">
                                    {formatAmount(latestActiveLink.amount, latestActiveLink.currency)}
                                </span>
                            </div>
                            <div className="px-3.5 py-3 flex items-center gap-2">
                                <a
                                    href={latestActiveLink.payment_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-[13px] font-semibold font-manrope text-natural-white bg-primary-default hover:bg-primary-default/90 transition-colors"
                                >
                                    Pay Now
                                    <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                                <button
                                    type="button"
                                    onClick={handleCopyPaymentLink}
                                    className="flex items-center gap-1.5 px-2.5 py-2 text-[12px] font-medium font-manrope text-grey-0 hover:bg-grey-5 rounded-md transition-colors"
                                    aria-label="Copy payment link"
                                    title="Copy payment link"
                                >
                                    <Copy className="w-3.5 h-3.5" />
                                    Copy
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Summary chips — same chip styling as the curated-counts chips in VersionsPanel */}
                {payments.length > 0 && (
                    <div className="px-5 py-3 border-b border-feature-card-border flex gap-1.5 flex-wrap">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-medium font-manrope tabular-nums">
                            {successPayments.length} success
                        </span>
                        {pendingPayments.length > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-50 text-amber-700 text-[11px] font-medium font-manrope tabular-nums">
                                {pendingPayments.length} pending
                            </span>
                        )}
                    </div>
                )}

                {/* List */}
                <div className="flex-1 overflow-y-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="w-5 h-5 animate-spin text-grey-1" />
                        </div>
                    ) : isError ? (
                        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                            <AlertCircle className="w-10 h-10 text-rose-400 mb-3" />
                            <p className="text-[14px] text-grey-0 font-manrope">Couldn't load payments</p>
                            <button
                                onClick={() => refetch()}
                                className="mt-3 text-[13px] text-primary-default font-medium font-manrope hover:underline"
                            >
                                Try again
                            </button>
                        </div>
                    ) : payments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                            <CreditCard className="w-10 h-10 text-grey-3 mb-3" />
                            <p className="text-[14px] font-semibold text-grey-0 font-manrope">No payments yet</p>
                            <p className="text-[13px] text-grey-1 mt-1 font-manrope max-w-[260px]">
                                Payments recorded for this trip will appear here.
                            </p>
                        </div>
                    ) : (
                        <ul className="px-3 py-3 flex flex-col gap-2">
                            {payments.map((p) => (
                                <PaymentCard key={p.id} payment={p} />
                            ))}
                        </ul>
                    )}
                </div>
            </motion.aside>
        </AnimatePresence>
    )

    return createPortal(panel, document.body)
}

/**
 * One customer payment, styled to match the manual-version card from
 * VersionsPanel: rounded-xl card with a header strip (timestamp + status
 * pill) and a body with provider, method, and payment ID.
 */
function PaymentCard({ payment }: { payment: CustomerPayment }) {
    const statusClass = STATUS_STYLES[payment.payment_status] ?? 'bg-grey-5 text-grey-2'
    const when = formatDate(payment.payment_date || payment.created_at)
    const currency = payment.payment_currency || 'INR'

    return (
        <li>
            <div className="rounded-xl border border-feature-card-border bg-natural-white overflow-hidden hover:border-primary-default/30 transition-colors">
                {/* Header strip — time + status, like the VersionCard header */}
                <div className="px-3.5 py-2.5 flex items-center gap-2 border-b border-feature-card-border/60 bg-grey-6/20">
                    <span
                        className="text-[12px] font-medium font-manrope text-grey-1 tabular-nums truncate"
                        title={when}
                    >
                        {when}
                    </span>
                    <span
                        className={`ml-auto text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full font-manrope ${statusClass}`}
                    >
                        {payment.payment_status}
                    </span>
                </div>

                {/* Body — amount headline, provider · method, optional traveler & id */}
                <div className="px-3.5 py-3 space-y-1.5">
                    <h3 className="text-[14px] font-semibold font-manrope text-grey-0 tabular-nums">
                        {formatAmount(payment.payment_amount, currency)}
                    </h3>
                    <p className="text-[12px] text-grey-1 font-manrope">
                        {payment.payment_via_provider}
                        <span className="text-grey-3"> · </span>
                        {payment.payment_method}
                    </p>
                    {(payment.traveler?.full_name || payment.traveler?.name) && (
                        <p className="text-[12px] text-grey-1 font-manrope truncate">
                            {payment.traveler?.full_name || payment.traveler?.name}
                        </p>
                    )}
                    {payment.payment_id && (
                        <p className="text-[11px] text-grey-2 font-manrope tabular-nums truncate">
                            ID: {payment.payment_id}
                        </p>
                    )}
                </div>
            </div>
        </li>
    )
}
