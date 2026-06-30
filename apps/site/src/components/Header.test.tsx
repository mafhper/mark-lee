import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import Header from "@/components/Header";

describe("Header", () => {
  it("links secondary routes back to the localized home sections", () => {
    render(
      <MemoryRouter initialEntries={["/pt-BR/faq"]}>
        <Header />
      </MemoryRouter>
    );

    const primary = screen.getByRole("navigation", { name: "Navegação principal" });
    expect(within(primary).getByRole("link", { name: "Editor" })).toHaveAttribute(
      "href",
      "/pt-BR#editor"
    );
    expect(within(primary).getByRole("link", { name: "Memórias" })).toHaveAttribute(
      "href",
      "/pt-BR#memorias"
    );
    expect(within(primary).getByRole("link", { name: "Local-first" })).toHaveAttribute(
      "href",
      "/pt-BR#local"
    );
  });

  it("uses the same compact information architecture on mobile", () => {
    render(
      <MemoryRouter initialEntries={["/pt-BR"]}>
        <Header />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: "Abrir menu principal" }));
    const mobile = screen.getByRole("navigation", { name: "Menu móvel" });

    expect(within(mobile).getByRole("link", { name: "Editor" })).toBeVisible();
    expect(within(mobile).getByRole("link", { name: "Memórias" })).toBeVisible();
    expect(within(mobile).getByRole("link", { name: "Local-first" })).toBeVisible();
    expect(within(mobile).getByRole("link", { name: "Baixar" })).toBeVisible();
  });
});
