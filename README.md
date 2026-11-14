# Arcwell Resource Collections

Thư viện tài nguyên ZIP có đăng nhập bằng email/mật khẩu và phân quyền download theo từng người dùng. Admin được khai báo bằng biến môi trường, ảnh preview được lưu trên Pixhost, còn metadata/quyền/audit được lưu trong PostgreSQL.

## Kiến trúc

- **Frontend:** Next.js 16 App Router, React 19, Tailwind CSS 4.
- **Authentication:** Auth.js v5 credentials provider, scrypt password hashes, JWT session.
- **Authorization:** `public`, `authenticated`, hoặc `restricted` theo email.
- **Database:** PostgreSQL + Drizzle ORM, migration nằm trong `drizzle/`.
- **ZIP storage:** S3/R2 direct upload bằng presigned URL; filesystem local chỉ là fallback development.
- **Preview storage:** browser resize/convert sang WebP trước, server proxy bản nhỏ lên Pixhost primary + backup.
- **Audit:** mỗi lượt download được ghi lại kèm user, IP và user-agent.

PostgreSQL chỉ lưu metadata, không lưu binary ZIP. Với S3/R2, ZIP không đi qua Next.js: browser tự tính SHA-256 trong Web Worker, PUT thẳng lên object storage, và download bằng presigned GET 60 giây sau khi server kiểm tra quyền.

## Chạy local

Yêu cầu Node.js `22.13+` và một PostgreSQL server.

1. Tạo file cấu hình:

   ```powershell
   Copy-Item .env.example .env.local
   ```

2. Có thể chạy PostgreSQL bằng Docker:

   ```powershell
   docker compose up -d postgres
   ```

3. Điền các biến trong `.env.local`:

   - `DATABASE_URL`
   - `AUTH_SECRET` — tạo bằng `npm exec auth secret`
   - `ADMIN_EMAIL` và `ADMIN_PASSWORD` — tài khoản admin được tạo tự động khi đăng nhập lần đầu; mật khẩu tối thiểu 12 ký tự

4. Chạy migration và ứng dụng:
   ```powershell
   npm run db:migrate
   npm run dev
   ```

Mở `http://localhost:3000/login` để đăng nhập tài khoản admin đã cấu hình hoặc `/register` để tạo tài khoản member. Mật khẩu admin được lưu dưới dạng scrypt hash sau lần đăng nhập đầu tiên; ứng dụng không ghi lại mật khẩu vào database dạng rõ. Member cần đăng ký trước khi admin cấp quyền theo email.

Email không được xác minh qua email, vì vậy chỉ cấp quyền theo email cho người dùng đã được xác nhận ngoài ứng dụng. Tài khoản thành viên cũ từ Google OAuth không có password hash và cần được tạo lại bằng email khác hoặc di chuyển thủ công.

Khi self-host production, đặt app sau reverse proxy tin cậy và cấu hình proxy chỉ chấp nhận hostname hợp lệ; Auth.js cần `trustHost` để tạo callback URL.

## Biến môi trường

| Biến | Bắt buộc | Ý nghĩa |
| --- | --- | --- |
| `DATABASE_URL` | Có | PostgreSQL connection string |
| `AUTH_SECRET` | Có | Secret mã hóa session, tối thiểu 32 ký tự |
| `ADMIN_EMAIL` | Có | Email của tài khoản admin được tạo tự động |
| `ADMIN_PASSWORD` | Có | Mật khẩu admin khởi tạo, tối thiểu 12 ký tự |
| `STORAGE_DRIVER` | Không | `s3` cho production, `local` cho development |
| `S3_BUCKET` | Khi dùng S3 | Tên bucket private |
| `S3_REGION` | Khi dùng S3 | Region, dùng `auto` cho Cloudflare R2 |
| `S3_ENDPOINT` | R2/MinIO | S3 API endpoint |
| `S3_ACCESS_KEY_ID` | R2/MinIO | Access key ký presigned URL |
| `S3_SECRET_ACCESS_KEY` | R2/MinIO | Secret key ký presigned URL |
| `S3_FORCE_PATH_STYLE` | Không | Bật cho một số MinIO endpoint |
| `UPLOAD_DIR` | Không | Đường dẫn tuyệt đối lưu ZIP; mặc định `.data/uploads` |
| `MAX_ARCHIVE_SIZE_MB` | Không | Giới hạn ZIP; mặc định 500 MB |
| `DATABASE_POOL_MAX` | Không | Số kết nối PostgreSQL tối đa mỗi process; mặc định 10 |
| `WEB_CONCURRENCY` | Không | Số worker PM2 cluster; mặc định 2 |

## Scripts

```text
npm run dev          # development server
npm run build        # production build
npm run lint         # ESLint
npm run typecheck    # TypeScript
npm run db:generate  # tạo migration từ schema
npm run db:migrate   # apply migration vào PostgreSQL
npm run db:studio    # giao diện Drizzle Studio
```

## Lưu ý production

### Chạy nhiều worker trên một máy

Sau khi build, có thể chạy Next.js qua PM2 cluster trên Linux để phân phối request lên nhiều process/CPU core:

```powershell
npm run build
npx pm2 start ecosystem.config.cjs
```

`WEB_CONCURRENCY` mặc định là 2; đặt biến này theo số CPU và giới hạn kết nối PostgreSQL. Mỗi worker có pool riêng, tối đa `DATABASE_POOL_MAX` kết nối, nên tổng giới hạn lý thuyết là `WEB_CONCURRENCY × DATABASE_POOL_MAX`. Ví dụ, nếu database dành tối đa 20 kết nối cho ứng dụng, cấu hình `WEB_CONCURRENCY=2` và `DATABASE_POOL_MAX=10`.

PM2 cluster tạo nhiều process Node.js, không phải worker thread. Đây phù hợp hơn cho server hiện tại vì các tác vụ chính là chờ PostgreSQL, S3 và Pixhost; chưa có phép tính CPU nặng phía server cần chuyển sang worker thread.

Bucket S3/R2 phải là private và cần CORS cho origin của web. Ví dụ:

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000", "https://your-domain.example"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["content-type", "x-amz-checksum-sha256"],
    "ExposeHeaders": ["etag"],
    "MaxAgeSeconds": 3600
  }
]
```

Presigned upload hiện dùng một `PUT`, phù hợp ZIP tối đa 5 GB của S3 PutObject; giới hạn mặc định của app là 500 MB. Nếu tăng vượt mức đó, nên chuyển sang presigned multipart upload. `STORAGE_DRIVER=local` vẫn gửi ZIP qua server vì filesystem local không thể nhận trực tiếp từ browser.
