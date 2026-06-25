# Hướng Dẫn Kết Nối MCP (Model Context Protocol) Cho Antigravity IDE

Tài liệu này tổng hợp chi tiết về cơ chế hoạt động của **Model Context Protocol (MCP)**, so sánh 3 cách kết nối phổ biến (Postgres Local, GitHub Local và GitHub Remote) kèm theo sơ đồ luồng dữ liệu (Data Flow) cụ thể để bạn dễ dàng quản lý hệ thống của mình.

---

## 1. Tổng Quan Về 3 Cách Cấu Hình MCP

Trong file cấu hình `mcp_config.json`, bạn có thể khai báo các máy chủ MCP theo 3 mô hình phổ biến dưới đây:

### 📌 Cách 1: Postgres Local Server (Chạy Command nội bộ)
Dùng để kết nối trực tiếp với Database PostgreSQL chạy trên máy của bạn (ví dụ như Docker Container).
* **Cấu hình ví dụ:**
  ```json
  "postgres": {
    "command": "npx",
    "args": [
      "-y",
      "@modelcontextprotocol/server-postgres",
      "postgresql://postgres:postgres@localhost:5432/medusa-store"
    ]
  }
```
* **Đặc điểm:** 
  * Chạy trực tiếp một tiến trình Node.js cục bộ trên máy để kết nối tới cổng `5432` của database.
  * Chỉ truy cập được dữ liệu trong mạng nội bộ (`localhost`).

### 📌 Cách 2: GitHub Local Server (Chạy Command nội bộ + Token)
Dùng để kết nối với nền tảng GitHub bên ngoài nhưng phần mềm dịch thuật (MCP server) chạy trên máy của bạn.
* **Cấu hình ví dụ:**
  ```json
  "github-local": {
    "command": "npx",
    "args": [
      "-y",
      "@modelcontextprotocol/server-github"
    ],
    "env": {
      "GITHUB_PERSONAL_ACCESS_TOKEN": "<YOUR_TOKEN>"
    }
  }
```
* **Đặc điểm:**
  * Khởi chạy code dịch thuật MCP ngay trên máy cục bộ của bạn.
  * Giữ Token xác thực an toàn tại máy của bạn, sau đó trực tiếp gọi lên API chính thức của GitHub.

### 📌 Cách 3: GitHub Remote Server (Kết nối qua `serverUrl` / SSE)
Dùng để kết nối với một dịch vụ MCP đã được cấu hình và chạy sẵn trên máy chủ đám mây của bên thứ ba (ví dụ: GitHub Copilot).
* **Cấu hình ví dụ:**
  ```json
  "github-remote": {
    "serverUrl": "https://api.githubcopilot.com/mcp/",
    "headers": {
      "Authorization": "Bearer <YOUR_TOKEN>",
      "Content-Type": "application/json"
    }
  }
```
* **Đặc điểm:**
  * Không chạy bất kỳ dòng code MCP nào dưới máy của bạn.
  * Gửi yêu cầu web trực tiếp lên server đám mây, server đám mây sẽ chịu trách nhiệm giao tiếp tiếp với GitHub API.

---

## 2. Sơ Đồ Luồng Hoạt Động (Data Flow Diagrams)

Mấu chốt của MCP là **AI Server (Gemini)** không bao giờ tự kết nối trực tiếp đến Database hay GitHub của bạn. AI chỉ đóng vai trò là "Bộ não" quyết định gọi hàm, còn **IDE (Extension trên máy bạn)** sẽ thực thi hành động đó.

### 🔄 Luồng 1 & 2: Chạy qua Command cục bộ (`npx`)

Sơ đồ dưới đây mô tả cách hoạt động khi bạn yêu cầu AI thực hiện tác vụ (Ví dụ: Truy vấn database hoặc tạo PR qua Command cục bộ):

