// Processes the `students` array defined in students-data.js
const output = document.getElementById("output");
const majorSelect = document.getElementById("major");
const minGpaInput = document.getElementById("minGpa");

function renderTable(list) {
  const rows = list
    .map(s => `<tr><td>${s.id}</td><td>${s.name}</td><td>${s.major}</td><td>${s.year}</td><td>${s.gpa.toFixed(1)}</td><td>${s.skills.join(", ")}</td></tr>`)
    .join("");
  output.innerHTML = `<table><thead><tr><th>ID</th><th>Name</th><th>Major</th><th>Year</th><th>GPA</th><th>Skills</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function renderSummary(list) {
  const avg = list.length ? list.reduce((sum, s) => sum + s.gpa, 0) / list.length : 0;
  const top = list.reduce((best, s) => (!best || s.gpa > best.gpa ? s : best), null);
  const byMajor = list.reduce((acc, s) => {
    acc[s.major] = (acc[s.major] || 0) + 1;
    return acc;
  }, {});
  const skills = [...new Set(list.flatMap(s => s.skills))].sort();

  document.getElementById("summary").innerHTML = `
    <li>Count: ${list.length}</li>
    <li>Average GPA: ${avg.toFixed(2)}</li>
    <li>Top student: ${top ? top.name + " (" + top.gpa + ")" : "n/a"}</li>
    <li>By major: ${Object.entries(byMajor).map(([m, n]) => `${m} (${n})`).join(", ") || "n/a"}</li>
    <li>Unique skills: ${skills.join(", ") || "n/a"}</li>`;
}

function update() {
  const major = majorSelect.value;
  const minGpa = parseFloat(minGpaInput.value) || 0;
  const filtered = students
    .filter(s => (major === "All" || s.major === major) && s.gpa >= minGpa)
    .sort((a, b) => b.gpa - a.gpa);
  renderTable(filtered);
  renderSummary(filtered);
}

// Build the major dropdown from the data itself
["All", ...new Set(students.map(s => s.major))].forEach(m => {
  majorSelect.add(new Option(m, m));
});

majorSelect.addEventListener("change", update);
minGpaInput.addEventListener("input", update);
update();
