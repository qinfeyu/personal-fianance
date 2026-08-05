"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { type Todo } from "@/lib/types";
import { Plus, Trash2, CheckCircle2, Circle, Loader2, ListTodo } from "lucide-react";
import { cn } from "@/lib/utils";

export default function TodoPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const fetchTodos = useCallback(async () => {
    setLoading(true);
    setError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error: fetchError } = await supabase
      .from("todos")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setTodos((data as Todo[]) || []);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  async function handleAddTodo(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setAdding(true);
    setError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("User not authenticated.");
      setAdding(false);
      return;
    }

    const { error: insertError } = await supabase.from("todos").insert({
      user_id: user.id,
      title: newTitle.trim(),
      completed: false,
    });

    if (insertError) {
      setError(insertError.message);
    } else {
      setNewTitle("");
      await fetchTodos();
    }
    setAdding(false);
  }

  async function handleToggleTodo(todo: Todo) {
    setActionId(todo.id);
    setError(null);
    const { error: updateError } = await supabase
      .from("todos")
      .update({ completed: !todo.completed })
      .eq("id", todo.id);

    if (updateError) {
      setError(updateError.message);
    } else {
      await fetchTodos();
    }
    setActionId(null);
  }

  async function handleDeleteTodo(id: string) {
    setActionId(id);
    setError(null);
    const { error: deleteError } = await supabase.from("todos").delete().eq("id", id);
    if (deleteError) {
      setError(deleteError.message);
    } else {
      await fetchTodos();
    }
    setActionId(null);
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
      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 text-sm">
          {error}
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
                const isActioned = actionId === todo.id;
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
                    <div
                      onClick={() => !isActioned && handleToggleTodo(todo)}
                      className="flex items-center gap-3 flex-1 cursor-pointer min-w-0"
                    >
                      {isActioned && actionId === todo.id ? (
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
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-white/20 hover:text-red-400 hover:bg-red-500/10 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2"
                      onClick={() => handleDeleteTodo(todo.id)}
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
    </div>
  );
}
