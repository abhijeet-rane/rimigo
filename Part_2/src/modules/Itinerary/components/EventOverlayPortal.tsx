import { createPortal } from 'react-dom'

export const EventOverlayPortal = ({ children }: { children: React.ReactNode }) => {
    const el = document.getElementById('event-overlay-root')
    if (!el) return null
    return createPortal(children, el)
}
