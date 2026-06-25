# 📧 Blueprint Thiết Kế: Hệ Thống Gửi Email Tự Động Với Resend & React Email (Medusa v2)

Tài liệu này cung cấp hướng dẫn thiết kế và triển khai chi tiết hệ thống gửi email tự động bằng **Resend** kết hợp với **React Email** trong **Medusa v2**. Blueprint này tuân thủ hoàn toàn theo tài liệu hướng dẫn chính thức của Medusa.

---

## 1. Kiến Trúc Luồng Gửi Email trong Medusa v2

Khác với Medusa v1 hoặc các hệ thống monolith thông thường, Medusa v2 khuyến khích việc tích hợp cổng email vào hệ thống Notification Module cốt lõi thông qua **Workflows** để đảm bảo tính an toàn giao dịch (transactional safety) và khả năng mở rộng.

```
[Sự kiện: order.placed] 
       │
       ▼
[Event Bus (Redis)]
       │
       ▼
[Subscriber (Bộ lắng nghe sự kiện)]
       │ (Kích hoạt chạy)
       ▼
[Workflow: sendOrderConfirmationWorkflow]
       │
       ├─► [Step 1: Truy vấn thông tin chi tiết đơn hàng qua Query Graph]
       │
       └─► [Step 2: sendNotificationStep]
                 │ (Gọi Notification Module Service)
                 ▼
          [Notification Module]
                 │ (Điều phối dựa trên channel: "email")
                 ▼
          [Resend Notification Provider]
                 │
                 ├─► [Render Template React Email sang HTML]
                 │
                 └─► [Gửi qua Resend SDK API] ──► [Khách Hàng]
```

---

## 2. Các Bước Thiết Lập & Code Mẫu Chi Tiết

### Bước 1: Cài đặt các thư viện cần thiết
Tại thư mục gốc của Medusa project (hoặc cụ thể tại `apps/backend`), chạy lệnh sau để cài đặt các package:

```bash
# Cài đặt Resend SDK và thư viện React Email components bản chính xác
pnpm add resend @react-email/components -E

# Cài đặt công cụ CLI React Email làm devDependency phục vụ việc Preview giao diện
pnpm add -D react-email
```

---

### Bước 2: Thiết kế Template Email với React Email
Tạo file template React Email cho sự kiện đặt hàng thành công tại đường dẫn:
`src/modules/email-resend/emails/order-placed.tsx`

