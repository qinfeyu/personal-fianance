"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { type Todo } from "@/lib/types";
import {
  useAddTodo,
  useDeleteTodo,
  useTodos,
  useToggleTodo,
} from "@/hooks/useTodos";
import { Plus, Trash2, CheckCircle2, Circle, Loader2, ListTodo } from "lucide-react";
import { cn, friendlyErrorMessage } from "@/lib/utils";

export default function TodoPage() {
  const [newTitle, setNewTitle] = useState("");
  const [todoToDelete, setTodoToDelete] = useState<Todo | null>(null);

  const todosQuery = useTodos();
  const addTodo = useAddTodo();
  const toggleTodo = useToggleTodo();
  const deleteTodo = useDeleteTodo();

  const todos = todosQuery.data ?? [];
  const loading = todosQuery.isLoading;
  const adding = addTodo.isPending;

  async function handleAddTodo(e: React.FormEvent) {
    e.preventDefault();
    const title = newTitle.trim();

    if (!title) return;

    try {
      await addTodo.mutateAsync(title);
      setNewTitle("");
    } catch {
      // The mutation surfaces its own error toast.
    }
  }

  function handleToggleTodo(todo: (typeof todos)[number]) {
    toggleTodo.mutate(todo);
  }

  function handleDeleteTodo(todo: (typeof todos)[number]) {
    setTodoToDelete(todo);
  }

  const completedCount = todos.filter((t) => t.completed).length;
  const pendingCount = todos.length - completedCount;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <ListTodo className="w-6 h-6 text-violet-400" />
          Financial To-Do List
        </h1>
        <p className="text-white/40 text-sm mt-0.5">
          Track financial goals, bills to pay, or general reminders
        </p>
      </div>

      {/* Error Message */}
      {todosQuery.error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 text-sm">
          {friendlyErrorMessage(todosQuery.error, "Couldn't load your tasks.")}
        </div>
      )}

      {/* Quick Add Form */}
      <Card className="border-white/[0.08] bg-white/[0.03]">
        <CardContent className="pt-6">
          <form onSubmit={handleAddTodo} className="flex gap-2">
            <Input
              id="todo-input"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Cancel unused subscriptions, Pay electric bill..."
              disabled={adding}
              className="flex-1"
            />
            <Button type="submit" disabled={adding || !newTitle.trim()} className="gap-1.5 shadow-lg shadow-violet-900/30">
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add Task
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Todo List Card */}
      <Card className="border-white/[0.08] bg-white/[0.03]">
        <CardHeader className="pb-3 border-b border-white/[0.06] flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <span>Tasks</span>
            {!loading && (
              <span className="text-white/40 font-normal text-xs">
                ({todos.length})
              </span>
            )}
          </CardTitle>
          <div className="flex gap-2">
            <Badge variant="outline" className="border-violet-500/30 text-violet-300">
              {pendingCount} pending
            </Badge>
            {completedCount > 0 && (
              <Badge variant="outline" className="border-emerald-500/30 text-emerald-300">
                {completedCount} completed
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          {loading ? (
            <div className="space-y-3 py-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="animate-pulse flex items-center gap-3">
                  <div className="w-5 h-5 bg-white/10 rounded-full" />
                  <div className="h-4 bg-white/10 rounded w-full" />
                  <div className="w-5 h-5 bg-white/10 rounded" />
                </div>
              ))}
            </div>
          ) : todos.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <p className="text-3xl">📝</p>
              <p className="text-white/40 text-sm">No tasks added yet</p>
            </div>
          ) : (
            <div className="space-y-1">
              {todos.map((todo) => {
                const isToggling =
                  toggleTodo.isPending &&
                  toggleTodo.variables?.id === todo.id;
                const isDeleting =
                  deleteTodo.isPending &&
                  deleteTodo.variables?.id === todo.id;
                const isActioned = isToggling || isDeleting;
                return (
                  <div
                    key={todo.id}
                    className={cn(
                      "group flex items-center justify-between p-3 rounded-xl border transition-all duration-150",
                      todo.completed
                        ? "border-white/[0.04] bg-white/[0.01] opacity-60"
                        : "border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.05]"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleTodo(todo)}
                      disabled={isActioned}
                      className="flex items-center gap-3 flex-1 cursor-pointer min-w-0 text-left"
                    >
                      {isToggling || isDeleting ? (
                        <Loader2 className="w-5 h-5 animate-spin text-white/30" />
                      ) : todo.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                      ) : (
                        <Circle className="w-5 h-5 text-white/30 hover:text-violet-400 transition-colors flex-shrink-0" />
                      )}
                      <span
                        className={cn(
                          "text-sm font-medium text-white/90 truncate",
                          todo.completed && "line-through text-white/40"
                        )}
                      >
                        {todo.title}
                      </span>
                    </button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-white/20 hover:text-red-400 hover:bg-red-500/10 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2"
                      onClick={() => handleDeleteTodo(todo)}
                      disabled={isActioned}
                      aria-label="Delete task"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={todoToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setTodoToDelete(null);
        }}
        title="Delete task?"
        description={
          todoToDelete
            ? `"${todoToDelete.title}" will be permanently deleted.`
            : ""
        }
        onConfirm={() => {
          if (todoToDelete) deleteTodo.mutate(todoToDelete);
          setTodoToDelete(null);
        }}
      />
    </div>
  );
}
