// ModalPortal.tsx
import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'

export const ModalPortal = ({ children }: { children: React.ReactNode }) => {
    const [container, setContainer] = useState<HTMLElement | null>(null)

    useEffect(() => {
        let el = document.getElementById('modal-root')

        if (!el) {
            el = document.createElement('div')
            el.id = 'modal-root'
            document.body.appendChild(el)
        }

        setContainer(el)
    }, [])

    if (!container) return null

    return createPortal(children, container)
}
