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