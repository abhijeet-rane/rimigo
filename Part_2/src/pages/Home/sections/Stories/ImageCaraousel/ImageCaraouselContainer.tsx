import { Card, Carousel } from './ImageCaraousel'

export default function ImageCaraouselContainer() {
    const cards = data.map((card, index) => (
        <Card
            key={card.src}
            card={card}
            index={index}
        />
    ))

    return (
        <div className="w-full h-full">
            <Carousel items={cards} />
        </div>
    )
}

const data = [
    {
        category: 'Found hidden gems we would have missed otherwise',
        title: 'Vandana',
        src: 'https://rimigowebsitecontent.s3-accelerate.amazonaws.com/rimigo-testimonials/paris.mp4',
        userIcon:
            'https://img.freepik.com/free-photo/joyful-brunette-woman-pink-hoodie-trendy-sunglasses-smiles-sincerely-takes-selfie-good-mood-outside_197531-24195.jpg?t=st=1741613184~exp=1741616784~hmac=75d515ac62973c135f0fdff78a05eb153094f662bdd322fd8277f6d99c968033&w=1060',
        location: '🇫🇷',
        poster: '/story-card/paris_thumbnail.webp',
        content: <></>
    },
    {
        category: 'Expert advice for traveling with young children',
        title: 'Nandini',
        src: 'https://rimigowebsitecontent.s3-accelerate.amazonaws.com/rimigo-testimonials/Singapore.mp4',
        userIcon:
            'https://img.freepik.com/free-photo/medium-shot-woman-holding-smartphone_23-2149461756.jpg?t=st=1741613263~exp=1741616863~hmac=aa8faa92a80339315257ed4a131c8f008cec932339ede939941be6e744112bfb&w=1060',
        location: '🇸🇬',
        poster: '/story-card/singapore_thumbnail.webp',
        content: <></>
    },
    {
        category: 'Saved ₹35000 on our family trip to Europe',
        title: 'Harshit',
        src: 'https://rimigowebsitecontent.s3-accelerate.amazonaws.com/rimigo-testimonials/Switzerland.mp4',
        userIcon:
            'https://img.freepik.com/free-photo/successful-businessman_1098-18155.jpg?t=st=1741357616~exp=1741361216~hmac=bcdf13017146f3fadef4e08a1c368b7015a9bfea66c92e0cda3f950fbe261eaa&w=740',
        location: '🇨🇭',
        poster: '/story-card/switzerland_thumbnail.webp',
        content: <></>
    },
    {
        category: 'The personalized itinerary was exactly what we wanted',
        title: 'Neha',
        src: 'https://rimigowebsitecontent.s3-accelerate.amazonaws.com/rimigo-testimonials/video_3.mp4',
        userIcon:
            'https://img.freepik.com/free-photo/selfie-portrait-videocall_23-2149186116.jpg?uid=R190507659&ga=GA1.1.1807791089.1741188294&semt=ais_hybrid',
        location: '🇮🇩',
        poster: '/story-card/indonesia_thumbnail.webp'
    },
    {
        category: 'Felt like having a local friend in every city',
        title: 'Atul',
        src: 'https://rimigowebsitecontent.s3-accelerate.amazonaws.com/rimigo-testimonials/Italy.mp4',
        userIcon: 'https://images.pexels.com/photos/1205033/pexels-photo-1205033.jpeg?auto=compress&cs=tinysrgb&w=600',
        location: '🇮🇹',
        poster: '/story-card/italy_thumbnail.webp'
    },
    {
        category: 'The money-saving tips really added up.',
        title: 'Mehul',
        src: 'https://rimigowebsitecontent.s3-accelerate.amazonaws.com/rimigo-testimonials/japan.mp4',
        userIcon:
            'https://img.freepik.com/free-photo/portrait-serious-smiling-modern-indian-man-near-office-building_496169-2890.jpg?t=st=1741357711~exp=1741361311~hmac=79cdf805ff9c8bd62e087a3f0a1ef5b75b554a17b564a600cdc07d588ba60b39&w=1060',
        location: '🇯🇵',
        poster: '/story-card/japan_thumbnail.webp'
    },
    {
        category: 'We found deals on Rimigo that our own research missed',
        title: 'Akshay',
        src: 'https://rimigowebsitecontent.s3-accelerate.amazonaws.com/rimigo-testimonials/video_2.mp4',
        userIcon:
            'https://img.freepik.com/free-photo/indian-man-city-male-traditional-turban-hinduist-summer-city_1157-41019.jpg?uid=R190507659&ga=GA1.1.1807791089.1741188294&semt=ais_hybrid',
        location: '🇹🇭',
        poster: '/story-card/thailand_thumbnail.webp'
    }
]
