import React, { useState, useEffect } from "react";
import { User, Task, TaskStatus } from "./types";
import AuthScreen from "./components/AuthScreen";
import TaskBoard from "./components/TaskBoard";
import TaskModal from "./components/TaskModal";
import { Kanban, RefreshCw, LogOut, Loader2 } from "lucide-react";

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem("task_mgr_token"));
  const [user, setUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal controllers
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Authenticate / Validate active session token on mount
  useEffect(() => {
    async function checkAuth() {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
          // Load initially
          await fetchTasks(token);
        } else {
          // Token is dead, wipe local state
          handleLogoutLocal();
        }
      } catch (err) {
        console.error("Network error during session verification:", err);
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, [token]);

  // Real-time synchronization periodic triggers
  useEffect(() => {
    if (!token || !user) return;

    // Fast polling fallback to keep columns real-time on multi-device/multi-tab edits
    const interval = setInterval(() => {
      fetchTasks(token, true); // true indicates a silent background refresh
    }, 7000);

    return () => clearInterval(interval);
  }, [token, user]);

  // Fetch tasks helper
  const fetchTasks = async (authToken: string, silent = false) => {
    try {
      const response = await fetch("/api/tasks", {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks || []);
      }
    } catch (err) {
      if (!silent) {
        console.error("Failed to load tasks:", err);
      }
    }
  };

  const handleAuthSuccess = (newToken: string, newUser: User) => {
    localStorage.setItem("task_mgr_token", newToken);
    setToken(newToken);
    setUser(newUser);
    fetchTasks(newToken);
  };

  const handleLogoutLocal = () => {
    localStorage.removeItem("task_mgr_token");
    setToken(null);
    setUser(null);
    setTasks([]);
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
    } catch (err) {
      console.error("Logout request failed:", err);
    } finally {
      handleLogoutLocal();
    }
  };

  // Drag-and-drop state updates
  const handleUpdateStatus = async (taskId: string, newStatus: TaskStatus) => {
    if (!token) return;

    // Optimistic state update representing fluid desktop UX
    const originalTasks = [...tasks];
    setTasks(prevTasks =>
      prevTasks.map(t => (t.id === taskId ? { ...t, status: newStatus, updatedAt: new Date().toISOString() } : t))
    );

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        throw new Error("Failed to save column state.");
      }

      await fetchTasks(token, true); // Silent database synchronization
    } catch (error) {
      console.error(error);
      // Revert state on error
      setTasks(originalTasks);
    }
  };

  // CRUD Operations handler
  const handleSaveTask = async (taskData: Partial<Task>) => {
    if (!token) return;

    if (selectedTask) {
      // UPDATE Mode
      const response = await fetch(`/api/tasks/${selectedTask.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(taskData)
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to update task.");
      }

      const updated = await response.json();
      setTasks(prev => prev.map(t => (t.id === updated.id ? updated : t)));
    } else {
      // CREATE Mode
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(taskData)
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to create task.");
      }

      const created = await response.json();
      setTasks(prev => [...prev, created]);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!token) return;

    // Optimistic Delete
    const originalTasks = [...tasks];
    setTasks(prev => prev.filter(t => t.id !== taskId));

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error("Failed to delete the task.");
      }
    } catch (error) {
      console.error(error);
      setTasks(originalTasks);
      throw error;
    }
  };

  const handleOpenCreateModal = () => {
    setSelectedTask(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (task: Task) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  if (loading) {
    return (
      <div id="loader-container" className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <span className="text-sm font-semibold text-gray-500 font-sans">Connecting to server...</span>
      </div>
    );
  }

  // Not authenticated? Show Login / Sign Up UI
  if (!token || !user) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div id="application-layout" className="min-h-screen bg-gray-50/50">
      {/* Task Board Dashboard */}
      <TaskBoard
        tasks={tasks}
        user={user}
        onLogout={handleLogout}
        onSelectTask={handleOpenEditModal}
        onCreateTaskClick={handleOpenCreateModal}
        onUpdateStatus={handleUpdateStatus}
      />

      {/* Shared Edit & Creation Modal */}
      {isModalOpen && (
        <TaskModal
          task={selectedTask}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveTask}
          onDelete={selectedTask ? handleDeleteTask : undefined}
        />
      )}
    </div>
  );
}
