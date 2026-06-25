import type {
  SubscriberArgs,
  SubscriberConfig,
} from "@medusajs/framework"

type BrandCreatedPayload = {
  id: string
  name: string
}

export default async function brandCreatedHandler({
  event: { data },
  container,
}: SubscriberArgs<BrandCreatedPayload>) {
  const logger = container.resolve("logger")
  const brandId = data.id
  const brandName = data.name

  logger.info(`[Redis Event Bus] Received brand.created event for ID: ${brandId}, Name: ${brandName}`)

  const elasticsearchUrl = process.env.ELASTICSEARCH_URL || "http://localhost:9200"

  try {
    logger.info(`[Elasticsearch] Indexing brand ${brandName} (${brandId}) to: ${elasticsearchUrl}/brands/_doc/${brandId}`)

    const response = await fetch(`${elasticsearchUrl}/brands/_doc/${brandId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: brandId,
        name: brandName,
        indexed_at: new Date().toISOString(),
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.error(`[Elasticsearch] Failed to index brand. Status: ${response.status}, Details: ${errorText}`)
    } else {
      logger.info(`[Elasticsearch] Successfully indexed brand: ${brandName}`)
    }
  } catch (error: any) {
    // Chúng ta log warning/error thay vì rethrow để tránh làm sập tiến trình Event Bus chính của Medusa
    logger.error(`[Elasticsearch] Connection error. Is Elasticsearch running at ${elasticsearchUrl}? Details: ${error.message}`)
  }
}

export const config: SubscriberConfig = {
  event: "brand.created",
  context: {
    subscriberId: "elasticsearch-brand-indexer",
  },
}
