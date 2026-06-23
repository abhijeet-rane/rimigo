import React from "react";
import { Share } from "lucide-react";
import { Button } from "@/components/shared/ButtonNew";
import { OrDivider } from "@/components/shared/OrDivider";
import { useScrollThreshold } from "../../../hooks/useScrollThreshold";

type ButtonConfig = {
  title: string;
  onClick: () => void;
  icon?: React.ReactNode;
  iconSize?: number; 
  className?: string;
  textStyle?: string;
  flex?: string; // e.g. "flex-1", "flex-[1.7]"
  variant?: "primary" | "secondary" | "custom";
};

type SubtextConfig = {
  text: string;
  icon?: string;
  className?: string;
};

type SecondaryLinkConfig = {
  text: string;
  onClick: () => void;
  className?: string;
};

type LeadingShareButtonConfig = {
  onClick: () => void;
  label?: string;
  icon?: React.ReactNode;
  ariaLabel?: string;
  className?: string;
};

type MobileStickyCTAProps = {
  buttons: ButtonConfig[]; // REQUIRED
  subtext?: SubtextConfig;
  /** Optional "OR <link>" row shown below the primary buttons. */
  secondaryLink?: SecondaryLinkConfig;
  /** Pill-shaped Share button rendered to the LEFT of the primary button(s).
   *  Matches the primary button height + rounded corners; bordered/outlined
   *  to read as a secondary action. */
  leadingShareButton?: LeadingShareButtonConfig;
  scrollThreshold?: number;
  scrollContainerId?: string;
  containerClassName?: string;
  backgroundClassName?: string;
  buttonsContainerClassName?: string;
  showOnScroll?: boolean;
};

const MobileStickyCTA = ({
  buttons,
  subtext,
  secondaryLink,
  leadingShareButton,
  scrollThreshold = 150,
  scrollContainerId = "premium-scroll-container",
  containerClassName = "",
  backgroundClassName = "",
  buttonsContainerClassName = "",
  showOnScroll = true,
}: MobileStickyCTAProps) => {
  const scrolled = useScrollThreshold(scrollThreshold, scrollContainerId);

  // Hard guard: no buttons = no CTA
  if (!buttons || buttons.length === 0) return null;

  const getVariantClassName = (variant?: ButtonConfig["variant"]) => {
    switch (variant) {
      case "primary":
        return "bg-linear-to-r from-primary-default to-primary-dark text-white";
      case "secondary":
        return "bg-linear-to-r from-header-black to-black text-white";
      case "custom":
      default:
        return "";
    }
  };

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 md:hidden transition-all duration-500 ease-out ${
        showOnScroll
          ? scrolled
            ? "translate-y-0 opacity-100"
            : "translate-y-full opacity-0 pointer-events-none"
          : "translate-y-0 opacity-100"
      } ${containerClassName}`}
    >
      {/* Background */}
      <div
        className={`bg-white border-t border-gray-200 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] ${backgroundClassName}`}
      >
        {/* Buttons */}
        <div
          className={`flex items-center justify-center gap-1 px-8 ${
            subtext ? "py-3 pb-3" : "py-3"
          } ${buttonsContainerClassName}`}
        >
          {leadingShareButton ? (
            <div className="flex items-stretch gap-2 w-full">
              <button
                type="button"
                aria-label={leadingShareButton.ariaLabel || "Share"}
                onClick={leadingShareButton.onClick}
                className={`shrink-0 flex items-center justify-center gap-1.5 px-4 py-3 rounded-md border border-grey-4 bg-white text-black font-red-hat-display font-[645] text-[15px] hover:bg-primary-default/5 transition-colors cursor-pointer ${
                  leadingShareButton.className || ""
                }`}
              >
                {leadingShareButton.icon ?? (
                  <Share className="w-[18px] h-[18px]" />
                )}
              </button>
              {buttons.map((button, index) => (
                <Button
                  key={index}
                  title={button.title}
                  onClick={button.onClick}
                  icon={button.icon}
                  iconSize={button.iconSize}
                  textStyle={
                    button.textStyle ||
                    "text-[15px] font-red-hat-display font-[645]"
                  }
                  className={`${button.flex || "flex-1"} py-3 font-red-hat-display font-[645] rounded-lg ${
                    button.variant ? getVariantClassName(button.variant) : ""
                  } ${button.className || ""}`}
                />
              ))}
            </div>
          ) : (
            buttons.map((button, index) => (
              <Button
                key={index}
                title={button.title}
                onClick={button.onClick}
                icon={button.icon}
                iconSize={button.iconSize}
                textStyle={
                  button.textStyle ||
                  "text-[15px] font-red-hat-display font-[645]"
                }
                className={`${button.flex || "flex-1"} py-3 font-red-hat-display font-[645] rounded-lg ${
                  button.variant ? getVariantClassName(button.variant) : ""
                } ${button.className || ""}`}
              />
            ))
          )}

          {secondaryLink && (
            <>
              <OrDivider
                className="my-1"
                textClassName="text-primary-default"
                lineClassName="via-primary-default/40 to-primary-default/40"
              />
              <button
                type="button"
                onClick={secondaryLink.onClick}
                className={`text-primary-default font-red-hat-display text-[14px] font-semibold underline underline-offset-[3px] decoration-primary-default/70 hover:text-primary-default/85 transition-colors cursor-pointer ${
                  secondaryLink.className || ''
                }`}>
                {secondaryLink.text}
              </button>
            </>
          )}

          {/* Subtext */}
          {subtext && (
            <div
              className={`flex w-full items-center justify-center gap-1 px-2 ${
                subtext.className || ""
              }`}
            >
              {subtext.icon && (
                <img
                  src={subtext.icon}
                  alt={subtext.text}
                  className="w-6 h-6"
                />
              )}
              <span className="font-red-hat-display text-[13px] text-grey-0 font-medium">
                {subtext.text}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileStickyCTA;
