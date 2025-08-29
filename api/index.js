// index.js - Sağlık İzleme Uygulaması (Frontend Controller)
// Uzun vadeli bir geliştirme süreci sonucunda detaylı özellikler barındırır.

import { Tracker } from "./tracker.js";

const API_URL = "http://localhost:3000/api"; // backend endpoint

class HealthApp {
  constructor() {
    this.token = null;
    this.tracker = new Tracker(API_URL);

    // UI Elements
    this.loginForm = document.getElementById("login-form");
    this.registerForm = document.getElementById("register-form");
    this.dashboard = document.getElementById("dashboard");
    this.logoutBtn = document.getElementById("logout-btn");
    this.statsContainer = document.getElementById("stats");
    this.activityForm = document.getElementById("activity-form");
    this.activityLog = document.getElementById("activity-log");

    this.bindEvents();
    this.loadTheme();
  }

  bindEvents() {
    if (this.loginForm) {
      this.loginForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.login();
      });
    }

    if (this.registerForm) {
      this.registerForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.register();
      });
    }

    if (this.logoutBtn) {
      this.logoutBtn.addEventListener("click", () => this.logout());
    }

    if (this.activityForm) {
      this.activityForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.addActivity();
      });
    }

    // Dark/Light Mode Toggle
    const themeToggle = document.getElementById("theme-toggle");
    if (themeToggle) {
      themeToggle.addEventListener("click", () => this.toggleTheme());
    }
  }

  async register() {
    const email = this.registerForm.querySelector("input[name='email']").value;
    const password =
      this.registerForm.querySelector("input[name='password']").value;

    const res = await fetch(`${API_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (res.ok) {
      alert("Kayıt başarılı! Giriş yapabilirsiniz.");
      this.registerForm.reset();
    } else {
      const error = await res.json();
      alert("Kayıt başarısız: " + error.error);
    }
  }

  async login() {
    const email = this.loginForm.querySelector("input[name='email']").value;
    const password =
      this.loginForm.querySelector("input[name='password']").value;

    const res = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (res.ok) {
      this.token = data.token;
      localStorage.setItem("token", this.token);
      this.showDashboard();
      this.tracker.track("user_login", { email });
    } else {
      alert("Giriş başarısız: " + data.error);
    }
  }

  logout() {
    this.token = null;
    localStorage.removeItem("token");
    this.dashboard.style.display = "none";
    this.loginForm.style.display = "block";
    this.tracker.track("user_logout");
  }

  async addActivity() {
    const type = this.activityForm.querySelector("select[name='type']").value;
    const duration =
      this.activityForm.querySelector("input[name='duration']").value;
    const calories =
      this.activityForm.querySelector("input[name='calories']").value;

    const res = await fetch(`${API_URL}/activities`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify({ type, duration, calories }),
    });

    if (res.ok) {
      this.activityForm.reset();
      this.loadActivities();
      this.tracker.track("activity_added", { type, duration, calories });
    } else {
      const error = await res.json();
      alert("Aktivite eklenemedi: " + error.error);
    }
  }

  async loadActivities() {
    const res = await fetch(`${API_URL}/activities`, {
      headers: { Authorization: `Bearer ${this.token}` },
    });
    const activities = await res.json();

    this.activityLog.innerHTML = "";
    activities.forEach((a) => {
      const li = document.createElement("li");
      li.innerHTML = `<b>${a.type}</b> - ${a.duration} dk, ${a.calories} kcal <i>(${new Date(
        a.createdAt
      ).toLocaleString()})</i>`;
      this.activityLog.appendChild(li);
    });

    this.updateStats(activities);
  }

  updateStats(activities) {
    const totalCalories = activities.reduce((sum, a) => sum + a.calories, 0);
    const totalDuration = activities.reduce((sum, a) => sum + a.duration, 0);

    this.statsContainer.innerHTML = `
      <div class="stat">Toplam Kalori: <span>${totalCalories}</span></div>
      <div class="stat">Toplam Süre: <span>${totalDuration} dk</span></div>
      <canvas id="activityChart"></canvas>
    `;

    this.renderChart(activities);
  }

  renderChart(activities) {
    const ctx = document.getElementById("activityChart").getContext("2d");
    if (window.myChart) window.myChart.destroy();

    window.myChart = new Chart(ctx, {
      type: "pie",
      data: {
        labels: activities.map((a) => a.type),
        datasets: [
          {
            data: activities.map((a) => a.calories),
            backgroundColor: [
              "#FF6384",
              "#36A2EB",
              "#FFCE56",
              "#4BC0C0",
              "#9966FF",
            ],
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: "bottom" },
        },
      },
    });
  }

  toggleTheme() {
    document.body.classList.toggle("dark-mode");
    localStorage.setItem(
      "theme",
      document.body.classList.contains("dark-mode") ? "dark" : "light"
    );
  }

  loadTheme() {
    const theme = localStorage.getItem("theme");
    if (theme === "dark") {
      document.body.classList.add("dark-mode");
    }
  }

  async showDashboard() {
    this.loginForm.style.display = "none";
    this.dashboard.style.display = "block";
    await this.loadActivities();
  }
}

// Init
window.addEventListener("DOMContentLoaded", () => {
  new HealthApp();
});
