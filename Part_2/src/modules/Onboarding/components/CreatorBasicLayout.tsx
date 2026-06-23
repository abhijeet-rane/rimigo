import React from "react";
import Typography from "@/components/shared/Typography";
import { RadialGradient } from "@/utils/SvgUtils";

interface CreatorBasicLayoutProps {
  children: React.ReactNode;
  className?: string; // optional extra container styling
}

const CreatorBasicLayout: React.FC<CreatorBasicLayoutProps> = ({
  children,
  className = "",
}) => {
  const HEADER_HEIGHT = 200; // same as RN height

  return (
    <div className={`flex flex-col min-h-screen bg-white ${className}`}>
      {/* Header section */}
      <div className="relative w-full" style={{ height: HEADER_HEIGHT }}>
        <div className="absolute inset-0 flex flex-col items-center justify-start">
          <RadialGradient />
          <Typography
            size="2xl"
            weight="semibold"
            family="redhat"
            color="primary-default"
            className="absolute top-12 z-10"
          >
            Rimigo
          </Typography>
        </div>
      </div>

      {/* Main content */}
      <div
        className="flex flex-col items-center justify-start w-full pt-[-40px] pb-10"
        style={{ marginTop: -HEADER_HEIGHT * 0.2 }}
      >
        {children}
      </div>
    </div>
  );
};

export default CreatorBasicLayout;
