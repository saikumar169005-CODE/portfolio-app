import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;
const DB_PATH = path.join(process.cwd(), "data", "db.json");

// Ensure data directory exists
if (!fs.existsSync(path.dirname(DB_PATH))) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

interface UserDbEntry {
  id: string;
  email: string;
  username: string;
  salt: string;
  passwordHash: string;
  createdAt: string;
}

interface SessionEntry {
  userId: string;
  username: string;
  email: string;
  expiresAt: number;
}

interface TaskDbEntry {
  id: string;
  userId: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
}

interface DatabaseSchema {
  users: UserDbEntry[];
  tasks: TaskDbEntry[];
  sessions: Record<string, SessionEntry>;
}

// Read database helper
function getDb(): DatabaseSchema {
  try {
    if (fs.existsSync(DB_PATH)) {
      const content = fs.readFileSync(DB_PATH, "utf-8");
      return JSON.parse(content);
    }
  } catch (error) {
    console.error("Error reading database file, resetting:", error);
  }
  const defaultDb: DatabaseSchema = { users: [], tasks: [], sessions: {} };
  saveDb(defaultDb);
  return defaultDb;
}

// Write database helper
function saveDb(db: DatabaseSchema) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing to database file:", error);
  }
}

// Cryptography helpers
function generateSalt(): string {
  return crypto.randomBytes(16).toString("hex");
}

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, "sha256").toString("hex");
}

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

app.use(express.json());

// Authentication Middleware
function authenticateToken(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    res.status(401).json({ error: "Access denied. Token missing." });
    return;
  }

  const db = getDb();
  const session = db.sessions[token];

  if (!session || session.expiresAt < Date.now()) {
    if (session) {
      delete db.sessions[token];
      saveDb(db);
    }
    res.status(401).json({ error: "Session expired or invalid. Please sign in again." });
    return;
  }

  // Extend session duration on active use (e.g. 1 hour)
  session.expiresAt = Date.now() + 60 * 60 * 1000;
  saveDb(db);

  (req as any).user = {
    id: session.userId,
    username: session.username,
    email: session.email,
  };
  next();
}

// Auth Routes

// 1. Register
app.post("/api/auth/register", (req, res) => {
  const { email, username, password } = req.body;

  if (!email || !username || !password) {
    res.status(400).json({ error: "All fields are required." });
    return;
  }

  const db = getDb();

  // Check unique constraints
  const lowerEmail = email.toLowerCase().trim();
  const lowerUsername = username.toLowerCase().trim();

  if (db.users.some(u => u.email.toLowerCase() === lowerEmail)) {
    res.status(400).json({ error: "An account with this email already exists." });
    return;
  }

  if (db.users.some(u => u.username.toLowerCase() === lowerUsername)) {
    res.status(400).json({ error: "This username is already taken." });
    return;
  }

  const salt = generateSalt();
  const passwordHash = hashPassword(password, salt);
  const userId = crypto.randomUUID();

  const newUser: UserDbEntry = {
    id: userId,
    email: email.trim(),
    username: username.trim(),
    salt,
    passwordHash,
    createdAt: new Date().toISOString()
  };

  db.users.push(newUser);

  // Auto-login upon registration
  const token = generateToken();
  db.sessions[token] = {
    userId: newUser.id,
    username: newUser.username,
    email: newUser.email,
    expiresAt: Date.now() + 60 * 60 * 1000 // 1 hour
  };

  saveDb(db);

  res.status(201).json({
    message: "Registration successful",
    token,
    user: {
      id: newUser.id,
      email: newUser.email,
      username: newUser.username,
      createdAt: newUser.createdAt
    }
  });
});

