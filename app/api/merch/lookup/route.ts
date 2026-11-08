import { NextRequest, NextResponse } from 'next/server'

const HEADERS = { 'User-Agent': 'Mozilla/5.0 (compatible; CollectingDotsDashboard/1.0)', 'Accept': 'application/json, text/html' }

interface ShopifyProduct {
  title?: string
  vendor?: string
  product_type?: string
  handle?: string
  images?: { src?: string; width?: number; height?: number; alt?: string | null }[]
}

/**
 * Shopify shops (Float, Veragua…) publish every product as JSON next to its page
 */
async function fromShopify(link: URL) {
  const handle = link.pathname.match(/\/products\/([^/?#]+)/)?.[1]
  if (!handle) return null
  const response = await fetch(`${link.origin}/products/${handle}.json`, { headers: HEADERS, cache: 'no-store' })
  if (!response.ok) return null
  const { product } = await response.json().catch(() => ({})) as { product?: ShopifyProduct }
  if (!product?.title) return null
  return {
    name: product.title,
    category: product.product_type || '',
    brand: product.vendor || '',
    url: `${link.origin}/products/${product.handle || handle}`,
    images: (product.images ?? []).filter(image => image.src).map((image, index) => ({
      src: image.src!, width: image.width || 1440, height: image.height || 1920, label: image.alt || `Photo ${index + 1}`,
    })),
  }
}

const meta = (html: string, property: string) =>
  html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'))?.[1]
  ?? html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`, 'i'))?.[1]

/**
 * Any other shop: the title and photo it shows in link previews
 */
async function fromPage(link: URL) {
  const response = await fetch(link, { headers: HEADERS, cache: 'no-store' })
  if (!response.ok) return null
  const html = await response.text()
  const name = meta(html, 'og:title')
  const image = meta(html, 'og:image')
  if (!name) return null
  return {
    name,
    category: '',
    brand: meta(html, 'og:site_name') || '',
    url: link.href,
    images: image ? [{ src: new URL(image, link).href, width: 1440, height: 1920, label: 'Photo 1' }] : [],
  }
}

/**
 * GET /api/merch/lookup?url=… - Product details read from a shop link, to fill the form
 */
export async function GET(request: NextRequest) {
  let link: URL
  try {
    link = new URL(request.nextUrl.searchParams.get('url') || '')
    if (!['http:', 'https:'].includes(link.protocol)) throw new Error()
  } catch {
    return NextResponse.json({ error: 'Please paste a full product link' }, { status: 400 })
  }

  try {
    const product = await fromShopify(link) ?? await fromPage(link)
    if (!product) {
      return NextResponse.json({ error: "The shop didn't share the product details. Try again in a minute, or fill them in yourself." }, { status: 502 })
    }
    return NextResponse.json({ product })
  } catch (error) {
    console.error('Error looking up product:', error)
    return NextResponse.json({ error: "Couldn't reach the shop. Try again in a minute, or fill the details in yourself." }, { status: 502 })
  }
}
