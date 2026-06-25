import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseCoordinateInput } from "./coordinates.ts";

describe("parseCoordinateInput", () => {
  it("lê 'lat, lng' simples (formato do Google 'copiar coordenadas')", () => {
    assert.deepEqual(parseCoordinateInput("-16.6869, -49.2648"), { lat: -16.6869, lng: -49.2648 });
    assert.deepEqual(parseCoordinateInput("48.8584;2.2945"), { lat: 48.8584, lng: 2.2945 });
  });

  it("lê coordenada do marcador de uma URL do Google Maps (!3d!4d)", () => {
    const url = "https://www.google.com/maps/place/Torre/@48.85,2.29,17z/data=!3d48.8584!4d2.2945";
    assert.deepEqual(parseCoordinateInput(url), { lat: 48.8584, lng: 2.2945 });
  });

  it("lê o centro @lat,lng quando não há marcador", () => {
    assert.deepEqual(parseCoordinateInput("https://maps.google.com/@-16.68,-49.26,12z"), { lat: -16.68, lng: -49.26 });
  });

  it("lê hash do OpenStreetMap (#map=z/lat/lng)", () => {
    assert.deepEqual(parseCoordinateInput("https://www.openstreetmap.org/#map=14/-16.6869/-49.2648"), { lat: -16.6869, lng: -49.2648 });
  });

  it("lê marcador do OSM (mlat/mlon em qualquer ordem)", () => {
    assert.deepEqual(parseCoordinateInput("https://www.openstreetmap.org/?mlon=2.2945&mlat=48.8584#map=18/48/2"), { lat: 48.8584, lng: 2.2945 });
  });

  it("rejeita coordenadas fora do intervalo", () => {
    assert.equal(parseCoordinateInput("200, 400"), null);
    assert.equal(parseCoordinateInput("-91, 0"), null);
  });

  it("rejeita texto sem coordenadas", () => {
    assert.equal(parseCoordinateInput("Parque Flamboyant"), null);
    assert.equal(parseCoordinateInput(""), null);
  });
});
