import Typography from './shared/Typography'
import clsx from 'clsx'

export type TabOption<T extends string> = {
    key: T
    label: string
}

interface MobileSearchTabsProps<T extends string> {
    tabs: TabOption<T>[]
    activeTab: T
    onChange: (tab: T) => void
}

const MobileSearchTabs = <T extends string>({ tabs, activeTab, onChange }: MobileSearchTabsProps<T>) => {
    return (
        <div className="flex w-full border-t border-b border-grey-4  overflow-hidden">
            {tabs.map((tab) => {
                const isActive = tab.key === activeTab

                return (
                    <button
                        key={tab.key}
                        onClick={() => onChange(tab.key)}
                        className={clsx(
                            'flex-1 flex-col  flex justify-center items-center  transition-colors',
                            isActive ? 'bg-primary-default-08 ' : ''
                        )}>
                        <Typography
                            size="14"
                            className="pt-4 pb-3.5"
                            weight="bold"
                            family="redhat"
                            color={isActive ? 'primary-default' : 'grey-0'}>
                            {tab.label}
                        </Typography>
                        <div className={clsx('h-0.5 w-full', isActive ? 'bg-primary-default' : 'bg-transparent')} />{' '}
                    </button>
                )
            })}
        </div>
    )
}

export default MobileSearchTabs
