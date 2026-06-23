import { useEffect, useState } from 'react'

const PrivacyPolicy = () => {
    const [content, setContent] = useState<string>('')
    const [isLoading, setIsLoading] = useState<boolean>(true)
    const [error, setError] = useState<string>('')

    useEffect(() => {
        const fetchPrivacyPolicy = async () => {
            try {
                setIsLoading(true)
                setError('')
                const response = await fetch('/privacy-policy.md')
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`)
                }
                const text = await response.text()
                setContent(text)
            } catch (error) {
                console.error('Error loading privacy policy:', error)
                setError('Error loading privacy policy content. Please try again later.')
            } finally {
                setIsLoading(false)
            }
        }

        fetchPrivacyPolicy()
    }, [])

    const renderMarkdown = (markdown: string) => {
        // Enhanced markdown to HTML conversion for better formatting
        return (
            markdown
                // Headers
                .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mb-3 mt-8">$1</h3>')
                .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mb-4 mt-10">$1</h2>')
                .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mb-6">$1</h1>')

                // Bold and italic
                .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')

                // Lists - handle both * and - markers with proper nesting
                .replace(/^\* {3}\* {3}\* {3}(.*$)/gim, '<li class="ml-8">$1</li>')
                .replace(/^\* {3}\* {3}(.*$)/gim, '<li class="ml-6">$1</li>')
                .replace(/^\* {3}(.*$)/gim, '<li class="ml-4">$1</li>')
                .replace(/^\* (.*$)/gim, '<li class="ml-2">$1</li>')

                // Links (process first to avoid conflicts with email detection)
                .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary hover:underline">$1</a>')

                // Note: All email addresses should be formatted as markdown links in the source file

                // Handle special sections with better spacing
                .replace(/\*\*([^*]+)\*\*:/g, '<strong class="font-semibold text-gray-900">$1:</strong>')

                // Wrap lists in ul tags
                .replace(/(<li.*<\/li>)/gs, '<ul class="list-disc pl-6 space-y-2 mb-4">$1</ul>')

                // Paragraphs
                .replace(/\n\n/g, '</p><p class="mb-4">')
                .replace(/^\n?/, '<p class="mb-4">')
                .replace(/\n?$/, '</p>')

                // Clean up empty paragraphs and fix header wrapping
                .replace(/<p class="mb-4"><\/p>/g, '')
                .replace(/<p class="mb-4"><h/g, '<h')
                .replace(/<\/h[^>]*><\/p>/g, '</h>')

                // Fix list wrapping
                .replace(/<p class="mb-4"><ul/g, '<ul')
                .replace(/<\/ul><\/p>/g, '</ul>')
        )
    }

    if (isLoading) {
        return (
            <div className="min-h-screen pt-32 pb-20 md:pt-44 md:pb-32 px-6 md:px-10 max-w-7xl mx-auto">
                <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    <span className="ml-3 text-lg">Loading privacy policy...</span>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen pt-32 pb-20 md:pt-44 md:pb-32 px-6 md:px-10 max-w-7xl mx-auto">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">Privacy Policy</h1>
                    <p className="text-red-600 mb-4">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-primary-default text-white rounded hover:bg-primary/90">
                        Try Again
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen pt-32 pb-20 md:pt-44 md:pb-32 px-6 md:px-10 max-w-7xl mx-auto">
            <div
                className="prose prose-lg max-w-none text-gray-800 leading-relaxed"
                style={
                    {
                        '--tw-prose-body': '#374151',
                        '--tw-prose-headings': '#111827',
                        '--tw-prose-links': '#3b82f6',
                        '--tw-prose-bold': '#111827',
                        '--tw-prose-counters': '#6b7280',
                        '--tw-prose-bullets': '#d1d5db',
                        '--tw-prose-hr': '#e5e7eb',
                        '--tw-prose-quotes': '#111827',
                        '--tw-prose-quote-borders': '#e5e7eb',
                        '--tw-prose-captions': '#6b7280',
                        '--tw-prose-code': '#111827',
                        '--tw-prose-pre-code': '#e5e7eb',
                        '--tw-prose-pre-bg': '#1f2937',
                        '--tw-prose-th-borders': '#d1d5db',
                        '--tw-prose-td-borders': '#e5e7eb'
                    } as React.CSSProperties
                }
                dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
            />
        </div>
    )
}

export default PrivacyPolicy
