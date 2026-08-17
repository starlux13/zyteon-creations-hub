import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  List,
  ListOrdered,
  Plus,
  Save,
  Trash2,
  Underline,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { usePanel } from "@/components/panel/panel-context";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/panel/notas")({
  component: NotasPage,
});

type NoteRow = {
  id: string;
  title: string;
  content: string;
  updated_at: string;
};

function NotasPage() {
  const { user } = useAuth();
  const { setDirty } = usePanel();
  const queryClient = useQueryClient();
  const editorRef = useRef<HTMLDivElement>(null);

  const notesQuery = useQuery({
    queryKey: ["notes", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("notes")
        .select("id, title, content, updated_at")
        .order("updated_at", { ascending: false });
      return (data ?? []) as NoteRow[];
    },
  });

  const [activeId, setActiveId] = useState<string | null>(null);
  const [title, setTitle] = useState("");

  const notes = notesQuery.data ?? [];
  const active = notes.find((n) => n.id === activeId) ?? null;

  useEffect(() => {
    if (!activeId && notes.length) setActiveId(notes[0]!.id);
  }, [activeId, notes]);

  useEffect(() => {
    if (!active) return;
    setTitle(active.title);
    if (editorRef.current) editorRef.current.innerHTML = active.content || "";
  }, [active?.id]);

  const exec = (command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    setDirty(true);
  };

  const createNote = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("notes")
      .insert({ user_id: user.id, title: "Nota nueva", content: "" })
      .select("id, title, content, updated_at")
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["notes", user.id] });
    setActiveId((data as NoteRow).id);
  };

  const saveNote = async () => {
    if (!active) return;
    const { error } = await supabase
      .from("notes")
      .update({ title, content: editorRef.current?.innerHTML ?? "" })
      .eq("id", active.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setDirty(false);
    await queryClient.invalidateQueries({ queryKey: ["notes", user?.id] });
    toast.success("Nota guardada");
  };

  const removeNote = async (id: string) => {
    await supabase.from("notes").delete().eq("id", id);
    if (activeId === id) setActiveId(null);
    await queryClient.invalidateQueries({ queryKey: ["notes", user?.id] });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Bloc de notas</h1>
          <p className="text-sm text-muted-foreground">Con formato de texto tipo procesador.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={createNote}>
            <Plus className="mr-2 h-4 w-4" /> Nueva nota
          </Button>
          <Button onClick={saveNote} disabled={!active}>
            <Save className="mr-2 h-4 w-4" /> Guardar
          </Button>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
        <aside className="space-y-2">
          {notes.map((note) => (
            <div
              key={note.id}
              className={`surface-panel flex items-center gap-2 rounded-xl p-3 ${
                note.id === activeId ? "ring-2 ring-primary" : ""
              }`}
            >
              <button onClick={() => setActiveId(note.id)} className="min-w-0 flex-1 text-left">
                <p className="truncate text-sm font-medium">{note.title}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(note.updated_at).toLocaleDateString()}
                </p>
              </button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => void removeNote(note.id)}
                aria-label="Eliminar nota"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {!notes.length ? (
            <p className="text-sm text-muted-foreground">Crea tu primera nota.</p>
          ) : null}
        </aside>

        <section className="surface-panel space-y-3 rounded-2xl p-4">
          <Input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setDirty(true);
            }}
            placeholder="Título de la nota"
            className="border-0 bg-transparent px-0 font-display text-xl font-semibold focus-visible:ring-0"
            disabled={!active}
          />
          <div className="flex flex-wrap items-center gap-1 rounded-xl border border-border p-2">
            <ToolButton label="Negrita" onClick={() => exec("bold")}>
              <Bold className="h-4 w-4" />
            </ToolButton>
            <ToolButton label="Cursiva" onClick={() => exec("italic")}>
              <Italic className="h-4 w-4" />
            </ToolButton>
            <ToolButton label="Subrayado" onClick={() => exec("underline")}>
              <Underline className="h-4 w-4" />
            </ToolButton>
            <Separator orientation="vertical" className="mx-1 h-6" />
            <ToolButton label="Lista" onClick={() => exec("insertUnorderedList")}>
              <List className="h-4 w-4" />
            </ToolButton>
            <ToolButton label="Lista numerada" onClick={() => exec("insertOrderedList")}>
              <ListOrdered className="h-4 w-4" />
            </ToolButton>
            <Separator orientation="vertical" className="mx-1 h-6" />
            <ToolButton label="Izquierda" onClick={() => exec("justifyLeft")}>
              <AlignLeft className="h-4 w-4" />
            </ToolButton>
            <ToolButton label="Centrar" onClick={() => exec("justifyCenter")}>
              <AlignCenter className="h-4 w-4" />
            </ToolButton>
            <ToolButton label="Derecha" onClick={() => exec("justifyRight")}>
              <AlignRight className="h-4 w-4" />
            </ToolButton>
            <Separator orientation="vertical" className="mx-1 h-6" />
            <select
              className="rounded-md border border-border bg-background px-2 py-1 text-sm"
              onChange={(e) => exec("formatBlock", e.target.value)}
              defaultValue="p"
            >
              <option value="p">Párrafo</option>
              <option value="h1">Título 1</option>
              <option value="h2">Título 2</option>
              <option value="h3">Título 3</option>
              <option value="blockquote">Cita</option>
            </select>
          </div>
          <div
            ref={editorRef}
            contentEditable={!!active}
            suppressContentEditableWarning
            onInput={() => setDirty(true)}
            className="prose-notes min-h-[50vh] rounded-xl border border-border bg-background/60 p-5 text-sm leading-relaxed outline-none"
          />
        </section>
      </div>
    </div>
  );
}

function ToolButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button type="button" size="icon" variant="ghost" aria-label={label} onClick={onClick}>
      {children}
    </Button>
  );
}
