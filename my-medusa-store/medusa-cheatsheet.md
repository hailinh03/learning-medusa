# Medusa Development Cheatsheet 📝

Bảng tra cứu nhanh các câu lệnh phát triển Medusa v2 trong dự án Monorepo này.

---

## 1. Khởi động hệ thống (Development)

*   **Chạy toàn bộ dự án (Backend + Storefront)**:
    ```bash
    pnpm dev
    ```
    *   **Backend URL**: `http://localhost:9000`
    *   **Admin Dashboard**: `http://localhost:9000/app` (Tài khoản admin mặc định: `admin@medusa-test.com` / `supersecret`)
    *   **Storefront URL**: `http://localhost:8000`

---

## 2. Quản lý Cơ sở dữ liệu (Database & Migrations)

Mỗi khi bạn thay đổi cấu trúc bảng dữ liệu (Data Model) trong code, bạn cần chạy 2 bước sau:

### Bước A: Tạo bản thiết kế (Generate Migration)
Tạo file SQL thiết kế bảng dựa trên sự thay đổi trong code:
```bash
pnpm db:generate <tên_module>
```
*   **Ví dụ**: `pnpm db:generate brand`
*   **Giải thích**: Tạo file chứa mã SQL tạo bảng `brand` trong thư mục `src/migrations/`.

### Bước B: Xây dựng bảng thực tế (Run Migration)
Áp dụng các thay đổi trong file thiết kế vào cơ sở dữ liệu thật:
```bash
pnpm db:migrate
```
*   **Giải thích**: Thực thi toàn bộ mã SQL chưa chạy lên cơ sở dữ liệu `medusa-store` để cập nhật bảng.

---

## 3. Quản lý Tài khoản Admin (Admin Users)

Tạo tài khoản Admin mới để đăng nhập vào trang quản trị (`/app`):
```bash
pnpm db:create-admin -e <email> -p <password>
```
*   **Cú pháp**:
    *   `-e` hoặc `--email`: Địa chỉ email đăng nhập.
    *   `-p` hoặc `--password`: Mật khẩu đăng nhập.
*   **Ví dụ**:
    ```bash
    pnpm db:create-admin -e admin@test.com -p supersecret
    ```

---

## 4. Dữ liệu mẫu (Data Seeding)

Nạp dữ liệu sản phẩm, danh mục, khu vực vận chuyển mẫu vào cơ sở dữ liệu trống:
```bash
pnpm backend:seed
```
*   **Giải thích**: Chạy script seed mẫu để bạn có sẵn sản phẩm test trên storefront.