```tsx
import { 
  Html, 
  Body, 
  Head, 
  Preview, 
  Container, 
  Section, 
  Row, 
  Column, 
  Heading, 
  Text, 
  Link, 
  Img, 
  Tailwind 
} from "@react-email/components"
import { OrderDTO, CustomerDTO } from "@medusajs/framework/types"
import * as React from "react"

type OrderPlacedEmailProps = {
  order: OrderDTO & {
    customer: CustomerDTO
  }
}

export function OrderPlacedEmailComponent({ order }: OrderPlacedEmailProps) {
  const formatter = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND"
  })

  return (
    <Html>
      <Head />
      <Preview>Xác nhận đơn hàng #{order.display_id || order.id}</Preview>
      <Tailwind>
        <Body className="bg-slate-50 my-auto mx-auto font-sans">
          <Container className="border border-solid border-slate-200 rounded my-[40px] mx-auto p-[20px] max-w-[600px] bg-white">
            <Heading className="text-slate-900 text-[24px] font-bold text-center p-0 my-[30px] mx-0">
              Cảm ơn bạn đã mua sắm!
            </Heading>
            <Text className="text-slate-800 text-[14px] leading-[24px]">
              Xin chào {order.customer?.first_name || "khách hàng"},
            </Text>
            <Text className="text-slate-800 text-[14px] leading-[24px]">
              Đơn hàng <strong>#{order.display_id || order.id}</strong> của bạn đã được xác nhận thành công và đang được xử lý.
            </Text>
            
            {/* Chi tiết sản phẩm */}
            <Section className="border border-solid border-slate-100 rounded p-[15px] my-[20px]">
              <Text className="text-slate-900 font-bold text-[16px] my-0 pb-[10px] border-b border-solid border-slate-100">
                Chi tiết sản phẩm
              </Text>
              {(order.items || []).map((item: any) => (
                <Row key={item.id} className="py-[10px] border-b border-solid border-slate-50">
                  <Column className="w-[80px]">
                    {item.thumbnail && (
                      <Img src={item.thumbnail} width="64" height="64" className="rounded" />
                    )}
                  </Column>
                  <Column>
                    <Text className="text-slate-800 font-semibold text-[14px] my-0">{item.title}</Text>
                    {item.variant?.title && (
                      <Text className="text-slate-500 text-[12px] my-0">Phân loại: {item.variant.title}</Text>
                    )}
                    <Text className="text-slate-500 text-[12px] my-0">Số lượng: {item.quantity}</Text>
                  </Column>
                  <Column align="right">
                    <Text className="text-slate-800 font-bold text-[14px] my-0">
                      {formatter.format(((item.unit_price || 0) * (item.quantity || 0)) / 100)}
                    </Text>
                  </Column>
                </Row>
              ))}
            </Section>

            {/* Thông tin thanh toán */}
            <Section className="bg-slate-50 p-[15px] rounded">
              <Row className="my-[5px]">
                <Column>
                  <Text className="text-slate-600 text-[14px] my-0">Tạm tính</Text>
                </Column>
                <Column align="right">
                  <Text className="text-slate-800 font-semibold text-[14px] my-0">
                    {formatter.format((order.subtotal || 0) / 100)}
                  </Text>
                </Column>
              </Row>
              <Row className="my-[5px]">
                <Column>
                  <Text className="text-slate-600 text-[14px] my-0">Phí vận chuyển</Text>
                </Column>
                <Column align="right">
                  <Text className="text-slate-800 font-semibold text-[14px] my-0">
                    {formatter.format((order.shipping_total || 0) / 100)}
                  </Text>
                </Column>
              </Row>
              <Row className="mt-[15px] pt-[15px] border-t border-solid border-slate-200">
                <Column>
                  <Text className="text-slate-900 font-bold text-[16px] my-0">Tổng thanh toán</Text>
                </Column>
                <Column align="right">
                  <Text className="text-indigo-600 font-bold text-[18px] my-0">
                    {formatter.format((order.total || 0) / 100)}
                  </Text>
                </Column>
              </Row>
            </Section>

            <Text className="text-slate-400 text-[12px] text-center mt-[30px] my-0">
              Nếu bạn có bất kỳ thắc mắc nào, vui lòng liên hệ với chúng tôi qua email hỗ trợ.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}

// Wrapper function trả về JSX
export function orderPlacedEmail(props: any) {
  return <OrderPlacedEmailComponent {...props} />
}

// Mock Order phục vụ hiển thị Preview cục bộ trên UI tool của React Email
const mockOrder = {
  id: "order_01JSNXDH9BPJWWKVW03B9E9KW8",
  display_id: 1234,
  subtotal: 25000000,
  shipping_total: 3000000,
  total: 28000000,
  customer: {
    first_name: "Anh Linh",
    last_name: "Nguyen",
  },
  items: [
    {
      id: "item_1",
      title: "Medusa Premium Sweatshirt",
      thumbnail: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/sweatshirt-vintage-front.png",
      quantity: 1,
      unit_price: 25000000,
      variant: {
        title: "Size L / Black",
      }
    }
  ]
}

export default function Preview() {
  return <OrderPlacedEmailComponent order={mockOrder as any} />
}
```

Để bật tính năng Live Preview trực quan trên trình duyệt, thêm script sau vào `package.json` của backend:
```json
"scripts": {
  "dev:email": "email dev --dir ./src/modules/email-resend/emails"
}
```
*Chạy `pnpm dev:email` để xem trực tiếp và debug giao diện email tại `http://localhost:3000`.*

---

### Bước 3: Tạo Resend Provider Service
Chỉnh sửa file Service để kết nối tới SDK Resend và xử lý compile động React Component bằng React Email `render`:
`src/modules/email-resend/service.ts`

