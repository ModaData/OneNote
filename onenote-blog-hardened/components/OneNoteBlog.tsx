'use client'
import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  NotebookPen,
  Search,
  MoreVertical,
  Star,
  Trash2,
  Save,
  Undo2,
  Redo2,
  GripVertical,
} from "lucide-react";

// ---- Rich Text: TipTap ----
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";

// ---- Drag & Drop: dnd-kit ----
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ------------------------------------------------------------
// OneNote-style Blog (Admin-only authoring)
// - Notebooks > Sections > Pages
// - TipTap rich-text editor
// - Drag-to-reorder sections & pages (dnd-kit)
// - LocalStorage persistence (can be swapped for DB later)
// - Read-only mode by default; pass isAdmin={true} to enable edit
// ------------------------------------------------------------

type Notebook = { id: string; title: string };
type Section = { id: string; title: string };
type Page = {
  id: string;
  title: string;
  content: string; // TipTap JSON string
  createdAt: string;
  updatedAt: string;
  starred?: boolean;
  trashed?: boolean;
};

const uid = () => Math.random().toString(36).slice(2, 10);
const nowISO = () => new Date().toISOString();

const DEFAULT_DATA = () => {
  const nbId = uid();
  const secId = uid();
  const pageId = uid();
  return {
    notebooks: [{ id: nbId, title: "Site" } as Notebook],
    sections: { [nbId]: [{ id: secId, title: "General" } as Section] } as Record<string, Section[]>,
    pages: {
      [secId]: [
        {
          id: pageId,
          title: "Welcome",
          content: JSON.stringify({
            type: "doc",
            content: [
              { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Hello!" }] },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "This is your OneNote-style blog. Only the admin can post or edit.",
                  },
                ],
              },
              {
                type: "bulletList",
                content: [
                  {
                    type: "listItem",
                    content: [
                      { type: "paragraph", content: [{ type: "text", text: "Create notebooks/sections/pages" }] },
                    ],
                  },
                  {
                    type: "listItem",
                    content: [{ type: "paragraph", content: [{ type: "text", text: "Rich text powered by TipTap" }] }],
                  },
                  {
                    type: "listItem",
                    content: [{ type: "paragraph", content: [{ type: "text", text: "Drag to reorder" }] }],
                  },
                ],
              },
            ],
          }),
          createdAt: nowISO(),
          updatedAt: nowISO(),
          starred: true,
          trashed: false,
        } as Page,
      ],
    } as Record<string, Page[]>,
    ui: {
      activeNotebookId: nbId,
      activeSectionId: secId,
      activePageId: pageId,
    },
  };
};

const STORAGE_KEY = "onenote_blog_v1";

function useLocalState(): [any, React.Dispatch<any>] {
  const [state, setState] = useState<any>(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
      return raw ? JSON.parse(raw) : DEFAULT_DATA();
    } catch {
      return DEFAULT_DATA();
    }
  });
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      }
    } catch {}
  }, [state]);
  return [state, setState];
}

function classNames(...arr: (string | false | null | undefined)[]) {
  return arr.filter(Boolean).join(" ");
}

const palette = {
  bg: "bg-white",
  subtle: "bg-zinc-50",
  border: "border-zinc-200",
  text: "text-zinc-800",
  textMuted: "text-zinc-500",
  shadow: "shadow-sm",
};

// ---- Sortable Row helper ----
function SortableRow({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} className={classNames(isDragging && "opacity-70")}>
      <div className="flex items-center gap-2">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab rounded-lg border border-zinc-200 bg-white p-1 text-zinc-500 hover:bg-zinc-50 active:cursor-grabbing"
          title="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}

// ---- TipTap Toolbar ----
function RTToolbar({ editor, isAdmin }: { editor: any; isAdmin: boolean }) {
  if (!editor) return null;
  const btn = (extra = "") =>
    classNames("rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs hover:bg-zinc-50 disabled:opacity-50", extra);

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 px-6 py-2">
      <button disabled={!isAdmin} onClick={() => editor.chain().focus().toggleBold().run()} className={btn(editor.isActive("bold") ? "bg-zinc-100" : "")}>
        <strong>B</strong>
      </button>
      <button disabled={!isAdmin} onClick={() => editor.chain().focus().toggleItalic().run()} className={btn(editor.isActive("italic") ? "bg-zinc-100" : "")}>
        <em>I</em>
      </button>
      <button disabled={!isAdmin} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={btn(editor.isActive("heading", { level: 1 }) ? "bg-zinc-100" : "")}>
        H1
      </button>
      <button disabled={!isAdmin} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={btn(editor.isActive("heading", { level: 2 }) ? "bg-zinc-100" : "")}>
        H2
      </button>
      <button disabled={!isAdmin} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={btn(editor.isActive("heading", { level: 3 }) ? "bg-zinc-100" : "")}>
        H3
      </button>
      <div className="mx-2 h-6 w-px bg-zinc-200" />
      <button disabled={!isAdmin} onClick={() => editor.chain().focus().toggleBulletList().run()} className={btn(editor.isActive("bulletList") ? "bg-zinc-100" : "")}>
        • List
      </button>
      <button disabled={!isAdmin} onClick={() => editor.chain().focus().toggleTaskList().run()} className={btn(editor.isActive("taskList") ? "bg-zinc-100" : "")}>
        ☐ Tasks
      </button>
      <div className="mx-2 h-6 w-px bg-zinc-200" />
      <button disabled={!isAdmin} onClick={() => editor.chain().focus().undo().run()} className={btn()}>
        <Undo2 className="h-4 w-4" />
      </button>
      <button disabled={!isAdmin} onClick={() => editor.chain().focus().redo().run()} className={btn()}>
        <Redo2 className="h-4 w-4" />
      </button>
    </div>
  );
}

