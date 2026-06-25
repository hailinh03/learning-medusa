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
    //container.resolve tương tự @Autowired để lấy service ra
    const brandModuleService: BrandModuleService = container.resolve(BRAND_MODULE)
    const brand = await brandModuleService.createBrands(input)

    // Phát event brand.created ra Redis Event Bus
    const eventBus = container.resolve("event_bus")
    await eventBus.emit({
      name: "brand.created",
      data: {
        id: brand.id,
        name: brand.name,
      },
    })

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