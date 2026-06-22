import {
    defineMiddlewares,
    validateAndTransformBody,
} from "@medusajs/framework/http"
import { PostAdminCreateBrand } from "./admin/brands/validators"
import { z } from "zod"


//file này phải gõ đúng là middlewares.ts nếu không sẽ không chạy
export default defineMiddlewares({
    routes: [
        {
            matcher: "/admin/brands", // Đường dẫn áp dụng
            method: "POST",           // Phương thức HTTP áp dụng
            middlewares: [
                validateAndTransformBody(PostAdminCreateBrand), // Tự động check dữ liệu
            ],
        },
        //, Medusa sẽ tự động loại bỏ tất cả các trường dữ liệu lạ gửi 
        // vào additional_data nếu bạn chưa khai báo trước. Cho nên ta khai báo:
        {
            matcher: "/admin/products",
            method: ["POST"],
            additionalDataValidator: {
                brand_id: z.string().optional(),
            }
        }
    ],
})
