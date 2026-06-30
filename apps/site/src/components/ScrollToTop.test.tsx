import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import ScrollToTop from "@/components/ScrollToTop";

describe("ScrollToTop", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("scrolls to a section when the route contains a home hash", async () => {
    const section = document.createElement("section");
    section.id = "memorias";
    section.scrollIntoView = vi.fn();
    document.body.appendChild(section);

    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 1;
    });

    render(
      <MemoryRouter initialEntries={["/pt-BR#memorias"]}>
        <ScrollToTop />
      </MemoryRouter>
    );

    await waitFor(() => expect(section.scrollIntoView).toHaveBeenCalledWith({ block: "start" }));
  });
});
