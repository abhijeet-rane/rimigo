import { Outlet } from 'react-router-dom'
import { Suspense } from 'react'
import { Loading } from '@/components/shared/Loading'
import { SideBarLayout } from '@/components/layouts/SideBarLayout'

export default function SideBarLayoutWrapper() {
    return (
        <Suspense fallback={<Loading />}>
            <SideBarLayout>
                <Outlet />
            </SideBarLayout>
        </Suspense>
    )
}
