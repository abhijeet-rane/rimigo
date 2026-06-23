import { useEffect, useState } from "react";

/**
 * useScrollThreshold
 *
 * A reusable hook that tells you whether a scroll position
 * has crossed a given threshold.
 *
 * ✅ Works with:
 * - A specific scrollable container (by id)
 * - OR the window scroll (default fallback)
 *
 * @param threshold - Number of pixels after which `passed` becomes true
 * @param containerId - Optional DOM element id to track scroll on
 *
 * @returns boolean - true if scrollTop > threshold
 *
 * -----------------------------------------
 * Example usage:
 *
 * // Window scroll
 * const scrolled = useScrollThreshold(150);
 *
 * // Container scroll
 * const scrolled = useScrollThreshold(150, "premium-scroll-container");
 */
export function useScrollThreshold(
  threshold: number = 150,
  containerId?: string
) {
  const [passed, setPassed] = useState(false);

  useEffect(() => {
    // Try to find the container if an id is provided
    const scrollContainer = containerId
      ? document.getElementById(containerId)
      : null;

    const handleScroll = () => {
      const scrollTop = scrollContainer
        ? scrollContainer.scrollTop // container scroll
        : window.scrollY;           // window scroll

      setPassed(scrollTop > threshold);
    };

    // Attach correct scroll listener
    if (scrollContainer) {
      scrollContainer.addEventListener("scroll", handleScroll);
    } else {
      window.addEventListener("scroll", handleScroll);
    }

    // Run once to set initial state (important on refresh)
    handleScroll();

    // Cleanup
    return () => {
      if (scrollContainer) {
        scrollContainer.removeEventListener("scroll", handleScroll);
      } else {
        window.removeEventListener("scroll", handleScroll);
      }
    };
  }, [threshold, containerId]);

  return passed;
}
