export interface Job {
    id: string
    title: string
    department: string
    location: string
    type: 'Full-time' | 'Part-time' | 'Contract' | 'Bengaluru'
    description: string
    requirements: string[]
    postedDate: string
}

export const jobs: Job[] = [
    {
        id: '1',
        title: 'Software Development Engineer',
        department: 'Engineering',
        location: 'Bengaluru',
        type: 'Full-time',
        description: 'Develop and maintain software applications, collaborating with cross-functional teams to deliver high-quality solutions.',
        requirements: [
            '5+ years of software development experience',
            'Proficiency in programming languages such as Java, C++, or Python',
            'Experience with software development methodologies like Agile or Scrum',
            'Strong problem-solving and analytical skills'
        ],
        postedDate: '2025-03-07'
    },
    {
        id: '2',
        title: 'FrontEnd Developer',
        department: 'Engineering',
        location: 'Bengaluru',
        type: 'Full-time',
        description: 'Implement user interfaces for web applications, ensuring responsive design and optimal user experience.',
        requirements: [
            '3+ years of experience with HTML, CSS, and JavaScript',
            'Proficiency in front-end frameworks like React or Angular',
            'Understanding of RESTful APIs and integration',
            'Strong attention to detail and design aesthetics'
        ],
        postedDate: '2025-03-07'
    },
    {
        id: '3',
        title: 'Product Designer',
        department: 'Design',
        location: 'Bengaluru',
        type: 'Full-time',
        description: 'Design user-centric products by conducting research, creating wireframes, and collaborating with engineering teams.',
        requirements: [
            '4+ years of product design experience',
            'Proficiency in design tools like Sketch or Figma',
            'Strong portfolio demonstrating design thinking',
            'Excellent communication and collaboration skills'
        ],
        postedDate: '2025-03-07'
    },
    {
        id: '4',
        title: 'Sales Associate',
        department: 'Sales',
        location: 'Bengaluru',
        type: 'Full-time',
        description: 'Engage with customers to drive sales, provide product information, and ensure a positive traveller experience.',
        requirements: [
            'Previous sales or customer service experience',
            'Excellent communication and interpersonal skills',
            'Ability to work in a fast-paced environment',
            'Strong problem-solving abilities'
        ],
        postedDate: '2025-03-07'
    },
    {
        id: '5',
        title: 'Growth Manager',
        department: 'Marketing',
        location: 'Bengaluru',
        type: 'Full-time',
        description: 'Develop and execute strategies to drive user acquisition, retention, and overall growth of business.',
        requirements: [
            '3+ years of experience in growth marketing or related fields',
            'Strong analytical skills and data-driven mindset',
            'Experience with A/B testing and conversion rate optimization',
            'Excellent project management abilities'
        ],
        postedDate: '2025-03-07'
    },
    {
        id: '6',
        title: 'Partnerships Manager',
        department: 'Business Development',
        location: 'Bengaluru',
        type: 'Full-time',
        description: 'Identify and manage strategic partnerships to drive business objectives and expand market reach.',
        requirements: [
            '3+ years of experience in partnership management or business development',
            'Strong negotiation and relationship-building skills',
            'Ability to identify and evaluate potential partners',
            'Excellent communication and strategic thinking abilities'
        ],
        postedDate: '2025-03-07'
    }
]

export const departments = ['All Departments', 'Design', 'Engineering', 'Marketing', 'Customer Success', 'Product', 'Sales']

export const locations = ['Bengaluru']

export const jobTypes = ['All Types', 'Full-time', 'Part-time', 'Contract', 'Bengaluru']
