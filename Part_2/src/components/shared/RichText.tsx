import React from "react";
import Typography, { TypographyProps } from "./Typography";

export interface RichTextProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "content"> {
  content: Array<Omit<TypographyProps, "children"> & { text: string; breakAfter?: boolean }>;
  textAlign?: "left" | "center" | "right" | "justify";
}

const RichText: React.FC<RichTextProps> = ({
  content,
  className = "",
  textAlign = "left",
  style,
  ...props
}) => {
  const containerClasses = [
    "inline",
    textAlign === "left"
      ? "text-left"
      : textAlign === "center"
      ? "text-center"
      : textAlign === "right"
      ? "text-right"
      : "text-justify",
    className,
  ].join(" ");

  return (
    <span {...props} className={containerClasses} style={{ whiteSpace: "pre-wrap", ...style }}>
      {content.map((item, index) => (
        <React.Fragment key={index}>
          <Typography
            family={item.family}
            weight={item.weight}
            size={item.size}
            color={item.color}
            underline={item.underline}
            italic={item.italic}
            gradientColors={item.gradientColors}
            className={item.className}
            style={item.style}
          >
            {item.text}
          </Typography>
          {item.breakAfter ? <br /> : index < content.length - 1 ? " " : ""}
        </React.Fragment>
      ))}
    </span>
  );
};

export default RichText;
