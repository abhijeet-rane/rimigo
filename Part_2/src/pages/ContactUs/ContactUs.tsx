const ContactUs = () => {
    return (
        <div className="min-h-screen pt-32 pb-20 md:pt-44 md:pb-32 px-6 md:px-10 max-w-7xl mx-auto">
            <h1 className="text-2xl font-bold">Contact Us</h1>
            <p>Last updated on 12-03-2025 17:45:20</p>

            <br />
            <br />
            <p>You may contact us using the information below:</p>
            <br />
            <div className="space-y-2">
                <p>
                    <span className="font-semibold">Merchant Legal entity name:</span> VIAREEL TRAVEL PRIVATE LIMITED
                </p>
                <p>
                    <span className="font-semibold">Registered Address:</span> wework vaishnavi signature, no. 78/9, outer ring road, bellandur s.o,
                    bellandur, karnataka, india, 560103, Bellandur, KARNATAKA, PIN: 560103
                </p>
                <p>
                    <span className="font-semibold">Operational Address:</span> wework vaishnavi signature, no. 78/9, outer ring road, bellandur s.o,
                    bellandur, karnataka, india, 560103, Bellandur, KARNATAKA, PIN: 560103
                </p>
                <p>
                    <span className="font-semibold">Telephone No:</span> +91 77569 85174
                </p>
                <p>
                    <span className="font-semibold">E-Mail ID:</span>{' '}
                    <a
                        href="mailto:support@rimigo.com"
                        className="text-blue-600 hover:underline">
                        support@rimigo.com
                    </a>
                </p>
            </div>
        </div>
    )
}

export default ContactUs
