import { createProductsWorkflow } from "@medusajs/medusa/core-flows"
import { StepResponse } from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"
import { LinkDefinition } from "@medusajs/framework/types"
import { BRAND_MODULE } from "../../modules/brand"
import BrandModuleService from "../../modules/brand/service"


// đây là 1 khe cắm vào workflow lõi của medusa. Tức là nó đang cắm  vào workflow của
// create product và kiểm tra xem nếu request có kèm brand_id thì 
// sẽ tạo ra 1 brand_id trong database. 

//Khi dùng .hooks có nghĩa là bạn đang can thiệp vào logic của workflow lõi
// Hooks còn được dùng cho các tính năng như: gửi email,...
createProductsWorkflow.hooks.productsCreated(
    // A. Hàm thực thi chính khi Hook chạy

    //Container: Chính là req.scope (IoC Container) được truyền xuyên suốt vào đây.
    //Giúp bạn gọi container.resolve() để lấy ra các Service cần dùng 
    // (tương tự @Autowired trong Spring Boot).
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
