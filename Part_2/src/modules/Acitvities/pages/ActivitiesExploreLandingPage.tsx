import { useQueryParams } from '@/hooks/useQueryParams'
import { useActivitiesSearchLandingPage } from '../hooks/useActivitiesSearchLandingPage'
import ActivitesZeroStatePage from './ActivitesZeroStatePage'
import ActivitiesExplorePage from './ActivitiesExplorePage'
import { convertToLowerCase } from '../utils/textUtils'

const ActivitiesExploreLandingPage = () => {
    const { country_id, city_id } = useQueryParams()
    const { monthName } = useActivitiesSearchLandingPage()
    const currentMonthLowerCase = convertToLowerCase(monthName)

    if (country_id || city_id) {
        return (
            <ActivitiesExplorePage
                country_id={country_id ?? null}
                city_id={city_id ?? null}
                currentMonthLowerCase={currentMonthLowerCase}
            />
        )
    }

    return <ActivitesZeroStatePage />
}

export default ActivitiesExploreLandingPage
