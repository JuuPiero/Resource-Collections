# PiaStore

PiaStore là catalog tài nguyên cá nhân theo concept Unity/Cocos Asset Store. Mọi khách đều xem được danh sách, mô tả và preview của tài nguyên đã publish; quyền tải ZIP vẫn theo access level và license.

Trong dashboard, admin có thể quản lý tài nguyên qua bảng tại **Assets** và quản lý tài khoản qua bảng **Users** (bật/tắt tài khoản; email admin được cấu hình sẽ được bảo vệ). Trang chi tiết tài nguyên hỗ trợ slider preview, phóng to ảnh và điều hướng bằng phím mũi tên. Khi đăng tài nguyên, có thể kéo thả file ZIP và tối đa 8 ảnh preview vào vùng chọn file.

## Kiến trúc

- Next.js 16 App Router, React 19, Tailwind CSS 4.
- Auth.js Credentials, JWT session, mật khẩu member lưu dưới dạng scrypt hash.
- Admin được xác thực trực tiếp từ `ADMIN_EMAIL` + `ADMIN_PASSWORD` trên server và có thể đăng nhập không cần database; dashboard và thao tác tài nguyên vẫn cần PostgreSQL.
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
- Start command: `node scripts/start-production.mjs`
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
3. `AUTH_SECRET` đã được cấu hình.
4. Sau khi đổi biến môi trường, phải redeploy. Render không đưa biến mới vào process đang chạy.
5. Đăng xuất/xóa cookie cũ rồi đăng nhập lại.

Admin login không đọc hoặc tạo bản ghi user trong database. Startup sẽ thử migration; nếu DB không truy cập được, server vẫn khởi động và ghi lỗi rõ ràng để admin có thể đăng nhập. Dashboard, đăng ký member, catalog, quyền tải và download audit vẫn cần database hoạt động và migration thành công.

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
