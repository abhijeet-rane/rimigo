import { Copy, Mail } from 'lucide-react'
import { toast } from 'sonner'

const ApplicationCTA = () => {
    return (
        <section
            id="life-at-Rimigo"
            className="py-20 md:py-32 px-6 md:px-10 bg-white">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center md:space-x-12 lg:space-x-24">
                    <div className="md:w-1/2 mb-10 md:mb-0  animate-fade-in">
                        <span className="inline-block px-4 py-1 rounded-full bg-careers-tag text-careers-accent text-sm font-medium mb-6">
                            Our Values
                        </span>
                        <h2 className="text-3xl md:text-4xl font-semibold text-careers-dark mb-6">Life at Rimigo</h2>
                        <p className="text-careers-muted mb-6">
                            We're building a company where people can do their best work. Our values guide everything we do, from how we make
                            decisions to how we treat each other.
                        </p>
                        <div className="space-y-6">
                            <div className="flex items-start">
                                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-careers-tag flex items-center justify-center mr-4">
                                    <span className="font-medium text-careers-accent">01</span>
                                </div>
                                <div>
                                    <h3 className="text-lg font-medium text-careers-dark mb-2">High Integrity</h3>
                                    <p className="text-careers-muted">
                                        We uphold the highest standards of integrity and transparency in all our actions and communications.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start">
                                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-careers-tag flex items-center justify-center mr-4">
                                    <span className="font-medium text-careers-accent">02</span>
                                </div>
                                <div>
                                    <h3 className="text-lg font-medium text-careers-dark mb-2">Traveller First</h3>
                                    <p className="text-careers-muted">
                                        We prioritize travellers' needs above all else, making decisions that enhance their travel experience
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start">
                                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-careers-tag flex items-center justify-center mr-4">
                                    <span className="font-medium text-careers-accent">03</span>
                                </div>
                                <div>
                                    <h3 className="text-lg font-medium text-careers-dark mb-2">Impact Driven</h3>
                                    <p className="text-careers-muted">
                                        We focus on actions that create meaningful results, valuing effectiveness over activity or effort.
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start">
                                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-careers-tag flex items-center justify-center mr-4">
                                    <span className="font-medium text-careers-accent">04</span>
                                </div>
                                <div>
                                    <h3 className="text-lg font-medium text-careers-dark mb-2">Full Accountability</h3>
                                    <p className="text-careers-muted">
                                        We take complete responsibility for our work, decisions, and outcomes without passing the buck.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="md:w-1/2  animate-fade-in delay-200">
                        <div className="bg-careers-light rounded-2xl p-8 md:p-10 border border-border/30">
                            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-careers-tag mb-6">
                                <Mail
                                    size={24}
                                    className="text-careers-accent"
                                />
                            </div>
                            <h3 className="text-2xl font-semibold text-careers-dark mb-4">Don't see a role that fits?</h3>
                            <p className="text-careers-muted mb-8">
                                We're always looking for talented people to join our team. If you don't see a role that matches your skills, send us
                                your resume and we'll keep you in mind for future opportunities.
                            </p>
                            <span className="flex items-center gap-1">
                                Email us at{' '}
                                <span className="text-blue-600 hover:underline flex items-center gap-2">
                                    hr@rimigo.com
                                    <button
                                        className="flex items-center gap-2 cursor-pointer"
                                        onClick={() => {
                                            navigator.clipboard.writeText('hr@rimigo.com')
                                            toast.success('Email copied to clipboard')
                                        }}>
                                        <Copy size={16} />
                                    </button>
                                </span>
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default ApplicationCTA
