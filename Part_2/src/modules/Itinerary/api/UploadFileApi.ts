import apiClient from '@/lib/api/apiClient'
import { API_CONFIG } from '@/lib/api/apiConfig'
import axios from 'axios'
import { toast } from 'sonner'

export interface UploadToGcpCallbacks {
    onUploadSuccess?: (objectAccessUrl: string) => void
    onUploadFailure?: (error: unknown) => void
    onUploadProgress?: (progress: number) => void
}

interface SignedUrlResponse {
    signed_url: string
    object_access_url: string
}

interface UploadResponse {
    object_access_url?: string
}

/**
 * Uploads a file to GCP using a signed URL
 * @param file - The file to upload
 * @param mode - The upload mode
 * @param callbacks - Optional callbacks for success, failure, and progress
 */
export async function UploadFileToStorage(file: File, mode: string, callbacks?: UploadToGcpCallbacks): Promise<void> {
    // Validate file type
    if (!file.type || file.type === '') {
        const error = new Error('File type is required')
        toast.error('Please select a valid file')
        callbacks?.onUploadFailure?.(error)
        return
    }

    try {
        // Generate unique file name (if needed in future; currently unused)

        // Request signed URL from backend
        const signedUrlRequestBody = {
            name: file.name,
            content_type: file.type,
            mode: mode
        }

        const signedUrlResponse = await apiClient.post<SignedUrlResponse>(`${API_CONFIG.BASE_URL}/curation/file-upload/`, signedUrlRequestBody)

        const signedUrl = signedUrlResponse.data.signed_url
        if (!signedUrl) {
            throw new Error('Signed URL not received from server')
        }

        // Upload file to GCP using signed URL
        // GCP signed URLs typically use PUT method
        let uploadResponse: { data: UploadResponse }

        // Try PUT first (standard for GCP signed URLs)
        uploadResponse = await axios.put<UploadResponse>(signedUrl, file, {
            headers: {
                'Content-Type': file.type
            }
        })
        const objectAccessUrl = uploadResponse.data.object_access_url || signedUrlResponse.data.object_access_url

        callbacks?.onUploadSuccess?.(objectAccessUrl)
    } catch (error) {
        toast.error('File not uploaded')

        if (callbacks?.onUploadFailure) {
            callbacks.onUploadFailure(error)
        } else {
            toast.error('Failed to upload file. Please try again.')
        }
        throw error
    }
}
