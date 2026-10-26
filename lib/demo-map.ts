import type { Edge, Node } from "@xyflow/react";

export const initialNodes: Node[] = [
  {
    id: "root",
    position: { x: 420, y: 250 },
    data: { label: "MindMap Pro" },
    type: "input",
    style: { background: "linear-gradient(135deg, #5b5cf0, #818cf8)", color: "#fff", border: "1px solid rgba(255,255,255,.35)", borderRadius: 18, padding: "18px 24px", fontWeight: 750, fontSize: 18, minWidth: 170, textAlign: "center", boxShadow: "0 12px 35px rgba(91,92,240,.25)" },
  },
  {
    id: "ideas",
    position: { x: 130, y: 100 },
    data: { label: "Ide & Brainstorm" },
    style: { background: "#fff", color: "#24253b", border: "1px solid #e1e4f2", borderRadius: 14, padding: "13px 18px", fontWeight: 650, minWidth: 150, boxShadow: "0 8px 22px rgba(27,31,59,.06)" },
  },
  {
    id: "learning",
    position: { x: 770, y: 95 },
    data: { label: "Belajar & Buku" },
    style: { background: "#fff", color: "#24253b", border: "1px solid #e1e4f2", borderRadius: 14, padding: "13px 18px", fontWeight: 650, minWidth: 150, boxShadow: "0 8px 22px rgba(27,31,59,.06)" },
  },
  {
    id: "projects",
    position: { x: 140, y: 430 },
    data: { label: "Proyek & Strategi" },
    style: { background: "#fff", color: "#24253b", border: "1px solid #e1e4f2", borderRadius: 14, padding: "13px 18px", fontWeight: 650, minWidth: 150, boxShadow: "0 8px 22px rgba(27,31,59,.06)" },
  },
  {
    id: "knowledge",
    position: { x: 770, y: 420 },
    data: { label: "Basis Pengetahuan" },
    style: { background: "#fff", color: "#24253b", border: "1px solid #e1e4f2", borderRadius: 14, padding: "13px 18px", fontWeight: 650, minWidth: 150, boxShadow: "0 8px 22px rgba(27,31,59,.06)" },
  },
];

export const initialEdges: Edge[] = [
  { id: "e-root-ideas", source: "root", target: "ideas", type: "smoothstep", style: { stroke: "#a5a7c7", strokeWidth: 2 } },
  { id: "e-root-learning", source: "root", target: "learning", type: "smoothstep", style: { stroke: "#a5a7c7", strokeWidth: 2 } },
  { id: "e-root-projects", source: "root", target: "projects", type: "smoothstep", style: { stroke: "#a5a7c7", strokeWidth: 2 } },
  { id: "e-root-knowledge", source: "root", target: "knowledge", type: "smoothstep", style: { stroke: "#a5a7c7", strokeWidth: 2 } },
];