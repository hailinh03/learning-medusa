import {
    createWorkflow,
    WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { createBrandStep } from "./steps/create-brand"

type CreateBrandWorkflowInput = {
    name: string
}
/**
 * CÁC QUY TẮC BẮT BUỘC KHI VIẾT WORKFLOW CONSTRUCTOR:
 * Khi viết phần hàm bên trong createWorkflow (gọi là Constructor)
 * 1.KHÔNG DÙNG ASYNC/AWAIT (cái này là cái bắt buộc) VÌ : Hàm constructor này không chạy lúc khách hàng gửi yêu cầu, mà nó chạy ngay khi khởi động server để Medusa vẽ ra "bản đồ các bước chạy" (Step Graph). Việc chạy thật sẽ do Workflow Engine tự gọi bất đồng bộ sau này.
 * 2.KHÔNG DÙNG ARROW FUNCTION => Phải dùng function hoặc function expression
 * 3.KHÔNG DÙNG LOGIC RẼ NHÁNH (IF/ELSE) HAY LOOP (FOR/WHILE). Vì hàm này chỉ dùng để khai báo bản đồ các bước. Nếu muốn rẽ nhánh, Medusa có các hàm bổ trợ riêng như when() . 
 * 
 * 
 */
// đây là workflow tương tự Saga Pattern
export const createBrandWorkflow = createWorkflow(
    "create-brand",
    function (input: CreateBrandWorkflowInput) {
        const brand = createBrandStep(input)
        return new WorkflowResponse(brand)
    }
)
