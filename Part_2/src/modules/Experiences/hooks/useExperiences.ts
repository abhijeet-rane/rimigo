import { useState, useCallback } from 'react'
import { Experience } from '../../../pages/Experiences/components/ExperienceCard'

export const useExperiences = () => {
    const [likedExperiences, setLikedExperiences] = useState<Set<string>>(new Set())
    const [uploadedExperiences, setUploadedExperiences] = useState<Set<string>>(new Set())

    const handleLike = useCallback((id: string) => {
        setLikedExperiences((prev) => {
            const newSet = new Set(prev)
            if (newSet.has(id)) {
                newSet.delete(id)
            } else {
                newSet.add(id)
            }
            return newSet
        })
    }, [])

    const handleUpload = useCallback((id: string) => {
        setUploadedExperiences((prev) => {
            const newSet = new Set(prev)
            if (newSet.has(id)) {
                newSet.delete(id)
            } else {
                newSet.add(id)
            }
            return newSet
        })
    }, [])

    const updateExperienceWithState = useCallback(
        (experience: Experience): Experience => {
            return {
                ...experience,
                isLiked: likedExperiences.has(experience.id),
                isUploaded: uploadedExperiences.has(experience.id)
            }
        },
        [likedExperiences, uploadedExperiences]
    )

    return {
        handleLike,
        handleUpload,
        updateExperienceWithState
    }
}
