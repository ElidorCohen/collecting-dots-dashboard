/**
 * The merch the website shows, kept in Dropbox at /merch/merch.json in display order.
 * The form and the API share these rules so the form never sends what the server would refuse.
 */

export interface MerchImage {
  src: string
  width: number
  height: number
  label: string
}

export interface MerchProduct {
  id: string
  name: string
  shortName: string
  category: string
  /** Short partner name for the title and tag, e.g. "Float" */
  brand: string
  /** Full partner name for sentences, e.g. "Float Apparel" */
  brandName: string
  url: string
  images: MerchImage[]
}

export type MerchErrors = Partial<Record<keyof MerchProduct, string>>

export const MERCH_FILE_PATH = '/merch/merch.json'

const text = (value: unknown) => typeof value === 'string' ? value.trim() : ''
const size = (value: unknown, fallback: number) => Number.isFinite(Number(value)) && Number(value) > 0 ? Math.round(Number(value)) : fallback
const withScheme = (url: string) => !url || /^https?:\/\//i.test(url) ? url : `https://${url}`
const slug = (value: string) => value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)

function isWebLink(value: string) {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol)
  } catch {
    return false
  }
}

export function normalizeProduct(input: Record<string, unknown>): MerchProduct {
  const name = text(input.name)
  const images = Array.isArray(input.images) ? input.images : []
  return {
    id: text(input.id) || slug(name) || `product-${Date.now()}`,
    name,
    shortName: text(input.shortName) || name,
    category: text(input.category),
    brand: text(input.brand),
    brandName: text(input.brandName) || text(input.brand),
    url: withScheme(text(input.url)),
    images: images.flatMap((image, index) => {
      const row = (image ?? {}) as Record<string, unknown>
      const src = withScheme(text(row.src))
      return src ? [{ src, width: size(row.width, 1440), height: size(row.height, 1920), label: text(row.label) || `Photo ${index + 1}` }] : []
    }),
  }
}

/** Expects a normalized product; returns an error per field, empty when it can be saved */
export function validateProduct(product: MerchProduct): MerchErrors {
  const errors: MerchErrors = {}
  if (!product.name) errors.name = 'Product name is required'
  if (!product.category) errors.category = 'Category is required (T-shirt, Ring, Cap…)'
  if (!product.brand) errors.brand = 'Brand is required (Float, Veragua…)'
  if (!product.url) errors.url = 'Shop link is required'
  else if (!isWebLink(product.url)) errors.url = 'Please enter a valid link'
  if (!product.images.length) errors.images = 'Add at least one photo'
  else if (product.images.some(image => !isWebLink(image.src))) errors.images = 'Every photo needs a valid link'
  return errors
}
