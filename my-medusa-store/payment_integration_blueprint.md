# 🗺️ Blueprint Thiết Kế: Hệ Thống Đa Cổng Thanh Toán Theo Region (Medusa v2)

Tài liệu này cung cấp thiết kế chi tiết, cấu trúc mã nguồn mẫu và quy trình cấu hình để tích hợp đồng thời 4 cổng thanh toán: **Stripe**, **PayPal**, **Ví MoMo** và **VietQR (PayOS)** vào hệ thống Medusa v2.

---

## 1. Kiến Trúc Tổng Quan (Architecture Overview)

Medusa v2 tách biệt hoàn toàn phần cốt lõi quản lý giỏ hàng (`Payment Module`) và phần giao tiếp với API ngân hàng (`Payment Provider`). 

```
[Storefront / Khách Hàng]
    ↓ (Chọn vùng quốc gia / Region)
[Medusa Backend]
    ↓ (Lọc danh sách Payment Providers được cấu hình cho Region đó)
    ├─ Region VIỆT NAM (VND) ──> ["momo", "payos"]
    └─ Region QUỐC TẾ (USD)   ──> ["stripe", "paypal"]
```

Để tích hợp bất kỳ cổng thanh toán nào, chúng ta chỉ cần tạo một lớp kế thừa từ lớp trừu tượng `AbstractPaymentProvider` của Medusa và đăng ký nó với `payment` module.

---

## 2. Các Bước Triển Khai (Implementation Steps)

### Bước 1: Cài đặt các thư viện (Dependencies)
```bash
# Thư viện chính thức cho Stripe
pnpm add @medusajs/payment-stripe

# Thư viện ngoài cho PayPal (nếu dùng plugin sẵn) hoặc tự viết
pnpm add medusa-payment-paypal
```

### Bước 2: Tạo Custom Payment Provider cho MoMo & PayOS

Tất cả các custom provider sẽ được lưu trữ trong thư mục `src/modules/`. Mỗi provider gồm 2 file chính: `service.ts` (xử lý logic) và `index.ts` (đăng ký module).

#### 2.1 Cấu trúc file PayOS Provider (`src/modules/payment-payos/service.ts`)
```typescript
import { AbstractPaymentProvider } from "@medusajs/framework/utils"
import { 
  PaymentProviderError, 
  PaymentProviderResult,
  InitiatePaymentInput,
  AuthorizePaymentInput,
  CapturePaymentInput,
  RefundPaymentInput
} from "@medusajs/framework/types"

type PayOSOptions = {
  clientId: string
  apiKey: string
  checksumKey: string
}

export default class PayOSPaymentProvider extends AbstractPaymentProvider {
  static identifier = "payos" // Khóa định danh sẽ hiển thị trên Medusa Admin
  protected options_: PayOSOptions

  constructor({}, options: PayOSOptions) {
    super()
    this.options_ = options
  }

  // 1. Tạo phiên thanh toán (Gọi khi khách bấm Checkout)
  // Sẽ gọi API của PayOS để tạo link thanh toán QR Code VietQR
  async initiatePayment(input: InitiatePaymentInput): Promise<PaymentProviderResult> {
    const { amount, currency_code, resource_id } = input
    
    try {
      // TODO: Viết code gọi API PayOS (https://api.payos.vn/v2/payment-requests)
      // Tạo request thanh toán và nhận về: checkoutUrl, qrCode...
      
      return {
        session_data: {
          checkout_url: "https://pay.payos.vn/web/...", // Link dẫn khách đi quét mã
          payment_id: "payos_txn_123456",
        }
      }
    } catch (error: any) {
      return {
        error: error.message
      }
    }
  }

  // 2. Xác thực trạng thái giao dịch
  async authorizePayment(paymentSessionData: Record<string, any>, context: Record<string, any>): Promise<PaymentProviderResult> {
    // Thường được gọi sau khi webhook của PayOS báo thành công hoặc khi storefront kiểm tra thủ công.
    return {
      status: "authorized",
      data: paymentSessionData
    }
  }

  // 3. Khấu trừ tiền (Capture)
  async capturePayment(input: CapturePaymentInput): Promise<PaymentProviderResult> {
    return {
      status: "captured",
      data: input.payment_data
    }
  }

  // 4. Hủy / Hoàn tiền (Refund)
  async refundPayment(input: RefundPaymentInput): Promise<PaymentProviderResult> {
    // Gọi API PayOS / VNPAY để hoàn tiền lại tài khoản khách hàng
    return {
      status: "refunded",
      data: input.payment_data
    }
  }

  // 5. Kiểm tra trạng thái hiện tại
  async getPaymentStatus(paymentSessionData: Record<string, any>): Promise<string> {
    // Trả về: "pending" | "authorized" | "captured" | "failed"
    return "pending"
  }
}
```

