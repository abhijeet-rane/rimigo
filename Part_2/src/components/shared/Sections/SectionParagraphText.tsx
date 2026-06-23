import Typography from '../Typography'

const SectionParagraphText = ({ text, textStyle }: { text: string; textStyle?: React.CSSProperties }) => {
    return (
        <Typography
            family="manrope"
            weight="light"
            size="md"
            color="grey_1"
            textAlign="left"
            className="inline-block"
            style={{
                fontStyle: 'normal',
                lineHeight: '1.5',
                letterSpacing: '-0.01em'
            }}>
            <p style={textStyle}>{text}</p>
        </Typography>
    )
}

export default SectionParagraphText
