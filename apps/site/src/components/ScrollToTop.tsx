import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";
import { resetPageScroll } from "@/lib/scroll";

const ScrollToTop = () => {
  const location = useLocation();

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;

    window.history.scrollRestoration = "manual";
    resetPageScroll();
    const frame = window.requestAnimationFrame(resetPageScroll);
    const timers = [
      window.setTimeout(resetPageScroll, 0),
      window.setTimeout(resetPageScroll, 80),
      window.setTimeout(resetPageScroll, 180),
      window.setTimeout(resetPageScroll, 360),
    ];

    return () => {
      window.cancelAnimationFrame(frame);
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [location.pathname, location.key]);

  return null;
};

export default ScrollToTop;
