import { defineRouteConfig } from "@medusajs/admin-sdk"
import { TagSolid } from "@medusajs/icons"
import {
    Container,
    Heading,
    createDataTableColumnHelper,
    DataTable,
    useDataTable,
} from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { sdk } from "../../lib/sdk"
import { useState, useMemo } from "react"

// 1. Định nghĩa kiểu dữ liệu (Types)
type Brand = {
    id: string
    name: string
    products?: { id: string; title: string }[]
}

type BrandsResponse = {
    brands: Brand[]
    count: number
    limit: number
    offset: number
}

// 2. Cấu hình các cột (Columns) cho Bảng
const columnHelper = createDataTableColumnHelper<Brand>()

const columns = [
    columnHelper.accessor("id", {
        header: "ID",
    }),
    columnHelper.accessor("name", {
        header: "Tên Thương Hiệu",
    }),
    columnHelper.accessor("products", {
        header: "Số lượng Sản phẩm",
        cell: ({ getValue }) => {
            const products = getValue()
            return products?.length || 0 // Đếm xem mảng products có bao nhiêu phần tử
        },
    }),
]

// 3. Giao diện chính của Trang
const BrandsPage = () => {
    const limit = 15
    const [pagination, setPagination] = useState({
        pageSize: limit,
        pageIndex: 0,
    })

    // Tính toán offset (bỏ qua bao nhiêu dòng) dựa trên trang hiện tại
    const offset = useMemo(() => {
        return pagination.pageIndex * limit
    }, [pagination])

    // Gọi API GET /admin/brands đã làm ở bước trước
    const { data, isLoading } = useQuery<BrandsResponse>({
        queryFn: () => sdk.client.fetch(`/admin/brands`, {
            query: { limit, offset },
        }),
        queryKey: ["brands", limit, offset],
    })

    // Đẩy dữ liệu vào Table có sẵn của Medusa UI
    const table = useDataTable({
        columns,
        data: data?.brands || [],
        getRowId: (row) => row.id,
        rowCount: data?.count || 0,
        isLoading,
        pagination: {
            state: pagination,
            onPaginationChange: setPagination,
        },
    })

    return (
        <Container className="divide-y p-0">
            <DataTable instance={table}>
                <DataTable.Toolbar className="flex flex-col items-start justify-between gap-2 md:flex-row md:items-center">
                    <Heading>Quản lý Thương hiệu</Heading>
                </DataTable.Toolbar>
                <DataTable.Table />
                <DataTable.Pagination />
            </DataTable>
        </Container>
    )
}

// 4. Cấu hình hiển thị Menu bên trái (Sidebar)
export const config = defineRouteConfig({
    label: "Thương hiệu", // Tên hiển thị trên menu
    icon: TagSolid,       // Icon cái thẻ tag
})

export default BrandsPage
