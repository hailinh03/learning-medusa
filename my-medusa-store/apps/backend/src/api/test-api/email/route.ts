import {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import { Modules } from "@medusajs/framework/utils"

export const POST = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  const { to } = req.body as { to?: string }

  if (!to) {
    res.status(400).json({ error: "Missing 'to' email address in request body." })
    return
  }

  try {
    // Resolve notification service từ container thông qua request scope
    const notificationService = req.scope.resolve(Modules.NOTIFICATION)

    // Kích hoạt gửi email test qua Notification Module
    const result = await notificationService.createNotifications({
      to,
      channel: "email",
      template: "test-email",
      data: {},
    })

    res.json({
      success: true,
      message: `Test email notification triggered successfully to ${to}.`,
      result,
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
}