```mermaid
sequenceDiagram
    participant User as Bạn (Khung Chat)
    participant IDE as IDE (Extension ở máy bạn)
    participant AI as AI Server (Gemini Cloud)
    participant Local as Tiến trình npx (Chạy ngầm ở máy bạn)
    participant Target as Target API/DB (Postgres / GitHub)

    User->>IDE: Gõ yêu cầu (Ví dụ: "Lấy 5 sản phẩm")
    IDE->>AI: Gửi câu hỏi + Danh sách Tools khả dụng (được đăng ký bởi npx)
    Note over AI: AI quyết định: "Cần chạy tool X với tham số Y"
    AI-->>IDE: Trả lệnh yêu cầu gọi tool: X(arguments)
    IDE->>Local: Gửi lệnh JSON qua đường ống Stdio nội bộ máy
    Note over Local: Tiến trình npx lấy Token/Config kết nối
    Local->>Target: Gửi truy vấn SQL / HTTPS Request
    Target-->>Local: Trả về dữ liệu kết quả thô (JSON/Dữ liệu bảng)
    Local-->>IDE: Trả kết quả về cho IDE qua Stdio
    IDE->>AI: Gửi kết quả thô để AI đọc hiểu
    AI-->>IDE: Dịch sang văn bản tự nhiên dễ hiểu
    IDE->>User: Hiển thị câu trả lời cuối cùng trong Khung Chat
```

---

### 🔄 Luồng 3: Chạy qua Remote Server (`serverUrl` - SSE)

Sơ đồ dưới đây mô tả cách hoạt động khi IDE gọi một Remote MCP Server qua Internet:

```mermaid
sequenceDiagram
    participant User as Bạn (Khung Chat)
    participant IDE as IDE (Extension ở máy bạn)
    participant AI as AI Server (Gemini Cloud)
    participant Remote as Remote MCP Server (Đám mây từ xa)
    participant GitHub as GitHub API (github.com)

    User->>IDE: Gõ yêu cầu (Ví dụ: "Tạo PR cho tôi")
    IDE->>AI: Gửi câu hỏi + Danh sách Tools khả dụng
    Note over AI: AI quyết định: "Cần chạy tool tạo_PR với tham số Y"
    AI-->>IDE: Trả lệnh yêu cầu gọi tool: tạo_PR(arguments)
    
    Note over IDE: IDE phát hiện đây là Remote Tool (SSE)
    IDE->>Remote: Gửi HTTP POST Request kèm Token trong Header
    Remote->>GitHub: Server đám mây gọi API của GitHub để tạo PR
    GitHub-->>Remote: Trả về kết quả xác nhận tạo PR thành công
    Remote-->>IDE: Trả kết quả HTTP Response về cho máy tính của bạn
    
    IDE->>AI: Gửi kết quả thô để AI đọc hiểu
    AI-->>IDE: Dịch sang văn bản tự nhiên dễ hiểu
    IDE->>User: Hiển thị câu trả lời cuối cùng trong Khung Chat
```

---

## 3. Nên Sử Dụng Cách Nào Khi Nào?

| Tình huống | Lựa chọn tối ưu | Lý do |
| :--- | :--- | :--- |
| **Truy cập dữ liệu nội bộ** *(File, Database Local, Script Bash)* | **Command Local (`npx`, `python`)** | Bắt buộc. Server Cloud không thể chọc vào mạng nội bộ (`localhost`) của máy bạn. |
| **Bảo mật Token nhạy cảm** *(GitHub PAT, Admin Keys)* | **Command Local (`npx`)** | Giúp Token chỉ lưu trữ và xử lý trực tiếp trên máy của bạn, không đi qua server trung gian nào khác. |
| **Kết nối App đám mây thông dụng** *(Notion, Slack, Google Drive)* | **Remote Server (`serverUrl`)** | Cực kỳ tiện lợi. Không cần tải thư viện về làm nặng máy, chỉ cần khai báo đường dẫn API và sử dụng. |
| **Tiết kiệm tài nguyên máy tính** | **Remote Server (`serverUrl`)** | Máy tính của bạn không cần tốn RAM/CPU để duy trì các tiến trình Node.js chạy ngầm khi mở IDE. |

---

> **Lưu ý an toàn:** Khi bạn tắt IDE Antigravity, tất cả các tiến trình local (ở Cách 1 và 2) sẽ tự động bị tắt đi hoàn toàn, không chạy ngầm gây tốn pin hay RAM của máy bạn.
