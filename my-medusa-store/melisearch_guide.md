# 🔍 Meilisearch — Hướng dẫn toàn tập (Cập nhật Custom Module SDK)

> **Dành cho dự án Medusa của bạn.** Viết theo phong cách "học từng bước", cập nhật theo kiến trúc Custom Module mới nhất.

---

## 1. Meilisearch là gì và hoạt động thế nào?

Meilisearch là một **search engine** (công cụ tìm kiếm) mã nguồn mở, được thiết kế đặc biệt cho **end-user search** — tức là kiểu tìm kiếm mà người dùng gõ vào ô search trên website và nhận kết quả ngay lập tức.

### Luồng hoạt động với Medusa

```
┌─────────────────────────────────────────────────────────┐
│                   Medusa Backend                        │
│                                                         │
│  POST /admin/products → createProductsWorkflow          │
│         ↓                                               │
│  Event Bus (Redis) phát ra: "product.created"           │
│         ↓                                               │
│  Plugin @rokmohar/medusa-plugin-meilisearch             │
│  (subscriber lắng nghe event, tự động push data)        │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│              Meilisearch Container (:7700)               │
│                                                         │
│  Index "products":                                      │
│  [                                                      │
│    { id: "prod_01", title: "Nike Air", ... },           │
│    { id: "prod_02", title: "Adidas Ultra", ... },       │
│  ]
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│              Frontend / API Client                      │
│                                                         │
│  GET http://localhost:7700/indexes/products/search      │
│      ?q=nike                                            │
│                                                         │
│  Trả về kết quả trong < 50ms, có typo tolerance        │
└─────────────────────────────────────────────────────────┘
```

### Khái niệm cốt lõi

| Khái niệm | Giải thích | Tương đương |
|---|---|---|
| **Index** | Một "bảng" chứa documents cùng loại | Table trong SQL |
| **Document** | Một bản ghi dữ liệu (JSON object) | Row trong SQL |
| **Primary Key** | Trường dùng để định danh document | Primary Key trong SQL |
| **Task** | Mọi thao tác ghi đều là async task | Job/Queue |
| **Search** | Full-text với typo tolerance | `LIKE '%query%'` nhưng thông minh hơn |

---

## 2. Xem Data trong Meilisearch

### Cách 1: Dùng Meilisearch Dashboard (dễ nhất)

**Bước 1:** Mở trình duyệt, truy cập:
```
http://localhost:7700
```

**Bước 2:** Nhập Master Key khi được hỏi:
```
supersecretmasterkey
```
*(giống với `MEILI_MASTER_KEY` trong `docker-compose.yml`)*

**Bước 3:** Bạn sẽ thấy giao diện với danh sách Indexes:
```
├── products     (X documents)
├── categories   (X documents)
└── brands       (X documents)
```

**Bước 4:** Click vào index `products` → bạn thấy toàn bộ documents đã được index, và có ô search để tìm kiếm trực tiếp.

---

### Cách 2: Dùng API trực tiếp (curl / Postman / Powershell)

#### Xem tất cả indexes
```bash
curl http://localhost:7700/indexes \
  -H "Authorization: Bearer supersecretmasterkey"
```

---

#### Xem tất cả documents trong một index
```bash
curl "http://localhost:7700/indexes/products/documents?limit=20" \
  -H "Authorization: Bearer supersecretmasterkey"
```

---

#### Tìm kiếm
```bash
curl -X POST "http://localhost:7700/indexes/products/search" \
  -H "Authorization: Bearer supersecretmasterkey" \
  -H "Content-Type: application/json" \
  -d '{"q": "nike", "limit": 5}'
```

> **Typo Tolerance:** Gõ `"nikee"` hoặc `"niek"` vẫn tìm được "Nike". Đây là tính năng nổi bật nhất của Meilisearch!

---

#### Xem brands (từ subscriber của bạn)
```bash
curl "http://localhost:7700/indexes/brands/documents" \
  -H "Authorization: Bearer supersecretmasterkey"
```

---

## 3. Cách data vào Meilisearch

### Luồng tự động (qua Plugin)
```
Bạn tạo product trong Medusa Admin
   → Medusa phát event "product.created" lên Redis
   → Plugin @rokmohar/medusa-plugin-meilisearch lắng nghe
   → Plugin fetch data product từ Medusa DB
   → Plugin gửi POST /indexes/products/documents lên Meilisearch
   → Meilisearch tạo Task (async)
   → Task hoàn thành → document xuất hiện trong index
```

### Luồng thông qua Custom Module SDK (như brand-created.ts)
```
POST /test-api/brand → createBrandWorkflow chạy
   → Workflow phát event "brand.created"
   → brand-created.ts subscriber lắng nghe
   → Subscriber resolve "meilisearch" custom module
   → Subscriber gọi meilisearchService.indexData([...], "brand")
   → SDK thêm tài liệu vào Meilisearch index "brands"
```

---

## 4. Tasks trong Meilisearch

> **Quan trọng:** Meilisearch **không** xử lý ngay lập tức. Mọi thao tác ghi (thêm, sửa, xóa document) đều được đưa vào hàng đợi dưới dạng **Task**.

### Xem tất cả tasks
```bash
curl "http://localhost:7700/tasks" \
  -H "Authorization: Bearer supersecretmasterkey"
```

### Trạng thái của Task

| Status | Ý nghĩa |
|---|---|
| `enqueued` | Đang xếp hàng chờ |
| `processing` | Đang xử lý |
| `succeeded` | Thành công ✅ |
| `failed` | Thất bại ❌ |

---

## 5. Cấu hình Meilisearch thành Custom Module trong Medusa v2

