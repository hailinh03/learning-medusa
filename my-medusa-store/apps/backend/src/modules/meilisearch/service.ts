const { Meilisearch } = require("meilisearch");
import { MedusaError } from "@medusajs/framework/utils";

// Định nghĩa kiểu dữ liệu cho Options truyền vào module
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
    // Đảm bảo phải cung cấp tối thiểu host và apiKey
    if (!options.host || !options.apiKey) {
      throw new MedusaError(
        MedusaError.Types.INVALID_ARGUMENT, 
        "Meilisearch host and apiKey options are required"
      );
    }
    // Khởi tạo SDK client
    // Sử dụng require("meilisearch") giúp tránh xung đột ESM/CommonJS khi biên dịch
    this.client = new Meilisearch({
      host: options.host,
      apiKey: options.apiKey,
    });
    this.options = options;
  }

  // Lấy tên index thực tế dựa vào IndexType
  async getIndexName(type: MeilisearchIndexType): Promise<string> {
    switch (type) {
      case "product":
        return this.options.productIndexName || "products";
      case "brand":
        return this.options.brandIndexName || "brands";
      default:
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Invalid index type: ${type}`
        );
    }
  }

  // Thêm hoặc cập nhật mảng documents vào index của Meilisearch
  async indexData(data: Record<string, unknown>[], type: MeilisearchIndexType = "product"): Promise<void> {
    const indexName = await this.getIndexName(type);
    const index = this.client.index(indexName);

    await index.addDocuments(data);
  }

  // Lấy các documents từ index của Meilisearch dựa trên danh sách documentIds
  async retrieveFromIndex(documentIds: string[], type: MeilisearchIndexType = "product"): Promise<any[]> {
    const indexName = await this.getIndexName(type);
    const index = this.client.index(indexName);
    
    const results = await Promise.all(
      documentIds.map(async (id) => {
        try {
          return await index.getDocument(id);
        } catch (error) {
          // Document không tồn tại, trả về null
          return null;
        }
      })
    );

    return results.filter(Boolean);
  }

  // Xóa các documents khỏi index của Meilisearch dựa trên danh sách documentIds
  async deleteFromIndex(documentIds: string[], type: MeilisearchIndexType = "product"): Promise<void> {
    const indexName = await this.getIndexName(type);
    const index = this.client.index(indexName);
    
    await index.deleteDocuments(documentIds);
  }

  // Tìm kiếm văn bản trên index chỉ định
  async search(query: string, type: MeilisearchIndexType = "product"): Promise<any> {
    const indexName = await this.getIndexName(type);
    const index = this.client.index(indexName);
    
    return await index.search(query);
  }
}
