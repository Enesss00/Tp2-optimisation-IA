import { describe, it, expect } from "vitest";
import { call } from "./helpers/http.js";

describe("GET /health", () => {
  it("repond ok", async () => {
    const res = await call("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});

describe("GET /rooms", () => {
  it("liste le catalogue", async () => {
    const res = await call("/rooms");
    expect(res.status).toBe(200);
    const ids = (res.body.rooms as { id: string }[]).map((r) => r.id);
    expect(ids).toEqual(["amphi", "salle-a", "salle-b", "labo"]);
  });
});

describe("GET /rooms/:id", () => {
  it("renvoie la salle et ses reservations", async () => {
    const res = await call("/rooms/amphi");
    expect(res.status).toBe(200);
    expect((res.body.room as { id: string }).id).toBe("amphi");
    const bookings = res.body.bookings as { id: string; roomId: string }[];
    expect(bookings.map((b) => b.id)).toContain("bk-1002");
    expect(bookings.every((b) => b.roomId === "amphi")).toBe(true);
  });

  it("renvoie 404 pour une salle inconnue", async () => {
    const res = await call("/rooms/cave");
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("salle inconnue");
  });
});
