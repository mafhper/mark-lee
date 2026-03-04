import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

const ScrollToTop = () => {
  const location = useLocation();

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;

    window.history.scrollRestoration = "manual";
    const reset = () => window.scrollTo({ top: 0, left: 0, behavior: "auto" });

    reset();
    const frame = window.requestAnimationFrame(reset);
    const timer = window.setTimeout(reset, 0);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [location.pathname, location.key]);

  return null;
};

export default ScrollToTop;
