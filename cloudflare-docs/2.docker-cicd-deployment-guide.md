# Kiến Trúc Triển Khai: Docker, CI/CD và Tính Độc Lập Với Network/DNS

Tài liệu này giải thích các khái niệm về Docker, quy trình CI/CD và làm rõ mối liên hệ (hoặc sự độc lập) giữa chúng với tầng mạng DNS/Cloudflare Tunnel.

---

## 1. Sơ Đồ Phân Tách Vai Trò (Decoupling)

Để dễ hình dung, việc phát triển và đưa ứng dụng lên Internet được chia thành 3 tầng hoàn toàn độc lập với nhau. Thay đổi ở tầng này **không làm ảnh hưởng** đến cấu hình của tầng khác.

```mermaid
graph TD
    subgraph Tầng 1: Code & CI/CD (Quản lý và Đóng gói)
        Git[Mã nguồn trên GitHub] -->|GitHub Actions| Build[Build Docker Image]
        Build -->|Push| Registry[Docker Hub / Registry]
    end

    subgraph Tầng 2: Server & Docker (Vận hành ứng dụng)
        Registry -->|Pull & Chạy| AppContainer[Medusa App Container <br/> port 9000]
        TunnelContainer[Cloudflared Container] <-->|Kết nối nội bộ| AppContainer
    end

    subgraph Tầng 3: Cloudflare & DNS (Kết nối & Bảo mật)
        TunnelContainer <===>|Đường ống ngầm| CFEdge[Cloudflare Edge Servers]
        CFEdge <--->|DNS resolution| User[Trình duyệt của Người dùng]
    end

    style Tầng 1 fill:#f9f,stroke:#333,stroke-width:2px
    style Tầng 2 fill:#bbf,stroke:#333,stroke-width:2px
    style Tầng 3 fill:#bfb,stroke:#333,stroke-width:2px
```

*   **Tầng 1 (CI/CD):** Lo việc build code và chuyển giao file chạy lên Server.
*   **Tầng 2 (Docker/Server):** Chạy ứng dụng trong môi trường cô lập.
*   **Tầng 3 (Cloudflare/DNS):** Đưa đường dẫn truy cập từ Internet về đúng vị trí ứng dụng đang chạy.

---

## 2. Docker Ảnh Hưởng Thế Nào Đến Cấu Hình Tunnel?

Khi bạn chọn cài đặt Tunnel bằng **Debian** (chạy trực tiếp trên hệ điều hành) hay **Docker** (chạy qua container như ảnh bạn chụp), bản chất kết nối mạng **không thay đổi**. Điểm khác biệt duy nhất là **nơi phần mềm `cloudflared` được cài đặt**:

### So sánh hai cách chạy Tunnel:
1.  **Chạy qua Debian (System Service):**
    *   Phần mềm `cloudflared` được cài trực tiếp vào hệ điều hành Ubuntu.
    *   Nó chuyển tiếp lưu lượng truy cập tới địa chỉ: `http://localhost:9000` (port ứng dụng chạy trên máy chủ).
2.  **Chạy qua Docker (Khuyên dùng khi đóng gói Docker):**
    *   Bạn chạy lệnh: `docker run -d cloudflare/cloudflared:latest tunnel --no-autoupdate run --token <TOKEN>`
    *   Lúc này, `cloudflared` là một container độc lập.
    *   Nếu bạn chạy ứng dụng Medusa bằng Docker, hai container này có thể kết nối với nhau thông qua mạng nội bộ của Docker (Docker Network).
    *   Ví dụ: Trong cấu hình Tunnel, thay vì trỏ về `localhost:9000`, bạn trỏ thẳng về tên container của Medusa: `http://medusa-backend:9000`.

> [!TIP]
> Việc chuyển sang Docker giúp hệ thống gọn gàng hơn. Khi cần chuyển server, bạn chỉ cần mang file `docker-compose.yml` sang server mới chạy lệnh là cả ứng dụng lẫn Tunnel đều tự động hoạt động mà không cần cài đặt cấu hình lại hệ điều hành.

---

## 3. Quy Trình CI/CD Có Liên Quan Đến DNS/Tunnel Không?

**Hầu như không liên quan.** 

CI/CD (Continuous Integration / Continuous Delivery) là quy trình tự động hóa:
1.  Khi bạn `git push` code mới lên GitHub.
2.  Một robot (ví dụ GitHub Actions) sẽ tự động kiểm tra lỗi code, build thành Docker Image.
3.  Robot SSH vào máy Ubuntu ở công ty của bạn, ra lệnh tắt container cũ, kéo (pull) bản image mới về và khởi động lại container ứng dụng.

**Tại sao DNS và Tunnel không bị ảnh hưởng?**
*   Tunnel (`cloudflared`) giống như một đường ống dẫn nước.
*   Ứng dụng của bạn (Medusa) là nguồn cấp nước.
*   Khi bạn chạy CI/CD, bạn chỉ đang thay thế "nguồn cấp nước mới tốt hơn" (cập nhật code mới cho ứng dụng) vào cùng một vị trí cổng kết nối (ví dụ cổng 9000).
*   Đường ống Tunnel vẫn giữ nguyên kết nối với Cloudflare và tiếp tục chuyển tiếp lưu lượng vào cổng 9000 đó. Tên miền `hailinh.id.vn` của bạn vẫn hoạt động bình thường mà không cần bất cứ cấu hình lại nào.

---

## 4. Các Phương Pháp Deploy Phổ Biến Hiện Nay

Ngoài Cloudflare Tunnel và Public IP truyền thống, thực tế các kỹ sư thường dùng các giải pháp sau tùy theo môi trường:

### 1. Public IP (Cho Production thực tế của doanh nghiệp)
*   **Cách làm:** Thuê các dịch vụ đám mây (AWS, Google Cloud, DigitalOcean) có IP tĩnh công cộng. Dùng cân bằng tải (Load Balancer) để phân phối tải và dùng Cloudflare làm lá chắn DNS đứng trước.
*   **Ưu điểm:** Khả năng mở rộng tốt, chịu tải cao.

### 2. Cloudflare Tunnel (Cho Home-lab, Môi trường phát triển hoặc Máy văn phòng)
*   **Cách làm:** Cài `cloudflared` để tạo kết nối Outbound đi ra.
*   **Ưu điểm:** Không tốn tiền thuê IP tĩnh, bảo mật tuyệt đối cho hệ thống mạng nội bộ của công ty.

### 3. Dịch Vụ PaaS (Platform as a Service - Đơn giản nhất cho Lập trình viên)
*   **Cách làm:** Sử dụng các nền tảng như **Render**, **Railway**, **Fly.io**, **Vercel** hoặc **Cloudflare Pages**.
*   **Cách hoạt động:** Bạn không cần quản lý Docker, IP hay Tunnel. Bạn chỉ cần kết nối tài khoản GitHub của bạn với các dịch vụ này. Khi có code mới, họ tự động build và cung cấp sẵn đường dẫn HTTPS bảo mật.
*   **Khi nào dùng:** Rất phù hợp cho các dự án vừa và nhỏ, giúp lập trình viên tập trung 100% vào viết code thay vì cấu hình hạ tầng mạng (DevOps).
