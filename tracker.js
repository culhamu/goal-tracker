// tracker.js - kullanıcı davranış izleyici
// Çok gelişmiş: otomatik event yakalama, beacon ile gönderim, offline queue, oturum analizi

export class Tracker {
  constructor(apiUrl) {
    this.apiUrl = apiUrl;
    this.sessionId = this.generateId();
    this.queue = [];
    this.flushInterval = 5000; // 5 sn'de bir gönder
    this.userAgent = navigator.userAgent;
    this.startTime = Date.now();

    this.autoCapture();
    this.startFlushLoop();
  }

  generateId() {
    return "sess_" + Math.random().toString(36).substring(2, 12);
  }

  autoCapture() {
    // Sayfa görüntülenme
    this.track("page_view", { url: window.location.href });

    // Tıklamalar
    document.addEventListener("click", (e) => {
      const target = e.target.closest("button, a, input");
      if (target) {
        this.track("ui_click", {
          tag: target.tagName,
          text: target.innerText || target.value || null,
        });
      }
    });

    // Scroll
    window.addEventListener("scroll", () => {
      const percent =
        (window.scrollY / (document.body.scrollHeight - window.innerHeight)) *
        100;
      this.track("scroll", { percent: Math.round(percent) });
    });

    // Pencere kapatma
    window.addEventListener("beforeunload", () => {
      this.track("session_end", {
        duration: Date.now() - this.startTime,
      });
      this.flush(true);
    });
  }

  track(event, props = {}) {
    const payload = {
      event,
      props,
      sessionId: this.sessionId,
      userAgent: this.userAgent,
      timestamp: new Date().toISOString(),
    };
    this.queue.push(payload);
  }

  async flush(useBeacon = false) {
    if (this.queue.length === 0) return;
    const events = this.queue.splice(0, this.queue.length);

    if (useBeacon && navigator.sendBeacon) {
      navigator.sendBeacon(
        `${this.apiUrl}/events`,
        JSON.stringify({ events })
      );
    } else {
      try {
        await fetch(`${this.apiUrl}/events`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ events }),
        });
      } catch (err) {
        console.warn("Event gönderilemedi, tekrar denenecek", err);
        this.queue.push(...events); // geri al
      }
    }
  }

  startFlushLoop() {
    setInterval(() => this.flush(), this.flushInterval);
  }
}
