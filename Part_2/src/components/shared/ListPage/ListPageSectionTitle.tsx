import { cn } from '@/lib/utils'
import Typography from '../Typography'

/*
<h2
                        style={{ fontFamily: fontFamily === 'redhat' ? 'Red Hat Display' : 'Caveat' }}
                        className={cn(` font-[550] text-[${titleSize}] leading-[${titleSize}] text-grey-0 tracking-[-0.4px]`, titleClassName)}>
                        {title}
                    </h2>
*/

const ListPageSectionTitle = ({ title, titleSize = '18px', titleClassName }: { title: string; titleSize?: string; titleClassName?: string }) => {
    return (
        <Typography className={cn(`font-[550] text-[${titleSize}] leading-[${titleSize}] text-grey-0 tracking-[-0.4px]`, titleClassName)}>
            {title}
        </Typography>
    )
}

export default ListPageSectionTitle
