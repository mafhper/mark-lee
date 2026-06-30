import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import PageLayout from "@/components/PageLayout";

describe("PageLayout metadata", () => {
  afterEach(() => {
    document.documentElement.lang = "pt-BR";
    document.title = "";
  });

  it("synchronizes locale and page metadata with the current route", async () => {
    render(
      <MemoryRouter initialEntries={["/en-US"]}>
        <PageLayout locale="en-US">
          <p>Content</p>
        </PageLayout>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(document.documentElement.lang).toBe("en-US");
      expect(document.title).toContain("Mark-Lee");
      expect(document.querySelector('meta[name="description"]')).toHaveAttribute(
        "content",
        expect.stringContaining("Memories")
      );
    });
  });
});
