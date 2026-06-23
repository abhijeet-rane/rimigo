import { useEffect, useState } from 'react'
import { TokenStorage } from '@/lib/api/tokenStorage'
import { toast } from 'sonner'
import { USER_TYPE_REGULAR, USER_TYPE_RIMIGO_INTERNAL, USER_TYPE_RIMIGO_PREMIUM, USER_TYPE_PRO } from '@/constants/userConfig'

export type UserInfo = {
    name: string
    phone?: string
    type?: string
    id?: string
}

export const useUserInfo = () => {
    const [user, setUser] = useState<UserInfo | null>(null)
    const isPremium = user?.type === USER_TYPE_RIMIGO_PREMIUM
    const isPro = user?.type === USER_TYPE_PRO
    const isRimigoInternal = user?.type === USER_TYPE_RIMIGO_INTERNAL
    const isRegular = user?.type === USER_TYPE_REGULAR

    useEffect(() => {
        const loadUserInfo = async () => {
            try {
                const info = await TokenStorage.getUserInfo()
                setUser({
                    id: info?.traveler_id,
                    name: info?.name || 'Traveler',
                    phone: info?.phone,
                    type: info?.type
                })
            } catch (err) {
                toast.error((err as Error).message || 'Failed to load user info')
            }
        }
        loadUserInfo()
    }, [])

    return { user, isPremium, isPro, isRimigoInternal, isRegular }
}
