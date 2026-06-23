import Typography from '@/components/shared/Typography'

const PoweredByRimigo = () => {
    return (
        <div className="flex flex-col items-center ">
            <Typography
                size="15"
                weight="medium"
                color="grey-2"
                family="manrope">
                powered by
            </Typography>

            <img
                src="/icons/logo-transparent-indigo.png"
                alt="Rimigo"
                className="h-8 md:h-10 w-auto object-contain"
            />
        </div>
    )
}

export default PoweredByRimigo
