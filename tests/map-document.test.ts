import { describe, expect, it } from "vitest";
import { parseMapDocument } from "../lib/domain/map-document";

const validDocument = () => ({
  version: 1,
  title: "Peta pengetahuan",
  nodes: [
    { id: "root", position: { x: 0, y: 0 }, data: { label: "Topik utama" } },
    { id: "child", position: { x: 120, y: 80 }, data: { label: "Cabang", notes: "Catatan" } },
  ],
  edges: [{ id: "e1", source: "root", target: "child", type: "smoothstep" }],
});

describe("parseMapDocument", () => {
  it("accepts a valid versioned map document", () => {
    expect(parseMapDocument(validDocument()).nodes).toHaveLength(2);
  });

  it("rejects unsupported schema versions", () => {
    expect(() => parseMapDocument({ ...validDocument(), version: 2 })).toThrow(/Versi/);
  });

  it("rejects duplicate topic identifiers", () => {
    const input = validDocument();
    input.nodes[1].id = "root";
    expect(() => parseMapDocument(input)).toThrow(/duplikat/);
  });

  it("rejects edges that reference missing nodes", () => {
    const input = validDocument();
    input.edges[0].target = "missing";
    expect(() => parseMapDocument(input)).toThrow(/tidak tersedia/);
  });

  it("rejects non-finite and extreme coordinates", () => {
    const input = validDocument();
    input.nodes[1].position.x = Number.POSITIVE_INFINITY;
    expect(() => parseMapDocument(input)).toThrow(/Koordinat/);
  });

  it("requires the stable root topic identifier", () => {
    const input = validDocument();
    input.nodes[0].id = "main";
    expect(() => parseMapDocument(input)).toThrow(/topik utama/);
  });

  it("rejects self-links and duplicate links", () => {
    const selfLink = validDocument();
    selfLink.edges[0].target = "root";
    expect(() => parseMapDocument(selfLink)).toThrow(/dirinya sendiri/);

    const duplicate = validDocument();
    duplicate.edges.push({ ...duplicate.edges[0], id: "e2" });
    expect(() => parseMapDocument(duplicate)).toThrow(/Koneksi duplikat/);
  });

  it("rejects excessively long labels", () => {
    const input = validDocument();
    input.nodes[1].data.label = "x".repeat(2001);
    expect(() => parseMapDocument(input)).toThrow(/Nama topik/);
  });
});
