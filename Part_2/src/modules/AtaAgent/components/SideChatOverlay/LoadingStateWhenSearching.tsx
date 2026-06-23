import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import ChatHeader from './ChatHeader'

interface LoadingStateWhenSearchingProps {
    searchQuery: string
    handleClose: () => void
    currentLoadingMessageIndex: number
    loadingMessages: string[]
    headerProps?: {
        logoSrc: string | null
        agentName: string | null
        featureName?: string | null
        onMinimize?: () => void
        onFeatureClick?: () => void
        onDragHandlePointerDown?: (event: React.PointerEvent) => void
    }
}

const LoadingStateWhenSearching: React.FC<LoadingStateWhenSearchingProps> = ({
    searchQuery,
    handleClose,
    currentLoadingMessageIndex,
    loadingMessages,
    headerProps
}) => {
    return (
        <div className="w-full h-full bg-white z-50">
            <div className="h-full flex flex-col">
                {headerProps ? (
                    <ChatHeader
                        logoSrc={headerProps.logoSrc}
                        agentName={headerProps.agentName}
                        featureName={headerProps.featureName}
                        onMinimize={headerProps.onMinimize ?? handleClose}
                        onFeatureClick={headerProps.onFeatureClick}
                        onDragHandlePointerDown={headerProps.onDragHandlePointerDown}
                        className="border-b border-grey_4 bg-white/95"
                    />
                ) : null}
                {/* Header with search query */}
                <div className="bg-white px-4 pt-6 pb-3">
                    <div className="flex items-start gap-3">
                        <div className="flex-1 bg-grey_5 px-4 py-3 rounded-lg">
                            <p className="text-xs font-medium text-grey_0 leading-5 line-clamp-2">"{searchQuery || 'Your search results'}"</p>
                        </div>
                        {!headerProps && (
                            <button
                                onClick={handleClose}
                                className="w-10 h-10 rounded-full bg-grey_4 flex items-center justify-center hover:bg-grey_3 transition-colors">
                                <X className="w-5 h-5 text-grey_0" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Loading animation */}
                <div className="flex-1 flex items-center justify-center px-8">
                    <div className="text-center max-w-sm">
                        <div className="w-32 h-32 mx-auto mb-8 relative">
                            {/* Compass animation */}
                            <div className="w-full h-full bg-primary-default rounded-full flex items-center justify-center animate-spin-slow">
                                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center">
                                    <div className="w-10 h-10 bg-primary-default rounded-full"></div>
                                </div>
                            </div>
                        </div>
                        <AnimatePresence mode="wait">
                            <motion.p
                                key={currentLoadingMessageIndex}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.6 }}
                                className="text-sm font-medium text-grey_0 px-4">
                                {loadingMessages[currentLoadingMessageIndex]}
                            </motion.p>
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default LoadingStateWhenSearching