#### 2.2 File Entrypoint cho PayOS (`src/modules/payment-payos/index.ts`)
```typescript
import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import PayOSPaymentProvider from "./service"

export default ModuleProvider(Modules.PAYMENT, {
  services: [
    PayOSPaymentProvider,
  ],
})
```

*(Thiết lập tương tự cho **Ví MoMo** tại `src/modules/payment-momo/service.ts` với `static identifier = "momo"` và file entrypoint tương tự).*


---

### Bước 3: Đăng ký trong `medusa-config.ts`

Chúng ta cần đăng ký dịch vụ `@medusajs/medusa/payment` cùng với danh sách các cổng thanh toán (providers) vào mảng `modules`:

```typescript
// medusa-config.ts
module.exports = defineConfig({
  // ... các config khác
  modules: [
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          // 1. Cổng thanh toán Stripe chính thức
          {
            resolve: "@medusajs/medusa/payment-stripe",
            id: "stripe",
            options: {
              apiKey: process.env.STRIPE_API_KEY,
              webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
            },
          },
          // 2. Cổng thanh toán PayOS tự phát triển (VietQR)
          {
            resolve: "./src/modules/payment-payos",
            id: "payos",
            options: {
              clientId: process.env.PAYOS_CLIENT_ID,
              apiKey: process.env.PAYOS_API_KEY,
              checksumKey: process.env.PAYOS_CHECKSUM_KEY,
            },
          },
          // 3. Cổng thanh toán MoMo tự phát triển
          {
            resolve: "./src/modules/payment-momo",
            id: "momo",
            options: {
              partnerCode: process.env.MOMO_PARTNER_CODE,
              accessKey: process.env.MOMO_ACCESS_KEY,
              secretKey: process.env.MOMO_SECRET_KEY,
            },
          },
          // 4. Cổng thanh toán thủ công (để test nhanh không cần API key)
          {
            resolve: "@medusajs/medusa/payment-manual",
            id: "manual",
          }
        ],
      },
    },
  ]
})
```

---

### Bước 4: Cấu hình trên Medusa Admin Dashboard (Phân vùng Region)

Để hiển thị Momo/PayOS cho Việt Nam và Stripe/PayPal cho Mỹ:

1. **Vào Dashboard**: Truy cập `http://localhost:9000/app` (Login tài khoản admin).
2. **Cấu hình Region Việt Nam**:
   - Vào mục **Settings > Regions** > Chọn **Vietnam**.
   - Mục **Currency** (Tiền tệ): Chọn **VND**.
   - Mục **Payment Providers**: Chỉ tích chọn **`payos`** và **`momo`**.
3. **Cấu hình Region Mỹ**:
   - Chọn **United States**.
   - Mục **Currency**: Chọn **USD**.
   - Mục **Payment Providers**: Chỉ tích chọn **`stripe`** và **`manual`** (hoặc `paypal`).

---

### Bước 5: Luồng hiển thị và thanh toán ở Storefront (Next.js / React)

1. **Lấy danh sách cổng**: Khi checkout, gọi API để lấy thông tin giỏ hàng hiện tại:
   `GET /store/carts/{cart_id}`
   Medusa sẽ tự động trả về mảng `payment_sessions` chứa danh sách cổng thanh toán đã gán cho Region của giỏ hàng đó (Ví dụ: `momo`, `payos`).
2. **Chọn cổng**: Người dùng chọn cổng, ví dụ `payos`. Frontend gửi request:
   `POST /store/carts/{cart_id}/payment-collection`
3. **Thanh toán**: Frontend dùng `checkout_url` nhận được từ API để redirect khách sang giao diện quét mã QR của PayOS/Momo.
4. **Hoàn tất**: Sau khi khách chuyển tiền, Webhook gửi thông tin về backend cập nhật trạng thái đơn hàng sang `authorized`.

---

## 3. Các Biến Môi Trường Cần Thiết (`.env`)

```env
# Stripe Sandbox (Lấy từ stripe.com/docs)
STRIPE_API_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# PayOS Sandbox (Đăng ký tại payos.vn)
PAYOS_CLIENT_ID=test_client_id_...
PAYOS_API_KEY=test_api_key_...
PAYOS_CHECKSUM_KEY=test_checksum_...

# MoMo Sandbox (Đăng ký tại developers.momo.vn)
MOMO_PARTNER_CODE=MOMO_...
MOMO_ACCESS_KEY=access_...
MOMO_SECRET_KEY=secret_...
```
