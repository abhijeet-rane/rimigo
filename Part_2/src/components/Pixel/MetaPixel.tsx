import { useEffect } from 'react'

type FBQFunction = (event: string, ...args: unknown[]) => void

interface FBQ extends FBQFunction {
    callMethod?: (...args: unknown[]) => void
    queue: unknown[]
    loaded: boolean
    version: string
    push: FBQ
}

declare global {
    interface Window {
        fbq: FBQ
        _fbq: FBQ
    }
}

const MetaPixel = () => {
    useEffect(() => {
        const initPixel = (f: Window, b: Document, e: string, v: string, n: FBQ, t: HTMLScriptElement | undefined, s: Element | undefined) => {
            if (document.querySelector('script[src*="fbevents.js"]')) return

            const fbqFunction: FBQ = function (event: string, ...args: unknown[]) {
                if (n.callMethod) {
                    n.callMethod.apply(n, [event, ...args])
                } else {
                    n.queue.push([event, ...args])
                }
            } as FBQ

            n = f.fbq = fbqFunction
            if (!f._fbq) f._fbq = n
            n.push = n
            n.loaded = true
            n.version = '2.0'
            n.queue = []

            t = b.createElement(e) as HTMLScriptElement
            t.async = true
            t.src = v
            s = b.getElementsByTagName(e)[0]
            s?.parentNode?.insertBefore(t, s)
        }

        initPixel(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js', {} as FBQ, undefined, undefined)

        window.fbq('init', '700473719541868') // Insert your Pixel ID here
        window.fbq('track', 'PageView')
    }, [])

    return null
}

export default MetaPixel
