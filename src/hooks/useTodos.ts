"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useUserId } from "@/lib/user-context";
import { queryKeys } from "@/lib/query-keys";
import { useToast } from "@/lib/toast";
import type { Todo } from "@/lib/types";

interface OptimisticContext {
  previous?: Todo[];
  tempId?: string;
}

export function useTodos() {
  const userId = useUserId();
  const supabase = createClient();

  return useQuery({
    queryKey: queryKeys.todos(userId),
    queryFn: async (): Promise<Todo[]> => {
      const { data, error } = await supabase
        .from("todos")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);

      return (data || []) as Todo[];
    },
  });
}

export function useAddTodo() {
  const userId = useUserId();
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const queryKey = queryKeys.todos(userId);

  return useMutation<Todo, Error, string, OptimisticContext>({
    mutationFn: async (title) => {
      const { data, error } = await supabase
        .from("todos")
        .insert({ user_id: userId, title, completed: false })
        .select("*")
        .single();

      if (error) throw new Error(error.message);

      return data as Todo;
    },
    onMutate: async (title) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Todo[]>(queryKey);
      const tempId = `optimistic-${Date.now()}-${Math.random()}`;

      if (previous) {
        queryClient.setQueryData<Todo[]>(queryKey, [
          {
            id: tempId,
            user_id: userId,
            title,
            completed: false,
            created_at: new Date().toISOString(),
          },
          ...previous,
        ]);
      }

      return { previous, tempId };
    },
    onError: (error, _title, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      toast({
        title: "Could not add task",
        description: error.message,
        variant: "error",
      });
    },
    onSuccess: (todo, _title, context) => {
      queryClient.setQueryData<Todo[]>(queryKey, (current = []) => [
        todo,
        ...current.filter((item) => item.id !== context?.tempId),
      ]);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey, refetchType: "none" });
    },
  });
}

export function useToggleTodo() {
  const userId = useUserId();
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const queryKey = queryKeys.todos(userId);

  return useMutation<Todo, Error, Todo, OptimisticContext>({
    mutationFn: async (todo) => {
      const { data, error } = await supabase
        .from("todos")
        .update({ completed: !todo.completed })
        .eq("id", todo.id)
        .eq("user_id", userId)
        .select("*")
        .single();

      if (error) throw new Error(error.message);

      return data as Todo;
    },
    onMutate: async (todo) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Todo[]>(queryKey);

      queryClient.setQueryData<Todo[]>(queryKey, (current = []) =>
        current.map((item) =>
          item.id === todo.id ? { ...item, completed: !item.completed } : item
        )
      );

      return { previous };
    },
    onError: (error, _todo, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      toast({
        title: "Could not update task",
        description: error.message,
        variant: "error",
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey, refetchType: "none" });
    },
  });
}

export function useDeleteTodo() {
  const userId = useUserId();
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const queryKey = queryKeys.todos(userId);

  return useMutation<void, Error, Todo, OptimisticContext>({
    mutationFn: async (todo) => {
      const { error } = await supabase
        .from("todos")
        .delete()
        .eq("id", todo.id)
        .eq("user_id", userId);

      if (error) throw new Error(error.message);
    },
    onMutate: async (todo) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Todo[]>(queryKey);

      queryClient.setQueryData<Todo[]>(queryKey, (current = []) =>
        current.filter((item) => item.id !== todo.id)
      );

      return { previous };
    },
    onError: (error, _todo, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      toast({
        title: "Could not delete task",
        description: error.message,
        variant: "error",
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey, refetchType: "none" });
    },
  });
}
