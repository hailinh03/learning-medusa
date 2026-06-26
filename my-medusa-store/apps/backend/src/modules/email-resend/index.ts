import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import ResendNotificationProviderService from "./service"

// đây là module provider, sau này ví dụ có dùng mailchimp, 
// sendgrid thì ta sẽ tạo thêm các module provider tương tự.
// rồi đưa vào mảng services 
export default ModuleProvider(Modules.NOTIFICATION, {
  services: [
    ResendNotificationProviderService,
  ],
})
