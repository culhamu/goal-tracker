# Goal Tracker App

Basit bir hedef takip uygulaması.

## Özellikler
- Hedef ekleme
- Hedefi tamamlama
- Hedef silme
- Veriler localStorage'da saklanır

## Nasıl çalıştırılır?
1. Dosyaları bir klasöre koyun
2. `index.html` dosyasını tarayıcıda açın
# Pro Analytics App

Modern bir Node.js + Express tabanlı mikro-analitik ve event izleme uygulaması.
İstemci tarafı `tracker.js` ile olay toplar; sunucu bunları doğrular, saklar (SQLite) ve API ile raporlar.

> **Öne Çıkanlar**
> - JWT tabanlı oturum ve rol yönetimi (user/admin)
> - Hız sınırlama, CORS, Helmet, güvenli header'lar
> - Şemaya dayalı doğrulama ve sanitize (utils/validate.js)
> - Servis katmanı (`api/`) ile yönlendirmeden bağımsız iş mantığı
> - Sorgu filtreleme, sayfalama, sıralama
> - Hafif client tracker (fetch/beacon)
> - Sağlık uç noktası

## Hızlı Başlangıç

```bash
npm init -y
npm i express helmet cors morgan express-rate-limit dotenv jsonwebtoken bcrypt better-sqlite3 uuid
# opsiyonel
npm i -D nodemon

echo "JWT_SECRET=supersecret_dev_key" > .env
echo "PORT=3000" >> .env

node app.js
# veya
npx nodemon app.js
