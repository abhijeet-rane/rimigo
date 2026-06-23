// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const preloadComponent = (importFn: () => Promise<any>) => {
    try {
        importFn()
    } catch (e) {
        // Silent fail for preloading
        console.error(e)
    }
}

export const preloadCriticalComponents = () => {
    // Preload critical floating components
    preloadComponent(() => import('../pages/Home/sections/Hero/FloatingImages/FloatingMsgType'))
    preloadComponent(() => import('../pages/Home/sections/Hero/FloatingImages/FloatingPlane'))
}
