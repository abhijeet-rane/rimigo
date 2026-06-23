import Typography from '../Typography'

const SectionTitle = ({
    title,
    containerStyle,
    titleStyle
}: {
    title: string
    containerStyle?: React.CSSProperties
    titleStyle?: React.CSSProperties
}) => {
    return (
        <div style={containerStyle}>
            <Typography
                family="redhat"
                color="grey-0"
                textAlign="left"
                className="mb-2"
                style={{
                    fontSize: '18px',
                    fontStyle: 'semibold',
                    fontWeight: 550,
                    lineHeight: '18px',
                    letterSpacing: '-0.36px'
                }}>
                <p style={titleStyle}>{title}</p>
            </Typography>
        </div>
    )
}

export default SectionTitle
