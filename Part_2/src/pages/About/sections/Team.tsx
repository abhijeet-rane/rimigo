import SectionTitle from '@/components/SectionTitle'
import { STATIC_TEXT } from '@/constants'
import { Linkedin } from 'lucide-react'

const Team = () => {
    return (
        <section className="text-gray-600 body-font">
            <div className="container px-5 py-24 mx-auto">
                <div className="flex flex-col">
                    <div className="flex flex-wrap sm:flex-row flex-col py-6 mb-12 justify-center items-center">
                        <SectionTitle title={STATIC_TEXT.TEAM_HEADER} />
                    </div>
                </div>
                <div className="flex flex-col lg:flex-row lg:flex-wrap sm:-m-4 -mx-4 -mb-10 -mt-4 ">
                    {STATIC_TEXT.TEAM_MEMBERS.map((member) => (
                        <div className="p-4 md:w-1/3 sm:mb-0 mb-6  flex flex-col items-center">
                            <div className="flex flex-col items-start  w-fit ">
                                <div className="rounded-md size-60 overflow-hidden">
                                    <img
                                        alt="content"
                                        className="object-cover object-center h-full w-full"
                                        src={member.image}
                                    />
                                </div>

                                <h2 className="text-xl font-medium title-font text-gray-900 mt-5">{member.name}</h2>
                                <div className="flex flex-row gap-2 items-center">
                                    <a
                                        href={member.x}
                                        target="_blank"
                                        rel="noopener noreferrer">
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            width="14"
                                            height="14"
                                            viewBox="0 0 24 24"
                                            fill="none">
                                            <path
                                                d="M3 21L10.5484 13.4516M10.5484 13.4516L3 3H8L13.4516 10.5484M10.5484 13.4516L16 21H21L13.4516 10.5484M21 3L13.4516 10.5484"
                                                stroke="#090A0C"
                                                stroke-width="1.5"
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                            />
                                        </svg>
                                    </a>
                                    <a
                                        href={member.linkedin}
                                        target="_blank"
                                        rel="noopener noreferrer">
                                        <Linkedin className="w-4 h-4 object-cover" />
                                    </a>
                                </div>
                                <p className="text-base leading-relaxed mt-2">{member.designation}</p>
                                <p className="flex items-center gap-2 text-md">
                                    <span className="flex items-center gap-2">
                                        <img
                                            src="https://rimigowebsitecontent.s3-accelerate.amazonaws.com/rimigo-about-us-page-content/notes.svg"
                                            alt="plane"
                                            className="w-4 h-4"
                                        />
                                        {member.travelledCountries}
                                    </span>
                                </p>
                                <p>
                                    <span className="inline-block align-middle">
                                        <img
                                            src="/about-us/notes.svg"
                                            alt="notes"
                                            className="w-4 h-4 inline-block align-middle"
                                        />
                                    </span>
                                    <span className="align-middle ml-2">{member.buildingRimigo}</span>
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}

export default Team
