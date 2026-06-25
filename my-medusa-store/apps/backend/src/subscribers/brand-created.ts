import type {
  SubscriberArgs,
  SubscriberConfig,
} from "@medusajs/framework"
import type MeilisearchModuleService from "../modules/meilisearch/service"

// TODO (tương lai): Thêm subscriber cho brand.updated và brand.deleted
// để đảm bảo Meilisearch luôn đồng bộ khi brand bị sửa hoặc xóa.

type BrandCreatedPayload = {
  id: string
  name: string
}

// ─────────────────────────────────────────────────────────
// Subscriber
// ─────────────────────────────────────────────────────────
export default async function brandCreatedHandler({
  event: { data },
  container,
}: SubscriberArgs<BrandCreatedPayload>) {
  const logger = container.resolve("logger")
  const { id: brandId, name: brandName } = data

  logger.info(`[Redis Event Bus] Received brand.created event for: "${brandName}" (${brandId})`)

  try {
    // Lấy dịch vụ Meilisearch custom module thông qua IoC container (Dependency Injection)
    const meilisearchService: MeilisearchModuleService = container.resolve("meilisearch")

    // Đưa brand vào Meilisearch index bằng SDK thông qua custom module
    // SDK sẽ tự tạo index "brands" (nếu chưa có) và gán primary key "id" tự động
    await meilisearchService.indexData([
      {
        id:         brandId,
        name:       brandName,
        indexed_at: new Date().toISOString(),
      }
    ], "brand")

    logger.info(`[Meilisearch] Brand "${brandName}" successfully indexed using module SDK`)
  } catch (error: any) {
    // Log error thay vì rethrow để tránh làm sập Event Bus của Medusa
    logger.error(`[Meilisearch] Failed to index brand "${brandName}": ${error.message}`)
  }
}

export const config: SubscriberConfig = {
  event: "brand.created",
  context: {
    subscriberId: "meilisearch-brand-indexer",
  },
}

