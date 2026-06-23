import AssisstantButton from '@/components/shared/AssisstantButton'

interface ExperienceDetailsHeaderProps {
    onToggleAssistant: () => void
    experienceName: string
}

const ExperienceDetailsHeader = ({ experienceName, onToggleAssistant }: ExperienceDetailsHeaderProps) => {
    return (
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
            <div className="text-sm text-gray-500 hidden sm:block">{experienceName}</div>
            {/* <div className="text-sm text-gray-500 sm:hidden">{experienceName}</div> */}
            <AssisstantButton onAssistantClick={onToggleAssistant} />
        </div>
    )
}

export default ExperienceDetailsHeader
