import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import BSFilterCustom, {
  filterFieldLayoutSx,
  filterInputRadius,
  filterValueLayoutSx,
} from "./BSFilterCustom";

jest.mock("../hooks/useResource", () => ({
  useResource: () => ({
    getResourceByGroupAndName: (_group, name) => ({
      resource_value: name,
    }),
  }),
}));

jest.mock("../utils/SecureStorage", () => ({
  get: () => "en",
}));

test("collapses and expands the filter body from the header", async () => {
  render(
    <BSFilterCustom
      bsFilterField={[]}
      bsFilterValueOnChanage={jest.fn()}
      bsSearch
    />,
  );

  const header = screen.getByRole("button", { name: "Collapse filters" });

  expect(header).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByRole("button", { name: "Search" })).toBeInTheDocument();

  fireEvent.click(header);

  expect(header).toHaveAttribute("aria-expanded", "false");
  await waitFor(() => {
    expect(
      screen.queryByRole("button", { name: "Search" }),
    ).not.toBeInTheDocument();
  });

  fireEvent.click(header);

  expect(header).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByRole("button", { name: "Search" })).toBeInTheDocument();
});

test("uses container-driven layouts that wrap filter controls when space shrinks", () => {
  expect(filterFieldLayoutSx.gridTemplateColumns).toBe("35% 1fr");
  expect(filterValueLayoutSx.gridTemplateColumns).toContain("auto-fit");
  expect(filterValueLayoutSx["& > *"]).toEqual(
    expect.objectContaining({
      minWidth: 0,
      width: "100%",
    }),
  );
});

test("keeps standalone filter inputs rounded at every viewport size", () => {
  expect(filterInputRadius).toBe("12px");
});
