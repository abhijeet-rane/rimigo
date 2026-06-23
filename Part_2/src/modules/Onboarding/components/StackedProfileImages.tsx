import React from "react";
import CircularImage from "./CircularImage";

interface StackedProfileImagesProps {
  urls: string[];        // array of image URLs
  radius?: number;       // optional radius for each avatar, default 12
  overlap?: number;      // optional overlap amount in px, default 8
}

const StackedProfileImages: React.FC<StackedProfileImagesProps> = ({
  urls,
  radius = 12,
  overlap = 8,
}) => {
  return (
    <div className="flex items-center">
      {urls.map((url, index) => (
        <div
          key={index}
          className="-ml-[8px]" // default negative margin for overlap
          style={{
            marginLeft: index === 0 ? 0 : -overlap,
            zIndex: urls.length - index,
          }}
        >
          <CircularImage url={url} radius={radius} />
        </div>
      ))}
    </div>
  );
};

export default StackedProfileImages;
