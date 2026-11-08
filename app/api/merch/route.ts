import { NextRequest, NextResponse } from 'next/server'
import { getValidAccessToken, readDropboxJson, writeDropboxJson } from '@/lib/dropbox'
import { MERCH_FILE_PATH, normalizeProduct, validateProduct, type MerchProduct } from '@/lib/merch'
import seed from '@/lib/merch-seed.json'

interface MerchData {
  products: MerchProduct[]
}

/**
 * Download merch.json; until the first save it starts from the products the website already shows
 */
async function readMerch(accessToken: string): Promise<MerchData> {
  const merchData = await readDropboxJson<MerchData>(accessToken, MERCH_FILE_PATH)
  if (!merchData) {
    return { products: (seed as MerchData).products }
  }
  if (!Array.isArray(merchData.products)) {
    throw new Error('merch.json has no products list')
  }
  return merchData
}

const writeMerch = (accessToken: string, merchData: MerchData) => writeDropboxJson(accessToken, MERCH_FILE_PATH, merchData)

/**
 * Normalize and validate a request body; returns the product and the first error message, if any
 */
function parseProduct(body: Record<string, unknown>): { product: MerchProduct; error?: string } {
  const product = normalizeProduct(body)
  const [error] = Object.values(validateProduct(product))
  return { product, error }
}

/**
 * Ids must stay unique: the website keys products by id
 */
function uniqueId(products: MerchProduct[], id: string, skipIndex = -1) {
  const taken = new Set(products.filter((_, i) => i !== skipIndex).map(product => product.id))
  let candidate = id
  for (let n = 2; taken.has(candidate); n++) candidate = `${id}-${n}`
  return candidate
}

function parseIndex(value: unknown, length: number): number | string {
  const index = parseInt(String(value), 10)
  if (isNaN(index) || index < 0) return 'Invalid index parameter'
  if (index >= length) return 'Product index out of range'
  return index
}

const reason = (error: unknown) => error instanceof Error ? error.message : String(error)

/**
 * GET /api/merch - All merch products, in website order
 */
export async function GET() {
  try {
    const accessToken = await getValidAccessToken()
    return NextResponse.json(await readMerch(accessToken))
  } catch (error) {
    console.error('Error fetching merch:', error)
    return NextResponse.json({ error: `Failed to fetch merch: ${reason(error)}` }, { status: 500 })
  }
}

/**
 * POST /api/merch - Add a product at the end of the list
 */
export async function POST(request: NextRequest) {
  try {
    const { product, error } = parseProduct(await request.json())
    if (error) {
      return NextResponse.json({ error }, { status: 400 })
    }

    const accessToken = await getValidAccessToken()
    const { products } = await readMerch(accessToken)
    const newProduct = { ...product, id: uniqueId(products, product.id) }

    await writeMerch(accessToken, { products: [...products, newProduct] })

    return NextResponse.json({ success: true, product: newProduct })
  } catch (error) {
    console.error('Error adding merch:', error)
    return NextResponse.json({ error: `Failed to add product: ${reason(error)}` }, { status: 500 })
  }
}

/**
 * PUT /api/merch - Update the product at an index
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { product, error } = parseProduct(body)
    if (error) {
      return NextResponse.json({ error }, { status: 400 })
    }

    const accessToken = await getValidAccessToken()
    const { products } = await readMerch(accessToken)
    const index = parseIndex(body.index, products.length)
    if (typeof index === 'string') {
      return NextResponse.json({ error: index }, { status: 400 })
    }

    const updatedProduct = { ...product, id: uniqueId(products, product.id, index) }
    await writeMerch(accessToken, { products: products.map((item, i) => i === index ? updatedProduct : item) })

    return NextResponse.json({ success: true, product: updatedProduct })
  } catch (error) {
    console.error('Error updating merch:', error)
    return NextResponse.json({ error: `Failed to update product: ${reason(error)}` }, { status: 500 })
  }
}

/**
 * PATCH /api/merch - Reorder: { order: [ids…] } lists every product id in the new website order
 */
export async function PATCH(request: NextRequest) {
  try {
    const { order } = await request.json()
    if (!Array.isArray(order)) {
      return NextResponse.json({ error: 'order must list the product ids' }, { status: 400 })
    }

    const accessToken = await getValidAccessToken()
    const { products } = await readMerch(accessToken)
    const byId = new Map(products.map(product => [product.id, product]))

    // A stale page could otherwise drop or duplicate products
    if (order.length !== products.length || new Set(order).size !== order.length || order.some(id => !byId.has(id))) {
      return NextResponse.json({ error: 'The list changed since you opened it. Please reload and try again.' }, { status: 409 })
    }

    await writeMerch(accessToken, { products: order.map(id => byId.get(id)!) })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error reordering merch:', error)
    return NextResponse.json({ error: `Failed to reorder: ${reason(error)}` }, { status: 500 })
  }
}

/**
 * DELETE /api/merch?index=n - Remove a product
 */
export async function DELETE(request: NextRequest) {
  try {
    const accessToken = await getValidAccessToken()
    const { products } = await readMerch(accessToken)
    const index = parseIndex(new URL(request.url).searchParams.get('index'), products.length)
    if (typeof index === 'string') {
      return NextResponse.json({ error: index }, { status: 400 })
    }

    await writeMerch(accessToken, { products: products.filter((_, i) => i !== index) })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting merch:', error)
    return NextResponse.json({ error: `Failed to delete product: ${reason(error)}` }, { status: 500 })
  }
}
