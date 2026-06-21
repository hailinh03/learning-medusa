import {
    defineMiddlewares,
    validateAndTransformBody,
} from "@medusajs/framework/http"
import { PostAdminCreateBrand } from "./admin/brands/validators"
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
    ],
})
