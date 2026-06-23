import React from "react";

interface ThreeStarProps {
    size?: number;
    className?: string;
    starSrc?: string;
}

const ThreeStar: React.FC<ThreeStarProps> = ({
    size = 48,
    className = "",
    starSrc = "/rimigo%20ai/ai_star.png",
}) => {

    const mainStarSize = size * 0.4;
    const smallStarSize1 = size * 0.2;
    const smallStarSize2 = size * 0.25;

    return (
        <div
            className={`relative mx-auto mb-7 ${className}`}
            style={{ width: size, height: size }}
        >
            {/* Rotated Cluster */}
            <div className="absolute inset-0 rotate-6">
                {/* Main Star */}
                <img
                    src={starSrc}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 object-contain"
                    style={{ width: mainStarSize, height: mainStarSize }}
                    alt="Main Star"
                />

                {/* Bottom Left Star */}
                <img
                    src={starSrc}
                    className="absolute bottom-2 left-2 object-contain"
                    style={{ width: smallStarSize1, height: smallStarSize1 }}
                    alt="Left Bottom Star"
                />

                {/* Bottom Right Star */}
                <img
                    src={starSrc}
                    className="absolute bottom-2 right-2 object-contain"
                    style={{ width: smallStarSize2, height: smallStarSize2 }}
                    alt="Right Bottom Star"
                />
            </div>
        </div>
    );
};

export default ThreeStar;
