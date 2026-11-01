"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentProps } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type NodeMouseHandler,
} from "@xyflow/react";
import {
  AlignLeft,
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  CircleHelp,
  Command,
  FilePlus2,
  FolderOpen,
  GitBranch,
  LayoutTemplate,
  Menu,
  Moon,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  Share2,
  Sparkles,
  Sun,
  Undo2,
  Redo2,
  X,
} from "lucide-react";
import { initialEdges, initialNodes } from "@/lib/demo-map";
import { parseStoredMapDocument, serializeMapDocument } from "@/lib/domain/document-lifecycle";
import { addChildTopic, addCrossLink, deleteCrossLinks, deleteTopicSubtree, moveTopic, reparentTopic, updateTopicContent } from "@/lib/domain/graph-commands";
import { fromCanonicalGraph, toCanonicalGraph } from "@/lib/domain/graph-adapter";
import { createHistory, recordHistorySnapshot, redoHistory, syncHistoryPresent, undoHistory, type HistoryState } from "@/lib/domain/history";

const STORAGE_KEY = "mindmap-pro:local-draft:v2";
const LEGACY_STORAGE_KEY = "mindmap-pro:local-draft:v1";
const RECOVERY_STORAGE_KEY = "mindmap-pro:local-draft:recovery";

type SavedMap = { nodes: Node[]; edges: Edge[]; title: string };



