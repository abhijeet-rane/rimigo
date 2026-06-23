import { Sparkles, WandSparkles } from 'lucide-react'
import Typography from '../Typography'

const RimigoSpecialText = ({
    text,
    style,
    showStarIcon = false,
    showMagicIcon = false,
    textStyle
}: {
    text: string
    style?: React.CSSProperties
    showStarIcon?: boolean
    showMagicIcon?: boolean
    textStyle?: React.CSSProperties
}) => {
    return (
        <Typography
            family="redhat"
            weight="semibold"
            color="primary-default"
            textAlign="left"
            className="relative"
            style={{
                fontSize: '14px',
                fontStyle: 'normal',
                fontWeight: 550,
                lineHeight: 'normal',
                letterSpacing: '-0.01em',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                ...style
            }}>
            {showStarIcon && (
                <Sparkles
                    width={16}
                    height={16}
                />
            )}
            {showMagicIcon && (
                <WandSparkles
                    width={16}
                    height={16}
                />
            )}
            <p style={textStyle}>{text}</p>
        </Typography>
    )
}

export default RimigoSpecialText
