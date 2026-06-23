const ExperienceDetailsReelsSection = ({
    reels
}: {
    reels: Array<{ id: string; url: string; description: string; created_at: string; updated_at: string; _cls: string }>
}) => {
    if (!reels) return null
    return (
        <div>
            <div className="grid grid-cols-2 gap-4">
                {/* {reels.map((reel) => (
                    
                ))} */}
            </div>
        </div>
    )
}

export default ExperienceDetailsReelsSection
