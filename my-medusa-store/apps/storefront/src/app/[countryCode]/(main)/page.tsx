import { Metadata } from "next"

import Hero from "@modules/home/components/hero"
import ProductList from "@modules/home/components/product-list"
import { getRegion } from "@lib/data/regions"
import { listProducts } from "@lib/data/products"

export const metadata: Metadata = {
  title: "Medusa Next.js Starter Template",
  description:
    "A performant frontend ecommerce starter template with Next.js 15 and Medusa.",
}

export default async function Home(props: {
  params: Promise<{ countryCode: string }>
}) {
  const params = await props.params

  const { countryCode } = params

  const region = await getRegion(countryCode)

  if (!region) {
    return null
  }
  const { response: { products },
  } = await listProducts({
    countryCode,
    queryParams: {
      limit: 8,
    }
  })




  return (
    <>
      <Hero />
      <ProductList products={products} />
    </>
  )
}