// ---- Main Component ----
export default function OneNoteBlog({ isAdmin = false }: { isAdmin?: boolean }) {
  const [data, setData] = useLocalState();
  const [query, setQuery] = useState("");

  const activeNotebookId: string = data.ui.activeNotebookId;
  const activeSectionId: string = data.ui.activeSectionId;
  const activePageId: string = data.ui.activePageId;

  const notebooks: Notebook[] = data.notebooks;
  const sections: Section[] = data.sections[activeNotebookId] || [];
  const pages: Page[] = data.pages[activeSectionId] || [];

  // Search (titles + JSON text content)
  const searchResults = useMemo(() => {
    if (!query.trim()) return pages.filter((p) => !p.trashed);
    const q = query.toLowerCase();
    return pages.filter((p) => {
      if (p.trashed) return false;
      const titleHit = (p.title || "").toLowerCase().includes(q);
      let text = "";
      try {
        const doc = JSON.parse(p.content);
        text = JSON.stringify(doc).toLowerCase();
      } catch {}
      return titleHit || text.includes(q);
    });
  }, [pages, query]);

  // Active page
  const activePage = pages.find((p) => p.id === activePageId && !p.trashed);

  // TipTap Editor
  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          bulletList: {
            keepMarks: true,
          },
        }),
        Placeholder.configure({ placeholder: "Write your post…" }),
        TaskList,
        TaskItem.configure({ nested: true }),
      ],
      content: activePage ? safeParseJSON(activePage.content) : undefined,
      editable: isAdmin,
      onUpdate: ({ editor }) => {
        if (!activePage || !isAdmin) return;
        updatePageContent(activePage.id, { content: JSON.stringify(editor.getJSON()) });
      },
    },
    [activePage?.id, isAdmin]
  );

  useEffect(() => {
    if (editor && activePage) {
      editor.commands.setContent(safeParseJSON(activePage.content));
      editor.setEditable(isAdmin);
    }
  }, [activePage?.id, isAdmin]);

  // Persistence helpers
  function setActiveNotebook(id: string) {
    setData((s: any) => ({
      ...s,
      ui: { ...s.ui, activeNotebookId: id, activeSectionId: (s.sections[id] || [])[0]?.id, activePageId: undefined },
    }));
  }
  function setActiveSection(id: string) {
    setData((s: any) => ({ ...s, ui: { ...s.ui, activeSectionId: id, activePageId: undefined } }));
  }
  function setActivePage(id: string) {
    setData((s: any) => ({ ...s, ui: { ...s.ui, activePageId: id } }));
  }
  function prettifyDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleString();
  }

  // CRUD (admin only for create/update/delete)
  function createNotebook() {
    if (!isAdmin) return;
    const id = uid();
    const title = prompt("Notebook name", "New Notebook");
    if (!title) return;
    setData((s: any) => ({
      ...s,
      notebooks: [...s.notebooks, { id, title }],
      sections: { ...s.sections, [id]: [] },
      ui: { ...s.ui, activeNotebookId: id, activeSectionId: undefined, activePageId: undefined },
    }));
  }
  function renameNotebook(id: string) {
    if (!isAdmin) return;
    const nb = notebooks.find((n) => n.id === id);
    const title = prompt("Rename notebook", nb?.title || "Notebook");
    if (!title) return;
    setData((s: any) => ({ ...s, notebooks: s.notebooks.map((n: Notebook) => (n.id === id ? { ...n, title } : n)) }));
  }
  function createSection() {
    if (!isAdmin || !activeNotebookId) return;
    const id = uid();
    const title = prompt("Section name", "New Section");
    if (!title) return;
    setData((s: any) => ({
      ...s,
      sections: { ...s.sections, [activeNotebookId]: [...(s.sections[activeNotebookId] || []), { id, title }] },
      ui: { ...s.ui, activeSectionId: id, activePageId: undefined },
    }));
  }
  function renameSection(id: string) {
    if (!isAdmin) return;
    const sec = sections.find((x) => x.id === id);
    const title = prompt("Rename section", sec?.title || "Section");
    if (!title) return;
    setData((s: any) => ({
      ...s,
      sections: {
        ...s.sections,
        [activeNotebookId]: (s.sections[activeNotebookId] || []).map((x: Section) => (x.id === id ? { ...x, title } : x)),
      },
    }));
  }
  function createPage() {
    if (!isAdmin || !activeSectionId) return;
    const id = uid();
    const now = nowISO();
    const newPage: Page = {
      id,
      title: "Untitled",
      content: JSON.stringify({ type: "doc", content: [{ type: "paragraph" }] }),
      createdAt: now,
      updatedAt: now,
      starred: false,
      trashed: false,
    };
    setData((s: any) => ({
      ...s,
      pages: { ...s.pages, [activeSectionId]: [newPage, ...(s.pages[activeSectionId] || [])] },
      ui: { ...s.ui, activePageId: id },
    }));
  }
  function updatePageContent(id: string, { title, content }: { title?: string; content?: string }) {
    const now = nowISO();
    setData((s: any) => ({
      ...s,
      pages: {
        ...s.pages,
        [activeSectionId]: (s.pages[activeSectionId] || []).map((p: Page) =>
          p.id === id ? { ...p, title: title ?? p.title, content: content ?? p.content, updatedAt: now } : p
        ),
      },
    }));
  }
  function toggleStarPage(id: string) {
    if (!isAdmin) return;
    setData((s: any) => ({
      ...s,
      pages: {
        ...s.pages,
        [activeSectionId]: (s.pages[activeSectionId] || []).map((p: Page) => (p.id === id ? { ...p, starred: !p.starred } : p)),
      },
    }));
  }
  function trashPage(id: string) {
    if (!isAdmin) return;
    if (!confirm("Move page to Trash?")) return;
    setData((s: any) => ({
      ...s,
      pages: {
        ...s.pages,
        [activeSectionId]: (s.pages[activeSectionId] || []).map((p: Page) => (p.id === id ? { ...p, trashed: true } : p)),
      },
      ui: { ...s.ui, activePageId: undefined },
    }));
  }

  // Drag handlers (sections)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  function onDragEndSections(e: any) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setData((s: any) => {
      const arr: Section[] = [...(s.sections[activeNotebookId] || [])];
      const from = arr.findIndex((x) => x.id === active.id);
      const to = arr.findIndex((x) => x.id === over.id);
      const reordered = arrayMove(arr, from, to);
      return { ...s, sections: { ...s.sections, [activeNotebookId]: reordered } };
    });
  }
  // Drag handlers (pages)
  function onDragEndPages(e: any) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setData((s: any) => {
      const arr: Page[] = [...(s.pages[activeSectionId] || [])];
      const from = arr.findIndex((x) => x.id === active.id);
      const to = arr.findIndex((x) => x.id === over.id);
      const reordered = arrayMove(arr, from, to);
      return { ...s, pages: { ...s.pages, [activeSectionId]: reordered } };
    });
  }

  return (
    <div className={classNames("h-[85vh] w-full", palette.bg, palette.text)}>
      {/* Top bar */}
      <div className={classNames("sticky top-0 z-10 border-b", palette.border, palette.subtle)}>
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-2">
          <div className="flex items-center gap-2">
            <NotebookPen className="h-5 w-5" />
            <span className="font-semibold">OneNote Blog</span>
            {!isAdmin && <span className="text-xs text-zinc-500">(read-only)</span>}
          </div>

          <div className="flex flex-1 items-center justify-center">
            <div className="relative w-full max-w-xl">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-zinc-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search posts…"
                className="w-full rounded-xl border border-zinc-200 bg-white pl-8 pr-3 py-2 text-sm outline-none ring-zinc-200 placeholder:text-zinc-400 focus:ring-2"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <>
                <ToolbarButton icon={Plus} label="New Page" onClick={createPage} />
                <ToolbarButton icon={Save} label="Save" onClick={() => { /* autosave */ }} />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto flex h-[calc(85vh-52px)] max-w-7xl">
        {/* Left: Sections (we keep a single notebook for simplicity) */}
        <aside className={classNames("flex w-56 flex-col border-r", palette.border)}>
          <div className="flex items-center justify-between px-3 py-2">
            <div className="text-xs uppercase tracking-wide text-zinc-500">Sections</div>
            {isAdmin && (
              <button
                className="rounded-lg border border-zinc-200 bg-white p-1 hover:bg-zinc-50"
                title="New section"
                onClick={createSection}
              >
                <Plus className="h-4 w-4" />
              </button>
            )}
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEndSections}>
            <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              <div className="flex-1 overflow-auto px-2 pb-2">
                {sections.length === 0 && <div className="px-3 py-2 text-xs text-zinc-500">No sections yet</div>}
                {sections.map((sec) => (
                  <SortableRow key={sec.id} id={sec.id}>
                    <button
                      onClick={() => setActiveSection(sec.id)}
                      onDoubleClick={() => isAdmin && renameSection(sec.id)}
                      className={classNames(
                        "mb-1 w-full rounded-xl px-3 py-2 text-left text-sm",
                        data.ui.activeSectionId === sec.id ? "bg-zinc-100" : "hover:bg-zinc-50"
                      )}
                    >
                      <div className="line-clamp-1 font-medium">{sec.title}</div>
                    </button>
                  </SortableRow>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </aside>

        {/* Middle: Pages */}
        <aside className={classNames("flex w-72 flex-col border-r", palette.border)}>
          <div className="mt-1 px-3 py-2 text-xs uppercase tracking-wide text-zinc-500">Pages</div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEndPages}>
            <SortableContext items={searchResults.map((p) => p.id)} strategy={verticalListSortingStrategy}>
              <div className="flex-1 overflow-auto px-2 pb-2">
                {searchResults.length === 0 && <div className="px-3 py-6 text-center text-sm text-zinc-500">No pages</div>}
                {searchResults.map((p) => (
                  <SortableRow key={p.id} id={p.id}>
                    <button
                      onClick={() => setActivePage(p.id)}
                      className={classNames(
                        "group mb-1 w-full rounded-xl border bg-white px-3 py-2 text-left",
                        palette.border,
                        palette.shadow,
                        activePageId === p.id ? "ring-2 ring-zinc-200" : "hover:bg-zinc-50"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="line-clamp-1 font-medium">{p.title || "Untitled"}</div>
                        <div className="flex items-center gap-2 text-zinc-400">
                          {p.starred && <Star className="h-4 w-4 fill-current" />}
                          <MoreVertical className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
                        </div>
                      </div>
                      <div className="mt-1 text-[10px] text-zinc-400">Updated {prettifyDate(p.updatedAt)}</div>
                      {isAdmin && (
                        <div className="mt-2 flex gap-1">
                          <MiniTag
                            icon={Star}
                            label={p.starred ? "Starred" : "Star"}
                            onClick={(e: any) => {
                              e.stopPropagation();
                              toggleStarPage(p.id);
                            }}
                          />
                          <MiniTag
                            icon={Trash2}
                            label="Trash"
                            onClick={(e: any) => {
                              e.stopPropagation();
                              trashPage(p.id);
                            }}
                          />
                        </div>
                      )}
                    </button>
                  </SortableRow>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </aside>

        {/* Main: Reader/Editor */}
        <main className="flex min-w-0 flex-1 flex-col">
          {activePage ? (
            <div className="flex h-full flex-col">
              {/* Page header */}
              <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-3">
                <input
                  value={activePage.title}
                  onChange={(e) => isAdmin && updatePageContent(activePage.id, { title: e.target.value })}
                  placeholder="Untitled"
                  readOnly={!isAdmin}
                  className="w-full max-w-[70%] rounded-lg border border-transparent px-2 py-1 text-lg font-semibold outline-none focus:border-zinc-200 read-only:text-zinc-700"
                />
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <span>Created {prettifyDate(activePage.createdAt)}</span>
                  <span>•</span>
                  <span>Updated {prettifyDate(activePage.updatedAt)}</span>
                </div>
              </div>

              <RTToolbar editor={editor} isAdmin={isAdmin} />

              <div className="h-full w-full flex-1 overflow-auto px-6 py-4">
                <div className="prose prose-zinc max-w-none">
                  <EditorContent editor={editor} />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-zinc-500">Select a page</div>
          )}
        </main>
      </div>
    </div>
  );
}

function MiniTag({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: any }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50"
    >
      <Icon className="h-3 w-3" />
      {label}
    </button>
  );
}

function ToolbarButton({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: any }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm hover:bg-zinc-50 active:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-200"
    >
      <Icon className="h-4 w-4" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function safeParseJSON(str?: string) {
  try {
    return JSON.parse(str || "");
  } catch {
    return { type: "doc", content: [{ type: "paragraph" }] };
  }
}
