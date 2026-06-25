import { AbstractNotificationProviderService, MedusaError } from "@medusajs/framework/utils"
import { Logger } from "@medusajs/framework/types"
import { Resend } from "resend"

type ResendOptions = {
  apiKey: string
  from: string
}

export default class ResendNotificationProviderService extends AbstractNotificationProviderService {
  static identifier = "resend"
  protected resendClient: Resend
  protected options_: ResendOptions
  protected logger_: Logger

  constructor({ logger }: { logger: Logger }, options: ResendOptions) {
    super()
    this.logger_ = logger
    this.options_ = options

    this.resendClient = new Resend(options.apiKey)
  }

  async send(notification: any): Promise<any> {
    const { to, channel, template, data } = notification

    if (channel !== "email") {
      return
    }

    try {
      const htmlContent = this.getHtmlTemplate(template, data)
      const subject = this.getEmailSubject(template, data)

      const response = await this.resendClient.emails.send({
        from: this.options_.from,
        to: [to],
        subject: subject,
        html: htmlContent,
      })

      if (response.error) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          response.error.message
        )
      }

      this.logger_.info(`[Resend] Email sent to ${to} for template '${template}'. ID: ${response.data?.id}`)
      return { id: response.data?.id }
    } catch (error: any) {
      this.logger_.error(`[Resend] Failed to send email to ${to}: ${error.message}`)
      return { error: error.message }
    }
  }

  private getHtmlTemplate(templateName: string, data: any): string {
    switch (templateName) {
      case "order-placed":
        return `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; color: #1e293b;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="color: #0f172a; margin-bottom: 8px;">Cảm ơn bạn đã mua hàng!</h1>
              <p style="color: #64748b; font-size: 16px;">Đơn hàng #${data.display_id || data.id} của bạn đã được tiếp nhận và đang được xử lý.</p>
            </div>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
            <h3 style="color: #334155;">Chi tiết đơn hàng:</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
              <thead>
                <tr style="border-bottom: 1px solid #e2e8f0; text-align: left;">
                  <th style="padding: 8px 0; color: #64748b;">Sản phẩm</th>
                  <th style="padding: 8px 0; color: #64748b; text-align: right;">Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                ${(data.items || []).map((item: any) => `
                  <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 12px 0;">
                      <div style="font-weight: 600; color: #334155;">${item.title}</div>
                      ${item.variant?.title ? `<div style="font-size: 12px; color: #64748b;">Mẫu: ${item.variant.title}</div>` : ""}
                      <div style="font-size: 14px; color: #64748b;">Số lượng: ${item.quantity}</div>
                    </td>
                    <td style="padding: 12px 0; text-align: right; font-weight: 600; color: #334155;">
                      ${((item.unit_price * item.quantity) / 100).toLocaleString("vi-VN")} VND
                    </td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
            <div style="background-color: #f8fafc; padding: 16px; border-radius: 6px; margin-bottom: 24px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="color: #64748b;">Tạm tính:</span>
                <span style="font-weight: 600; color: #334155;">${(data.subtotal / 100).toLocaleString("vi-VN")} VND</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="color: #64748b;">Phí vận chuyển:</span>
                <span style="font-weight: 600; color: #334155;">${(data.shipping_total / 100).toLocaleString("vi-VN")} VND</span>
              </div>
              <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 12px 0;" />
              <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: bold;">
                <span style="color: #0f172a;">Tổng cộng:</span>
                <span style="color: #0f172a;">${(data.total / 100).toLocaleString("vi-VN")} VND</span>
              </div>
            </div>
            <div style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 32px;">
              <p>Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi qua email hỗ trợ.</p>
              <p>&copy; ${new Date().getFullYear()} Medusa Store. All rights reserved.</p>
            </div>
          </div>
        `
      case "test-email":
        return `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px; max-width: 500px; margin: 0 auto;">
            <h2 style="color: #4f46e5;">🧪 Kiểm thử tích hợp Email Medusa v2</h2>
            <p>Xin chào!</p>
            <p>Đây là email kiểm tra hệ thống tích hợp <strong>Resend</strong> của bạn trên ứng dụng Medusa.</p>
            <p>Thời gian kiểm tra: <strong>${new Date().toLocaleString("vi-VN")}</strong></p>
            <p style="color: #16a34a; font-weight: bold;">Trạng thái kết nối: Hoạt động tốt! ✅</p>
          </div>
        `
      default:
        return `<div style="font-family: sans-serif; padding: 20px;"><p>Thông báo mới từ cửa hàng.</p></div>`
    }
  }

  private getEmailSubject(templateName: string, data: any): string {
    switch (templateName) {
      case "order-placed":
        return `Đơn hàng #${data.display_id || data.id} đã đặt thành công!`
      case "test-email":
        return `🧪 Test kết nối Resend Email - Medusa v2`
      default:
        return `Thông báo mới từ cửa hàng`
    }
  }
}
