const form = document.getElementById("goal-form");
const input = document.getElementById("goal-input");
const list = document.getElementById("goal-list");

let goals = JSON.parse(localStorage.getItem("goals")) || [];

function saveGoals() {
  localStorage.setItem("goals", JSON.stringify(goals));
}

function renderGoals() {
  list.innerHTML = "";
  goals.forEach((goal, index) => {
    const li = document.createElement("li");
    li.className = goal.completed ? "completed" : "";

    li.innerHTML = `
      <span onclick="toggleGoal(${index})">${goal.text}</span>
      <button onclick="removeGoal(${index})">Sil</button>
    `;
    list.appendChild(li);
  });
}

function toggleGoal(index) {
  goals[index].completed = !goals[index].completed;
  saveGoals();
  renderGoals();
}

function removeGoal(index) {
  goals.splice(index, 1);
  saveGoals();
  renderGoals();
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (text !== "") {
    goals.push({ text, completed: false });
    input.value = "";
    saveGoals();
    renderGoals();
  }
});

renderGoals();
