# Arcwell Resource Collections

Thư viện tài nguyên ZIP có đăng nhập Google và phân quyền download theo từng người dùng. Admin được khai báo bằng biến môi trường, ảnh preview được lưu trên Pixhost, còn metadata/quyền/audit được lưu trong PostgreSQL.

## Kiến trúc

- **Frontend:** Next.js 16 App Router, React 19, Tailwind CSS 4.
- **Authentication:** Auth.js v5 + Google OAuth, JWT session.
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
   - `AUTH_GOOGLE_ID`
   - `AUTH_GOOGLE_SECRET`
   - `ADMIN_EMAILS` — hỗ trợ nhiều email, phân tách bằng dấu phẩy

4. Trong Google Cloud Console, thêm redirect URI:

   ```text
   http://localhost:3000/api/auth/callback/google
   ```

5. Chạy migration và ứng dụng:

   ```powershell
   npm run db:migrate
   npm run dev
   ```

Mở `http://localhost:3000`. Tài khoản trong `ADMIN_EMAILS` sẽ thấy form upload và phần cấp quyền. Các Google account khác đăng nhập với vai trò member.

## Biến môi trường

| Biến | Bắt buộc | Ý nghĩa |
| --- | --- | --- |
| `DATABASE_URL` | Có | PostgreSQL connection string |
| `AUTH_SECRET` | Có | Secret mã hóa session, tối thiểu 32 ký tự |
| `AUTH_GOOGLE_ID` | Có | Google OAuth client ID |
| `AUTH_GOOGLE_SECRET` | Có | Google OAuth client secret |
| `ADMIN_EMAILS` | Có | Danh sách admin, phân tách bằng dấu phẩy |
| `ALLOWED_EMAIL_DOMAINS` | Không | Giới hạn domain Google được đăng nhập |
| `STORAGE_DRIVER` | Không | `s3` cho production, `local` cho development |
| `S3_BUCKET` | Khi dùng S3 | Tên bucket private |
| `S3_REGION` | Khi dùng S3 | Region, dùng `auto` cho Cloudflare R2 |
| `S3_ENDPOINT` | R2/MinIO | S3 API endpoint |
| `S3_ACCESS_KEY_ID` | R2/MinIO | Access key ký presigned URL |
| `S3_SECRET_ACCESS_KEY` | R2/MinIO | Secret key ký presigned URL |
| `S3_FORCE_PATH_STYLE` | Không | Bật cho một số MinIO endpoint |
| `UPLOAD_DIR` | Không | Đường dẫn tuyệt đối lưu ZIP; mặc định `.data/uploads` |
| `MAX_ARCHIVE_SIZE_MB` | Không | Giới hạn ZIP; mặc định 500 MB |

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
