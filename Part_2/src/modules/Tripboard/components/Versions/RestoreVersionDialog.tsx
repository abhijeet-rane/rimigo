import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Loader2 } from 'lucide-react'
import type { TripboardVersion } from '@/api/tripboardVersionsApi'
import {
    formatVersionTimestamp,
    buildVersionSubtitle,
    buildVersionTitle,
    isAutoVersion,
} from './versionUtils'

interface RestoreVersionDialogProps {
    isOpen: boolean
    version: TripboardVersion | null
    onConfirm: () => Promise<void>
    onClose: () => void
    isRestoring?: boolean
}

export default function RestoreVersionDialog({
    isOpen,
    version,
    onConfirm,
    onClose,
    isRestoring = false,
}: RestoreVersionDialogProps) {
    if (!version) return null

    const ts = formatVersionTimestamp(version.created_at)
    const subtitle = buildVersionSubtitle(version)
    const title = buildVersionTitle(version)
    const auto = isAutoVersion(version)

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={!isRestoring ? onClose : undefined}
                        className="fixed inset-0 bg-black/40 z-[200]"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96, y: 12 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 12 }}
                        transition={{ type: 'spring', damping: 24, stiffness: 280 }}
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[201] w-[calc(100vw-32px)] max-w-md bg-natural-white rounded-2xl shadow-2xl p-6"
                    >
                        <div className="flex items-start gap-3 mb-4">
                            <div className="shrink-0 w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
                                <AlertTriangle className="w-5 h-5 text-amber-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h2 className="text-[17px] font-semibold font-manrope text-grey-0">
                                    {auto ? 'Undo to this point?' : 'Restore this version?'}
                                </h2>
                                <p className="text-[13px] text-grey-1 mt-1 font-manrope">
                                    Your tripboard will be swapped to this state. We'll save a backup of what's
                                    currently on screen first, so you can always come back.
                                </p>
                            </div>
                        </div>

                        <div className="bg-grey-6 rounded-lg p-3 mt-4">
                            <p className="text-[14px] font-semibold font-manrope text-grey-0 line-clamp-2">
                                {title}
                            </p>
                            {subtitle && (
                                <p className="text-[12px] text-grey-1 mt-0.5 font-manrope">{subtitle}</p>
                            )}
                            <p className="text-[12px] text-grey-2 mt-1 font-manrope">
                                {ts.relative}
                                {version.author?.name ? ` · by ${version.author.name}` : ''}
                            </p>
                        </div>

                        <div className="flex items-center justify-end gap-2 mt-6">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isRestoring}
                                className="px-4 py-2 rounded-lg text-[14px] font-medium font-manrope text-grey-0 hover:bg-grey-5 transition-colors disabled:opacity-60"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={onConfirm}
                                disabled={isRestoring}
                                className="px-4 py-2 rounded-lg text-[14px] font-medium font-manrope text-natural-white bg-primary-default hover:bg-primary-default/90 transition-colors disabled:opacity-60 flex items-center gap-2"
                            >
                                {isRestoring && <Loader2 className="w-4 h-4 animate-spin" />}
                                {isRestoring
                                    ? auto
                                        ? 'Undoing…'
                                        : 'Restoring…'
                                    : auto
                                        ? 'Yes, undo to here'
                                        : 'Restore version'}
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
