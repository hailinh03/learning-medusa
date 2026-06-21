import { MedusaService } from "@medusajs/framework/utils";

import { Brand } from "./models/brand"

export class BrandModuleService extends MedusaService({
    Brand,
}) {
    // Các hàm CRUD tự động được sinh ra
}

export default BrandModuleService; // khi import không thể import {} bỏ dấu {} và có thể đặt tên tùy ý