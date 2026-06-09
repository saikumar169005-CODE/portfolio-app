fetch("http://localhost:5000/projects")
.then(res => res.json())
.then(data => {
    const container = document.getElementById("projects");

    data.forEach(project => {
        const card = document.createElement("div");
        card.classList.add("card");

        card.innerHTML = `
            <h3>${project.title}</h3>
            <p>${project.description}</p>
            <a href="${project.link}" target="_blank">View Project</a>
        `;

        container.appendChild(card);
    });
});