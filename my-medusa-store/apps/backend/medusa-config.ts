import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET,
      cookieSecret: process.env.COOKIE_SECRET,
    }
  },
  modules: [
    {
      resolve: "./src/modules/brand",
    },
    {
      resolve: "./src/modules/meilisearch",
      options: {
        host: process.env.MEILISEARCH_HOST ?? 'http://localhost:7700',
        apiKey: process.env.MEILISEARCH_API_KEY ?? '',
        productIndexName: 'products',
        brandIndexName: 'brands',
      },
    },
    {
      resolve: "@medusajs/medusa/notification",
      options: {
        providers: [
          {
            resolve: "./src/modules/email-resend",
            id: "resend",
            options: {
              apiKey: process.env.RESEND_API_KEY,
              from: process.env.RESEND_FROM,
            },
          },
        ],
      },
    },
    { // giải thích tại sao lại đăng ký nằm ở dưới
      resolve: "@medusajs/event-bus-redis",
      key: "event_bus",
      options: {
        redisUrl: process.env.REDIS_URL,
      },
    },
  ],
})

// Mặc định, khi bạn cài đặt Medusa v2, nó đi kèm với một Local Event Bus (in-memory).

// Hạn chế của Local Event Bus: Nó chạy hoàn toàn trên RAM của tiến trình Node.js hiện tại.
// Khi bạn tắt/khởi động lại server hoặc nếu server bị crash, tất cả event đang xếp hàng đợi
// (queue) sẽ bị mất sạch. Đồng thời, nó không thể chia sẻ hàng đợi giữa nhiều máy chủ
// (nếu sau này bạn scale dự án chạy trên 2-3 server cùng lúc).
// Lý do khai báo: Để Medusa biết rằng nó cần từ bỏ cơ chế chạy tạm bằng RAM này
// và chuyển sang đẩy toàn bộ event sang container Redis (chạy trên cổng 6379),
// chúng ta phải khai báo module @medusajs/event-bus-redis. Khi đó, Redis sẽ đóng vai trò
// làm hàng đợi bền vững (Persistent Queue).