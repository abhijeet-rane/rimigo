import { ERROR_MESSAGES } from '@/constants/toastMessages/errorMessageConstants'
import apiClient from '@/lib/api/apiClient'

/**
 * Types for Trip Invite API
 */

export type RelationshipType = 'friend' | 'family' | 'partner' | 'spouse' | 'colleague' | 'child' | 'other'

export type GenerateInviteRequest = {
    relationship?: RelationshipType
    expires_in_days?: number // 1-365
}

export type GenerateInviteResponse = {
    status: 'success'
    data: {
        invite_token: string
        invite_url: string
        status: 'pending' | 'active' | 'accepted' | 'expired' | 'cancelled'
        expires_at?: string | null
    }
}

export type AcceptInviteRequest = {
    relationship?: RelationshipType
}

export type AcceptInviteResponse = {
    status: 'success'
    data: {
        message: string
        trip_id: string
        trip_sequence_id: string
        active_trip_set: boolean
        has_trip_access: boolean
    }
}

export type InviteDetailsResponse = {
    status: 'success'
    data: {
        trip_name: string
        trip_sequence_id: string
        invited_by_name: string
        status: 'pending' | 'active' | 'accepted' | 'expired' | 'cancelled'
        expires_at: string | null
        requires_login: boolean
    }
}

export type InviteItem = {
    invite_token: string
    invite_url: string
    status: 'pending' | 'active' | 'accepted' | 'expired' | 'cancelled'
    created_at: string
    expires_at: string | null
    accepted_by: {
        id: string
        name: string
        email: string
    } | null
    accepted_at: string | null
    relationship: RelationshipType
}

export type ListInvitesResponse = {
    status: 'success'
    data: {
        invites: InviteItem[]
    }
}

export type CancelInviteResponse = {
    status: 'success'
    data: {
        message: string
    }
}

export type LeaveTripResponse = {
    status: 'success'
    data: {
        message: string
        trip_id: string
        active_trip_cleared: boolean
    }
}

/**
 * Generate an invite link for a trip
 */
export const generateInvite = async (tripId: string, options: GenerateInviteRequest = {}): Promise<GenerateInviteResponse['data']> => {
    try {
        const response = await apiClient.post<GenerateInviteResponse>(`/api/trips/${tripId}/invite/generate/`, options)
        return response.data.data
    } catch (error: any) {
        const errorMessage = error.response?.data?.error?.message || error.message || ERROR_MESSAGES.SOMETHING_WENT_WRONG
        throw new Error(errorMessage)
    }
}

/**
 * Accept an invitation using an invite token
 */
export const acceptInvite = async (inviteToken: string, options: AcceptInviteRequest = {}): Promise<AcceptInviteResponse['data']> => {
    try {
        const response = await apiClient.post<AcceptInviteResponse>(`/api/trips/invite/${inviteToken}/accept/`, options)
        return response.data.data
    } catch (error: any) {
        const errorMessage = error.response?.data?.error?.message || error.message || ERROR_MESSAGES.SOMETHING_WENT_WRONG
        throw new Error(errorMessage)
    }
}

/**
 * Get invite details (public endpoint, no auth required)
 */
export const getInviteDetails = async (inviteToken: string): Promise<InviteDetailsResponse['data']> => {
    try {
        const response = await apiClient.get<InviteDetailsResponse>(`/api/trips/invite/${inviteToken}/`)
        return response.data.data
    } catch (error: any) {
        const errorMessage = error.response?.data?.error?.message || error.message || 'Invite not found'
        throw new Error(errorMessage)
    }
}

/**
 * List all invites for a trip (trip owner only)
 */
export const listInvites = async (tripId: string): Promise<InviteItem[]> => {
    try {
        const response = await apiClient.get<ListInvitesResponse>(`/api/trips/${tripId}/invites/`)
        return response.data.data.invites
    } catch (error: any) {
        const errorMessage = error.response?.data?.error?.message || error.message || ERROR_MESSAGES.SOMETHING_WENT_WRONG
        throw new Error(errorMessage)
    }
}

/**
 * Cancel/revoke an invite
 */
export const cancelInvite = async (inviteToken: string): Promise<CancelInviteResponse['data']> => {
    try {
        const response = await apiClient.post<CancelInviteResponse>(`/api/trips/invite/${inviteToken}/cancel/`, {})
        return response.data.data
    } catch (error: any) {
        const errorMessage = error.response?.data?.error?.message || error.message || ERROR_MESSAGES.SOMETHING_WENT_WRONG
        throw new Error(errorMessage)
    }
}

/**
 * Leave a trip the caller previously joined via invite.
 */
export const leaveTrip = async (tripId: string): Promise<LeaveTripResponse['data']> => {
    try {
        const response = await apiClient.post<LeaveTripResponse>(`/api/trips/${tripId}/leave/`, {})
        return response.data.data
    } catch (error: any) {
        const errorMessage = error.response?.data?.error?.message || error.message || ERROR_MESSAGES.SOMETHING_WENT_WRONG
        throw new Error(errorMessage)
    }
}
