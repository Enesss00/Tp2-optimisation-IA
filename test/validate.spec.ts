import { describe, it, expect } from "vitest";
import { requireDate, ValidationError } from "../src/lib/validate.js";

// AGENTS.md : les dates circulent en ISO 8601 UTC.
describe("requireDate", () => {
  it.each(["2026-11-02T09:00:00Z", "2026-11-02T09:00Z", "2026-11-02T09:00:00.000Z"])(
    "accepte une date ISO 8601 UTC : %s",
    (value) => {
      expect(requireDate({ d: value }, "d")).toBe(value);
    }
  );

  it.each([
    ["un nombre", "1"],
    ["une annee seule", "2026"],
    ["un format americain", "12/25/2026"],
    ["une date sans heure", "2026-11-02"],
    ["une heure sans fuseau (interpretee en heure locale du serveur)", "2026-11-02T09:00:00"],
    ["un decalage autre que UTC", "2026-11-02T09:00:00+02:00"],
    ["un 30 fevrier (decale silencieusement au 2 mars)", "2026-02-30T09:00:00Z"]
  ])("refuse %s", (_cas, value) => {
    expect(() => requireDate({ d: value }, "d")).toThrow(ValidationError);
  });
});
