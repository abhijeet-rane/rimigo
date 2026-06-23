import { useEffect, useMemo, useRef, useState } from 'react'

type WPContentFrameProps = {
    html: string
    wordpressSiteBase?: string // e.g. https://blog.rimigo.com
    fontHrefs?: string[] // optional font CSS links to mirror WP
    bodyFontFamily?: string // e.g. 'Manrope, sans-serif'
    headingFontFamily?: string // e.g. 'Red Hat Display, sans-serif'
}

export default function WPContentFrame({
    html,
    wordpressSiteBase = 'https://blog.rimigo.com',
    fontHrefs,
    bodyFontFamily = `'Manrope', sans-serif`,
    headingFontFamily = `'Red Hat Display', sans-serif`
}: WPContentFrameProps) {
    const iframeRef = useRef<HTMLIFrameElement>(null)
    const [height, setHeight] = useState<number>(300)

    const srcDoc = useMemo(() => {
        const fonts =
            fontHrefs && fontHrefs.length ? fontHrefs : ['https://fonts.googleapis.com/css2?family=Manrope&family=Red+Hat+Display&display=swap']
        const fontLinks = fonts.map((href) => `<link rel=\"stylesheet\" href=\"${href}\" />`).join('')

        return `<!doctype html>
<html>
  <head>
    <meta charset=\"utf-8\" />
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
    <link rel=\"preconnect\" href=\"https://fonts.googleapis.com\" />
    <link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin />
    ${fontLinks}
    <link rel=\"stylesheet\" href=\"https://s.w.org/wp-includes/css/dist/block-library/style.min.css\" />
    <link rel=\"stylesheet\" href=\"https://s.w.org/wp-includes/css/dist/block-library/theme.min.css\" />
    <link rel=\"stylesheet\" href=\"${wordpressSiteBase}/wp-content/themes/oceanwp/style.css\" />
    <style>
      :root, html, body { margin: 0; padding: 0; background: transparent; }
      body, .entry-content { line-height: 1.8; font-family: ${bodyFontFamily}; }
      .entry-content h1, .entry-content h2, .entry-content h3,
      .entry-content h4, .entry-content h5, .entry-content h6 { font-family: ${headingFontFamily}; }
      img { max-width: 100%; height: auto; }
      table { width: 100%; border-collapse: collapse; }
    </style>
  </head>
  <body>
    <main class=\"entry-content\">${html}</main>
    <script>
      const resize = () => {
        const h = document.documentElement.scrollHeight || document.body.scrollHeight;
        parent.postMessage({ type: 'wp-iframe-height', height: h }, '*');
      };
      const patchLinks = () => {
        document.querySelectorAll('a').forEach(a => {
          a.setAttribute('target', '_blank');
          a.setAttribute('rel', 'noopener noreferrer');
        });
      };
      window.addEventListener('load', () => { patchLinks(); resize(); });
      new ResizeObserver(() => { patchLinks(); resize(); }).observe(document.body);
    </script>
  </body>
</html>`
    }, [html, wordpressSiteBase, fontHrefs, bodyFontFamily, headingFontFamily])

    useEffect(() => {
        const onMessage = (e: MessageEvent) => {
            if (e.data && e.data.type === 'wp-iframe-height' && typeof e.data.height === 'number') {
                setHeight(e.data.height)
            }
        }
        window.addEventListener('message', onMessage)
        return () => window.removeEventListener('message', onMessage)
    }, [])

    return (
        <iframe
            ref={iframeRef}
            title="WordPress Content"
            style={{ width: '100%', height, border: '0', display: 'block' }}
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            srcDoc={srcDoc}
        />
    )
}