```typescript
import { 
  AbstractNotificationProviderService, 
  MedusaError 
} from "@medusajs/framework/utils"
import { 
  Logger,
  ProviderSendNotificationDTO,
  ProviderSendNotificationResultsDTO
} from "@medusajs/framework/types"
import { Resend } from "resend"
import { render } from "@react-email/components"
import * as React from "react"
import { orderPlacedEmail } from "./emails/order-placed"

// Khai báo các loại Templates được hỗ trợ
enum Templates {
  ORDER_PLACED = "order-placed",
}

// Map các template sang React email wrapper tương ứng
const templates: {[key in Templates]?: (props: any) => React.ReactNode} = {
  [Templates.ORDER_PLACED]: orderPlacedEmail,
}

type ResendOptions = {
  api_key: string      // Bắt buộc cấu hình dạng snake_case theo tài liệu chính thức
  from: string         // Email người gửi (Sender)
  html_templates?: Record<string, { subject?: string; content: string }>
}

export default class ResendNotificationProviderService extends AbstractNotificationProviderService {
  static identifier = "resend"
  protected resendClient: Resend
  protected options: ResendOptions
  protected logger: Logger

  constructor({ logger }: { logger: Logger }, options: ResendOptions) {
    super()
    this.resendClient = new Resend(options.api_key)
    this.options = options
    this.logger = logger
  }

  // Phương thức tĩnh kiểm tra tính hợp lệ của cấu hình Medusa
  static validateOptions(options: Record<any, any>) {
    if (!options.api_key) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Option `api_key` is bắt buộc cấu hình trong Provider options."
      )
    }
    if (!options.from) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Option `from` là bắt buộc để làm địa chỉ gửi đi."
      )
    }
  }

  // Tìm kiếm template tương ứng
  getTemplate(template: Templates) {
    if (this.options.html_templates?.[template]) {
      return this.options.html_templates[template].content
    }
    const allowedTemplates = Object.keys(templates)

    if (!allowedTemplates.includes(template)) {
      return null
    }

    return templates[template]
  }

  // Xác định tiêu đề (Subject) email
  getTemplateSubject(template: Templates) {
    if (this.options.html_templates?.[template]?.subject) {
      return this.options.html_templates[template].subject
    }
    switch (template) {
      case Templates.ORDER_PLACED:
        return "Xác nhận đặt hàng thành công!"
      default:
        return "Thông báo mới từ Medusa Store"
    }
  }

  // Giao thức gửi chính
  async send(
    notification: ProviderSendNotificationDTO
  ): Promise<ProviderSendNotificationResultsDTO> {
    const template = this.getTemplate(notification.template as Templates)

    if (!template) {
      this.logger.error(
        `Không tìm thấy template tương thích cho '${notification.template}'. Các template hiện có: ${Object.values(Templates)}`
      )
      return {}
    }

    const subject = this.getTemplateSubject(notification.template as Templates)

    try {
      // Nếu template là chuỗi thuần (HTML tùy chỉnh từ config), gửi trực tiếp.
      // Ngược lại, gọi render() của React Email để biên dịch React Component sang HTML string.
      const html = typeof template === "string" 
        ? template 
        : await render(template(notification.data))

      const response = await this.resendClient.emails.send({
        from: this.options.from,
        to: [notification.to],
        subject,
        html,
      })

      if (response.error) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          response.error.message
        )
      }

      this.logger.info(`[Resend] Gửi email thành công tới ${notification.to}. ID: ${response.data?.id}`)
      return { id: response.data?.id }
    } catch (error: any) {
      this.logger.error(`[Resend] Lỗi gửi email tới ${notification.to}: ${error.message}`)
      return { error: error.message }
    }
  }
}
```

---

### Bước 4: Khai báo Entrypoint cho Provider Module
Tạo/Chỉnh sửa file `src/modules/email-resend/index.ts`:

```typescript
import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import ResendNotificationProviderService from "./service"

export default ModuleProvider(Modules.NOTIFICATION, {
  services: [
    ResendNotificationProviderService,
  ],
})
```

---

### Bước 5: Viết Workflow Step & Workflow gửi Email
Theo chuẩn Medusa v2, ta không gọi thẳng provider mà bọc trong workflow để xử lý an toàn dữ liệu.

1. **Workflow Step** (`src/workflows/steps/send-notification.ts`):
```typescript
import { Modules } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { CreateNotificationDTO } from "@medusajs/framework/types"

export const sendNotificationStep = createStep(
  "send-notification",
  async (data: CreateNotificationDTO[], { container }) => {
    const notificationModuleService = container.resolve(
      Modules.NOTIFICATION
    )
    const notification = await notificationModuleService.createNotifications(data)
    return new StepResponse(notification)
  }
)
```

