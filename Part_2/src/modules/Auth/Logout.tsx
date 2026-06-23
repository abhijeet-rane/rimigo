import { useEffect } from 'react'
import { useAuth } from '@/lib/auth/providers/AuthProviders'
import { Navigate, useSearchParams } from 'react-router-dom'
import { LOGIN_ROUTE } from '@/routes/routes'

export default function Logout() {
    const { signOut } = useAuth()
    const [searchParams] = useSearchParams()
    const redirectTo = searchParams.get('redirectTo')

    useEffect(() => {
        signOut()
    }, [signOut])

    // Build the login URL with redirectTo parameter if available
    // Sanitize nested redirect: if redirectTo starts with "/login?redirectTo=", strip that prefix
    const rawRedirect = redirectTo ?? ''
    const sanitizedRedirect = rawRedirect.startsWith('/login?redirectTo=') ? rawRedirect.replace(/^\/login\?redirectTo=/, '') : rawRedirect
    const loginUrl = sanitizedRedirect ? `${LOGIN_ROUTE}?redirectTo=${encodeURIComponent(sanitizedRedirect)}` : LOGIN_ROUTE

    return (
        <Navigate
            to={loginUrl}
            replace
        />
    )
}
