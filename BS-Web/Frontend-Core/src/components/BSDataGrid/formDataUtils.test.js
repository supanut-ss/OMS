import { initializeFieldValue, resolveFormMode } from "./formDataUtils";

test("resolves edit mode from an existing row before React state updates", () => {
  expect(resolveFormMode({ isExistingRecord: true, dialogMode: "add" })).toBe(
    "edit",
  );
});

test("preserves an existing inactive value when initializing an edit form", () => {
  expect(
    initializeFieldValue({
      existingValue: "NO",
      hasExistingValue: true,
      isActiveField: true,
    }),
  ).toBe("NO");
});
