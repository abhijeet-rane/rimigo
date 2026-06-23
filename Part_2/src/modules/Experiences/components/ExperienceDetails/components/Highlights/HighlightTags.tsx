const HighlightTags = ({ tags }: { tags: string[] }) => {
    return (
        <div className="flex items-center gap-2">
            {tags.map((tag) => (
                <div
                    key={tag}
                    // first letter in uppercase
                    className="flex items-center gap-2 shrink-0 capitalize text-grey-0"
                    style={{
                        padding: '2px 8px',
                        borderRadius: 18,
                        border: '1px solid var(--grey-4, #E0E0E0)',
                        background: 'white',
                        fontFamily: 'Manrope',
                        fontSize: 14,
                        fontWeight: 600
                    }}>
                    {/* 📍 {''} */}
                    {tag}
                </div>
            ))}
        </div>
    )
}

export default HighlightTags
