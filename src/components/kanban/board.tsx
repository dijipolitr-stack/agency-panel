"use client";

import { useState, useTransition } from "react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { Plus, Calendar, ExternalLink } from "lucide-react";
import Link from "next/link";
import { cn, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Field } from "@/components/ui/input";
import { Card, CardBody } from "@/components/ui/card";
import { createProjectAction, updateProjectStatusAction } from "@/app/(app)/clients/actions";
import type { ProjectStatus } from "@/types/database";

interface ProjectRow {
  id: string;
  title: string;
  description: string | null;
  status: ProjectStatus;
  position: number;
  due_date: string | null;
  updated_at: string;
}

const COLUMNS: { id: ProjectStatus; label: string; tone: string }[] = [
  { id: "idea", label: "Ideas", tone: "border-ink-600" },
  { id: "production", label: "In production", tone: "border-amber-500/30" },
  { id: "review", label: "Review", tone: "border-blue-500/30" },
  { id: "scheduled", label: "Scheduled", tone: "border-coral/30" },
  { id: "published", label: "Published", tone: "border-sage-500/30" },
];

export function KanbanBoard({
  clientId,
  initialProjects,
}: {
  clientId: string;
  initialProjects: ProjectRow[];
}) {
  const [projects, setProjects] = useState<ProjectRow[]>(initialProjects);
  const [isPending, startTransition] = useTransition();
  const [showNew, setShowNew] = useState<ProjectStatus | null>(null);

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }
    const newStatus = destination.droppableId as ProjectStatus;

    setProjects((prev) => {
      const moving = prev.find((p) => p.id === draggableId);
      if (!moving) return prev;
      const others = prev.filter((p) => p.id !== draggableId);
      const inDest = others.filter((p) => p.status === newStatus).sort((a, b) => a.position - b.position);
      inDest.splice(destination.index, 0, { ...moving, status: newStatus });
      const repositioned = inDest.map((p, idx) => ({ ...p, position: idx }));
      const otherStatus = others.filter((p) => p.status !== newStatus);
      return [...otherStatus, ...repositioned];
    });

    startTransition(async () => {
      await updateProjectStatusAction(draggableId, newStatus, destination.index);
    });
  };

  const handleNew = async (status: ProjectStatus, formData: FormData) => {
    formData.set("client_id", clientId);
    formData.set("status", status);
    const res = await createProjectAction(formData);
    if (res.id) {
      const title = formData.get("title")?.toString() ?? "";
      setProjects((p) => [
        ...p,
        {
          id: res.id!,
          title,
          description: formData.get("description")?.toString() || null,
          status,
          position: p.filter((x) => x.status === status).length,
          due_date: null,
          updated_at: new Date().toISOString(),
        },
      ]);
      setShowNew(null);
    }
  };

  return (
    <div className="px-8 py-8">
      <header className="flex items-end justify-between mb-8">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-coral">⊹ Pipeline</div>
          <h2 className="font-display text-4xl tracking-tightest mt-1">Kanban</h2>
          <p className="text-ink-300 text-sm mt-1">Drag cards to move them through the pipeline.</p>
        </div>
        {isPending && (
          <span className="text-[10px] font-mono uppercase tracking-wider text-ink-400 animate-fade-in">
            Saving...
          </span>
        )}
      </header>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 min-h-[600px]">
          {COLUMNS.map((col) => {
            const colProjects = projects
              .filter((p) => p.status === col.id)
              .sort((a, b) => a.position - b.position);
            return (
              <div key={col.id} className={cn("rounded-md border bg-ink-800/30 flex flex-col", col.tone)}>
                <div className="px-3 py-2.5 flex items-center justify-between border-b border-ink-700">
                  <div className="flex items-center gap-2">
                    <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-ink-200">
                      {col.label}
                    </div>
                    <span className="text-[10px] font-mono text-ink-500">{colProjects.length}</span>
                  </div>
                  <button
                    onClick={() => setShowNew(col.id)}
                    className="w-6 h-6 rounded flex items-center justify-center text-ink-400 hover:bg-ink-700 hover:text-coral transition-colors"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        "flex-1 p-2 space-y-2 min-h-[200px] transition-colors",
                        snapshot.isDraggingOver && "bg-coral/5",
                      )}
                    >
                      {colProjects.map((p, idx) => (
                        <Draggable key={p.id} draggableId={p.id} index={idx}>
                          {(provided, snap) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={cn(
                                "p-3 rounded-md bg-ink-700/60 border border-ink-600 backdrop-blur-sm",
                                "hover:border-coral/40 transition-colors group",
                                snap.isDragging && "border-coral shadow-2xl rotate-1",
                              )}
                            >
                              <div className="font-display text-sm text-ink-50 leading-snug">{p.title}</div>
                              {p.description && (
                                <div className="text-[11px] text-ink-300 mt-1 line-clamp-2">{p.description}</div>
                              )}
                              <div className="flex items-center justify-between mt-3">
                                <div className="text-[9px] font-mono uppercase tracking-wider text-ink-500">
                                  {p.due_date ? (
                                    <span className="flex items-center gap-1">
                                      <Calendar size={10} /> {formatDate(p.due_date)}
                                    </span>
                                  ) : (
                                    formatDate(p.updated_at)
                                  )}
                                </div>
                                <Link
                                  href={`/clients/${clientId}/content?project=${p.id}`}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity text-coral"
                                >
                                  <ExternalLink size={11} />
                                </Link>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}

                      {showNew === col.id && (
                        <Card className="bg-ink-700/80">
                          <CardBody>
                            <form
                              action={(fd) => handleNew(col.id, fd)}
                              className="space-y-3"
                            >
                              <Field label="Title" htmlFor={`new-${col.id}`}>
                                <Input id={`new-${col.id}`} name="title" autoFocus required placeholder="Q4 launch teaser" />
                              </Field>
                              <Textarea name="description" placeholder="Description (optional)" rows={2} />
                              <div className="flex gap-2">
                                <Button size="sm" type="submit">Create</Button>
                                <Button size="sm" variant="ghost" type="button" onClick={() => setShowNew(null)}>
                                  Cancel
                                </Button>
                              </div>
                            </form>
                          </CardBody>
                        </Card>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}