export default function HomePage() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [title, setTitle] = useState("Ruang ide saya");
  const [selectedId, setSelectedId] = useState<string | null>("root");
  const [searchTerm, setSearchTerm] = useState("");
  const [saveState, setSaveState] = useState<"loading" | "saved" | "error">("loading");
  const [dark, setDark] = useState(false);
  const [outlineOpen, setOutlineOpen] = useState(true);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [mobilePanel, setMobilePanel] = useState<"none" | "outline" | "inspector">("none");
  const [history, setHistory] = useState<HistoryState<SavedMap>>(() => createHistory({ nodes: initialNodes, edges: initialEdges, title: "Ruang ide saya" }));
  const [ready, setReady] = useState(false);
  const [restoreSafe, setRestoreSafe] = useState(false);
  const [recoveryBackupSafe, setRecoveryBackupSafe] = useState(false);
  const [notice, setNotice] = useState("");
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      let raw: string | null = null;
      try {
        raw = window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_STORAGE_KEY);
        if (raw) {
          const parsed: unknown = JSON.parse(raw);
          const restored = parseStoredMapDocument(parsed);
          setNodes(restored.nodes);
          setEdges(restored.edges);
          setTitle(restored.title);
          if (restored.migrated) {
            setNotice("Draft lama berhasil dimigrasikan ke format dokumen kanonis.");
          }
        }
        setRestoreSafe(true);
      } catch {
        let recovered = false;
        if (raw) {
          try {
            const existingRecovery = window.localStorage.getItem(RECOVERY_STORAGE_KEY);
            if (existingRecovery === null) {
              window.localStorage.setItem(RECOVERY_STORAGE_KEY, raw);
              recovered = window.localStorage.getItem(RECOVERY_STORAGE_KEY) === raw;
            } else {
              recovered = existingRecovery === raw;
            }
            if (recovered) setRecoveryBackupSafe(true);
          } catch {
            // Preserve the original key; do not overwrite when recovery storage is unavailable.
          }
        }
        setSaveState("error");
        setNotice(recovered
          ? "Draft tidak valid. Salinan recovery dibuat dan draft asli dipertahankan; autosave dihentikan."
          : "Draft tidak dapat dibaca. Draft asli dipertahankan; autosave dihentikan.");
      } finally {
        setReady(true);
      }
    }, 0);
    return () => window.clearTimeout(handle);
  }, [setEdges, setNodes]);

  useEffect(() => {
    if (!ready || !restoreSafe) return;
    const handle = window.setTimeout(() => {
      try {
        const payload = serializeMapDocument(title, nodes, edges);
        window.localStorage.setItem(STORAGE_KEY, payload);
        window.localStorage.removeItem(LEGACY_STORAGE_KEY);
        setSaveState("saved");
      } catch {
        setSaveState("error");
        setNotice("Autosave gagal. Periksa ruang penyimpanan browser dan ekspor dokumen sebagai cadangan.");
      }
    }, 350);
    return () => window.clearTimeout(handle);
  }, [nodes, edges, title, ready, restoreSafe]);

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedId) ?? null,
    [nodes, selectedId],
  );

  const selectedLabel = selectedNode ? String(selectedNode.data.label ?? "Topik baru") : "";
  const snapshot = useCallback((): SavedMap => ({ nodes, edges, title }), [nodes, edges, title]);

  const remember = useCallback(() => {
    const currentSnapshot = snapshot();
    setHistory((current) => recordHistorySnapshot(
      current,
      currentSnapshot,
      30,
      (left, right) => left.nodes === right.nodes
        && left.edges === right.edges
        && left.title === right.title,
    ));
  }, [snapshot]);

  const hierarchyOptions = useMemo(() => {
    if (!selectedId || selectedId === "root") return [];
    try {
      const graph = toCanonicalGraph(title, nodes, edges);
      const childrenByParent = new Map<string, string[]>();
      for (const topic of graph.nodes) {
        if (topic.parentId === null) continue;
        const children = childrenByParent.get(topic.parentId) ?? [];
        children.push(topic.id);
        childrenByParent.set(topic.parentId, children);
      }
      const blocked = new Set<string>([selectedId]);
      const queue = [selectedId];
      for (let index = 0; index < queue.length; index += 1) {
        for (const childId of childrenByParent.get(queue[index]) ?? []) {
          if (blocked.has(childId)) continue;
          blocked.add(childId);
          queue.push(childId);
        }
      }
      return graph.nodes.filter((topic) => !blocked.has(topic.id));
    } catch {
      return [];
    }
  }, [selectedId, title, nodes, edges]);

  const selectedParentId = useMemo(() => {
    if (!selectedId || selectedId === "root") return "";
    try {
      return toCanonicalGraph(title, nodes, edges).nodes.find((topic) => topic.id === selectedId)?.parentId ?? "";
    } catch {
      return "";
    }
  }, [selectedId, title, nodes, edges]);

  const reparentSelected = useCallback((parentId: string) => {
    if (!selectedId || selectedId === "root") return;
    try {
      const graph = toCanonicalGraph(title, nodes, edges);
      const next = reparentTopic(graph, selectedId, parentId);
      const visual = fromCanonicalGraph(next);
      remember();
      setNodes(visual.nodes);
      setEdges(visual.edges);
      setNotice("Hierarki topik berhasil diperbarui.");
    } catch (error) {
      setNotice(error instanceof Error ? `Pemindahan parent ditolak: ${error.message}` : "Parent topik tidak valid.");
    }
  }, [selectedId, title, nodes, edges, remember, setNodes, setEdges]);

  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    // Structural deletion must pass through onBeforeDelete and canonical commands.
    const safeChanges = changes.filter((change) => change.type !== "remove");
    if (safeChanges.length > 0) onNodesChange(safeChanges);
  }, [onNodesChange]);

  const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
    // Hierarchy edges are derived from parentId; raw edge removal is never authoritative.
    const safeChanges = changes.filter((change) => change.type !== "remove");
    if (safeChanges.length > 0) onEdgesChange(safeChanges);
  }, [onEdgesChange]);

  const updateSelectedNotes = useCallback((value: string) => {
    if (!selectedId) return;
    try {
      const graph = toCanonicalGraph(title, nodes, edges);
      const next = updateTopicContent(graph, selectedId, { notes: value });
      setNodes(fromCanonicalGraph(next).nodes);
    } catch (error) {
      setNotice(error instanceof Error ? `Catatan ditolak: ${error.message}` : "Catatan tidak valid.");
    }
  }, [selectedId, title, nodes, edges, setNodes]);
  const onConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target || connection.source === connection.target) {
      setNotice("Koneksi harus menghubungkan dua topik yang berbeda.");
      return;
    }
    const duplicate = edges.some((edge) =>
      (edge.data as { relation?: string } | undefined)?.relation === "cross_link"
      && ((edge.source === connection.source && edge.target === connection.target)
        || (edge.source === connection.target && edge.target === connection.source)),
    );
    if (duplicate) {
      setNotice("Relasi silang antara kedua topik sudah tersedia.");
      return;
    }
    try {
      const graph = toCanonicalGraph(title, nodes, edges);
      const next = addCrossLink(graph, {
        id: `link-${crypto.randomUUID()}`,
        source: connection.source,
        target: connection.target,
      });
      const visual = fromCanonicalGraph(next);
      remember();
      setNodes(visual.nodes);
      setEdges(visual.edges);
      setNotice("Relasi silang berhasil ditambahkan.");
    } catch (error) {
      setNotice(error instanceof Error ? `Koneksi ditolak: ${error.message}` : "Koneksi tidak valid.");
    }
  }, [edges, nodes, title, remember, setNodes, setEdges]);

  const onNodeDragStop: NonNullable<ComponentProps<typeof ReactFlow>["onNodeDragStop"]> = useCallback((_event, node) => {
    try {
      const graph = toCanonicalGraph(title, nodes, edges);
      const next = moveTopic(graph, node.id, node.position);
      const visual = fromCanonicalGraph(next);
      setNodes(visual.nodes);
      setEdges(visual.edges);
    } catch (error) {
      setNotice(error instanceof Error ? `Posisi topik ditolak: ${error.message}` : "Posisi topik tidak valid.");
    }
  }, [title, nodes, edges, setNodes, setEdges]);

  const onNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    setSelectedId(node.id);
    setMobilePanel("inspector");
  }, []);
  const onBeforeDelete = useCallback(async ({
    nodes: deletingNodes,
    edges: deletingEdges,
  }: { nodes: Node[]; edges: Edge[] }) => {
    if (deletingNodes.length === 0 && deletingEdges.length === 0) return false;
    try {
      let next = toCanonicalGraph(title, nodes, edges);
      if (deletingNodes.length > 0) {
        const deletingIds = new Set(deletingNodes.map((node) => node.id));
        const roots = deletingNodes.filter((node) => {
          const parentId = next.nodes.find((topic) => topic.id === node.id)?.parentId;
          return parentId === null || parentId === undefined || !deletingIds.has(parentId);
        });
        for (const node of roots) {
          if (next.nodes.some((topic) => topic.id === node.id)) {
            next = deleteTopicSubtree(next, node.id);
          }
        }
      } else {
        if (deletingEdges.some((edge) =>
          (edge.data as { relation?: string } | undefined)?.relation !== "cross_link")) {
          throw new Error("Koneksi hierarki hanya dapat diubah melalui parent topik.");
        }
      }
      const removedCrossLinks = deletingEdges
        .filter((edge) => (edge.data as { relation?: string } | undefined)?.relation === "cross_link")
        .map((edge) => edge.id)
        .filter((id) => next.edges.some((edge) => edge.id === id));
      if (removedCrossLinks.length > 0) next = deleteCrossLinks(next, removedCrossLinks);
      const visual = fromCanonicalGraph(next);
      remember();
      setNodes(visual.nodes);
      setEdges(visual.edges);
      if (selectedId && !next.nodes.some((node) => node.id === selectedId)) setSelectedId("root");
      setNotice("Perubahan penghapusan diterapkan melalui canonical command.");
    } catch (error) {
      setNotice(error instanceof Error ? `Penghapusan ditolak: ${error.message}` : "Penghapusan tidak valid.");
    }
    // The canonical command already applied the operation; prevent React Flow's raw deletion.
    return false;
  }, [title, nodes, edges, remember, setNodes, setEdges, selectedId]);


  const addTopic = useCallback((asChild: boolean) => {
    const root = nodes.find((node) => node.id === "root");
    const parent = asChild
      ? nodes.find((node) => node.id === selectedId) ?? root
      : root;
    if (!parent) return;
    const id = `topic-${crypto.randomUUID()}`;
    try {
      const graph = toCanonicalGraph(title, nodes, edges);
      const next = addChildTopic(graph, {
        id,
        parentId: parent.id,
        label: "Topik baru",
        position: { x: parent.position.x + (asChild ? 250 : 80), y: parent.position.y + (asChild ? 105 : 190) },
      });
      const visual = fromCanonicalGraph(next);
      visual.nodes = visual.nodes.map((node) => node.id !== id ? node : {
        ...node,
        style: { background: dark ? "#24263a" : "#fff", color: dark ? "#f5f6ff" : "#24253b", border: "1px solid #cfd2ec", borderRadius: 14, padding: "13px 18px", fontWeight: 600, minWidth: 130, boxShadow: "0 8px 22px rgba(27,31,59,.07)" },
      });
      remember();
      setNodes(visual.nodes);
      setEdges(visual.edges);
    } catch (error) {
      setNotice(error instanceof Error ? `Topik tidak dapat dibuat: ${error.message}` : "Topik tidak dapat dibuat.");
      return;
    }
    setSelectedId(id);
    setInspectorOpen(true);
    setMobilePanel("inspector");
  }, [nodes, edges, title, selectedId, remember, setNodes, setEdges, dark]);

  const renameSelected = useCallback((value: string) => {
    if (!selectedId) return;
    try {
      const graph = toCanonicalGraph(title, nodes, edges);
      const next = updateTopicContent(graph, selectedId, { label: value });
      setNodes(fromCanonicalGraph(next).nodes);
    } catch (error) {
      setNotice(error instanceof Error ? `Nama topik ditolak: ${error.message}` : "Nama topik tidak valid.");
    }
  }, [selectedId, title, nodes, edges, setNodes]);

  const deleteSelected = useCallback(() => {
    if (!selectedId || selectedId === "root") return;
    try {
      const graph = toCanonicalGraph(title, nodes, edges);
      const next = deleteTopicSubtree(graph, selectedId);
      const visual = fromCanonicalGraph(next);
      remember();
      setNodes(visual.nodes);
      setEdges(visual.edges);
      setSelectedId("root");
      setNotice("Topik dan subcabang hierarkis dihapus. Gunakan Undo untuk memulihkan.");
    } catch (error) {
      setNotice(error instanceof Error ? `Penghapusan ditolak: ${error.message}` : "Topik tidak dapat dihapus.");
    }
  }, [selectedId, edges, nodes, title, remember, setNodes, setEdges]);

  const undo = useCallback(() => {
    const current = syncHistoryPresent(history, snapshot());
    const next = undoHistory(current);
    if (next === current) return;
    setHistory(next);
    setNodes(next.present.nodes);
    setEdges(next.present.edges);
    setTitle(next.present.title);
    setSelectedId(next.present.nodes.some((node) => node.id === selectedId) ? selectedId : "root");
  }, [history, snapshot, selectedId, setNodes, setEdges]);

  const redo = useCallback(() => {
    const current = syncHistoryPresent(history, snapshot());
    const next = redoHistory(current);
    if (next === current) return;
    setHistory(next);
    setNodes(next.present.nodes);
    setEdges(next.present.edges);
    setTitle(next.present.title);
    setSelectedId(next.present.nodes.some((node) => node.id === selectedId) ? selectedId : "root");
  }, [history, snapshot, selectedId, setNodes, setEdges]);

  const importJson = useCallback(async (file?: File) => {
    if (!file) return;
    try {
      const raw: unknown = JSON.parse(await file.text());
      if (!raw || typeof raw !== "object") throw new Error("Dokumen harus berupa objek JSON.");
      const parsed = parseStoredMapDocument(raw);
      remember();
      setNodes(parsed.nodes);
      setEdges(parsed.edges);
      setTitle(parsed.title);
      setSelectedId(parsed.nodes.some((node) => node.id === "root") ? "root" : parsed.nodes[0]?.id ?? null);
      if (!restoreSafe && recoveryBackupSafe) setRestoreSafe(true);
      setNotice(parsed.migrated
        ? "Dokumen lama berhasil dimigrasikan dan dimuat."
        : "Impor dokumen kanonis berhasil divalidasi dan dimuat."
        + (!restoreSafe && !recoveryBackupSafe ? " Autosave tetap dinonaktifkan karena backup draft lama belum terverifikasi." : ""));
    } catch (error) {
      setNotice(error instanceof Error ? "Impor gagal: " + error.message : "Impor gagal karena file tidak valid.");
    } finally {
      if (importInputRef.current) importInputRef.current.value = "";
    }
  }, [remember, setNodes, setEdges, restoreSafe, recoveryBackupSafe]);

  const exportJson = useCallback(() => {
    try {
      const mapDocument = serializeMapDocument(title, nodes, edges);
      const blob = new Blob([mapDocument], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${title.trim().replace(/[^a-z0-9-_]+/gi, "-").toLowerCase() || "mindmap"}.json`;
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setNotice(error instanceof Error ? "Ekspor gagal: " + error.message : "Dokumen tidak dapat diekspor.");
    }
  }, [title, nodes, edges]);

  const visibleNodes = useMemo(() => nodes.filter((node) => String(node.data.label ?? "").toLowerCase().includes(searchTerm.toLowerCase())), [nodes, searchTerm]);

  return (
    <main className={dark ? "app-shell dark-mode" : "app-shell"}>
      <aside className={outlineOpen ? "left-rail" : "left-rail rail-collapsed"}>
        <div className="brand-lockup">
          <div className="brand-mark"><GitBranch size={21} strokeWidth={2.4} /></div>
          {outlineOpen && <div><div className="brand-name">mindmap<span>pro</span></div><div className="brand-caption">VISUAL KNOWLEDGE STUDIO</div></div>}
        </div>
        <button className="workspace-switch" onClick={() => setTitle("Ruang ide saya")} title="Pilih workspace">
          <div className="workspace-avatar">M</div>
          {outlineOpen && <><div className="workspace-copy"><strong>Workspace pribadi</strong><span>Free workspace</span></div><ChevronDown size={15} /></>}
        </button>
        <div className="rail-section-label">{outlineOpen ? "WORKSPACE" : "WS"}</div>
        <nav className="rail-nav">
          <button className="rail-link active"><FolderOpen size={17} /><span>Semua mind map</span><span className="nav-count">4</span></button>
          <button className="rail-link"><LayoutTemplate size={17} /><span>Template</span></button>
          <button className="rail-link"><Sparkles size={17} /><span>AI Knowledge Studio</span><span className="new-pill">NEW</span></button>
        </nav>
        <div className="rail-section-label rail-section-spaced">{outlineOpen ? "TERAKHIR DIBUKA" : "RECENT"}</div>
        <button className="recent-map selected"><span className="recent-dot purple" /><span>Ruang ide saya</span><MoreHorizontal size={15} /></button>
        <button className="recent-map"><span className="recent-dot blue" /><span>Rencana belajar</span></button>
        <button className="recent-map"><span className="recent-dot orange" /><span>Strategi produk</span></button>
        <div className="rail-spacer" />
        <div className="rail-bottom">
          <button className="rail-link"><CircleHelp size={17} /><span>Bantuan & panduan</span></button>
          <button className="rail-link"><Settings2 size={17} /><span>Pengaturan</span></button>
          <div className="profile-card"><div className="profile-avatar">U</div><div className="profile-copy"><strong>Pengguna</strong><span>Workspace owner</span></div><MoreHorizontal size={16} /></div>
        </div>
      </aside>

      <section className="main-column">
        <header className="topbar">
          <div className="breadcrumb"><span>Workspace</span><ArrowRight size={13} /><strong>{title}</strong><button className="icon-button tiny"><ChevronDown size={14} /></button></div>
          <div className="topbar-actions">
            <div className={saveState === "saved" ? "save-indicator is-saved" : "save-indicator"}><span className="save-dot" />{saveState === "saved" ? "Tersimpan lokal" : saveState === "error" ? "Gagal menyimpan" : "Menyimpan…"}</div>
            <button className="icon-button" aria-label="Undo" onClick={undo} disabled={!history.past.length}><Undo2 size={17} /></button>
            <button className="icon-button" aria-label="Redo" onClick={redo} disabled={!history.future.length}><Redo2 size={17} /></button>
            <div className="topbar-divider" />
            <button className="secondary-button hide-small" onClick={() => importInputRef.current?.click()}><FolderOpen size={15} /> Impor</button>
            <button className="secondary-button hide-small" onClick={exportJson}><ArrowDownToLine size={16} /> Ekspor</button>
            <input ref={importInputRef} type="file" accept="application/json,.json" hidden onChange={(event) => void importJson(event.currentTarget.files?.[0])} />
            <button className="primary-button" onClick={() => { navigator.clipboard?.writeText(window.location.href).catch(() => undefined); }}><Share2 size={15} /> Bagikan</button>
          </div>
        </header>

        <div className="map-toolbar">
          <div className="map-title-group"><input className="map-title-input" value={title} onFocus={remember} onChange={(event) => setTitle(event.target.value)} aria-label="Nama mind map" /><div className="map-meta"><span className="privacy-dot" /> Pribadi <span className="meta-separator">·</span> Diperbarui otomatis</div></div>
          <div className="map-tools">
            <button className="tool-button" onClick={() => addTopic(false)}><Plus size={16} /><span>Topik</span></button>
            <button className="tool-button" onClick={() => addTopic(true)}><GitBranch size={16} /><span>Cabang</span></button>
            <button className="tool-button" onClick={() => setMobilePanel("outline")}><AlignLeft size={16} /><span>Outline</span></button>
            <button className="icon-button theme-toggle" aria-label="Toggle theme" onClick={() => setDark((value) => !value)}>{dark ? <Sun size={17} /> : <Moon size={17} />}</button>
            <button className="icon-button panel-toggle" aria-label="Toggle inspector" onClick={() => setInspectorOpen((value) => !value)}><Menu size={17} /></button>
          </div>
        </div>

        <div className="editor-layout">
          {outlineOpen && <section className="outline-panel">
            <div className="panel-heading"><div><span className="panel-eyebrow">NAVIGASI</span><h2>Outline</h2></div><button className="icon-button tiny" aria-label="Sembunyikan outline" onClick={() => setOutlineOpen(false)}><ArrowLeft size={15} /></button></div>
            <label className="search-box"><Search size={15} /><input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Cari topik…" /><kbd>⌘ K</kbd></label>
            <div className="outline-tree">
              {visibleNodes.map((node) => <button key={node.id} className={node.id === selectedId ? "outline-item selected" : "outline-item"} onClick={() => { setSelectedId(node.id); setMobilePanel("inspector"); }}><span className={node.id === "root" ? "tree-icon root-icon" : "tree-icon"}>{node.id === "root" ? <GitBranch size={13} /> : <span />}</span><span>{String(node.data.label ?? "Topik")}</span></button>)}
              <button className="outline-add" onClick={() => addTopic(true)}><Plus size={14} /> Tambah topik</button>
            </div>
            <div className="outline-footer"><span>{nodes.length} topik</span><span>{edges.length} koneksi</span></div>
          </section>}

          <section className="canvas-area" aria-label="Kanvas mind map">
            <div className="canvas-top-label"><span className="canvas-live-dot" /> CANVAS <span>/</span> {nodes.length} NODES</div>
            {!outlineOpen && <button className="floating-open-outline" onClick={() => setOutlineOpen(true)}><AlignLeft size={15} /> Outline</button>}
            <ReactFlow nodes={nodes} edges={edges} onNodesChange={handleNodesChange} onEdgesChange={handleEdgesChange} onNodeDragStart={remember} onNodeDragStop={onNodeDragStop} onConnect={onConnect} onNodeClick={onNodeClick} onBeforeDelete={onBeforeDelete} fitView fitViewOptions={{ padding: 0.22 }} minZoom={0.15} maxZoom={2} deleteKeyCode={["Backspace", "Delete"]} proOptions={{ hideAttribution: true }}>
              <Background variant={BackgroundVariant.Dots} gap={22} size={1} color={dark ? "#34364c" : "#dfe2f0"} />
              <Controls position="bottom-left" />
              <MiniMap position="bottom-right" pannable zoomable nodeColor={(node) => node.id === "root" ? "#6968ee" : "#d9dcf6"} maskColor={dark ? "rgba(10,11,22,.65)" : "rgba(246,247,252,.65)"} />
            </ReactFlow>
            <div className="canvas-hint"><Command size={13} /> Pilih topik untuk mengedit <span>·</span> Seret untuk menyusun</div>
          </section>

          {inspectorOpen && <aside className="inspector-panel">
            <div className="panel-heading"><div><span className="panel-eyebrow">PROPERTI</span><h2>Topik</h2></div><button className="icon-button tiny" aria-label="Tutup properti" onClick={() => setInspectorOpen(false)}><X size={15} /></button></div>
            {selectedNode ? <div className="inspector-content">
              <div className="topic-preview"><div className="topic-preview-icon"><GitBranch size={18} /></div><div><strong>{selectedId === "root" ? "Topik utama" : "Topik cabang"}</strong><span>ID: {(selectedId ?? "unknown").slice(0, 15)}</span></div></div>
              <label className="field-label">Nama topik</label><textarea className="topic-name-field" rows={3} value={selectedLabel} onFocus={remember} onChange={(event) => renameSelected(event.target.value)} />
              <div className="field-label field-label-row">Informasi <span className="optional-label">OPSIONAL</span></div><textarea className="notes-field" rows={4} value={String(selectedNode.data.notes ?? "")} onFocus={remember} onChange={(event) => updateSelectedNotes(event.target.value)} placeholder="Tambahkan catatan, definisi, atau konteks…" />
              {selectedId !== "root" && <><label className="field-label" htmlFor="topic-parent">Parent hierarki</label><select id="topic-parent" className="notes-field" value={selectedParentId} onChange={(event) => reparentSelected(event.target.value)}><option value="" disabled>Pilih parent</option>{hierarchyOptions.map((topic) => <option key={topic.id} value={topic.id}>{topic.data.label}</option>)}</select></>}
              <div className="inspector-divider" />
              <div className="field-label">Aksi cepat</div>
              <button className="action-row" onClick={() => addTopic(true)}><div className="action-icon lavender"><GitBranch size={15} /></div><span><strong>Tambah cabang</strong><small>Buat subtopik dari pilihan</small></span><Plus size={15} /></button>
              <button className="action-row" onClick={() => addTopic(false)}><div className="action-icon mint"><FilePlus2 size={15} /></div><span><strong>Tambah topik bebas</strong><small>Tambahkan ide ke kanvas</small></span><Plus size={15} /></button>
              {selectedId !== "root" && <button className="delete-topic" onClick={deleteSelected}><X size={14} /> Hapus topik terpilih</button>}
              <div className="ai-card"><div className="ai-card-top"><div className="ai-sparkle"><Sparkles size={16} /></div><span>AI KNOWLEDGE STUDIO</span><span className="soon-pill">SEGERA</span></div><strong>Kembangkan pemikiranmu</strong><p>Ubah satu ide menjadi cabang terstruktur, ringkasan, atau pertanyaan belajar.</p><button disabled className="ai-cta">Asisten AI <ArrowRight size={14} /></button></div>
            </div> : <div className="inspector-empty">Pilih topik pada kanvas untuk melihat propertinya.</div>}
          </aside>}
        </div>

        <footer className="statusbar"><div><span className="status-check"><Check size={11} /></span> {notice || "Draft lokal"} <span className="status-divider">/</span> {nodes.length} topik</div><div className="status-right"><span>100%</span><span className="status-divider">·</span><span>Autosave perangkat</span><button onClick={exportJson}><ArrowDownToLine size={13} /> JSON</button></div></footer>
      </section>

      {mobilePanel !== "none" && <div className="mobile-sheet-backdrop" onClick={() => setMobilePanel("none")}><section className="mobile-sheet" onClick={(event) => event.stopPropagation()}><div className="sheet-handle" /><div className="sheet-header"><strong>{mobilePanel === "outline" ? "Outline" : "Properti topik"}</strong><button className="icon-button" onClick={() => setMobilePanel("none")}><X size={17} /></button></div>{mobilePanel === "outline" ? <div className="sheet-list">{nodes.map((node) => <button key={node.id} onClick={() => { setSelectedId(node.id); setMobilePanel("inspector"); }}><GitBranch size={15} />{String(node.data.label ?? "Topik")}<ArrowRight size={14} /></button>)}</div> : <div className="sheet-editor"><label className="field-label">Nama topik</label><textarea rows={2} value={selectedLabel} onFocus={remember} onChange={(event) => renameSelected(event.target.value)} /><button className="primary-button" onClick={() => addTopic(true)}><Plus size={15} /> Tambah cabang</button></div>}</section></div>}
    </main>
  );
}