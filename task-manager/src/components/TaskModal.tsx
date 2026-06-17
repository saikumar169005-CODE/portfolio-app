import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { X, Calendar, Tag, AlertTriangle, AlertCircle, Plus, Trash2, CheckCircle } from "lucide-react";
import { Task, TaskStatus, TaskPriority } from "../types";

interface TaskModalProps {
  task: Task | null; // If null, we are in CREATE mode
  onClose: () => void;
  onSave: (taskData: Partial<Task>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export default function TaskModal({ task, onClose, onSave, onDelete }: TaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (task) {
      setTitle(task.title || "");
      setDescription(task.description || "");
      setStatus(task.status || "todo");
      setPriority(task.priority || "medium");
      setDueDate(task.dueDate ? task.dueDate.split("T")[0] : "");
      setTagsInput(task.tags ? task.tags.join(", ") : "");
    } else {
      setTitle("");
      setDescription("");
      setStatus("todo");
      setPriority("medium");
      setDueDate("");
      setTagsInput("");
    }
    setError(null);
  }, [task]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Please specify a task title.");
      return;
    }

    setLoading(true);

    const processedTags = tagsInput
      .split(",")
      .map(tag => tag.trim())
      .filter(Boolean);

    const taskPayload: Partial<Task> = {
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      dueDate: dueDate || undefined,
      tags: processedTags
    };

    try {
      await onSave(taskPayload);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save the task.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = async () => {
    if (!task || !onDelete) return;
    if (!window.confirm("Are you sure you want to permanently delete this task?")) return;

    setLoading(true);
    setError(null);

    try {
      await onDelete(task.id);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to delete the task.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="task-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-[2px]">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.15 }}
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl border border-zinc-200 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-100 bg-zinc-50/50">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${task ? "bg-zinc-800" : "bg-zinc-400"}`} />
            <h2 id="task-modal-title" className="text-base font-bold font-display text-zinc-900">
              {task ? "Edit Task Details" : "Create New Task"}
            </h2>
          </div>
          <button
            id="close-modal-button"
            type="button"
            onClick={onClose}
            className="p-1 px-1.5 text-zinc-400 hover:text-zinc-650 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2 text-red-700 text-xs font-semibold">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1" htmlFor="task-title">
              Task Title <span className="text-red-500">*</span>
            </label>
            <input
              id="task-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. review system architecture"
              className="w-full px-3.5 py-2.5 border border-zinc-200 focus:border-zinc-900 rounded-xl text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900/10 transition-all bg-zinc-50/30 focus:bg-white"
              maxLength={150}
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1" htmlFor="task-desc">
              Description
            </label>
            <textarea
              id="task-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the outcomes, scope, or subtasks involved..."
              className="w-full px-3.5 py-2.5 border border-zinc-200 focus:border-zinc-900 rounded-xl text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900/10 transition-all bg-zinc-50/30 focus:bg-white resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1" htmlFor="task-status">
                Status
              </label>
              <select
                id="task-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm text-zinc-900 focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900/10 bg-white cursor-pointer"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1" htmlFor="task-priority">
                Priority Label
              </label>
              <select
                id="task-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm text-zinc-900 focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900/10 bg-white cursor-pointer"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1" htmlFor="task-due">
                Due Date
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
                  <Calendar size={15} />
                </span>
                <input
                  id="task-due"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-zinc-200 rounded-xl text-sm text-zinc-900 focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900/10 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1" htmlFor="task-tags">
                Tags (Comma separated)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
                  <Tag size={15} />
                </span>
                <input
                  id="task-tags"
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="e.g. backend, brand, refactor"
                  className="w-full pl-9 pr-3 py-2 border border-zinc-200 rounded-xl text-sm text-zinc-900 focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900/10 bg-white placeholder:text-zinc-400"
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-zinc-150 mt-6">
            {task && onDelete ? (
              <button
                id="delete-task-button"
                type="button"
                onClick={handleDeleteClick}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-700 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                <Trash2 size={14} />
                <span>Delete</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                id="cancel-modal-button"
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-zinc-600 hover:text-zinc-900 border border-zinc-200 hover:bg-zinc-50 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="save-task-button"
                type="submit"
                disabled={loading}
                className="flex items-center gap-1.5 px-4.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {task ? (
                      <span>Save Changes</span>
                    ) : (
                      <>
                        <Plus size={14} className="stroke-[2.5]" />
                        <span>Create Task</span>
                      </>
                    )}
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
