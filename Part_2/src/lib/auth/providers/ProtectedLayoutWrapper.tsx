import ProtectedLayout from '@/lib/auth/providers/Protectedlayout'
import { Outlet } from 'react-router-dom'

export default function ProtectedLayoutWrapper() {
    return (
        <ProtectedLayout>
            <Outlet />
        </ProtectedLayout>
    )
}
