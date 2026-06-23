import React from "react";
import Typography from "@/components/shared/Typography";

interface HeroHeaderTextProps {
  title: string;
  description: string;
}

const HeroHeaderText: React.FC<HeroHeaderTextProps> = ({
  title,
  description,
}) => {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <Typography
        size="2xl" // or map large_24 to your Tailwind/Tokens size
        weight="semibold"
        family="redhat"
        color="grey-0"
        textAlign="center"
      >
        {title}
      </Typography>

      <Typography
        size="md" // or map regular to your Tailwind/Tokens size
        weight="medium"
        family="manrope"
        color="grey-2"
        textAlign="center"
      >
        {description}
      </Typography>
    </div>
  );
};

export default HeroHeaderText;
