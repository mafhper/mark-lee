export const resetPageScroll = () => {
  if (typeof window === "undefined") return;

  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
};