2. **Workflow gửi hóa đơn đặt hàng** (`src/workflows/send-order-confirmation.ts`):
```typescript
import { 
  createWorkflow, 
  WorkflowResponse,
  when
} from "@medusajs/framework/workflows-sdk"
import { useQueryGraphStep } from "@medusajs/framework/workflows-sdk"
import { sendNotificationStep } from "./steps/send-notification"

type WorkflowInput = {
  id: string
}

export const sendOrderConfirmationWorkflow = createWorkflow(
  "send-order-confirmation",
  (input: WorkflowInput) => {
    // 1. Lấy dữ liệu chi tiết của Order và Customer bằng Query Graph của Medusa v2
    const { data: orders } = useQueryGraphStep({
      entity: "order",
      fields: [
        "id",
        "display_id",
        "email",
        "subtotal",
        "shipping_total",
        "total",
        "customer.first_name",
        "customer.last_name",
        "items.*",
      ],
      filters: {
        id: input.id,
      },
    })

    const order = orders[0]

    // 2. Chỉ kích hoạt gửi email nếu trường email tồn tại trong Order
    when({ order }, ({ order }) => !!order.email).then(() => {
      sendNotificationStep([
        {
          to: order.email,
          channel: "email",
          template: "order-placed",
          data: {
            order: order,
          },
        },
      ])
    })

    return new WorkflowResponse({
      order_id: input.id
    })
  }
)
```

---

### Bước 6: Tạo Subscriber Lắng Nghe Sự Kiện
Tạo file subscriber kích hoạt Workflow khi nhận event phát ra từ lõi Medusa:
`src/subscribers/order-placed.ts`

```typescript
import type {
  SubscriberArgs,
  SubscriberConfig,
} from "@medusajs/framework"
import { sendOrderConfirmationWorkflow } from "../workflows/send-order-confirmation"

export default async function orderPlacedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  // Thực thi workflow bất đồng bộ
  await sendOrderConfirmationWorkflow(container)
    .run({
      input: {
        id: data.id,
      },
    })
}

// Cấu hình lắng nghe event đặt hàng thành công
export const config: SubscriberConfig = {
  event: "order.placed",
}
```

---

### Bước 7: Đăng ký cấu hình ứng dụng

#### 1. Khai báo biến môi trường trong `.env`
```env
# Nhận API key từ Dashboard của Resend
RESEND_API_KEY=re_xyz123abc...

# Email người gửi (Lưu ý: phải verify domain trên Resend mới dùng được domain riêng, mặc định dùng onboarding@resend.dev)
RESEND_FROM=onboarding@resend.dev
```

#### 2. Kích hoạt module Notification trong `medusa-config.ts`
Cập nhật khai báo module trong `medusa-config.ts` để nạp các option dạng **snake_case** và bật channel `"email"`:
```typescript
    {
      resolve: "@medusajs/medusa/notification",
      options: {
        providers: [
          {
            resolve: "./src/modules/email-resend",
            id: "resend",
            options: {
              channels: ["email"],
              api_key: process.env.RESEND_API_KEY,  // Khóa snake_case chuẩn của Medusa
              from: process.env.RESEND_FROM,
            },
          },
        ],
      },
    },
```

---

## 3. Kế Hoạch Kiểm Thử Của Bạn (Verification Plan)

### Kiểm thử thủ công bằng API Endpoint (Kiểm tra kết nối và cấu hình Resend)
Bạn có thể sử dụng endpoint POST đã tạo sẵn ở `src/api/test-api/email/route.ts` để trigger nhanh một thông báo email kiểm thử.

**Chi tiết Request:**
- **URL**: `POST http://localhost:9000/test-api/email`
- **Headers**: `Content-Type: application/json`
- **Body JSON**:
```json
{
  "to": "email_cua_ban@example.com"
}
```

**Cách thức chạy:**
1. Khởi động backend bằng lệnh `pnpm dev`.
2. Dùng Postman hoặc curl để gửi request POST trên.
3. Kiểm tra log server để đảm bảo không xuất hiện lỗi từ phía `validateOptions` hoặc lỗi API key của Resend, đồng thời kiểm tra Hòm thư email mục tiêu của bạn.
