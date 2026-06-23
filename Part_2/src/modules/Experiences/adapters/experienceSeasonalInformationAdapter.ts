import { SeasonalInformationType } from '../types/experienceDetailTypes'

export const adaptExperienceSeasonalInformationToUI = (seasonalInformation: SeasonalInformationType): SeasonalInformationType => {
    if (!seasonalInformation) return {}
    return seasonalInformation
}
