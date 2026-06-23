import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export interface ParsedUrlResult {
    baseUrl: string
    path: string
    params: Record<string, string>
}

export const parseUrlParams = (url: string): ParsedUrlResult => {
    try {
        const parsedUrl = new URL(url)

        const path = parsedUrl.pathname

        const params: Record<string, string> = {}
        parsedUrl.searchParams.forEach((value, key) => {
            params[key] = value
        })

        return {
            baseUrl: `${parsedUrl.protocol}//${parsedUrl.host}`,
            path,
            params
        }
    } catch (error) {
        return {
            baseUrl: '',
            path: '',
            params: {}
        }
    }
}
