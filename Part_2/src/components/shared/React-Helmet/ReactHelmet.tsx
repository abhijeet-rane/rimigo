import { Helmet } from 'react-helmet-async'

const ReactHelmet = ({ title }: { title: string }) => {
    return (
        <Helmet>
            <title>{title}</title>
        </Helmet>
    )
}

export default ReactHelmet
