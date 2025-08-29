/*!
 * Basit istemci izleme: sayfa görüntüleme ve UI etkileşimlerini API'ye yollar.
 * Sağlık verilerinden bağımsızdır; ürün kalitesi metrikleri için örneklenmiştir.
 */
(function(){
  const ENDPOINT = '/api/vitals'; // örnek: sayfa açılışında context HR yoksa sadece "mood" yolla
  const QUEUE = [];
  const FLUSH_INTERVAL = 2500;

  function send(path, payload, authToken) {
    const body = JSON.stringify(payload);
    const headers = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = 'Bearer ' + authToken;
    fetch(path, { method:'POST', headers, body }).catch(()=>{});
  }

  function track(type, payload) {
    // Bu tracker sağlık datası yollamaz; sadece demo amaçlı mood/nota izin veriyoruz.
    const evt = { mood: type, note: JSON.stringify(payload||{}).slice(0,128) };
    QUEUE.push(evt);
  }

  function flush() {
    if (!window.__tracker || !window.__tracker.userId || !window.__tracker.token) return;
    while (QUEUE.length) {
      const evt = QUEUE.shift();
      send(ENDPOINT, evt, window.__tracker.token);
    }
  }

  window.__tracker = {
    userId: null,
    token: null,
    setUser(id){ this.userId = String(id); },
    setToken(t){ this.token = t; },
    track
  };

  setInterval(flush, FLUSH_INTERVAL);
  window.addEventListener('beforeunload', flush);
})();
