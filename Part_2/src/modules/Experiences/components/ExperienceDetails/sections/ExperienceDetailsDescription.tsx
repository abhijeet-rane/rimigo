const ExperienceDetailsDescription = ({ description }: { description: string }) => {
    if (!description) return null
    return (
        <div className="mb-6 mt-4">
            <p className="text-gray-700 leading-relaxed">{description}</p>
        </div>
    )
}

export default ExperienceDetailsDescription
