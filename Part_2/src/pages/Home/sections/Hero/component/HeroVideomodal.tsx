import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface VideoModalProps {
  isOpen: boolean
  onClose: () => void
  videoUrl: string
  title?: string
  autoPlay?: boolean
  maxWidth?: 'md' | 'lg' | 'xl' | '2xl' | '6xl'
}

const widthMap = {
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '6xl': 'max-w-6xl',
}

const HeroVideoModal = ({
  isOpen,
  onClose,
  videoUrl,
  title = 'Video player',
  autoPlay = true,
  maxWidth = '6xl',
}: VideoModalProps) => {
  if (!isOpen) return null

  const src = autoPlay ? `${videoUrl}?autoplay=1` : videoUrl

  return (
    <div
      className="fixed inset-0 z-50 bg-natural-black-80-2 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 text-white hover:bg-natural-white-16 z-10"
        onClick={onClose}
      >
        <X size={24} />
      </Button>

      {/* Video container */}
      <div
        className={cn(
          'relative w-full aspect-video',
          widthMap[maxWidth]
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <iframe
          className="w-full h-full rounded-xl"
          src={src}
          title={title}
          allow="autoplay; encrypted-media"
          allowFullScreen
        />
      </div>
    </div>
  )
}

export default HeroVideoModal
