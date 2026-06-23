import React from 'react'
import { Tile } from './Tile'
import { HERO_CARD_COPY } from '../Constants/heroCards'
import CustomShimmer from '@/components/shared/Shimmer'

interface ImageShowCase {
    destinations?: string[]
    itinerary?:string[]
    experiences?: string[]
    stays?: string[]
}

interface TilesGridProps {
    onTileClick: (route: string) => void
    isLoading: boolean
    heroCardImages?: ImageShowCase
    totalExperiences?: number
}

interface TileData {
    key: string
    title: string
    subtitle: string
    images: string[]
    route: string
    imageType: 'portrait' | 'landscape'
    showOverlay?: boolean
}

// interface TilesCarouselProps {
//     tiles: TileData[]
//     onTileClick: (route: string) => void
//     isLoading: boolean
// }

interface TilesGridDesktopProps {
    tiles: TileData[]
    onTileClick: (route: string) => void
    isLoading: boolean
}

// Mobile Carousel Component
// const TilesCarousel: React.FC<TilesCarouselProps> = ({ tiles, onTileClick, isLoading }) => {
//     const [activeIndex, setActiveIndex] = useState(0)
//     const scrollContainerRef = useRef<HTMLDivElement>(null)

//     // Track scroll position to update active dot
//     useEffect(() => {
//         const scrollContainer = scrollContainerRef.current
//         if (!scrollContainer || tiles.length === 0) return

//         const handleScroll = () => {
//             const scrollLeft = scrollContainer.scrollLeft
//             const containerWidth = scrollContainer.clientWidth
//             const currentIndex = Math.round(scrollLeft / containerWidth)
//             setActiveIndex(Math.min(currentIndex, tiles.length - 1))
//         }

//         scrollContainer.addEventListener('scroll', handleScroll)
//         handleScroll()

//         return () => {
//             scrollContainer.removeEventListener('scroll', handleScroll)
//         }
//     }, [tiles.length])

//     if (isLoading) {
//         return (
//             <>
//                 <div className="flex overflow-x-auto scrollbar-hide pb-4 snap-x snap-mandatory">
//                     {[1, 2, 3].map((i) => (
//                         <div
//                             key={i}
//                             className="flex-shrink-0 snap-start px-4 sm:px-6"
//                             style={{ width: '100%' }}
//                         >
//                             <CustomShimmer height={200} radius={16} />
//                         </div>
//                     ))}
//                 </div>
//                 <div className="flex justify-center gap-2 mt-4 px-4 sm:px-6">
//                     {[1, 2, 3].map((i) => (
//                         <div key={i} className="w-2 h-2 rounded-full bg-gray-300" />
//                     ))}
//                 </div>
//             </>
//         )
//     }

//     return (
//         <>
//             <div
//                 ref={scrollContainerRef}
//                 className="flex overflow-x-auto scrollbar-hide pb-4 snap-x snap-mandatory"
//                 style={{
//                     scrollSnapType: 'x mandatory',
//                     scrollSnapStop: 'always'
//                 }}
//             >
//                 {tiles.map((tile) => (
//                     <div
//                         key={tile.key}
//                         className="flex-shrink-0 snap-start px-4 sm:px-6"
//                         style={{
//                             width: '100%',
//                             height: '200px',
//                             scrollSnapStop: 'always'
//                         }}
//                     >
//                         <div className="w-full h-full">
//                             <Tile
//                                 title={tile.title}
//                                 subtitle={tile.subtitle}
//                                 images={tile.images}
//                                 imageType={tile.imageType}
//                                 onClick={() => onTileClick(tile.route)}
//                             />
//                         </div>
//                     </div>
//                 ))}
//             </div>

//             {/* Pagination Dots */}
//             <div className="flex items-center justify-center gap-2 mt-4 px-4 sm:px-6 pb-6">
//                 {tiles.map((_, index) => (
//                     <div
//                         key={index}
//                         className={`rounded-full transition-all flex-shrink-0 ${index === activeIndex
//                             ? 'w-2.5 h-2.5 sm:w-3 sm:h-3 bg-primary-default'
//                             : 'w-2 h-2 sm:w-2.5 sm:h-2.5 bg-primary-default opacity-30'
//                             }`}
//                     />
//                 ))}
//             </div>
//         </>
//     )
// }

// Desktop Grid Component
const TilesGridDesktop: React.FC<TilesGridDesktopProps> = ({ tiles, onTileClick, isLoading }) => {
    if (isLoading) {
        return (
            <div className="grid grid-cols-3  gap-6 px-8 pb-8">
                {[1, 2, 3].map((i) => (
                    <CustomShimmer key={i} height={176} radius={16} />
                ))}
            </div>
        )
    }

    return (
        <div className="flex flex-col md:grid md:grid-cols-3 gap-6 px-5 pb-8">
            {tiles.map((tile) => (
                <Tile
                    key={tile.key}
                    title={tile.title}
                    subtitle={tile.subtitle}
                    images={tile.images}
                    imageType={tile.imageType}
                    showOverlay={tile.showOverlay}
                    onClick={() => onTileClick(tile.route)}
                />
            ))}
        </div>
    )
}

// Main TilesGrid Component
export const TilesGrid: React.FC<TilesGridProps> = ({
    onTileClick,
    isLoading,
    heroCardImages = {},
    totalExperiences:  _totalExperiences
}) => {
    // Map API images to cards, fallback to static images from HERO_CARD_COPY
    const tilesToRender = HERO_CARD_COPY.map((tile) => {
        // Get images from API if available, otherwise use static images
        const apiImages = heroCardImages[tile.key as keyof ImageShowCase]
        const images = (apiImages && apiImages.length > 0) ? apiImages : tile.images

        // Update subtitle for experiences card with total count
        // let subtitle = tile.subtitle
        // if (tile.key === 'experiences' && totalExperiences !== undefined) {
        //     subtitle = `${totalExperiences} activities to choose from`
        // }

        return {
            ...tile,
            images,
            subtitle: tile.subtitle
        }
    })

    return (
        <>
            {/* Mobile Carousel - Only visible on small screens (< md) */}
            {/* <div className="md:hidden">
                <TilesCarousel 
                    tiles={tilesToRender}
                    onTileClick={onTileClick}
                    isLoading={isLoading}
                />
            </div> */}

            {/* Desktop Grid - Only visible on md and above */}
            <div className="block">
                <TilesGridDesktop
                    tiles={tilesToRender}
                    onTileClick={onTileClick}
                    isLoading={isLoading}
                />
            </div>
        </>
    )
}