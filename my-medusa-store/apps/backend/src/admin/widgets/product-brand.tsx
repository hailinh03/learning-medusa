import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps, AdminProduct } from "@medusajs/framework/types"
import { Container, Heading, Text } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { sdk } from "../lib/sdk"

type AdminProductBrand = AdminProduct & {
    brand?: {
        id: string
        name: string
    }
}

// Đây là UI Component chính
const ProductBrandWidget = ({
    data: product,
}: DetailWidgetProps<AdminProduct>) => {

    // Dùng React Query và SDK để gọi API lấy thông tin brand của sản phẩm này
    const { data: queryResult, isLoading } = useQuery({
        queryFn: () => sdk.admin.product.retrieve(product.id, {
            fields: "+brand.*", // Dấu + nghĩa là giữ nguyên các field mặc định, chỉ nối thêm brand
        }),
        queryKey: ["product", product.id, "brand"],
    })
    // Trích xuất tên brand từ kết quả trả về
    const brandName = (queryResult?.product as AdminProductBrand)?.brand?.name
    // Trạng thái đang tải (Loading)
    if (isLoading) {
        return (
            <Container className="divide-y p-0">
                <div className="px-6 py-4">
                    <Text size="small">Đang tải Brand...</Text>
                </div>
            </Container>
        )
    }
    // Giao diện khi tải xong
    return (
        <Container className="divide-y p-0">
            <div className="flex items-center justify-between px-6 py-4">
                <Heading level="h2">Thương hiệu (Brand)</Heading>
            </div>
            <div className="grid grid-cols-2 items-center px-6 py-4">
                <Text size="small" weight="plus" leading="compact">
                    Tên
                </Text>
                <Text size="small" leading="compact">
                    {brandName || "Không có hãng"}
                </Text>
            </div>
        </Container>
    )
}
export const config = defineWidgetConfig({
    zone: "product.details.before", // Nằm ở đầu trang chi tiết sản phẩm
})

export default ProductBrandWidget