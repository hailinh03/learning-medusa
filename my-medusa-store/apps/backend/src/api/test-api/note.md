# Cấu Trúc API Route & Cơ Chế Bảo Mật Trong Medusa v2

Trong Medusa v2, cấu trúc thư mục con bên trong `src/api` sẽ trực tiếp quyết định **đường dẫn URL (Route Path)** và **cơ chế bảo mật (Middleware)** được áp dụng tự động.

## 1. Phân biệt các cấp thư mục API

* **`/src/api/admin/...`** $\to$ Tương ứng URL: `/admin/...`
  * **Mục đích:** Dành cho trang quản lý (Admin Dashboard).
  * **Bảo mật:** Bắt buộc phải có **Session cookie** hoặc **Token JWT của tài khoản admin**. Không cho phép truy cập nặc danh (Guest).
* **`/src/api/store/...`** $\to$ Tương ứng URL: `/store/...`
  * **Mục đích:** Dành cho khách hàng mua sắm (Storefront).
  * **Bảo mật:** Yêu cầu bắt buộc truyền header `x-publishable-api-key`.
* **Mức ngoài cùng `/src/api/<tên-folder>/...`** $\to$ Tương ứng URL: `/<tên-folder>/...`
  * **Mục đích:** Các API tùy biến riêng biệt (Custom Top-level Routes).
  * **Bảo mật:** Mặc định không áp dụng bất kỳ bộ lọc bảo mật storefront hay admin nào của Medusa. Bạn tự viết middleware bảo mật riêng nếu cần.

---

## 2. Tại sao Storefront API lại cần `x-publishable-api-key`?

*Tại sao Storefront dành cho khách hàng lại dùng API Key công khai mà không bắt buộc dùng Token đăng nhập giống như Admin?*

### Lý do 1: Hỗ trợ khách vãng lai (Guest Browsing & Checkout)
Khách hàng vào trang web thương mại điện tử thường muốn **xem sản phẩm, thêm vào giỏ hàng, và thanh toán** mà không bắt buộc phải tạo tài khoản hay đăng nhập. 
Vì là khách vãng lai, họ không có Session cookie hay Token JWT cá nhân. Tuy nhiên, hệ thống vẫn cần một cơ chế định danh để quản lý phiên hoạt động.

### Lý do 2: Quản lý đa kênh bán hàng (Sales Channels / Omnichannel)
Một hệ thống Medusa Backend có thể phục vụ song song cho nhiều Frontend khác nhau (ví dụ: Website bán lẻ bản Web, App di động iOS/Android, Trang B2B).
* Mỗi Frontend này sẽ được cấp một **Publishable API Key (Khóa công khai)** riêng.
* Khi Frontend gửi `x-publishable-api-key` trong header, Medusa sẽ nhận biết: *"À, đây là request từ App di động, hãy lọc chỉ hiển thị những sản phẩm được phép bán trên kênh App"* hoặc *"Đây là request từ trang Web US, hãy hiển thị giá bán bằng USD"*.
* Khóa này **không dùng để xác định danh tính cá nhân**, mà dùng để **xác định ngữ cảnh bán hàng (Sales Channel Context)**.

### Vậy Khách hàng có dùng Token JWT hay Session không?
* **Có!** Đối với các tác vụ cá nhân cần bảo mật (ví dụ: Xem lịch sử đơn hàng của tôi, quản lý sổ địa chỉ cá nhân, đổi mật khẩu), Medusa **vẫn kiểm tra thêm Session / Token JWT của khách hàng** (Customer Authentication).
* Lúc này, một request lên các API bảo mật đó của khách hàng sẽ cần **đồng thời cả hai**:
  1. `x-publishable-api-key`: Để xác định kênh bán hàng (Sales Channel).
  2. `Customer Session JWT`: Để xác định tài khoản khách hàng cụ thể đang đăng nhập.