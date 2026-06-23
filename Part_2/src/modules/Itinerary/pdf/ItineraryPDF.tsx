import { Document } from '@react-pdf/renderer'

import type { PdfData } from './types'

import { CoverPage } from './components/CoverPage'
import { DayPage } from './components/DayPage'
import { MustHaveAppendix } from './components/MustHaveAppendix'
import { TripOverviewPage } from './components/TripOverviewPage'
import { VouchersAppendix } from './components/VouchersAppendix'

export function ItineraryPDF({ data }: { data: PdfData }) {
    const { trip, days, stays, vouchers, mustHave, deals, origin, mapboxToken } = data
    return (
        <Document
            title={trip.name ? `${trip.name} — Rimigo Itinerary` : 'Rimigo Itinerary'}
            author="Rimigo"
            creator="Rimigo"
            producer="Rimigo"
        >
            <CoverPage trip={trip} stays={stays} days={days} origin={origin} />

            <TripOverviewPage
                trip={trip}
                days={days}
                stays={stays}
                mapboxToken={mapboxToken}
            />

            {days.map((day, i) => (
                <DayPage
                    key={day.date || i}
                    day={day}
                    dayIndex={i}
                    totalDays={days.length}
                    stays={stays}
                    trip={trip}
                    origin={origin}
                    deals={deals}
                />
            ))}

            {mustHave && <MustHaveAppendix data={mustHave} />}

            {vouchers && vouchers.length > 0 && (
                <VouchersAppendix vouchers={vouchers} />
            )}
        </Document>
    )
}
