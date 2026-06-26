import { getProductPrice } from "@lib/util/get-product-price";
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link";

import React from "react"

type ProductWithBrand = HttpTypes.StoreProduct & {
  brand?: {
    id: string;
    name: string
  }
}

export default function ProductList({ products }: { products: ProductWithBrand[] }) {
  return (
    <div className="content-container py-12 md:py-20">
      <div className="flex flex-col items-start justify-between gap-4 mb-10 md:flex-row md:items-end">
        <div>
          <span className="text-sm font-semibold tracking-widest text-neutral-500 uppercase">
            Curated Picks
          </span>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-neutral-900 md:text-4xl">
            Featured Products
          </h2>
        </div>
        <div className="text-sm text-neutral-500 max-w-sm">
          A selection of our finest items, designed with care and attention to detail.
        </div>
      </div>

      <div className="grid grid-cols-1 gap-y-12 sm:grid-cols-2 sm:gap-x-6 lg:grid-cols-4 lg:gap-x-8">
        {products && products.map((product) => {
          // Tính toán giá rẻ nhất (cheapestPrice) cho sản phẩm hiện tại
          const { cheapestPrice } = getProductPrice({
            product,
          })

          // Lấy tên thương hiệu nếu có, hoặc hiển thị "Medusa" mặc định
          const brandName = product.brand?.name || "Medusa"
          return (
            <div key={product.id} className="group relative flex flex-col overflow-hidden rounded-xl border border-neutral-100 bg-white shadow-sm transition-all duration-300 hover:shadow-md">
              {/* Image Wrapper */}
              <LocalizedClientLink href={`/products/${product.handle}`} className="aspect-[4/5] w-full overflow-hidden bg-neutral-50 relative block">
                {product.thumbnail ? (
                  <img
                    src={product.thumbnail}
                    alt={product.title}
                    className="h-full w-full object-cover object-center transition-all duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="h-full w-full bg-neutral-100 flex items-center justify-center text-neutral-400">
                    No Image
                  </div>
                )}
                <div className="absolute top-3 left-3 bg-neutral-950/80 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 rounded-md">
                  {brandName}
                </div>
              </LocalizedClientLink>
              {/* Info Container */}
              <div className="flex flex-1 flex-col p-5">
                <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                  {brandName}
                </span>
                <LocalizedClientLink href={`/products/${product.handle}`}>
                  <h3 className="text-base font-semibold text-neutral-800 line-clamp-1 mb-1 hover:underline">
                    {product.title}
                  </h3>
                </LocalizedClientLink>
                <p className="text-xs text-neutral-500 line-clamp-2 mb-4 leading-relaxed flex-1">
                  {product.description || "No description available."}
                </p>
                <div className="flex items-center justify-between pt-3 border-t border-neutral-50">
                  <span className="text-lg font-bold text-neutral-900">
                    {cheapestPrice?.calculated_price || "N/A"}
                  </span>
                  <LocalizedClientLink href={`/products/${product.handle}`}>
                    <button className="text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 transition-colors duration-200 px-4 py-2 rounded-lg">
                      Details
                    </button>
                  </LocalizedClientLink>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
