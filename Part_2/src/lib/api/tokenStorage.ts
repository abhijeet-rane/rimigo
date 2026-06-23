// utils/tokenStorage.ts

const ACCESS_TOKEN_KEY = 'accessToken'
const REFRESH_TOKEN_KEY = 'refreshToken'
const USER_INFO_KEY = 'userInfo'

export const TokenStorage = {
    async getAccessToken() {
        return localStorage.getItem(ACCESS_TOKEN_KEY)
    },
    async setAccessToken(token: string) {
        localStorage.setItem(ACCESS_TOKEN_KEY, token)
    },
    async removeAccessToken() {
        localStorage.removeItem(ACCESS_TOKEN_KEY)
    },

    async getRefreshToken() {
        return localStorage.getItem(REFRESH_TOKEN_KEY)
    },
    async setRefreshToken(token: string) {
        localStorage.setItem(REFRESH_TOKEN_KEY, token)
    },
    async removeRefreshToken() {
        localStorage.removeItem(REFRESH_TOKEN_KEY)
    },

    async getUserInfo(): Promise<any | null> {
        const json = localStorage.getItem(USER_INFO_KEY)
        return json ? JSON.parse(json) : null
    },
    async setUserInfo(info: any) {
        localStorage.setItem(USER_INFO_KEY, JSON.stringify(info))
    },
    async removeUserInfo() {
        localStorage.removeItem(USER_INFO_KEY)
    },

    async isLoggedIn(): Promise<boolean> {
        const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY)
        const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
        return !!accessToken && !!refreshToken && accessToken !== 'undefined' && refreshToken !== 'undefined'
    },

    // Synchronous variants — the `async` methods above only wrap synchronous
    // localStorage reads, so awaiting them costs an extra render tick where auth
    // is "unknown" (the flash of a "Loading…" gate). These let route wrappers
    // resolve auth on the FIRST render instead. SSR-safe: returns the logged-out
    // default when there is no `localStorage` (server). The client uses
    // `createRoot` (not hydration), so reading here on first client render does
    // not risk a hydration mismatch.
    isLoggedInSync(): boolean {
        if (typeof localStorage === 'undefined') return false
        const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY)
        const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
        return !!accessToken && !!refreshToken && accessToken !== 'undefined' && refreshToken !== 'undefined'
    },
    getUserInfoSync(): { traveler_id?: string; type?: string; [key: string]: unknown } | null {
        if (typeof localStorage === 'undefined') return null
        const json = localStorage.getItem(USER_INFO_KEY)
        if (!json) return null
        try {
            return JSON.parse(json)
        } catch {
            return null
        }
    },

    async clear() {
        localStorage.removeItem(ACCESS_TOKEN_KEY)
        localStorage.removeItem(REFRESH_TOKEN_KEY)
        localStorage.removeItem(USER_INFO_KEY)
    }
}
