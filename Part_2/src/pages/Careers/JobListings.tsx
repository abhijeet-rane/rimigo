import { jobs } from '@/constants/job'
import { Briefcase } from 'lucide-react'
import { useEffect, useState } from 'react'
import JobCard from './JobCard'

const JobListings = () => {
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedDepartment, setSelectedDepartment] = useState('All Departments')
    const [selectedLocation, setSelectedLocation] = useState('All Locations')
    const [selectedType, setSelectedType] = useState('All Types')
    const [filteredJobs, setFilteredJobs] = useState(jobs)

    useEffect(() => {
        let results = jobs

        // Apply search term filter
        if (searchTerm) {
            results = results.filter(
                (job) =>
                    job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    job.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    job.department.toLowerCase().includes(searchTerm.toLowerCase())
            )
        }

        // Apply department filter
        if (selectedDepartment !== 'All Departments') {
            results = results.filter((job) => job.department === selectedDepartment)
        }

        // Apply location filter
        if (selectedLocation !== 'All Locations') {
            results = results.filter((job) => job.location === selectedLocation)
        }

        // Apply job type filter
        if (selectedType !== 'All Types') {
            results = results.filter((job) => job.type === selectedType)
        }

        setFilteredJobs(results)
    }, [searchTerm, selectedDepartment, selectedLocation, selectedType])

    const resetFilters = () => {
        setSearchTerm('')
        setSelectedDepartment('All Departments')
        setSelectedLocation('All Locations')
        setSelectedType('All Types')
    }

    return (
        <section
            id="open-positions"
            className="py-16 md:py-24 px-6 md:px-10 bg-careers-light">
            <div className="max-w-7xl mx-auto">
                <div className="mb-12 md:mb-16">
                    <h2 className="text-3xl md:text-4xl font-semibold text-careers-dark mb-4  animate-fade-in">Open Positions</h2>
                    <p className="text-careers-muted max-w-3xl  animate-fade-in delay-100">
                        Find your perfect role on our team. We're always looking for talented people to join us in our mission.
                    </p>
                </div>

                {/* Job Results */}
                <div className="mt-8">
                    {filteredJobs.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredJobs.map((job, index) => (
                                <JobCard
                                    key={job.id}
                                    job={job}
                                    index={index}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-16  animate-fade-in">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-careers-tag mb-4">
                                <Briefcase
                                    size={24}
                                    className="text-careers-accent"
                                />
                            </div>
                            <h3 className="text-xl font-semibold text-careers-dark mb-2">No matching positions</h3>
                            <p className="text-careers-muted mb-6">We couldn't find any positions matching your search criteria.</p>
                            <button
                                onClick={resetFilters}
                                className="px-6 py-3 rounded-full bg-careers-accent text-white font-medium hover:bg-careers-hover transition-colors duration-300">
                                Clear Filters
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </section>
    )
}

export default JobListings
