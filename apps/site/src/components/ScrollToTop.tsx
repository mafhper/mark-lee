import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";
import { resetPageScroll } from "@/lib/scroll";

const ScrollToTop = () => {
  const location = useLocation();

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;

    window.history.scrollRestoration = "manual";
    const scroll = () => {
      if (location.hash) {
        const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
        target?.scrollIntoView({ block: "start" });
        return;
      }
      resetPageScroll();
    };

    scroll();
    const frame = window.requestAnimationFrame(scroll);
    const timers = [0, 80, 180, 360].map((delay) => window.setTimeout(scroll, delay));

    return () => {
      window.cancelAnimationFrame(frame);
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [location.pathname, location.hash, location.key]);

  return null;
};

export default ScrollToTop;
