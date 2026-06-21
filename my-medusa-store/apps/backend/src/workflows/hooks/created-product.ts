import { createProductsWorkflow } from "@medusajs/medusa/core-flows"
import { StepResponse } from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"
import { LinkDefinition } from "@medusajs/framework/types"
import { BRAND_MODULE } from "../../modules/brand"
import BrandModuleService from "../../modules/brand/service"

createProductsWorkflow.hooks.productsCreated(
    // A. Hàm thực thi chính khi Hook chạy
    async ({ products, additional_data }, { container }) => {
        // 1. Kiểm tra xem request tạo sản phẩm có gửi kèm brand_id không. Nếu không, bỏ qua.
        if (!additional_data?.brand_id) {
            return new StepResponse([], [])
        }

        const brandModuleService: BrandModuleService = container.resolve(BRAND_MODULE)

        // 2. Kiểm tra xem ID thương hiệu này có tồn tại thật trong Database không.
        // Nếu không tồn tại, hàm này sẽ ném ra lỗi (Error) giúp quy trình dừng lại.
        await brandModuleService.retrieveBrand(additional_data.brand_id as string)

        // 3. Lấy dịch vụ quản lý liên kết ("link") của Medusa ra để sử dụng
        const link = container.resolve("link")
        const links: LinkDefinition[] = []

        // 4. Tạo danh sách các dòng liên kết giữa từng sản phẩm với brand_id đó
        for (const product of products) {
            links.push({
                [Modules.PRODUCT]: {
                    product_id: product.id,
                },
                [BRAND_MODULE]: {
                    brand_id: additional_data.brand_id,
                },
            })
        }

        // 5. Ghi các dòng liên kết này vào bảng trung gian (product_product_brand_brand)
        await link.create(links)

        // 6. Trả về kết quả và lưu danh sách link để phòng hờ hoàn tác khi lỗi
        return new StepResponse(links, links)
    },
    // B. Hàm hoàn tác (Compensation Function) khi quy trình tạo sản phẩm sau đó bị lỗi
    async (links, { container }) => {
        if (!links?.length) return

        const link = container.resolve("link")
        // Hủy bỏ (xóa) các dòng liên kết vừa tạo
        await link.dismiss(links)
    }
)
