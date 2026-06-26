import type {
    SubscriberArgs,
    SubscriberConfig,
} from "@medusajs/framework"
import type MeilisearchModuleService from "../modules/meilisearch/service"

type BrandDeletedPayload = {
    id: string
}

export default async function brandDeletedHandler({
    event: { data },
    container,
}: SubscriberArgs<BrandDeletedPayload>) {
    const logger = container.resolve("logger")
    const { id: brandId } = data

    logger.info(`[Redis Event Bus] Received brand.deleted event for ID: ${brandId}`)

    try {
        // Lấy dịch vụ Meilisearch custom module
        const meilisearchService: MeilisearchModuleService = container.resolve("meilisearch")

        // Gọi hàm xóa document trong index "brand" của Meilisearch
        await meilisearchService.deleteFromIndex([brandId], "brand")

        logger.info(`[Meilisearch] Brand ID "${brandId}" successfully deleted from index`)
    } catch (error: any) {
        logger.error(`[Meilisearch] Failed to delete brand ID "${brandId}": ${error.message}`)
    }
}

export const config: SubscriberConfig = {
    event: "brand.deleted",
    context: {
        subscriberId: "meilisearch-brand-deleter",
    },
}
