import Typography from './shared/Typography'
import RimigoDateCalendar from './RimigoDateCalendar'
import MobileSearchExpandContent from './MobileSearchExpandContent'

const formatDate = (date: Date | null) =>
    date
        ? date.toLocaleDateString('default', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
          })
        : 'Select Date'

interface DatesCheckSectionStaysProps {
    checkIn: Date | null
    checkOut: Date | null
    onChange: (start: Date | null, end: Date | null) => void
}

const DatesCheckSectionStays: React.FC<DatesCheckSectionStaysProps> = ({ checkIn, checkOut, onChange }) => {
    // const [activeTab, setActiveTab] = useState<'range' | 'flexible'>('range')

    const selectingEnd = !!checkIn && !checkOut

    return (
        <MobileSearchExpandContent title="When are you going?">
            <div className="flex flex-col gap-4  pb-4">
                {/* Tabs */}
                {/* <MobileSearchTabs
                    tabs={[
                        { key: 'range', label: 'Range' },
                        { key: 'flexible', label: 'I’m flexible' }
                    ]}
                    activeTab={activeTab}
                    onChange={setActiveTab}
                /> */}

                <div className="flex flex-col gap-3 px-2.5">
                    {/* Date cards */}
                    <div className="flex gap-3">
                        {/* CHECK-IN */}
                        <div
                            className={`flex-1 flex flex-col p-3 rounded-[8px] border-[2px] ${
                                !checkIn || !selectingEnd ? 'border-primary-default' : 'border-grey-4 bg-grey-4'
                            }`}>
                            <Typography
                                size="12"
                                weight="bold"
                                color="grey-2">
                                CHECK-IN
                            </Typography>
                            <Typography
                                size="16"
                                weight="semibold">
                                {formatDate(checkIn)}
                            </Typography>
                        </div>

                        {/* CHECK-OUT */}
                        <div
                            className={`flex-1 p-3 rounded-[8px] border-[2px] flex flex-col ${selectingEnd ? 'border-primary-default' : 'border-grey-4 bg-grey-4'}`}>
                            <Typography
                                size="12"
                                weight="bold"
                                color="grey-2">
                                CHECK-OUT
                            </Typography>
                            <Typography
                                size="16"
                                weight="semibold">
                                {formatDate(checkOut)}
                            </Typography>
                        </div>
                    </div>

                    {/* Calendar */}
                    <RimigoDateCalendar
                        startDate={checkIn}
                        endDate={checkOut}
                        minDate={new Date()}
                        onChange={onChange}
                    />
                </div>
            </div>
        </MobileSearchExpandContent>
    )
}

export default DatesCheckSectionStays
