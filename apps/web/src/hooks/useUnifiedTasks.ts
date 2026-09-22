'use client';
import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';
import { useTaskStore } from '../store/useTaskStore';
import type { Task } from '../types';

interface LocalTask {
  id: string;
  title: string;
  description?: string;
  done: boolean;
  priority: 1 | 2 | 3;
  dueDate?: string;
  createdAt: string;
}

/**
 * Unified hook that manages tasks across both pre-login (localStorage) and post-login (database).
 * - Before login: Uses localStorage (client-side only)
 * - After login: Fetches from database and stores in Zustand
 * - On login: Syncs localStorage tasks to database
 */
export function useUnifiedTasks() {
  const isAuth = useAuthStore(s => s.isAuth);
  const { tasks: dbTasks, setTasks: setDbTasks, addTask, updateTask, removeTask, setLoading } = useTaskStore();

  const [localTasks, setLocalTasks] = useState<LocalTask[]>([]);
  const [loading, setLocalLoading] = useState(!isAuth);

  const LS_KEY = 'tf_tasks';

  // Load localStorage tasks on mount (if not authenticated)
  useEffect(() => {
    if (!isAuth) {
      try {
        const stored = localStorage.getItem(LS_KEY);
        setLocalTasks(stored ? JSON.parse(stored) : []);
      } catch {
        setLocalTasks([]);
      }
      setLocalLoading(false);
    }
  }, [isAuth]);

  // Fetch database tasks when authenticated
  useEffect(() => {
    if (isAuth) {
      fetchDatabaseTasks();
    }
  }, [isAuth]);

  async function fetchDatabaseTasks() {
    try {
      setLoading(true);
      const { data } = await api.get('/api/tasks');
      setDbTasks(data.data || []);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      setLoading(false);
    }
  }

  // Get tasks - local if not authed, database if authed
  const getTasks = useCallback((): (LocalTask | Task)[] => {
    return isAuth ? dbTasks : localTasks;
  }, [isAuth, dbTasks, localTasks]);

  // Persist local tasks to localStorage
  const persistLocalTasks = (tasks: LocalTask[]) => {
    localStorage.setItem(LS_KEY, JSON.stringify(tasks));
  };

  // Add task - works for both authenticated and non-authenticated
  const addTaskUnified = useCallback((task: Partial<Task> | LocalTask) => {
    if (isAuth) {
      // Add to database via API
      api.post('/api/tasks', {
        title: task.title,
        description: task.description,
        priority: task.priority,
        dueDate: task.dueDate,
        tags: (task as any).tags,
      }).then(res => {
        addTask(res.data.data);
      }).catch(err => console.error('Failed to add task:', err));
    } else {
      // Add to localStorage
      const localTask: LocalTask = {
        id: Date.now().toString(),
        title: task.title || '',
        description: task.description,
        priority: (task.priority as 1 | 2 | 3) || 2,
        dueDate: task.dueDate,
        done: false,
        createdAt: new Date().toISOString(),
      };
      const updated = [localTask, ...localTasks];
      setLocalTasks(updated);
      persistLocalTasks(updated);
    }
  }, [isAuth, localTasks, addTask]);

  // Update task
  const updateTaskUnified = useCallback((id: string, data: Partial<Task | LocalTask>) => {
    if (isAuth) {
      // Update in database
      api.patch(`/api/tasks/${id}`, {
        title: data.title,
        description: data.description,
        priority: data.priority,
        dueDate: data.dueDate,
        status: (data as any).status,
        tags: (data as any).tags,
      }).then(res => {
        updateTask(id, res.data.data);
      }).catch(err => console.error('Failed to update task:', err));
    } else {
      // Update in localStorage
      const updated = localTasks.map(t =>
        t.id === id
          ? {
              ...t,
              title: data.title ?? t.title,
              description: data.description ?? t.description,
              priority: (data.priority as 1 | 2 | 3) ?? t.priority,
              dueDate: data.dueDate ?? t.dueDate,
              done: (data as LocalTask).done ?? t.done,
            }
          : t
      );
      setLocalTasks(updated);
      persistLocalTasks(updated);
    }
  }, [isAuth, localTasks, updateTask]);

  // Delete task
  const deleteTaskUnified = useCallback((id: string) => {
    if (isAuth) {
      // Delete from database
      api.delete(`/api/tasks/${id}`).then(() => {
        removeTask(id);
      }).catch(err => console.error('Failed to delete task:', err));
    } else {
      // Delete from localStorage
      const updated = localTasks.filter(t => t.id !== id);
      setLocalTasks(updated);
      persistLocalTasks(updated);
    }
  }, [isAuth, localTasks, removeTask]);

  // Toggle task completion
  const toggleTaskUnified = useCallback((id: string) => {
    if (isAuth) {
      const task = dbTasks.find(t => t.id === id);
      if (task) {
        const request = task.status === 'done'
          ? api.patch(`/api/tasks/${id}`, { status: 'pending' })
          : api.post(`/api/tasks/${id}/complete`);
        request.then(res => {
          updateTask(id, res.data.data);
        }).catch(err => console.error('Failed to toggle task:', err));
      }
    } else {
      const task = localTasks.find(t => t.id === id);
      if (task) {
        const updated = localTasks.map(t =>
          t.id === id ? { ...t, done: !t.done } : t
        );
        setLocalTasks(updated);
        persistLocalTasks(updated);
      }
    }
  }, [isAuth, dbTasks, localTasks, updateTask]);

  return {
    tasks: getTasks(),
    loading: isAuth ? loading : false,
    addTask: addTaskUnified,
    updateTask: updateTaskUnified,
    deleteTask: deleteTaskUnified,
    toggleTask: toggleTaskUnified,
    refetch: fetchDatabaseTasks,
  };
}