Để sử dụng SDK chính thức của Meilisearch một cách chuẩn hóa mà không gặp lỗi ESM/CJS (do SDK mới là ESM-only trong khi Medusa backend dùng CommonJS), chúng ta cấu hình nó làm một **Custom Module** của Medusa.

### 1. File Service: `src/modules/meilisearch/service.ts`
Khởi tạo client thông qua `require` động để vượt qua ràng buộc của TypeScript compile:
```typescript
const { Meilisearch } = require("meilisearch");
import { MedusaError } from "@medusajs/framework/utils";

type MeilisearchOptions = {
  host: string;
  apiKey: string;
  productIndexName?: string;
  brandIndexName?: string;
}

export type MeilisearchIndexType = "product" | "brand"

export default class MeilisearchModuleService {
  private client: typeof Meilisearch;
  private options: MeilisearchOptions;

  constructor({}, options: MeilisearchOptions) {
    if (!options.host || !options.apiKey) {
      throw new MedusaError(
        MedusaError.Types.INVALID_ARGUMENT, 
        "Meilisearch host and apiKey options are required"
      );
    }
    this.client = new Meilisearch({ host: options.host, apiKey: options.apiKey });
    this.options = options;
  }

  async getIndexName(type: MeilisearchIndexType): Promise<string> {
    switch (type) {
      case "product":
        return this.options.productIndexName || "products";
      case "brand":
        return this.options.brandIndexName || "brands";
      default:
        throw new MedusaError(MedusaError.Types.INVALID_DATA, `Invalid index type: ${type}`);
    }
  }

  async indexData(data: Record<string, unknown>[], type: MeilisearchIndexType = "product"): Promise<void> {
    const indexName = await this.getIndexName(type);
    await this.client.index(indexName).addDocuments(data);
  }

  async deleteFromIndex(documentIds: string[], type: MeilisearchIndexType = "product"): Promise<void> {
    const indexName = await this.getIndexName(type);
    await this.client.index(indexName).deleteDocuments(documentIds);
  }

  // Các phương thức khác: retrieveFromIndex, search...
}
```

### 2. File Entrypoint: `src/modules/meilisearch/index.ts`
```typescript
import { Module } from "@medusajs/framework/utils"
import MeilisearchModuleService from "./service"

export const MEILISEARCH_MODULE = "meilisearch"

export default Module(MEILISEARCH_MODULE, {
  service: MeilisearchModuleService,
})
```

### 3. Đăng ký trong `medusa-config.ts`
```typescript
  modules: [
    {
      resolve: "./src/modules/brand",
    },
    {
      resolve: "./src/modules/meilisearch",
      options: {
        host: process.env.MEILISEARCH_HOST ?? 'http://localhost:7700',
        apiKey: process.env.MEILISEARCH_API_KEY ?? '',
        productIndexName: 'products',
        brandIndexName: 'brands',
      },
    },
    // ... các modules khác
  ]
```

### 4. Gọi trong Subscriber `brand-created.ts`
```typescript
import type MeilisearchModuleService from "../modules/meilisearch/service"

export default async function brandCreatedHandler({ event: { data }, container }) {
  // Dependency Injection qua container:
  const meilisearchService: MeilisearchModuleService = container.resolve("meilisearch")
  
  await meilisearchService.indexData([
    {
      id: data.id,
      name: data.name,
      indexed_at: new Date().toISOString(),
    }
  ], "brand")
}
```

---

## 6. Thử nghiệm step-by-step

### Bước 1: Khởi chạy các dịch vụ Docker
```bash
docker-compose up -d
```

### Bước 2: Khởi động Medusa server
```bash
pnpm dev
```

### Bước 3: Tạo một brand mới để test (Powershell)
```powershell
Invoke-RestMethod -Uri http://localhost:9000/test-api/brand -Method Post -ContentType 'application/json' -Body '{"name": "Nike Run SDK"}'
```

### Bước 4: Kiểm tra brand đã được SDK đồng bộ vào Meilisearch
```powershell
Invoke-RestMethod -Uri http://localhost:7700/indexes/brands/documents -Method Get -Headers @{ Authorization = "Bearer supersecretmasterkey" }
```

---

## 7. So sánh các cách tiếp cận tích hợp

| Tiêu chí | Dùng Fetch REST API thô | Dùng Meilisearch SDK trực tiếp | Dùng Custom Module (Khuyên dùng) |
|---|---|---|---|
| **Cú pháp** | Phức tạp, dễ sai URL/Headers | Gọn gàng, hướng đối tượng | Rất gọn gàng, có kiểu dữ liệu đầy đủ |
| **Xử lý ESM/CJS** | ✅ Không bị ảnh hưởng | ❌ Lỗi biên dịch TypeScript 1479 | ✅ Giải quyết qua `require` động trong module |
| **Tái sử dụng** | Phải viết lại helper ở các file | Phải import lại cấu hình Host/Key | ✅ Resolve qua IoC Container mọi nơi |

---

## 8. Những gì đã được cấu hình trong dự án của bạn

1. **`medusa-config.ts`**: Đã đăng ký plugin tự động cho `products`, `categories` và custom module `meilisearch` cho các thực thể khác.
2. **`brand-created.ts`**: Lấy dịch vụ `"meilisearch"` từ container để đồng bộ brand mới tạo.
3. **`src/modules/meilisearch`**: Toàn bộ logic bao gói SDK client.
4. **`.env`**: Đã lưu trữ `MEILISEARCH_HOST` và `MEILISEARCH_API_KEY`.

---

## 9. Ghi chú TODO cho tương lai

> **TODO:** Thêm subscriber cho `brand.updated` và `brand.deleted`
> - Khi brand bị **sửa tên** → Đồng bộ bằng `meilisearchService.indexData([...], "brand")`
> - Khi brand bị **xóa** → Xóa tài liệu bằng `meilisearchService.deleteFromIndex([brandId], "brand")`
