import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import Produto from "@/pages/Produto";

describe("Produto", () => {
  it("presents Editor and Memórias as two contexts over local files", () => {
    const { container } = render(
      <MemoryRouter>
        <Produto locale="pt-BR" />
      </MemoryRouter>
    );

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Escreva o que precisa. Guarde o que importa.",
      })
    ).toBeVisible();
    expect(screen.getAllByRole("link", { name: "Baixar Mark-Lee" })[0]).toHaveAttribute(
      "href",
      "/pt-BR/downloads"
    );

    for (const sectionId of ["dois-contextos", "editor", "memorias", "local"]) {
      expect(container.querySelector(`#${sectionId}`)).toBeInTheDocument();
    }

    expect(container.querySelector("canvas")).not.toBeInTheDocument();
    expect(screen.queryByText("Tudo para escrever, revisar e entregar.")).not.toBeInTheDocument();
  });
});
