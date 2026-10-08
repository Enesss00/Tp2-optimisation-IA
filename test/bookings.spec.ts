import { describe, it, expect } from "vitest";
import { call } from "./helpers/http.js";

const post = (payload: unknown) =>
  call("/bookings", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });

describe("POST /bookings", () => {
  it("refuse une salle inconnue", async () => {
    const res = await post({
      roomId: "cave",
      who: "moi",
      people: 2,
      startsAt: "2026-11-02T09:00:00Z",
      endsAt: "2026-11-02T10:00:00Z"
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("salle inconnue : cave");
  });

  it("refuse un depassement de capacite", async () => {
    const res = await post({
      roomId: "salle-b",
      who: "moi",
      people: 40,
      startsAt: "2026-11-02T09:00:00Z",
      endsAt: "2026-11-02T10:00:00Z"
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("capacite depassee : 40 > 6");
  });

  it("refuse une date invalide", async () => {
    const res = await post({
      roomId: "salle-b",
      who: "moi",
      people: 2,
      startsAt: "la semaine prochaine",
      endsAt: "2026-11-02T10:00:00Z"
    });
    expect(res.status).toBe(400);
  });

  it("refuse un creneau qui finit avant de commencer", async () => {
    const res = await post({
      roomId: "salle-b",
      who: "moi",
      people: 2,
      startsAt: "2026-11-02T11:00:00Z",
      endsAt: "2026-11-02T10:00:00Z"
    });
    expect(res.status).toBe(400);
  });

  it("accepte une reservation qui commence quand la precedente finit", async () => {
    const first = await post({
      roomId: "labo",
      who: "equipe-1",
      people: 4,
      startsAt: "2026-11-03T09:00:00Z",
      endsAt: "2026-11-03T10:00:00Z"
    });
    expect(first.status).toBe(201);

    const second = await post({
      roomId: "labo",
      who: "equipe-2",
      people: 4,
      startsAt: "2026-11-03T10:00:00Z",
      endsAt: "2026-11-03T11:00:00Z"
    });
    expect(second.status).toBe(201);
  });
});

describe("POST /bookings — tarif", () => {
  it("renvoie un prix numerique majore le week-end", async () => {
    // samedi 14 novembre 2026, 2 h en salle-b (15 EUR/h) + 20 EUR de majoration
    const res = await post({
      roomId: "salle-b",
      who: "moi",
      people: 2,
      startsAt: "2026-11-14T09:00:00Z",
      endsAt: "2026-11-14T11:00:00Z"
    });
    expect(res.status).toBe(201);
    expect((res.body.booking as { price: number }).price).toBe(50);
  });
});

describe("POST /bookings — validation", () => {
  const valide = {
    roomId: "salle-b",
    who: "moi",
    people: 2,
    startsAt: "2026-11-20T09:00:00Z",
    endsAt: "2026-11-20T10:00:00Z"
  };

  it.each([
    ["roomId manquant", { ...valide, roomId: undefined }, "champ manquant ou vide : roomId"],
    ["who vide", { ...valide, who: "   " }, "champ manquant ou vide : who"],
    ["people non entier", { ...valide, people: 2.5 }, "entier positif attendu : people"],
    ["people nul", { ...valide, people: 0 }, "entier positif attendu : people"],
    ["people en texte", { ...valide, people: "2" }, "entier positif attendu : people"],
    ["endsAt invalide", { ...valide, endsAt: "demain" }, "date invalide : endsAt"],
    ["creneau de duree nulle", { ...valide, endsAt: valide.startsAt }, "endsAt doit etre posterieur a startsAt"]
  ])("refuse : %s", async (_cas, payload, message) => {
    const res = await post(payload);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe(message);
  });

  it("accepte une capacite exactement atteinte", async () => {
    const res = await post({ ...valide, people: 6, startsAt: "2026-11-20T14:00:00Z", endsAt: "2026-11-20T15:00:00Z" });
    expect(res.status).toBe(201);
  });

  it("refuse un creneau qui chevauche une reservation existante", async () => {
    const res = await post({
      roomId: "salle-a",
      who: "moi",
      people: 2,
      startsAt: "2026-10-05T10:00:00Z",
      endsAt: "2026-10-05T12:00:00Z"
    });
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: "creneau deja reserve", conflictsWith: "bk-1001" });
  });

  it("enregistre la reservation creee avec son prix", async () => {
    const res = await post({ ...valide, startsAt: "2026-11-19T09:00:00Z", endsAt: "2026-11-19T12:00:00Z" });
    expect(res.status).toBe(201);
    const booking = res.body.booking as { id: string; price: number };
    expect(booking.price).toBe(45);
    const list = await call("/bookings?roomId=salle-b");
    expect((list.body.bookings as { id: string }[]).map((b) => b.id)).toContain(booking.id);
  });
});

describe("GET /bookings", () => {
  it("liste toutes les reservations", async () => {
    const res = await call("/bookings");
    expect(res.status).toBe(200);
    const ids = (res.body.bookings as { id: string }[]).map((b) => b.id);
    expect(ids).toEqual(expect.arrayContaining(["bk-1001", "bk-1002"]));
  });

  it("filtre par salle", async () => {
    const res = await call("/bookings?roomId=amphi");
    const list = res.body.bookings as { roomId: string }[];
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((b) => b.roomId === "amphi")).toBe(true);
  });
});

describe("DELETE /bookings/:id", () => {
  it("annule une reservation existante", async () => {
    const created = await post({
      roomId: "labo",
      who: "a-annuler",
      people: 1,
      startsAt: "2026-12-01T09:00:00Z",
      endsAt: "2026-12-01T10:00:00Z"
    });
    const id = (created.body.booking as { id: string }).id;
    const res = await call(`/bookings/${id}`, { method: "DELETE" });
    expect(res.status).toBe(200);
    expect(res.body.cancelled).toBe(id);
    const again = await call(`/bookings/${id}`, { method: "DELETE" });
    expect(again.status).toBe(404);
  });

  it("renvoie 404 pour une reservation inconnue", async () => {
    const res = await call("/bookings/bk-0", { method: "DELETE" });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("reservation inconnue");
  });
});