// 2. Login
app.post("/api/auth/login", (req, res) => {
  const { identity, password } = req.body; // identity can be email or username

  if (!identity || !password) {
    res.status(400).json({ error: "Identity (email/username) and password are required." });
    return;
  }

  const db = getDb();
  const lowerIdentity = identity.toLowerCase().trim();

  const user = db.users.find(
    u => u.email.toLowerCase() === lowerIdentity || u.username.toLowerCase() === lowerIdentity
  );

  if (!user) {
    res.status(401).json({ error: "Invalid credentials. Please double check and try again." });
    return;
  }

  const checkHash = hashPassword(password, user.salt);
  if (checkHash !== user.passwordHash) {
    res.status(401).json({ error: "Invalid credentials. Please double check and try again." });
    return;
  }

  const token = generateToken();
  db.sessions[token] = {
    userId: user.id,
    username: user.username,
    email: user.email,
    expiresAt: Date.now() + 60 * 60 * 1000 // 1 hour
  };

  saveDb(db);

  res.json({
    message: "Sign in successful",
    token,
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      createdAt: user.createdAt
    }
  });
});

// 3. Logout
app.post("/api/auth/logout", (req, res) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token) {
    const db = getDb();
    if (db.sessions[token]) {
      delete db.sessions[token];
      saveDb(db);
    }
  }

  res.json({ message: "Successfully logged out" });
});

// 4. Me/Verify Session
app.get("/api/auth/me", authenticateToken, (req, res) => {
  res.json({ user: (req as any).user });
});


// Task CRUD Operations

// 1. Get all tasks for authenticated user
app.get("/api/tasks", authenticateToken, (req, res) => {
  const userId = (req as any).user.id;
  const db = getDb();
  const userTasks = db.tasks.filter(t => t.userId === userId);
  res.json({ tasks: userTasks });
});

// 2. Create dynamic task
app.post("/api/tasks", authenticateToken, (req, res) => {
  const userId = (req as any).user.id;
  const { title, description, status, priority, dueDate, tags } = req.body;

  if (!title) {
    res.status(400).json({ error: "Task title is required." });
    return;
  }

  const db = getDb();
  const newTask: TaskDbEntry = {
    id: crypto.randomUUID(),
    userId,
    title: title.trim(),
    description: (description || "").trim(),
    status: status || "todo",
    priority: priority || "medium",
    dueDate: dueDate || undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: Array.isArray(tags) ? tags.map(t => t.trim()).filter(Boolean) : []
  };

  db.tasks.push(newTask);
  saveDb(db);

  res.status(201).json(newTask);
});

// 3. Update task
app.put("/api/tasks/:id", authenticateToken, (req, res) => {
  const userId = (req as any).user.id;
  const { id } = req.params;
  const { title, description, status, priority, dueDate, tags } = req.body;

  const db = getDb();
  const taskIndex = db.tasks.findIndex(t => t.id === id && t.userId === userId);

  if (taskIndex === -1) {
    res.status(404).json({ error: "Task not found or access denied." });
    return;
  }

  const existingTask = db.tasks[taskIndex];

  const updatedTask: TaskDbEntry = {
    ...existingTask,
    title: title !== undefined ? title.trim() : existingTask.title,
    description: description !== undefined ? description.trim() : existingTask.description,
    status: status !== undefined ? status : existingTask.status,
    priority: priority !== undefined ? priority : existingTask.priority,
    dueDate: dueDate !== undefined ? dueDate : existingTask.dueDate,
    updatedAt: new Date().toISOString(),
    tags: Array.isArray(tags) ? tags.map(t => t.trim()).filter(Boolean) : existingTask.tags
  };

  db.tasks[taskIndex] = updatedTask;
  saveDb(db);

  res.json(updatedTask);
});

// 4. Delete task
app.delete("/api/tasks/:id", authenticateToken, (req, res) => {
  const userId = (req as any).user.id;
  const { id } = req.params;

  const db = getDb();
  const taskIndex = db.tasks.findIndex(t => t.id === id && t.userId === userId);

  if (taskIndex === -1) {
    res.status(404).json({ error: "Task not found or access denied." });
    return;
  }

  db.tasks.splice(taskIndex, 1);
  saveDb(db);

  res.json({ message: "Task deleted successfully", id });
});


// Dev support & Production Vite configurations
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server loaded on http://0.0.0.0:${PORT}`);
  });
}

startServer();
