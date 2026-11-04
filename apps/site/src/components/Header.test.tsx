import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import Header from "@/components/Header";

describe("Header", () => {
  it("links the home chapters back to the localized sections", () => {
    render(
      <MemoryRouter initialEntries={["/pt-BR/faq"]}>
        <Header />
      </MemoryRouter>
    );

    const primary = screen.getByRole("navigation", { name: "Navegação principal" });
    expect(within(primary).getByRole("link", { name: "Produto" })).toHaveAttribute(
      "href",
      "/pt-BR#leituras"
    );
    expect(within(primary).getByRole("link", { name: "Arquivos" })).toHaveAttribute(
      "href",
      "/pt-BR#arquivo"
    );
    expect(within(primary).getByRole("link", { name: "Personalização" })).toHaveAttribute(
      "href",
      "/pt-BR#temas"
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

    expect(within(mobile).getByRole("link", { name: "Produto" })).toBeVisible();
    expect(within(mobile).getByRole("link", { name: "Arquivos" })).toBeVisible();
    expect(within(mobile).getByRole("link", { name: "Personalização" })).toBeVisible();
    expect(within(mobile).getByRole("link", { name: "Baixar" })).toBeVisible();
  });
});
