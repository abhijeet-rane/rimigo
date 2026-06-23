import { getPlatformLogoURL } from "@/constants/icons/platformIcons"

type ImageStackProps = {
    platforms?: string[]
    images?: string[]
    size?: number
    overlap?: number
}

const ImageStack = ({
    platforms = [],
    images = [],
    size = 64,
    overlap = 32,
}: ImageStackProps) => {
    // Resolve platform names → URLs
    const platformImages = platforms
        .map((platform) => getPlatformLogoURL(platform))
        .filter(Boolean) as string[]

    // Merge both sources
    const finalImages = [...platformImages, ...images]

    if (finalImages.length === 0) return null

    return (
        <div className="flex items-center">
            {finalImages.map((src, index) => (
                <img
                    key={`${src}-${index}`}
                    src={src}
                    alt="platform logo"
                    style={{
                        width: size,
                        height: size,
                        marginLeft: index === 0 ? 0 : -overlap,
                    }}
                    className="rounded-full border-white bg-white object-cover shadow-sm"
                />
            ))}
        </div>
    )
}

export default ImageStack
