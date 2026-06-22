import {
    MedusaRequest,
    MedusaResponse,
} from "@medusajs/framework/http"
import { createBrandWorkflow } from "../../../workflows/create-brand"
import { PostAdminCreateBrandType } from "./validators"

export const POST = async (
    req: MedusaRequest<PostAdminCreateBrandType>,
    res: MedusaResponse
) => {

    console.log(req.validatedBody);
    // Chạy Workflow và truyền dữ liệu đã được validate vào
    const { result } = await createBrandWorkflow(req.scope).run({
        input: req.validatedBody,
    })
    // Trả về dữ liệu JSON cho Client
    res.json({ brand: result })
}

export const GET = async (
    req: MedusaRequest,
    res: MedusaResponse
) => {
    const query = req.scope.resolve("query")
    // Dùng req.queryConfig để nhận các tham số phân trang (limit, offset) từ Client
    const {
        data: brands,
        metadata: { count, take, skip } = {},
    } = await query.graph({
        entity: "brand",
        ...req.queryConfig, // Tự động chèn limit, offset, và fields vào đây
    })
    // Trả về dữ liệu kèm theo siêu dữ liệu (metadata) để Frontend làm thanh phân trang
    res.json({
        brands,
        count,        // Tổng số brand có trong Database
        limit: take,  // Số brand lấy trên 1 trang (mặc định là 15 hoặc 50)
        offset: skip, // Bỏ qua bao nhiêu bản ghi
    })
}