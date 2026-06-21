import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import BrandModuleService from "../../modules/brand/service"
import { BRAND_MODULE } from "../../modules/brand"

export type CreateBrandStepInput = {
  name: string
}

export const createBrandStep = createStep( // đây là 1 factory function, cần 3 cái sau:
  // A. Tên step
  "create-brand-step",
  // B. Hàm chạy chính (Step Function)
  async (input: CreateBrandStepInput, { container }) => {
    const brandModuleService: BrandModuleService = container.resolve(BRAND_MODULE)
    const brand = await brandModuleService.createBrands(input)
    return new StepResponse(brand, brand.id)
  },
  // C. Hàm hoàn tác (Compensation Function)
  async (brandId, { container }) => {
    if (!brandId) {
      return
    }
    const brandModuleService: BrandModuleService = container.resolve(BRAND_MODULE)
    await brandModuleService.deleteBrands(brandId)
  }
)