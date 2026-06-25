import {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { createBrandWorkflow } from "../../../workflows/create-brand"

export const POST = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  const { result } = await createBrandWorkflow(req.scope).run({
    input: {
      name: (req.body as any).name || "Test Brand Meilisearch",
    },
  })
  res.json({ brand: result })
}
