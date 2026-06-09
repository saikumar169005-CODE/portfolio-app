const express = require("express");
const cors = require("cors");
const connectDB = require("./db");
const Project = require("./models/Project");

const app = express();
app.use(cors());
app.use(express.json());

connectDB();

// Add project
app.post("/projects", async (req, res) => {
    const project = new Project(req.body);
    await project.save();
    res.send(project);
});

// Get projects
app.get("/projects", async (req, res) => {
    const projects = await Project.find();
    res.send(projects);
});

app.listen(5000, () => {
    console.log("Server running on port 5000");
});