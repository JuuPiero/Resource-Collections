# Arcwell Private Asset Store

Kho tài nguyên cá nhân theo concept Unity/Cocos Asset Store. Người dùng chỉ thấy và tải các asset public, dành cho thành viên, hoặc được admin cấp license theo email.

## Kiến trúc

- Next.js 16 App Router, React 19, Tailwind CSS 4.
- Auth.js Credentials, JWT session, mật khẩu member lưu dưới dạng scrypt hash.
- Admin được xác thực trực tiếp từ `ADMIN_EMAIL` + `ADMIN_PASSWORD` trên server.
- PostgreSQL + Drizzle ORM cho user, asset, license và download audit.
- ZIP upload/download trực tiếp qua S3/R2 presigned URL.
- Browser Web Worker tính SHA-256 và tối ưu preview trước khi upload.
- Preview được proxy lên Pixhost; server không resize ảnh.
- PM2 cluster dùng nhiều process/CPU khi self-host hoặc chạy trên Render.

## Chạy local

```powershell
Copy-Item .env.example .env.local
docker compose up -d postgres
npm run db:migrate
npm run dev
```

Admin password phải có từ 12 đến 128 ký tự.

## Deploy Render

Repository đã có [render.yaml](./render.yaml). Có thể tạo Blueprint hoặc cấu hình Web Service thủ công:

- Build command: `npm ci && npm run build`
- Start command: `npm run db:migrate && npm run start:cluster`
- Health check: `/`
- Node: `22.13.0` trở lên

Trong Render Dashboard → service → **Environment**, bắt buộc khai báo:

```text
DATABASE_URL
AUTH_SECRET
ADMIN_EMAIL
ADMIN_PASSWORD
STORAGE_DRIVER
```

Nếu dùng R2/S3, khai báo thêm:

```text
S3_BUCKET
S3_REGION
S3_ENDPOINT
S3_ACCESS_KEY_ID
S3_SECRET_ACCESS_KEY
S3_FORCE_PATH_STYLE
```

File `.env` trên máy local bị gitignore và không tự được gửi lên Render. Có thể dùng nút **Add from .env** trong Render Dashboard, sau đó chọn **Save, rebuild, and deploy**.

### Vì sao admin không đăng nhập được trên Render?

Kiểm tra theo thứ tự:

1. `ADMIN_EMAIL` và `ADMIN_PASSWORD` đã tồn tại trong Environment của đúng Web Service.
2. `ADMIN_PASSWORD` có ít nhất 12 ký tự và không vô tình chứa dấu ngoặc kép.
3. `DATABASE_URL` trỏ đúng database production.
4. Migration `npm run db:migrate` đã chạy; bảng `users` phải có cột `password_hash`.
5. Sau khi đổi biến môi trường, phải redeploy. Render không đưa biến mới vào process đang chạy.
6. Đăng xuất/xóa cookie cũ rồi đăng nhập lại.

Admin hiện xác thực mật khẩu trực tiếp từ environment nên đổi `ADMIN_PASSWORD` trên Render có hiệu lực sau redeploy, không bị khóa bởi password hash cũ trong database.

## Object storage CORS

Bucket phải private. CORS tối thiểu:

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000", "https://your-app.onrender.com"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["content-type", "x-amz-checksum-sha256"],
    "ExposeHeaders": ["etag"],
    "MaxAgeSeconds": 3600
  }
]
```

## Scripts

```text
npm run dev
npm run build
npm run start
npm run start:cluster
npm run lint
npm run typecheck
npm run db:generate
npm run db:migrate
npm run db:studio
```

`WEB_CONCURRENCY` điều khiển số process PM2. Mỗi process có PostgreSQL pool riêng với tối đa `DATABASE_POOL_MAX` connections; tổng tối đa xấp xỉ `WEB_CONCURRENCY × DATABASE_POOL_MAX`.

`CPU_WORKER_THREADS` điều khiển Piscina worker pool dùng để xác minh SHA-256 cho local-storage fallback. Khi chạy PM2 cluster, mặc định mỗi web process chỉ tạo một CPU worker để tránh oversubscription.
