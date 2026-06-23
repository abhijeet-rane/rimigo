import type { PdfData } from './types'

function defaultFilename(data: PdfData): string {
    const name = data.trip.name?.trim() || 'Trip'
    const date = new Date().toISOString().slice(0, 10)
    // Strip characters Windows/macOS reject in filenames.
    const safeName = name.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim()
    return `Rimigo - ${safeName} - ${date}.pdf`
}

export async function downloadItineraryPdf(
    data: PdfData,
    filename?: string,
): Promise<void> {
    // react-pdf is ~200 KB gzipped — dynamic-import so the tripboard
    // bundle only pays the cost when the user clicks Download.
    const [{ pdf }, { ItineraryPDF }, { saveAs }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('./ItineraryPDF'),
        import('file-saver'),
    ])

    const blob = await pdf(<ItineraryPDF data={data} />).toBlob()
    saveAs(blob, filename || defaultFilename(data))
}
