import { Module } from "@medusajs/framework/utils"
import { BrandModuleService } from "./service"


// Module (Spring Boot Starter / Configuration): 
// Đóng gói một nghiệp vụ khép kín (Model, Service, API) 
// và đăng ký vào Application Context của hệ thống.
// Đóng gói BrandModuleService dưới tên key "brand".
// sau đó đưa vào medusa-config.ts là xong
export const BRAND_MODULE = "brand"
export default Module(BRAND_MODULE, {
    service: BrandModuleService,
})


// Module là một factory function của @medusajs/framework/utils 
// nhiệm vụ của nó là đóng gói toàn bộ logic của một module (Models,Migrations,Services)
// thành 1 gói tiêu chuẩn để Medusa có thể  tự động Scan, init Migrations và đưa vào container
// khi server start.
