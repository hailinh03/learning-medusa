import type {
  SubscriberArgs,
  SubscriberConfig,
} from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

type OrderPlacedPayload = {
  id: string
}
// event này sẽ được kích hoạt khi có đơn hàng được tạo thành công do hệ thống core 
// của medusa tự kích hoạt 
export default async function orderPlacedHandler({
  event: { data },
  container,
}: SubscriberArgs<OrderPlacedPayload>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const { id: orderId } = data

  logger.info(`[Redis Event Bus] Received order.placed event for order ID: ${orderId}`)

  try {
    // Sử dụng Query Engine để lấy chi tiết đơn hàng
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data: orders } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "display_id",
        "email",
        "total",
        "subtotal",
        "shipping_total",
        "items.*",
        "items.variant.*",
      ],
      filters: {
        id: orderId,
      },
    })

    const order = orders?.[0]

    if (!order) {
      logger.error(`[Order Placed Subscriber] Order with ID ${orderId} not found.`)
      return
    }

    if (!order.email) {
      logger.warn(`[Order Placed Subscriber] Order ${orderId} has no email address. Skipping email sending.`)
      return
    }

    // Lấy dịch vụ Notification Module
    const notificationService = container.resolve(Modules.NOTIFICATION)

    // Kích hoạt gửi email qua Notification Module (sử dụng Resend Provider đã đăng ký)
    await notificationService.createNotifications({
      to: order.email,
      channel: "email",
      template: "order-placed",
      data: order, // truyền toàn bộ object đơn hàng làm data cho template
    })

    logger.info(`[Order Placed Subscriber] Triggered email notification for order ${order.display_id || order.id} to ${order.email}`)
  } catch (error: any) {
    logger.error(`[Order Placed Subscriber] Failed to process order confirmation email: ${error.message}`)
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
  context: {
    subscriberId: "email-order-placed-notifier",
  },
}
