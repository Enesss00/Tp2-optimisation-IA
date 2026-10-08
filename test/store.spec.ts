import { describe, it, expect } from "vitest";
import { rooms, findRoom, bookingsForRoom, nextBookingId } from "../src/store.js";

// Le store sera remplace par la vraie base (INFRA-140). Ces tests visent son contrat
// (findRoom, bookingsForRoom, nextBookingId) : ils resteront valables pour le remplacant.
describe("store", () => {
  it("expose le catalogue de salles", () => {
    expect(rooms.length).toBeGreaterThan(0);
  });

  it("retrouve une salle par son identifiant", () => {
    const room = findRoom("salle-a");
    expect(room?.id).toBe("salle-a");
    expect(room?.capacity).toBe(12);
  });

  it("renvoie undefined pour une salle inconnue", () => {
    expect(findRoom("cave")).toBeUndefined();
  });

  it("ne retourne que les reservations de la salle demandee", () => {
    const list = bookingsForRoom("salle-a");
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((b) => b.roomId === "salle-a")).toBe(true);
  });

  it("ne retourne aucune reservation pour une salle libre", () => {
    expect(bookingsForRoom("salle-b")).toHaveLength(0);
  });

  it("genere des identifiants de reservation distincts", () => {
    const a = nextBookingId();
    const b = nextBookingId();
    expect(a).toMatch(/^bk-\d+$/);
    expect(b).not.toBe(a);
  });
});
