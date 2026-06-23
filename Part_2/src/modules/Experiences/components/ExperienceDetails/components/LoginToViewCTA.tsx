import { Lock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface LoginToViewCTAProps {
    experienceId: string
    countryId?: string
    countryName?: string
    type?: 'ai-analysis' | 'tours'
}

const LoginToViewCTA = ({ experienceId, countryId, countryName, type = 'ai-analysis' }: LoginToViewCTAProps) => {
    const navigate = useNavigate()

    const handleLoginClick = () => {
        // Build the authenticated experience URL with all parameters
        // Include the default personalization parameters used in public view
        const params = new URLSearchParams()

        // Add default personalization (matching public page defaults)
        params.append('groupType', 'couple')
        params.append('travelPurpose', 'leisure_relaxation')
        params.append('preferences', 'cultural')

        // Add month and year (current month)
        const now = new Date()
        params.append('month', (now.getMonth() + 1).toString())
        params.append('year', now.getFullYear().toString())

        // Add country info
        if (countryId) params.append('country_id', countryId)
        if (countryName) params.append('country_name', countryName)

        const authenticatedUrl = `/experiences/${experienceId}?${params.toString()}`

        // Redirect to login with returnUrl
        navigate(`/login?redirectTo=${encodeURIComponent(authenticatedUrl)}`)
    }

    const buttonText = type === 'ai-analysis' ? 'Unlock Personalised Review' : 'Find the best tours'

    return (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/20 backdrop-blur-[1px]">
            <button
                onClick={handleLoginClick}
                className="px-8 py-4 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 flex items-center gap-2">
                <Lock className="w-5 h-5" />
                {buttonText}
            </button>
        </div>
    )
}

export default LoginToViewCTA
