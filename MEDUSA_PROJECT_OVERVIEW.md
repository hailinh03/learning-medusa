# 📦 Medusa v2 Project Overview — Dành cho lập trình viên Spring Boot

> **Mục tiêu tài liệu:** Tổng hợp cấu trúc dự án, luồng dữ liệu, và các file cấu hình
> quan trọng của Medusa v2, với **ánh xạ khái niệm sang Spring Boot** để dễ hiểu hơn.

---

## Mục lục

1. [Tổng quan Monorepo](#1-tổng-quan-monorepo)
2. [Backend — `apps/backend/`](#2-backend--appsbackend)
   - [Cấu trúc thư mục Backend](#21-cấu-trúc-thư-mục-backend)
   - [Ánh xạ khái niệm Backend → Spring Boot](#22-ánh-xạ-khái-niệm-backend--spring-boot)
3. [Storefront — `apps/storefront/`](#3-storefront--appsstorefront)
   - [Cấu trúc thư mục Storefront](#31-cấu-trúc-thư-mục-storefront)
4. [Các file cấu hình quan trọng](#4-các-file-cấu-hình-quan-trọng)
5. [Luồng Request tổng quát](#5-luồng-request-tổng-quát)
6. [Bảng tra cứu lệnh nhanh](#6-bảng-tra-cứu-lệnh-nhanh)

---

## 1. Tổng quan Monorepo

Dự án được tổ chức theo kiểu **Monorepo** — một repo Git duy nhất chứa nhiều ứng dụng con, quản lý bằng **pnpm workspaces**.

> 💡 **Tương đương Spring Boot:** Giống như một Maven multi-module project, trong đó mỗi `module` là một ứng dụng độc lập.

```
my-medusa-store/                  ← Root workspace (Maven parent POM)
├── apps/
│   ├── backend/                  ← Medusa Server (Spring Boot Application)
│   └── storefront/               ← Next.js Frontend (React SPA/SSR)
├── docker-compose.yml            ← Infrastructure (PostgreSQL + Redis)
├── medusa-cheatsheet.md          ← Bảng lệnh tra cứu nhanh
└── package.json                  ← Root package (pnpm workspace config)
```

### Infrastructure (`docker-compose.yml`)

```yaml
services:
  postgres:   # Cơ sở dữ liệu chính — tương đương MySQL/PostgreSQL trong Spring
    image: postgres:15-alpine
    ports: "5432:5432"

  redis:      # Message broker + Cache — tương đương Spring's @Async thread pool
    image: redis:7-alpine  # BẮT BUỘC: Medusa dùng Redis cho Events & Scheduled Jobs
    ports: "6379:6379"
```

> ⚠️ **Lưu ý:** Redis là **bắt buộc** trong Medusa. Nó đóng vai trò như một
> message queue cho Subscribers (Events) và Scheduled Jobs — tương tự
> Kafka/RabbitMQ hoặc Spring's `@Async` TaskExecutor.

---

## 2. Backend — `apps/backend/`

### 2.1 Cấu trúc thư mục Backend

```
apps/backend/
├── src/
│   │
│   ├── modules/                  ← Đây là TRÁI TIM của Medusa
│   │   └── brand/                ← Một domain nghiệp vụ độc lập
│   │       ├── models/
│   │       │   └── brand.ts      ← @Entity + @Table (JPA)
│   │       ├── service.ts        ← JpaRepository + @Service (auto-CRUD)
│   │       ├── migrations/       ← Flyway/Liquibase migration scripts
│   │       │   └── Migration20260621122458.ts
│   │       └── index.ts          ← @Configuration (đăng ký module vào container)
│   │
│   ├── api/                      ← @RestController layer
│   │   ├── middlewares.ts        ← Filter/Interceptor + Bean Validation
│   │   ├── admin/
│   │   │   └── brands/
│   │   │       ├── route.ts      ← @PostMapping / @GetMapping
│   │   │       └── validators.ts ← Request DTO + @Valid (Zod schema)
│   │   └── store/
│   │       └── custom/
│   │           └── route.ts
│   │
│   ├── workflows/                ← Saga Pattern (Distributed Transaction)
│   │   ├── create-brand.ts       ← Saga Orchestrator
│   │   ├── steps/
│   │   │   └── create-brand.ts   ← Saga Command (1 step = 1 mutation + rollback)
│   │   └── hooks/
│   │       └── created-product.ts← AOP @Around / @EventListener (đồng bộ)
│   │
│   ├── links/                    ← Bảng trung gian (JPA @ManyToMany join table)
│   │   └── product-brand.ts      ← defineLink(ProductModule, BrandModule)
│   │
│   ├── subscribers/              ← @KafkaListener / @EventListener (bất đồng bộ)
│   │   └── README.md
│   │
│   ├── jobs/                     ← @Scheduled (Cron Jobs)
│   │   └── README.md
│   │
│   ├── admin/                    ← Giao diện Admin Dashboard (React/Vite)
│   │   ├── widgets/
│   │   │   └── product-brand.tsx ← UI Component nhúng vào trang có sẵn
│   │   ├── routes/
│   │   │   └── brands/page.tsx   ← Trang quản lý thương hiệu mới
│   │   └── lib/
│   │       └── sdk.ts            ← Admin SDK client
│   │
│   └── migration-scripts/
│       └── initial-data-seed.ts  ← Data seeder (khởi tạo dữ liệu mẫu)
│
├── medusa-config.ts              ← application.properties (CỰC KỲ QUAN TRỌNG)
├── package.json                  ← pom.xml (dependencies + scripts)
├── .env.template                 ← application-dev.properties (template)
└── tsconfig.json                 ← TypeScript compiler config
```

---

### 2.2 Ánh xạ khái niệm Backend → Spring Boot

#### 📌 Module (`src/modules/brand/`)
> **Tương đương:** Một bounded context trong DDD, hoặc một Spring Boot Starter tự tạo.

```typescript
// src/modules/brand/models/brand.ts
// ═══════════════════════════════════════════════════════════
// SPRING BOOT tương đương:
//   @Entity
//   @Table(name = "brand")
//   public class Brand { @Id private String id; @Column private String name; }
// ═══════════════════════════════════════════════════════════
import { model } from "@medusajs/framework/utils"

export const Brand = model.define("brand", {
  id: model.id().primaryKey(),  // @Id @GeneratedValue(UUID)
  name: model.text(),           // @Column(nullable = false)
  // created_at, updated_at, deleted_at được tự động thêm — đừng khai báo thêm!
})
```

```typescript
// src/modules/brand/service.ts
// ═══════════════════════════════════════════════════════════
// SPRING BOOT tương đương:
//   public interface BrandRepository extends JpaRepository<Brand, String> {}
//   @Service public class BrandService { @Autowired BrandRepository repo; }
//
// Điểm khác biệt: Medusa TỰ ĐỘNG sinh ra toàn bộ CRUD:
//   createBrands(), retrieveBrand(), listBrands(),
//   updateBrands(), deleteBrands(), listAndCountBrands()
// Bạn không cần viết bất cứ dòng nào trong class!
// ═══════════════════════════════════════════════════════════
import { MedusaService } from "@medusajs/framework/utils"
import { Brand } from "./models/brand"

export class BrandModuleService extends MedusaService({ Brand }) {
  // Tất cả CRUD đã được sinh tự động — chỉ thêm method khi có logic đặc biệt
}
export default BrandModuleService
```

```typescript
// src/modules/brand/index.ts
// ═══════════════════════════════════════════════════════════
// SPRING BOOT tương đương:
//   @Configuration public class BrandConfig {
//     @Bean public BrandService brandService() { return new BrandService(); }
//   }
// Sau đó khai báo trong medusa-config.ts — như @ComponentScan
// ═══════════════════════════════════════════════════════════
import { Module } from "@medusajs/framework/utils"
import { BrandModuleService } from "./service"

export const BRAND_MODULE = "brand"  // Key để container.resolve("brand")
export default Module(BRAND_MODULE, {
  service: BrandModuleService,
})
```

---

#### 📌 Workflow & Step (`src/workflows/`)
> **Tương đương:** Saga Orchestrator Pattern — giống Camunda BPMN hoặc Axon Saga.

```typescript
// src/workflows/steps/create-brand.ts
// ═══════════════════════════════════════════════════════════
// SPRING BOOT tương đương: Một Saga Command với rollback thủ công
//   try {
//     Brand brand = brandService.create(input);
//   } catch (Exception e) {
//     brandService.delete(lastCreatedId); // manual compensate
//   }
// Medusa làm việc này TỰ ĐỘNG qua Compensation Function
// ═══════════════════════════════════════════════════════════
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { BRAND_MODULE } from "../modules/brand"

export const createBrandStep = createStep(
  "create-brand-step",            // Tên duy nhất của bước

  // A. Hàm chạy chính (Execute) — tương đương logic trong @Transactional method
  async (input: { name: string }, { container }) => {
    // container.resolve() == @Autowired trong Spring
    const brandService = container.resolve(BRAND_MODULE)
    const brand = await brandService.createBrands(input)

    // StepResponse(output, compensationInput)
    // compensationInput là dữ liệu được truyền vào hàm rollback bên dưới
    return new StepResponse(brand, brand.id)
  },

  // B. Hàm hoàn tác (Compensation) — tự động gọi khi bước SAU bị lỗi
  //    Tương đương logic rollback trong catch block của Saga
  async (brandId, { container }) => {
    if (!brandId) return
    const brandService = container.resolve(BRAND_MODULE)
    await brandService.deleteBrands(brandId)
  }
)
```

```typescript
// src/workflows/create-brand.ts
// ═══════════════════════════════════════════════════════════
// ⚠️ QUY TẮC VÀNG của Workflow Constructor:
//   1. KHÔNG dùng async/await (hàm này chạy lúc server khởi động để VẼ đồ thị)
//   2. KHÔNG dùng arrow function => (dùng function keyword)
//   3. KHÔNG dùng if/else, for/while (dùng when() và transform() thay thế)
//   4. KHÔNG dùng new Date() (dùng transform() để tạo date lúc runtime)
// ═══════════════════════════════════════════════════════════
import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { createBrandStep } from "./steps/create-brand"

export const createBrandWorkflow = createWorkflow(
  "create-brand",               // Tên workflow — phải unique toàn hệ thống

  function (input: { name: string }) {  // Regular function, NOT async arrow!
    const brand = createBrandStep(input) // KHÔNG có await — Medusa xử lý async nội bộ
    return new WorkflowResponse(brand)
  }
)
```

---

#### 📌 API Route (`src/api/`)
> **Tương đương:** `@RestController` + File-based routing (như Spring MVC nhưng theo cấu trúc thư mục).

```typescript
// src/api/admin/brands/validators.ts
// ═══════════════════════════════════════════════════════════
// SPRING BOOT tương đương:
//   public class CreateBrandRequest {
//     @NotBlank private String name;
//   }
// Zod đóng vai trò như Hibernate Validator (@Valid, @NotNull, @Size...)
// ═══════════════════════════════════════════════════════════
import { z } from "zod"

export const PostAdminCreateBrand = z.object({
  name: z.string(),             // @NotBlank String name
})
// TypeScript: z.infer<T> tự suy ra kiểu từ Zod schema → không cần viết interface riêng
export type PostAdminCreateBrandType = z.infer<typeof PostAdminCreateBrand>
```

```typescript
// src/api/middlewares.ts
// ═══════════════════════════════════════════════════════════
// SPRING BOOT tương đương: HandlerInterceptor hoặc @ControllerAdvice
// File này BẮT BUỘC đặt tên đúng là "middlewares.ts" để Medusa tự scan
// ═══════════════════════════════════════════════════════════
import { defineMiddlewares, validateAndTransformBody } from "@medusajs/framework/http"
import { PostAdminCreateBrand } from "./admin/brands/validators"

export default defineMiddlewares({
  routes: [
    {
      matcher: "/admin/brands",           // URL pattern (như @RequestMapping)
      method: "POST",                     // HTTP method
      middlewares: [
        validateAndTransformBody(PostAdminCreateBrand), // @Valid tự động
        // Nếu validation fail → trả về 400 ngay, không vào route handler
      ],
    },
    // Mở rộng payload của Core API (thêm brand_id vào POST /admin/products)
    {
      matcher: "/admin/products",
      method: ["POST"],
      additionalDataValidator: {
        brand_id: z.string().optional(),  // Cho phép truyền thêm trường này
      }
    },
  ],
})
```

```typescript
// src/api/admin/brands/route.ts
// ═══════════════════════════════════════════════════════════
// ROUTING THEO THƯ MỤC:
//   File tại src/api/admin/brands/route.ts → URL: /admin/brands
//   File tại src/api/admin/brands/[id]/route.ts → URL: /admin/brands/:id
//
// SPRING BOOT tương đương:
//   @RestController @RequestMapping("/admin/brands")
//   public class BrandController { @PostMapping ... }
//
// TypeScript: MedusaRequest<T> là generic type — T chỉ định kiểu của req.validatedBody
// ═══════════════════════════════════════════════════════════
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { createBrandWorkflow } from "../../../workflows/create-brand"
import { PostAdminCreateBrandType } from "./validators"

// export const POST — không phải @PostMapping annotation mà là tên hàm phải viết HOA
export const POST = async (
  req: MedusaRequest<PostAdminCreateBrandType>, // Generic<T>: type của validatedBody
  res: MedusaResponse
) => {
  // req.scope == IoC Container cho request hiện tại (như ApplicationContext trong Spring)
  const { result } = await createBrandWorkflow(req.scope).run({
    input: req.validatedBody,  // Dữ liệu đã được validate bởi middleware
  })
  res.json({ brand: result })
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const query = req.scope.resolve("query")  // Query service — dùng để JOIN data

  const { data: brands, metadata } = await query.graph({
    entity: "brand",
    ...req.queryConfig,  // limit, offset, fields từ query params
  })

  res.json({ brands, count: metadata?.count, limit: metadata?.take, offset: metadata?.skip })
}
```

---

#### 📌 Subscribers (`src/subscribers/`)
> **Tương đương:** `@EventListener` hoặc Kafka `@KafkaListener` — **bất đồng bộ**, không block main flow.

```typescript
// src/subscribers/order-placed.ts
// ═══════════════════════════════════════════════════════════
// SPRING BOOT tương đương:
//   @Component public class OrderPlacedListener {
//     @EventListener public void handleOrderPlaced(OrderPlacedEvent event) {
//       emailService.sendConfirmation(event.getOrderId());
//     }
//   }
// ═══════════════════════════════════════════════════════════
import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"

export default async function orderPlacedHandler({
  event: { data },       // data chỉ chứa { id: string } — phải fetch full data nếu cần
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve("logger")
  logger.info(`Xử lý đơn hàng: ${data.id}`)

  // Query full order data
  const query = container.resolve("query")
  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "email", "total", "customer.*"],
    filters: { id: data.id },
  })
  // Gửi email xác nhận...
}

export const config: SubscriberConfig = {
  event: "order.placed",   // Tên event — như topic trong Kafka
}
```

---

#### 📌 Module Links (`src/links/`)
> **Tương đương:** Bảng trung gian `@ManyToMany` trong JPA, nhưng **giữa các module độc lập**.

```typescript
// src/links/product-brand.ts
// ═══════════════════════════════════════════════════════════
// VẤN ĐỀ: Product Module và Brand Module độc lập hoàn toàn (như Microservices).
// Không thể thêm brand_id trực tiếp vào bảng product của Medusa Core.
//
// GIẢI PHÁP: defineLink tạo ra bảng trung gian tự động:
//   product_product_brand_brand (product_id, brand_id)
//
// SPRING BOOT tương đương (nếu cùng một Monolith):
//   @Entity Product { @ManyToOne Brand brand; }
// ═══════════════════════════════════════════════════════════
import BrandModule from "../modules/brand"
import ProductModule from "@medusajs/medusa/product"
import { defineLink } from "@medusajs/framework/utils"

export default defineLink(
  {
    linkable: ProductModule.linkable.product,
    isList: true,   // Một Brand có nhiều Products (One-to-Many)
  },
  BrandModule.linkable.brand  // Phía ngược lại: một Product thuộc một Brand
)
// ⚠️ Sau khi tạo link, PHẢI chạy: npx medusa db:migrate
```

---

#### 📌 Workflow Hooks (`src/workflows/hooks/`)
> **Tương đương:** AOP `@Around` advice hoặc `@EventListener` **đồng bộ** (block main flow).

```typescript
// src/workflows/hooks/created-product.ts
// ═══════════════════════════════════════════════════════════
// Hook cho phép "chen chân" vào workflow CÓ SẴN của Medusa (createProductsWorkflow)
// mà KHÔNG cần sửa source code gốc.
//
// SPRING BOOT tương đương:
//   @Aspect @Component public class ProductCreationAspect {
//     @AfterReturning(pointcut="@annotation(CreateProduct)")
//     public void afterProductCreated(Product product, String brandId) {
//       linkService.createProductBrandLink(product.getId(), brandId);
//     }
//   }
// ═══════════════════════════════════════════════════════════
import { createProductsWorkflow } from "@medusajs/medusa/core-flows"
import { StepResponse } from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"
import { BRAND_MODULE } from "../../modules/brand"

createProductsWorkflow.hooks.productsCreated(
  // A. Hàm chạy sau khi products được tạo thành công
  async ({ products, additional_data }, { container }) => {
    if (!additional_data?.brand_id) {
      return new StepResponse([], [])  // Không có brand_id → bỏ qua
    }

    const link = container.resolve("link")  // Link service — quản lý bảng trung gian
    const links = products.map(product => ({
      [Modules.PRODUCT]: { product_id: product.id },
      [BRAND_MODULE]: { brand_id: additional_data.brand_id },
    }))

    await link.create(links)  // Ghi vào bảng product_product_brand_brand
    return new StepResponse(links, links)
  },

  // B. Compensation: Nếu workflow tạo product THẤT BẠI sau hook này → tự xóa link
  async (links, { container }) => {
    if (!links?.length) return
    const link = container.resolve("link")
    await link.dismiss(links)  // Xóa link đã tạo
  }
)
```

---

## 3. Storefront — `apps/storefront/`

### 3.1 Cấu trúc thư mục Storefront

> **Tổng thể:** Next.js 15 App Router — tương đương Spring MVC nhưng render cả server lẫn client side.

```
apps/storefront/src/
│
├── app/                          ← Routing theo thư mục (như @RequestMapping nhưng tự động)
│   └── [countryCode]/            ← Dynamic segment — tương đương @PathVariable
│       ├── (main)/               ← Route group: có Nav + Footer (layout chung)
│       │   ├── page.tsx          ← Trang chủ: GET /vn
│       │   ├── store/page.tsx    ← Danh sách sản phẩm: GET /vn/store
│       │   ├── products/
│       │   │   └── [handle]/
│       │   │       └── page.tsx  ← Chi tiết sản phẩm: GET /vn/products/:handle
│       │   ├── cart/page.tsx     ← Giỏ hàng: GET /vn/cart
│       │   └── account/          ← Trang tài khoản (có sub-routes)
│       │
│       └── (checkout)/           ← Route group riêng: không có Nav/Footer
│           └── checkout/page.tsx ← Trang thanh toán
│
├── modules/                      ← UI Components theo domain (tách biệt theo nghiệp vụ)
│   ├── common/                   ← Shared components (Button, Input, Modal, Icon...)
│   ├── layout/                   ← Nav, Footer, SideMenu, CartDropdown
│   ├── products/                 ← ProductCard, ImageGallery, ProductActions
│   ├── cart/                     ← CartItem, CartTotals, EmptyCart
│   ├── checkout/                 ← Địa chỉ, Shipping, Payment, Review
│   ├── order/                    ← OrderDetails, OrderSummary, ShippingDetails
│   ├── account/                  ← Profile, AddressBook, OrderHistory
│   └── skeletons/                ← Loading skeleton components
│
├── lib/
│   ├── config.ts                 ← Khởi tạo Medusa JS SDK (ĐIỂM DUY NHẤT gọi API)
│   ├── data/                     ← Tầng gọi API — tương đương @FeignClient
│   │   ├── cart.ts               ← sdk.store.cart.*
│   │   ├── products.ts           ← sdk.store.product.*
│   │   ├── customer.ts           ← sdk.store.customer.*
│   │   ├── orders.ts             ← sdk.store.order.*
│   │   ├── regions.ts            ← sdk.store.region.*
│   │   └── cookies.ts            ← Quản lý auth token, cart ID trong cookies
│   ├── hooks/                    ← React custom hooks (useToggleState, useIntersection)
│   ├── context/                  ← React Context API (tương đương @RequestScope bean)
│   └── util/                     ← Utility functions
│       ├── money.ts              ← Định dạng tiền tệ (Intl.NumberFormat)
│       ├── get-product-price.ts  ← Tính giá hiển thị
│       └── get-percentage-diff.ts← Tính % giảm giá
│
├── types/
│   ├── global.ts                 ← Custom TypeScript types cho project
│   └── icon.ts                   ← Type cho SVG icon props
│
└── styles/
    └── globals.css               ← TailwindCSS base styles
```

#### SDK Client — `lib/config.ts`
> **Tương đương:** `@FeignClient` hoặc `RestTemplate` trong Spring — nhưng **PHẢI dùng**, không được thay thế bằng `fetch()` thông thường.

```typescript
// src/lib/config.ts
// ═══════════════════════════════════════════════════════════
// ⚠️ NGUYÊN TẮC BẮT BUỘC:
//   - LUÔN dùng sdk.client.fetch() cho custom API routes
//   - LUÔN dùng sdk.store.* cho built-in endpoints
//   - KHÔNG BAO GIỜ dùng fetch() trực tiếp
//
//   VÌ SAO? SDK tự động gắn:
//     - x-publishable-api-key header (Store routes)
//     - Authorization: Bearer <token> header (Admin routes)
//   Nếu dùng fetch() thường → thiếu headers → 401/403 error
// ═══════════════════════════════════════════════════════════
import Medusa from "@medusajs/js-sdk"

export const sdk = new Medusa({
  baseUrl: process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000",
  publishableKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
  // SDK tự động handle authentication headers
})
```

---

## 4. Các file cấu hình quan trọng

### 📄 `medusa-config.ts` — Tương đương `application.properties`

```typescript
// apps/backend/medusa-config.ts
import { loadEnv, defineConfig } from '@medusajs/framework/utils'

// Tải biến môi trường từ .env file (tương đương @PropertySource)
loadEnv(process.env.NODE_ENV || 'development', process.cwd())

module.exports = defineConfig({
  projectConfig: {
    // ─── Kết nối Database ───────────────────────────────────
    databaseUrl: process.env.DATABASE_URL,
    // spring.datasource.url=jdbc:postgresql://localhost:5432/medusa-store

    http: {
      // ─── CORS Configuration ─────────────────────────────────
      storeCors: process.env.STORE_CORS!,
      // Cho phép storefront (http://localhost:8000) gọi Store API

      adminCors: process.env.ADMIN_CORS!,
      // Cho phép admin dashboard gọi Admin API

      authCors: process.env.AUTH_CORS!,
      // Cho phép auth endpoints

      // ─── Security ───────────────────────────────────────────
      jwtSecret: process.env.JWT_SECRET,
      // jwt.secret=supersecret

      cookieSecret: process.env.COOKIE_SECRET,
      // server.session.cookie.secret=supersecret
    }
  },

  // ─── Module Registration ──────────────────────────────────
  // BẮT BUỘC: Mọi custom module PHẢI được khai báo ở đây
  // Tương đương @ComponentScan hoặc khai báo @Bean trong @Configuration
  modules: [
    {
      resolve: "./src/modules/brand",  // Đường dẫn tương đối đến module
    },
    // Thêm custom modules khác tại đây
  ],
})
```

---

### 📄 `.env.template` — Tương đương `application-dev.properties`

```bash
# apps/backend/.env.template — Copy thành .env và điền giá trị thực

# ─── CORS ──────────────────────────────────────────────────
STORE_CORS=http://localhost:8000,https://docs.medusajs.com
ADMIN_CORS=http://localhost:5173,http://localhost:9000
AUTH_CORS=http://localhost:5173,http://localhost:9000

# ─── Database ───────────────────────────────────────────────
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/medusa-store
# Chạy: docker-compose up -d postgres để khởi động PostgreSQL

# ─── Security ───────────────────────────────────────────────
JWT_SECRET=supersecret       # Đổi thành giá trị ngẫu nhiên phức tạp khi production
COOKIE_SECRET=supersecret

# ─── Cache/Queue ────────────────────────────────────────────
REDIS_URL=redis://localhost:6379
# Chạy: docker-compose up -d redis để khởi động Redis
```

---

### 📄 `apps/backend/package.json` — Tương đương `pom.xml`

```json
{
  "name": "@dtc/backend",
  "scripts": {
    "build":  "medusa build",    // mvn package (compile + bundle)
    "start":  "medusa start",    // java -jar app.jar (production)
    "dev":    "medusa develop",  // mvn spring-boot:run --hot-reload
    "lint":   "medusa lint"      // mvn checkstyle:check
  },
  "dependencies": {
    "@medusajs/medusa":    "2.16.0",  // spring-boot-starter-web (core framework)
    "@medusajs/framework": "2.16.0",  // spring-framework (low-level APIs)
    "@medusajs/js-sdk":    "2.16.0",  // openfeign (HTTP client)
    "@medusajs/ui":        "4.1.15",  // UI components cho Admin React app
    "@medusajs/admin-sdk": "2.16.0",  // Admin extension SDK
    "zod":                 "4.2.0",   // hibernate-validator (Bean Validation)
    "@tanstack/react-query":"5.64.2"  // Data fetching cho React (không có tương đương Spring)
  },
  "devDependencies": {
    "typescript": "^5.6.2"     // Compiler — như javac nhưng tùy chọn
  },
  "engines": {
    "node": ">=20"             // Tương đương java.version = 17 trong pom.xml
  }
}
```

---

## 5. Luồng Request tổng quát

### 5.1 Luồng tạo Brand (POST /admin/brands)

```
┌─────────────────────────────────────────────────────────────────────┐
│  ADMIN DASHBOARD (React)                                            │
│  sdk.client.fetch("/admin/brands", { method: "POST", body: {...} }) │
│  Tự động gắn: Authorization: Bearer <admin_jwt>                     │
└────────────────────────────┬────────────────────────────────────────┘
                             │ HTTP POST /admin/brands
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  MIDDLEWARES (src/api/middlewares.ts)                               │
│  → validateAndTransformBody(PostAdminCreateBrand)                   │
│  → Kiểm tra { name: string } hợp lệ không?                         │
│  → Nếu không hợp lệ: trả về 400 Bad Request ngay                   │
│  → Nếu hợp lệ: gắn vào req.validatedBody, gọi tiếp route handler  │
│                                                                     │
│  [SPRING BOOT tương đương] HandlerInterceptor.preHandle() + @Valid  │
└────────────────────────────┬────────────────────────────────────────┘
                             │ req.validatedBody = { name: "Nike" }
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  ROUTE HANDLER (src/api/admin/brands/route.ts)                     │
│  export const POST = async (req, res) => {                          │
│    await createBrandWorkflow(req.scope).run({ input: req.body })    │
│  }                                                                  │
│                                                                     │
│  [SPRING BOOT tương đương] @RestController @PostMapping             │
└────────────────────────────┬────────────────────────────────────────┘
                             │ Khởi động Workflow
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  WORKFLOW (src/workflows/create-brand.ts)                           │
│  createBrandWorkflow → [createBrandStep]                            │
│  Đây là Saga Orchestrator — điều phối các bước                     │
│                                                                     │
│  [SPRING BOOT tương đương] @Service @Transactional method          │
└────────────────────────────┬────────────────────────────────────────┘
                             │ Thực thi từng Step
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP (src/workflows/steps/create-brand.ts)                        │
│  container.resolve(BRAND_MODULE) → brandService.createBrands(input)│
│                                                                     │
│  Nếu THÀNH CÔNG: trả brand về Workflow                             │
│  Nếu THẤT BẠI:   Medusa tự gọi Compensation Function (rollback)    │
│                                                                     │
│  [SPRING BOOT tương đương] Saga Command + Compensating Transaction  │
└────────────────────────────┬────────────────────────────────────────┘
                             │ CRUD operation
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  MODULE SERVICE (src/modules/brand/service.ts)                     │
│  BrandModuleService.createBrands({ name: "Nike" })                  │
│  → MikroORM INSERT INTO brand (id, name, ...) VALUES (...)         │
│                                                                     │
│  [SPRING BOOT tương đương] JpaRepository.save(entity)              │
└────────────────────────────┬────────────────────────────────────────┘
                             │ SQL Query
                             ▼
                    ┌─────────────────┐
                    │   PostgreSQL    │
                    │   brand table   │
                    └─────────────────┘
```

---

### 5.2 Luồng lấy danh sách Brand (GET /admin/brands)

```
Client → GET /admin/brands?limit=15&offset=0
       → Middleware: validateAndTransformQuery (parse params)
       → Route Handler: query.graph({ entity: "brand", ...req.queryConfig })
       → Query Service: SELECT * FROM brand LIMIT 15 OFFSET 0
       → Response: { brands: [...], count: N, limit: 15, offset: 0 }
```

---

### 5.3 Luồng tạo Product kèm Brand (POST /admin/products với brand_id)

```
Client → POST /admin/products { title: "...", brand_id: "brand_01..." }
       → Middleware: additionalDataValidator { brand_id: z.string().optional() }
       → Medusa Core: createProductsWorkflow chạy
       → [HOOK] productsCreated hook chạy sau khi products được tạo
           → Kiểm tra additional_data.brand_id
           → link.create([{ product: {...}, brand: {...} }])
           → INSERT INTO product_product_brand_brand VALUES (...)
       → Response: { product: { id: "...", title: "..." } }

Nếu createProductsWorkflow thất BẠI sau hook:
       → Hook Compensation: link.dismiss(links) → Xóa link đã tạo
```

---

### 5.4 Luồng Storefront gọi API (Next.js → Medusa Backend)

```
┌──────────────────────────────────────────────────────┐
│  STOREFRONT PAGE (Server Component - Next.js)        │
│  const products = await listProducts({ countryCode })│
└──────────────────────┬───────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────┐
│  DATA LAYER (src/lib/data/products.ts)               │
│  return sdk.client.fetch("/store/products", {        │
│    query: { region_id, fields, limit, offset }       │
│  })                                                  │
│  SDK tự gắn: x-publishable-api-key header            │
└──────────────────────┬───────────────────────────────┘
                       │ HTTP GET /store/products
                       ▼
┌──────────────────────────────────────────────────────┐
│  MEDUSA BACKEND — Store Products API (Built-in)      │
│  → Query products với pricing theo region            │
│  → Response: { products: [...], count: N }           │
└──────────────────────┬───────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────┐
│  REACT COMPONENT renders product list                │
└──────────────────────────────────────────────────────┘
```

---

## 6. Bảng tra cứu lệnh nhanh

| Lệnh | Tương đương Maven/Spring | Mô tả |
|------|--------------------------|-------|
| `pnpm dev` | `mvn spring-boot:run` | Khởi động toàn bộ (backend + frontend) |
| `pnpm db:generate brand` | Tạo Flyway migration file | Sinh file migration từ thay đổi data model |
| `pnpm db:migrate` | `mvn flyway:migrate` | Áp dụng migration lên PostgreSQL |
| `pnpm db:create-admin -e admin@test.com -p pass` | Tạo admin user | Tạo tài khoản đăng nhập Admin Dashboard |
| `pnpm backend:seed` | Chạy DataLoader/CommandLineRunner | Nạp dữ liệu mẫu (products, regions...) |
| `pnpm build` | `mvn package` | Build production bundle |

### URL quan trọng khi dev

| URL | Mô tả |
|-----|-------|
| `http://localhost:9000` | Medusa Backend API |
| `http://localhost:9000/app` | Admin Dashboard (login: `admin@medusa-test.com` / `supersecret`) |
| `http://localhost:8000` | Storefront (giao diện khách hàng) |

---

## 7. Bảng ánh xạ khái niệm tổng hợp

| Medusa v2 | Spring Boot | Ghi chú |
|-----------|-------------|---------|
| `model.define("brand", {...})` | `@Entity @Table` | Định nghĩa bảng DB |
| `MedusaService({ Brand })` | `JpaRepository` + `@Service` | Auto-generate CRUD |
| `Module("brand", { service })` | `@Configuration @Bean` | Đăng ký vào container |
| `container.resolve("brand")` | `@Autowired` | Dependency Injection |
| `medusa-config.ts modules[]` | `@ComponentScan` | Đăng ký module |
| `npx medusa db:generate` | Tạo Flyway script | Schema migration |
| `npx medusa db:migrate` | `mvn flyway:migrate` | Chạy migration |
| `createStep(name, fn, compensate)` | Saga Command + Rollback | 1 step = 1 mutation |
| `createWorkflow(name, fn)` | `@Transactional` Saga Orchestrator | Điều phối các steps |
| `route.ts export const POST` | `@PostMapping` | HTTP handler |
| `middlewares.ts` | `HandlerInterceptor` + `@Valid` | Filter + Validation |
| `Zod schema` | `@NotNull @Size @Valid` | Bean Validation |
| `z.infer<typeof Schema>` | `class RequestDTO { }` | Tự suy ra kiểu từ schema |
| `defineLink(ModuleA, ModuleB)` | `@ManyToMany` join table | Liên kết cross-module |
| `Subscribers` | `@EventListener` (async) | Xử lý event bất đồng bộ |
| `Workflow Hooks` | `@Around AOP` (sync) | Chen vào workflow có sẵn |
| `Scheduled Jobs` | `@Scheduled` Cron | Tác vụ định kỳ |
| `req.scope` | `ApplicationContext` per-request | DI container cho 1 request |
| `sdk.client.fetch()` | `RestTemplate` / `@FeignClient` | HTTP client có sẵn auth |
| `query.graph()` | JPQL / `@Query` | Cross-module data query |
| `transform()` trong workflow | Không có tương đương trực tiếp | Xử lý data trong workflow graph |

---

> 📝 **Tài liệu được tạo cho dự án học Medusa v2 của lập trình viên Java/Spring Boot.**
> Cập nhật lần cuối: 2026-06-23
> Medusa version: `2.16.0`
