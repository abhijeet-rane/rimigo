import { Job } from '@/constants/job'
import { cn } from '@/lib/utils'
import { ArrowUpRight, Clock, MapPin } from 'lucide-react'

interface JobCardProps {
    job: Job
    index: number
}

const JobCard = ({ job, index }: JobCardProps) => {
    // Calculate days ago
    const postedDate = new Date(job.postedDate)
    const today = new Date()
    const diffTime = Math.abs(today.getTime() - postedDate.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    // Add delay based on index for staggered animation
    const delayClass = index < 5 ? `delay-${index * 100}` : ''

    return (
        <div
            className={cn(
                'group bg-careers-card rounded-xl p-6 border border-border/30 hover:border-careers-accent/30 transition-all duration-300',
                'hover:shadow-lg hover:shadow-careers-accent/5 transform hover:-translate-y-1',
                'animate-scale-in',
                delayClass
            )}>
            <div className="flex justify-between items-start mb-4">
                <div>
                    <span className="text-xs font-medium text-careers-muted bg-careers-tag px-3 py-1 rounded-full inline-block mb-3">
                        {job.department}
                    </span>
                    <h3 className="text-xl font-semibold text-careers-dark group-hover:text-careers-accent transition-colors duration-300">
                        {job.title}
                    </h3>
                </div>
            </div>

            <div className="flex items-center text-careers-muted text-sm mb-4 space-x-4">
                <div className="flex items-center">
                    <MapPin
                        size={14}
                        className="mr-1"
                    />
                    <span>{job.location}</span>
                </div>
                <div className="flex items-center">
                    <Clock
                        size={14}
                        className="mr-1"
                    />
                    <span>{diffDays} days ago</span>
                </div>
            </div>

            <p className="text-careers-muted mb-6 line-clamp-3">{job.description}</p>

            <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-careers-dark">{job.type}</span>
                <a
                    href={`https://tally.so/r/3EMWY4`}
                    className="flex items-center text-careers-accent font-medium text-sm group-hover:underline">
                    Apply Now
                    <ArrowUpRight
                        size={16}
                        className="ml-1 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300"
                    />
                </a>
            </div>
        </div>
    )
}

export default JobCard
