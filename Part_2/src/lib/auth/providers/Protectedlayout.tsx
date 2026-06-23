import { TokenStorage } from '@/lib/api/tokenStorage'
import { isDevMode } from '@/lib/config/config'
import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
    const [isTokenValid, setIsTokenValid] = useState<boolean | null>(null)

    // get current location
    const location = useLocation()

    // Check TokenStorage authentication
    useEffect(() => {
        const checkTokenAuth = async () => {
            try {
                const isLoggedIn = await TokenStorage.isLoggedIn()
                setIsTokenValid(isLoggedIn)

                if (!isLoggedIn) {
                    TokenStorage.clear()
                }
            } catch (error) {
                if (isDevMode) {
                    console.error('Error checking token storage auth:', error)
                }
                setIsTokenValid(false)
                TokenStorage.clear()
            }
        }

        checkTokenAuth()
    }, [])

    if (isTokenValid === null) {
        return <div>Loading...</div> // Or your loading component
    }
    // Redirect if either Firebase auth or token storage auth fails
    if (isTokenValid === false) {
        return (
            <Navigate
                to={`/login?redirectTo=${encodeURIComponent(location.pathname + location.search)}`}
                replace
            />
        )
    }

    return <>{children}</>
}
