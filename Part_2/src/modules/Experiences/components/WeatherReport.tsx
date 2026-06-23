import { Cloud, CloudRain, CloudSnow, Sun } from 'lucide-react'

interface MonthData {
    month: string
    temp: number
    rating: 'best' | 'good' | 'mixed' | 'poor'
    icon: 'sun' | 'cloud' | 'rain' | 'snow'
}

const weatherData: MonthData[] = [
    { month: 'Jan', temp: 30, rating: 'best', icon: 'sun' },
    { month: 'Feb', temp: 30, rating: 'best', icon: 'sun' },
    { month: 'Mar', temp: 31, rating: 'best', icon: 'sun' },
    { month: 'Apr', temp: 31, rating: 'good', icon: 'cloud' },
    { month: 'May', temp: 30, rating: 'mixed', icon: 'rain' },
    { month: 'Jun', temp: 30, rating: 'mixed', icon: 'rain' },
    { month: 'Jul', temp: 29, rating: 'poor', icon: 'rain' },
    { month: 'Aug', temp: 29, rating: 'poor', icon: 'rain' },
    { month: 'Sep', temp: 29, rating: 'poor', icon: 'rain' },
    { month: 'Oct', temp: 29, rating: 'poor', icon: 'rain' },
    { month: 'Nov', temp: 29, rating: 'mixed', icon: 'cloud' },
    { month: 'Dec', temp: 29, rating: 'best', icon: 'sun' }
]

const WeatherIcon = ({ type }: { type: string }) => {
    const iconClass = 'w-4 h-4 text-yellow-500'

    switch (type) {
        case 'sun':
            return <Sun className={iconClass} />
        case 'cloud':
            return <Cloud className={iconClass} />
        case 'rain':
            return <CloudRain className={iconClass} />
        case 'snow':
            return <CloudSnow className={iconClass} />
        default:
            return <Sun className={iconClass} />
    }
}

const getRatingColor = (rating: string) => {
    switch (rating) {
        case 'best':
            return 'bg-[#2d5f3f]'
        case 'good':
            return 'bg-[#6ba368]'
        case 'mixed':
            return 'bg-[#e8a95d]'
        case 'poor':
            return 'bg-[#d47272]'
        default:
            return 'bg-gray-400'
    }
}

const getBackgroundColor = (rating: string) => {
    switch (rating) {
        case 'best':
            return 'bg-gray-200'
        case 'good':
            return 'bg-orange-50'
        case 'mixed':
            return 'bg-orange-50'
        case 'poor':
            return 'bg-red-50'
        default:
            return 'bg-gray-100'
    }
}

export default function WeatherChart() {
    // const maxTemp = Math.max(...weatherData.map((d) => d.temp))
    const minTemp = Math.min(...weatherData.map((d) => d.temp))

    return (
        <div className="bg-white p-4 rounded-lg w-full max-w-[600px] mx-auto">
            <div className="mb-3">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-3 gap-3">
                    <div className="inline-block">
                        <select className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md border-none outline-none cursor-pointer text-sm font-medium">
                            <option>South Thailand</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-3 text-xs flex-wrap">
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-[#2d5f3f]"></div>
                            <span className="text-gray-600">Best</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-[#6ba368]"></div>
                            <span className="text-gray-600">Good</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-[#e8a95d]"></div>
                            <span className="text-gray-600">Mixed</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-[#d47272]"></div>
                            <span className="text-gray-600">Poor</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="relative">
                <div className="flex items-end justify-center gap-0.5 h-48">
                    {weatherData.map((data, index) => {
                        const baseHeight = 80
                        const heightVariation = (data.temp - minTemp) * 12
                        const barHeight = baseHeight + heightVariation

                        return (
                            <div
                                key={index}
                                className={`flex-1 flex flex-col items-center justify-end h-full ${getBackgroundColor(data.rating)} rounded-t-lg pt-2`}>
                                <div className="flex flex-col items-center mb-1.5">
                                    <WeatherIcon type={data.icon} />
                                    <div className="text-xs text-gray-700 mt-0.5 font-medium">{data.temp}°C</div>
                                </div>

                                <div
                                    className={`w-full ${getRatingColor(data.rating)} rounded-t-sm transition-all duration-300`}
                                    style={{ height: `${barHeight}px` }}></div>

                                <div className="text-xs font-semibold text-gray-800 mt-1.5 pb-0.5">{data.month}</div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
