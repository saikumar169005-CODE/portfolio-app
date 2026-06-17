import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  Plus,
  LogOut,
  Calendar,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  Filter,
  CheckCircle,
  Clock,
  Play,
  RotateCcw,
  Sparkles,
  ArrowUpDown,
  Hash,
  Inbox,
  CalendarDays,
  FolderOpen,
  User,
  ExternalLink,
  MoreVertical,
  Activity
} from "lucide-react";
import { Task, TaskStatus, TaskPriority, User as UserType } from "../types";

interface TaskBoardProps {
  tasks: Task[];
  user: UserType;
  onLogout: () => void;
  onSelectTask: (task: Task) => void;
  onCreateTaskClick: () => void;
  onUpdateStatus: (taskId: string, newStatus: TaskStatus) => Promise<void>;
}

export default function TaskBoard({
  tasks,
  user,
  onLogout,
  onSelectTask,
  onCreateTaskClick,
  onUpdateStatus
}: TaskBoardProps) {
  // Columns config matching the Bento design spec
  const columns: { id: TaskStatus; label: string; bgClass: string; borderClass: string; textColor: string; badgeColor: string }[] = [
    { 
      id: "todo", 
      label: "To Do", 
      bgClass: "bg-white", 
      borderClass: "border-zinc-200", 
      textColor: "text-zinc-900",
      badgeColor: "bg-zinc-100 text-zinc-950"
    },
    { 
      id: "in_progress", 
      label: "In Progress", 
      bgClass: "bg-white", 
      borderClass: "border-zinc-200", 
      textColor: "text-zinc-900",
      badgeColor: "bg-zinc-100 text-zinc-950"
    },
    { 
      id: "done", 
      label: "Done", 
      bgClass: "bg-white", 
      borderClass: "border-zinc-200",
      textColor: "text-zinc-500",
      badgeColor: "bg-zinc-100 text-zinc-500"
    }
  ];

  // States
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "all">("all");
  const [activeTab, setActiveTab] = useState<"inbox" | "today" | "upcoming">("inbox");
  const [sortBy, setSortBy] = useState<"created" | "due">("created");
  const [draggedOverColumn, setDraggedOverColumn] = useState<TaskStatus | null>(null);
  const [isSignoutLoading, setIsSignoutLoading] = useState(false);

  // Productivity Stats
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === "done").length;
  const inProgressTasks = tasks.filter(t => t.status === "in_progress").length;
  const todoTasks = tasks.filter(t => t.status === "todo").length;
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Filter Tasks based on search term & priority, and simulated views
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = 
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.tags && task.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())));
    
    const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
    
    // Tab filtering (Inbox=all, Today=due within next 24h/no due, Upcoming=has due date later)
    let matchesTab = true;
    if (activeTab === "today") {
      // Show high priority or tasks due soon / today
      matchesTab = task.priority === "high" || !task.dueDate;
    } else if (activeTab === "upcoming") {
      matchesTab = !!task.dueDate;
    }

    return matchesSearch && matchesPriority && matchesTab;
  });

  // Sort Tasks
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortBy === "due") {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    } else {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  // Drag handles
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    if (draggedOverColumn !== status) {
      setDraggedOverColumn(status);
    }
  };

  const handleDragLeave = () => {
    setDraggedOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    setDraggedOverColumn(null);
    const taskId = e.dataTransfer.getData("text/plain");
    if (taskId) {
      const t = tasks.find(item => item.id === taskId);
      if (t && t.status !== targetStatus) {
        onUpdateStatus(taskId, targetStatus);
      }
    }
  };

  const handleCheckboxToggle = async (task: Task) => {
    const nextStatus: TaskStatus = task.status === "done" ? "todo" : "done";
    await onUpdateStatus(task.id, nextStatus);
  };

  const handleMobileMove = (taskId: string, currentStatus: TaskStatus, direction: "next" | "prev") => {
    const statusOrder: TaskStatus[] = ["todo", "in_progress", "done"];
    const currentIndex = statusOrder.indexOf(currentStatus);
    let nextIndex = currentIndex;

    if (direction === "next") {
      nextIndex = Math.min(currentIndex + 1, statusOrder.length - 1);
    } else {
      nextIndex = Math.max(currentIndex - 1, 0);
    }

    if (currentIndex !== nextIndex) {
      onUpdateStatus(taskId, statusOrder[nextIndex]);
    }
  };

  const handleSignOutClick = async () => {
    setIsSignoutLoading(true);
    try {
      await onLogout();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSignoutLoading(false);
    }
  };

  // Calendar rendering (May 2026/Immediate current month)
  const currentYear = new Date().getFullYear();
  const currentMonthName = new Date().toLocaleString("default", { month: "long" });
  const currentDay = new Date().getDate();

  return (
    <div id="board-container" className="min-h-screen bg-zinc-50 flex flex-col font-sans text-zinc-900 antialiased">
      {/* Dynamic Header */}
      <header className="h-16 bg-white border-b border-zinc-200 flex items-center justify-between px-4 sm:px-8 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
            <div className="w-3.5 h-3.5 border-2 border-white rounded-sm"></div>
          </div>
          <h1 className="text-lg font-bold tracking-tight font-display text-zinc-900">TaskFlow Pro</h1>
        </div>

        <div className="flex items-center gap-4 sm:gap-6">
          <div className="hidden sm:flex -space-x-1.5">
            <div className="w-7 h-7 rounded-full bg-zinc-900 border-2 border-white flex items-center justify-center text-[9px] font-bold text-white uppercase">
              {user.username.slice(0, 2)}
            </div>
            <div className="w-7 h-7 rounded-full bg-zinc-100 border-2 border-white flex items-center justify-center text-[9px] font-bold text-zinc-600 uppercase">
              OP
            </div>
            <div className="w-7 h-7 rounded-full bg-zinc-200 border-2 border-white flex items-center justify-center text-[9px] font-bold text-zinc-700 uppercase">
              AI
            </div>
          </div>
          <span className="hidden sm:inline h-6 w-px bg-zinc-200"></span>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-semibold leading-tight text-zinc-900">{user.username}</p>
              <p className="text-[10px] text-zinc-500 leading-none">{user.email}</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center font-bold text-xs uppercase text-zinc-700">
              {user.username.slice(0, 1)}
            </div>
          </div>
        </div>
      </header>

      {/* Main Grid: Bento Box Structural layout */}
      <main className="flex-1 p-4 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-5 overflow-y-auto max-w-7xl mx-auto w-full">
        
        {/* Bento Nav Panel (col-span-3) */}
        <div className="md:col-span-3 bg-white border border-zinc-200 rounded-2xl p-4.5 flex flex-col h-fit md:h-auto spark-sidebar select-none">
          <button 
            onClick={onCreateTaskClick}
            className="w-full bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl py-3 text-xs font-bold tracking-wide flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-colors mb-5"
          >
            <Plus size={15} className="stroke-[2.5]" />
            <span>Create Task</span>
          </button>

          <nav id="view-tabs" className="space-y-1.5 mb-6">
            <button
              onClick={() => setActiveTab("inbox")}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                activeTab === "inbox" 
                  ? "bg-zinc-100 text-zinc-900" 
                  : "text-zinc-500 hover:bg-zinc-50/80 hover:text-zinc-900"
              }`}
            >
              <span className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full ${activeTab === "inbox" ? "bg-zinc-900" : "bg-zinc-300"}`}></span> 
                Inbox All
              </span>
              <span className="text-[10px] bg-zinc-200/50 text-zinc-650 px-1.5 py-0.5 rounded-md font-mono">{tasks.length}</span>
            </button>

            <button
              onClick={() => setActiveTab("today")}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                activeTab === "today" 
                  ? "bg-zinc-100 text-zinc-900" 
                  : "text-zinc-500 hover:bg-zinc-50/80 hover:text-zinc-900"
              }`}
            >
              <span className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full ${activeTab === "today" ? "bg-zinc-900" : "bg-transparent border border-zinc-400"}`}></span> 
                Today / Critical
              </span>
              <span className="text-[10px] bg-zinc-200/50 text-zinc-650 px-1.5 py-0.5 rounded-md font-mono">
                {tasks.filter(t => t.priority === "high" || !t.dueDate).length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("upcoming")}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                activeTab === "upcoming" 
                  ? "bg-zinc-100 text-zinc-900" 
                  : "text-zinc-500 hover:bg-zinc-50/80 hover:text-zinc-900"
              }`}
            >
              <span className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full ${activeTab === "upcoming" ? "bg-zinc-900" : "bg-transparent border border-zinc-400"}`}></span> 
                Upcoming
              </span>
              <span className="text-[10px] bg-zinc-200/50 text-zinc-650 px-1.5 py-0.5 rounded-md font-mono">
                {tasks.filter(t => !!t.dueDate).length}
              </span>
            </button>
          </nav>

          {/* Quick instructions / Help tag block */}
          <div className="pt-5 border-t border-zinc-100 mt-auto hidden md:block">
            <span className="text-[9px] uppercase tracking-wider font-bold text-zinc-400 block mb-3.5">
              Active Tags Coverage
            </span>
            <div className="flex flex-wrap gap-1.5">
              {Array.from(new Set(tasks.flatMap(t => t.tags || []))).slice(0, 6).map((tag, i) => (
                <span 
                  key={i} 
                  className="text-[10px] bg-zinc-50 text-zinc-600 border border-zinc-200 px-2 py-0.5 rounded-lg font-medium"
                >
                  #{tag}
                </span>
              ))}
              {tasks.flatMap(t => t.tags || []).length === 0 && (
                <span className="text-[10px] italic text-zinc-400 font-normal">No active tags.</span>
              )}
            </div>
          </div>
        </div>

        {/* Bento Content Area (col-span-6) */}
        <div className="md:col-span-6 flex flex-col gap-4">
          
          {/* Header Filtering box */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-4.5 flex flex-col sm:flex-row items-center gap-3.5 justify-between">
            <div className="relative w-full sm:max-w-[240px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search active queues..."
                className="w-full pl-8.5 pr-3 py-1.5 bg-zinc-50 focus:bg-white text-xs text-zinc-900 border border-zinc-200 focus:border-zinc-900 rounded-xl outline-none transition-all placeholder:text-zinc-400"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as any)}
                className="bg-zinc-50 border border-zinc-200 text-[11px] font-bold text-zinc-650 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-zinc-900 cursor-pointer"
              >
                <option value="all">All Priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-zinc-50 border border-zinc-200 text-[11px] font-bold text-zinc-650 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-zinc-900 cursor-pointer"
              >
                <option value="created">Newest</option>
                <option value="due">Due Date</option>
              </select>
            </div>
          </div>

          {/* Core Kanban columns displaying Bento Grid cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4.5">
            {columns.map(col => {
              const colTasks = sortedTasks.filter(t => t.status === col.id);
              const isOver = draggedOverColumn === col.id;

              return (
                <div
                  id={`col-${col.id}`}
                  key={col.id}
                  onDragOver={(e) => handleDragOver(e, col.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, col.id)}
                  className={`flex flex-col min-h-[450px] bg-white border rounded-2xl p-4 transition-all duration-200 ${
                    isOver ? "border-zinc-900 bg-zinc-100/40 scale-[1.01]" : "border-zinc-200"
                  }`}
                >
                  {/* Column Label */}
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-2 mb-3.5">
                    <span className="text-xs font-bold font-display z-10 text-zinc-800 flex items-center gap-1.5">
                      {col.label}
                      <span className={`text-[10px] font-mono px-1.5 py-0.1 rounded-md ${col.badgeColor}`}>
                        {colTasks.length}
                      </span>
                    </span>
                  </div>

                  {/* Tasks List */}
                  <div className="flex-1 space-y-3 overflow-y-auto max-h-[580px] pr-0.5 select-none">
                    <AnimatePresence mode="popLayout">
                      {colTasks.length === 0 ? (
                        <div className="h-full min-h-[300px] flex flex-col items-center justify-center p-4 text-center border border-dashed border-zinc-200 rounded-xl bg-zinc-50/50">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Empty</span>
                          <span className="text-[9px] text-zinc-400 mt-1 max-w-[120px]">
                            Drag or drop cards or click "+" to build workflow.
                          </span>
                        </div>
                      ) : (
                        colTasks.map(task => (
                          <motion.div
                            key={task.id}
                            layout
                            draggable
                            onDragStart={(e) => handleDragStart(e, task.id)}
                            className="group p-4 bg-white border border-zinc-200/80 hover:border-zinc-900 rounded-xl flex flex-col gap-2 shadow-xs transition-all relative"
                          >
                            {/* Checkbox title connector */}
                            <div className="flex items-start gap-2.5">
                              <input
                                type="checkbox"
                                checked={task.status === "done"}
                                onChange={() => handleCheckboxToggle(task)}
                                className="w-4 h-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 cursor-pointer mt-0.5"
                              />
                              <div className="flex-1 min-w-0">
                                <h4 
                                  onClick={() => onSelectTask(task)}
                                  className={`text-xs font-bold tracking-tight text-zinc-900 hover:text-zinc-600 transition-colors cursor-pointer line-clamp-1 ${
                                    task.status === "done" ? "line-through text-zinc-400 font-medium" : ""
                                  }`}
                                >
                                  {task.title}
                                </h4>
                                {task.description && (
                                  <p className={`text-[11px] text-zinc-550 mt-1 line-clamp-2 leading-tight ${
                                    task.status === "done" ? "line-through text-zinc-400" : ""
                                  }`}>
                                    {task.description}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Badging Footer items */}
                            <div className="flex items-center justify-between gap-1 border-t border-zinc-100 pt-2.5 mt-1.5 flex-wrap">
                              {/* Tag display */}
                              <div className="flex items-center gap-1 overflow-hidden max-w-[60%]">
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wide leading-none shrink-0 ${
                                  task.priority === "high" 
                                    ? "bg-red-50 text-red-705" 
                                    : task.priority === "medium"
                                    ? "bg-amber-50 text-amber-705"
                                    : "bg-zinc-100 text-zinc-650"
                                }`}>
                                  {task.priority}
                                </span>
                              </div>

                              {/* Due display */}
                              {task.dueDate ? (
                                <span className="text-[10px] text-zinc-400 font-mono flex items-center gap-1">
                                  <Calendar size={10} />
                                  {new Date(task.dueDate).toLocaleDateString([], { month: "short", day: "numeric" })}
                                </span>
                              ) : (
                                <span className="text-[9px] text-zinc-300 italic">No deadline</span>
                              )}
                            </div>

                            {/* Desktop quick action buttons */}
                            <div className="absolute right-2.5 top-2 opacity-0 group-hover:opacity-100 flex items-center gap-1 bg-white pl-1.5 transition-opacity">
                              {col.id !== "todo" && (
                                <button
                                  type="button"
                                  onClick={() => handleMobileMove(task.id, task.status, "prev")}
                                  className="p-1 hover:bg-zinc-100 rounded text-zinc-400 hover:text-zinc-900 border border-zinc-150 cursor-pointer"
                                  title="Move Left"
                                >
                                  <ChevronLeft size={10} />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => onSelectTask(task)}
                                className="p-1 hover:bg-zinc-100 rounded text-zinc-400 hover:text-zinc-900 border border-zinc-150 cursor-pointer"
                                title="Edit"
                              >
                                <ChevronRight size={10} />
                              </button>
                            </div>
                          </motion.div>
                        ))
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick task list search results overview / footer credit status */}
          <div className="bg-zinc-100 border border-dashed border-zinc-300 rounded-2xl flex items-center px-4.5 py-3 gap-3">
            <span className="text-lg text-zinc-400 font-light select-none">+</span>
            <input 
              type="text" 
              placeholder="Instant shortcut to create high priority tasks..."
              onClick={onCreateTaskClick}
              readOnly
              className="flex-1 bg-transparent border-none focus:outline-none text-[11px] text-zinc-500 italic cursor-pointer pointer-events-auto"
            />
            <div className="flex gap-1.5 text-[9px] font-bold text-zinc-400 select-none">
              <span className="border border-zinc-300 rounded px-1 flex items-center gap-0.5">SHIFT</span>
              <span className="border border-zinc-300 rounded px-1">N</span>
            </div>
          </div>
        </div>

        {/* Bento Analysis Panel & Small Calendar (col-span-3) */}
        <div className="md:col-span-3 flex flex-col gap-4">
          
          {/* Productivity score cell */}
          <div className="bg-zinc-900 text-white rounded-2xl p-5 flex flex-col justify-between h-[180px] shadow-sm relative overflow-hidden select-none">
            <div className="absolute right-3.5 top-3.5 text-zinc-600">
              <Activity size={18} />
            </div>
            <div>
              <h3 className="text-xs font-semibold opacity-70 mb-3 uppercase tracking-wider">Productivity Score</h3>
              <div className="flex items-baseline gap-1.5">
                <span className="text-4xl font-extrabold tracking-tighter">{completionPercentage}%</span>
                <span className="text-emerald-400 text-xs font-bold flex items-center gap-0.5 shrink-0">+12%</span>
              </div>
              <p className="text-[10px] opacity-50 mt-1 max-w-[150px]">Completion rate calculated instantly from database arrays.</p>
            </div>

            {/* Simulated bar graph */}
            <div className="flex gap-1 items-end h-10 mt-2">
              <div className="w-full bg-white/10 rounded-t h-[30%]"></div>
              <div className="w-full bg-white/10 rounded-t h-[50%]"></div>
              <div className="w-full bg-white/15 rounded-t h-[20%]"></div>
              <div className="w-full bg-white/20 rounded-t h-[70%]"></div>
              <div className="w-full bg-white/40 rounded-t h-[60%]"></div>
              <div className={`w-full rounded-t transition-all ${completionPercentage > 0 ? 'bg-emerald-400' : 'bg-white/10'}`} style={{ height: `${Math.max(15, completionPercentage)}%` }}></div>
            </div>
          </div>

          {/* Bento Calendar / Deadline Tracker */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-5 flex flex-col select-none">
            <h3 className="text-xs font-bold mb-3.5 font-display text-zinc-900 flex items-center justify-between">
              <span>{currentMonthName} {currentYear}</span>
              <CalendarDays size={13} className="text-zinc-400" />
            </h3>

            {/* Mini Grid representation of the calendar */}
            <div className="grid grid-cols-7 gap-y-2 gap-x-1 text-center">
              {["m", "t", "w", "t", "f", "s", "s"].map((d, index) => (
                <span key={index} className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">{d}</span>
              ))}

              {/* Just represent dynamic day sequence */}
              {Array.from({ length: 28 }).map((_, i) => {
                const dayNumber = i + 1;
                const isToday = dayNumber === currentDay;
                return (
                  <span 
                    key={i} 
                    className={`text-[11px] font-mono p-0.5 rounded-full flex items-center justify-center ${
                      isToday 
                        ? "bg-zinc-900 text-white font-bold w-5 h-5 mx-auto" 
                        : "text-zinc-700"
                    }`}
                  >
                    {dayNumber}
                  </span>
                )
              })}
            </div>

            <div className="mt-4 pt-4 border-t border-zinc-100 flex flex-col gap-1.5">
              <span className="text-[8px] uppercase tracking-wider font-bold text-zinc-400">Next Looming Deadline</span>
              {tasks.filter(t => t.status !== "done" && t.dueDate).slice(0, 1).map((t, idx) => (
                <div key={idx} className="flex items-center gap-1.5 p-1.5 bg-zinc-50 rounded-lg border border-zinc-200 overflow-hidden">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></div>
                  <p className="text-[10px] font-semibold text-zinc-700 truncate">{t.title}</p>
                </div>
              ))}
              {tasks.filter(t => t.status !== "done" && t.dueDate).length === 0 && (
                <div className="text-[9px] text-zinc-400 italic">No pressing deadlines.</div>
              )}
            </div>
          </div>

          {/* Bento Account Details and Sign-out block */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-4 flex flex-col justify-between mt-auto">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Sync Mode Active</span>
            </div>
            
            <button
              id="sign-out-btn"
              type="button"
              onClick={handleSignOutClick}
              disabled={isSignoutLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-zinc-50 hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900 text-xs font-bold rounded-xl transition-all cursor-pointer border border-zinc-200 disabled:opacity-50"
            >
              <LogOut size={13} />
              <span>Log Out Securely</span>
            </button>
          </div>

        </div>

      </main>
    </div>
  );
}
