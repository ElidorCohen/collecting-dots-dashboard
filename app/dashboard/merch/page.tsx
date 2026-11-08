"use client"

import { useState, useEffect } from 'react'
import { DashboardLayout } from '../../components/dashboard-layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'
import { ShoppingBag, Plus, Trash2, Edit2, Loader2, ChevronUp, ChevronDown, ExternalLink, Wand2, X, GripVertical } from 'lucide-react'
import { normalizeProduct, validateProduct, type MerchImage, type MerchProduct } from '@/lib/merch'

const EMPTY = { id: '', name: '', shortName: '', category: '', brand: '', brandName: '', url: '', images: [] as MerchImage[] }

// The server's own message says what went wrong; fall back to the status when there is none
const readError = async (response: Response, fallback: string) => {
  const data = await response.json().catch(() => null)
  return data?.error || `${fallback} (${response.status})`
}

export default function MerchPage() {
  const [products, setProducts] = useState<MerchProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null)
  const [formData, setFormData] = useState(EMPTY)
  const [link, setLink] = useState('')
  const [newPhoto, setNewPhoto] = useState('')
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [lookupState, setLookupState] = useState<{ busy: boolean; error?: string }>({ busy: false })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [reordering, setReordering] = useState(false)
  // Mouse users drag; touch screens use the arrows
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dropAt, setDropAt] = useState<number | null>(null)

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      setLoadError(null)
      const response = await fetch('/api/merch')
      if (!response.ok) {
        throw new Error(await readError(response, 'Failed to fetch merch'))
      }
      const data: { products: MerchProduct[] } = await response.json()
      setProducts(data.products || [])
    } catch (error) {
      console.error('Error fetching merch:', error)
      setLoadError(error instanceof Error ? error.message : 'Failed to fetch merch')
    } finally {
      setLoading(false)
    }
  }

  const setField = (field: keyof typeof EMPTY, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (formErrors[field]) {
      setFormErrors(prev => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  const setImages = (images: MerchImage[]) => {
    setFormData(prev => ({ ...prev, images }))
    if (formErrors.images) setFormErrors(prev => ({ ...prev, images: '' }))
  }

  const openDialog = (index: number | null) => {
    const product = index === null ? EMPTY : products[index]
    setEditingIndex(index)
    setFormData({ ...EMPTY, ...product, images: [...product.images] })
    setLink(product.url)
    setNewPhoto('')
    setFormErrors({})
    setLookupState({ busy: false })
    setIsDialogOpen(true)
  }

  const closeDialog = () => {
    setIsDialogOpen(false)
    setEditingIndex(null)
  }

  // Fills the form from the shop; the person still checks it before saving
  const fillFromLink = async () => {
    if (!link.trim()) return
    setLookupState({ busy: true })
    try {
      const response = await fetch(`/api/merch/lookup?url=${encodeURIComponent(link.trim())}`)
      if (!response.ok) {
        throw new Error(await readError(response, 'Lookup failed'))
      }
      const { product } = await response.json()
      setFormData(prev => ({
        ...prev,
        name: product.name || prev.name,
        shortName: prev.shortName || product.name,
        category: product.category || prev.category,
        brand: prev.brand || product.brand,
        brandName: prev.brandName || product.brand,
        url: product.url || link.trim(),
        // Two photos keep the website's front / back switch; more can be added below
        images: product.images?.length ? product.images.slice(0, 2) : prev.images,
      }))
      setFormErrors({})
      setLookupState({ busy: false })
    } catch (error) {
      setFormData(prev => ({ ...prev, url: prev.url || link.trim() }))
      setLookupState({ busy: false, error: error instanceof Error ? error.message : 'Lookup failed' })
    }
  }

  const addPhoto = () => {
    if (!newPhoto.trim()) return
    setImages([...formData.images, { src: newPhoto.trim(), width: 1440, height: 1920, label: `Photo ${formData.images.length + 1}` }])
    setNewPhoto('')
  }

  const moveImage = (index: number, by: number) => {
    const images = [...formData.images]
    const [image] = images.splice(index, 1)
    images.splice(index + by, 0, image)
    setImages(images)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const product = normalizeProduct(formData)
    const errors = validateProduct(product) as Record<string, string>
    setFormErrors(errors)
    if (Object.keys(errors).length) return

    try {
      setIsSubmitting(true)
      const editing = editingIndex !== null
      const response = await fetch('/api/merch', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing ? { index: editingIndex, ...product } : product),
      })
      if (!response.ok) {
        throw new Error(await readError(response, editing ? 'Failed to update product' : 'Failed to add product'))
      }
      closeDialog()
      await fetchProducts()
    } catch (error) {
      console.error('Error saving product:', error)
      alert(error instanceof Error ? error.message : 'Failed to save product')
    } finally {
      setIsSubmitting(false)
    }
  }

  // The list order is the website order; it saves as soon as a product moves
  const moveTo = async (from: number, to: number) => {
    if (from === to) return
    const next = [...products]
    const [product] = next.splice(from, 1)
    next.splice(to, 0, product)
    setProducts(next)
    try {
      setReordering(true)
      const response = await fetch('/api/merch', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: next.map(item => item.id) }),
      })
      if (!response.ok) {
        throw new Error(await readError(response, 'Failed to reorder'))
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to reorder')
      await fetchProducts()
    } finally {
      setReordering(false)
    }
  }

  const move = (index: number, by: number) => moveTo(index, index + by)

  // dropAt is the gap the product would land in: 0 is above the first, products.length below the last
  const dragOver = (e: React.DragEvent<HTMLLIElement>, index: number) => {
    if (dragIndex === null) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    const box = e.currentTarget.getBoundingClientRect()
    setDropAt(e.clientY < box.top + box.height / 2 ? index : index + 1)
  }

  const drop = (e: React.DragEvent) => {
    e.preventDefault()
    if (dragIndex !== null && dropAt !== null) {
      moveTo(dragIndex, dropAt > dragIndex ? dropAt - 1 : dropAt)
    }
    setDragIndex(null)
    setDropAt(null)
  }

  const handleDeleteConfirm = async () => {
    if (deleteIndex === null) return
    try {
      const response = await fetch(`/api/merch?index=${deleteIndex}`, { method: 'DELETE' })
      if (!response.ok) {
        throw new Error(await readError(response, 'Failed to delete product'))
      }
      await fetchProducts()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete product')
    } finally {
      setDeleteIndex(null)
    }
  }

  const fieldError = (field: string) => formErrors[field] && (
    <p className="text-sm text-destructive">{formErrors[field]}</p>
  )

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-3xl text-foreground sm:text-4xl">Merch</h1>
            <p className="text-muted-foreground mt-1">The order here is the order on the website.<span className="hidden [@media(pointer:fine)]:inline"> Drag to reorder.</span></p>
          </div>
          <Button onClick={() => openDialog(null)}>
            <Plus />
            Add Product
          </Button>
        </div>

        {loading && (
          <Card>
            <CardContent className="p-8 text-center sm:p-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Loading merch...</p>
            </CardContent>
          </Card>
        )}

        {!loading && loadError && (
          <Card>
            <CardContent className="p-8 text-center sm:p-12">
              <ShoppingBag className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
              <h2 className="mb-2 text-xl font-semibold text-foreground">Merch could not be loaded</h2>
              <p className="text-muted-foreground mb-4">{loadError}</p>
              <Button onClick={fetchProducts}>Try again</Button>
            </CardContent>
          </Card>
        )}

        {!loading && !loadError && products.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center sm:p-12">
              <ShoppingBag className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
              <h2 className="mb-2 text-xl font-semibold text-foreground">No products yet</h2>
              <p className="text-muted-foreground mb-4">Paste a shop link to add the first one.</p>
              <Button onClick={() => openDialog(null)}>
                <Plus />
                Add Product
              </Button>
            </CardContent>
          </Card>
        )}

        {!loading && !loadError && products.length > 0 && (
          <ol className="grid gap-3" onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropAt(null) }}>
            {products.map((product, index) => (
              <li
                key={product.id}
                draggable={!reordering}
                onDragStart={(e) => { setDragIndex(index); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', product.id) }}
                onDragOver={(e) => dragOver(e, index)}
                onDrop={drop}
                onDragEnd={() => { setDragIndex(null); setDropAt(null) }}
                className={`relative min-w-0 ${dragIndex === index ? 'opacity-40' : ''}`}
              >
                {dropAt === index && dragIndex !== null && <span className="absolute -top-2 left-0 right-0 h-0.5 rounded-full bg-brand" aria-hidden="true" />}
                {dropAt === index + 1 && index === products.length - 1 && dragIndex !== null && <span className="absolute -bottom-2 left-0 right-0 h-0.5 rounded-full bg-brand" aria-hidden="true" />}
                <Card className="flex-row items-center gap-3 overflow-hidden p-2 pr-1 sm:gap-4 sm:p-3 [@media(pointer:fine)]:cursor-grab [@media(pointer:fine)]:active:cursor-grabbing">
                  <GripVertical className="hidden h-4 w-4 shrink-0 text-muted-foreground [@media(pointer:fine)]:block" aria-hidden="true" />
                  <span className="w-5 shrink-0 text-center font-mono text-xs text-muted-foreground">{String(index + 1).padStart(2, '0')}</span>
                  <img src={product.images[0]?.src} alt="" draggable={false} className="h-20 w-[60px] shrink-0 rounded-lg bg-muted object-cover" />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold text-foreground">{product.shortName}</h3>
                    <p className="truncate text-sm text-muted-foreground">{product.brand} · {product.category}</p>
                    <a
                      href={product.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-foreground underline-offset-4 hover:underline"
                    >
                      Shop link
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <div className="flex shrink-0 flex-col sm:flex-row [@media(pointer:fine)]:hidden">
                    <Button variant="ghost" size="icon" aria-label={`Move ${product.shortName} up`} disabled={index === 0 || reordering} onClick={() => move(index, -1)}>
                      <ChevronUp />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label={`Move ${product.shortName} down`} disabled={index === products.length - 1 || reordering} onClick={() => move(index, 1)}>
                      <ChevronDown />
                    </Button>
                  </div>
                  <div className="flex shrink-0 flex-col sm:flex-row">
                    <Button variant="ghost" size="icon" aria-label={`Edit ${product.shortName}`} onClick={() => openDialog(index)}>
                      <Edit2 />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${product.shortName}`}
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setDeleteIndex(index)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </Card>
              </li>
            ))}
          </ol>
        )}

        <Dialog open={isDialogOpen} onOpenChange={closeDialog}>
          <DialogContent className="sm:max-w-[560px]">
            <DialogHeader>
              <DialogTitle>{editingIndex !== null ? 'Edit Product' : 'Add Product'}</DialogTitle>
              <DialogDescription>Paste the product link to fill this in, then check it.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="merch-link">Product link</Label>
                <div className="flex gap-2">
                  <Input
                    id="merch-link"
                    inputMode="url"
                    autoCapitalize="none"
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    placeholder="https://shop.com/products/..."
                  />
                  <Button type="button" variant="outline" onClick={fillFromLink} disabled={!link.trim() || lookupState.busy}>
                    {lookupState.busy ? <Loader2 className="animate-spin" /> : <Wand2 />}
                    Fill in
                  </Button>
                </div>
                {lookupState.error && <p className="text-sm text-destructive">{lookupState.error}</p>}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="merch-name">Product name</Label>
                  <Input id="merch-name" value={formData.name} onChange={(e) => setField('name', e.target.value)} placeholder="Dot Ring" />
                  {fieldError('name')}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="merch-short">Name on the website</Label>
                  <Input id="merch-short" value={formData.shortName} onChange={(e) => setField('shortName', e.target.value)} placeholder="Dot Ring" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="merch-category">Category</Label>
                  <Input id="merch-category" value={formData.category} onChange={(e) => setField('category', e.target.value)} placeholder="Ring" />
                  {fieldError('category')}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="merch-brand">Brand</Label>
                  <Input id="merch-brand" value={formData.brand} onChange={(e) => setField('brand', e.target.value)} placeholder="Veragua" />
                  {fieldError('brand')}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="merch-brand-name">Brand full name</Label>
                  <Input id="merch-brand-name" value={formData.brandName} onChange={(e) => setField('brandName', e.target.value)} placeholder="Veragua Lifestyle" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="merch-url">Shop link</Label>
                  <Input id="merch-url" inputMode="url" autoCapitalize="none" value={formData.url} onChange={(e) => setField('url', e.target.value)} placeholder="https://shop.com/products/..." />
                  {fieldError('url')}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Photos</Label>
                {formData.images.length > 0 && (
                  <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {formData.images.map((image, index) => (
                      <li key={`${image.src}-${index}`} className="space-y-1.5">
                        <div className="relative">
                          <img src={image.src} alt="" className="aspect-[3/4] w-full rounded-lg bg-muted object-cover" />
                          <button
                            type="button"
                            aria-label="Remove photo"
                            onClick={() => setImages(formData.images.filter((_, i) => i !== index))}
                            className="absolute right-1.5 top-1.5 flex size-8 items-center justify-center rounded-full bg-card/90 text-foreground"
                          >
                            <X className="h-4 w-4" />
                          </button>
                          {index === 0 && <span className="absolute bottom-1.5 left-1.5 rounded-full bg-card/90 px-2 py-0.5 text-xs font-medium">Main</span>}
                        </div>
                        <div className="flex items-center gap-1">
                          <Input
                            aria-label="Photo label"
                            value={image.label}
                            onChange={(e) => setImages(formData.images.map((item, i) => i === index ? { ...item, label: e.target.value } : item))}
                            className="h-9 text-sm"
                          />
                          {index > 0 && (
                            <Button type="button" variant="ghost" size="icon" aria-label="Move photo earlier" onClick={() => moveImage(index, -1)}>
                              <ChevronUp className="-rotate-90" />
                            </Button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex gap-2">
                  <Input inputMode="url" autoCapitalize="none" value={newPhoto} onChange={(e) => setNewPhoto(e.target.value)} placeholder="Photo link" />
                  <Button type="button" variant="outline" onClick={addPhoto} disabled={!newPhoto.trim()}>
                    <Plus />
                    Add
                  </Button>
                </div>
                {fieldError('images')}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDialog} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="animate-spin" /> : null}
                  {editingIndex !== null ? 'Update Product' : 'Add Product'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {deleteIndex !== null && (
          <ConfirmationDialog
            isOpen
            onClose={() => setDeleteIndex(null)}
            onConfirm={handleDeleteConfirm}
            title="Delete Product"
            description={`Remove "${products[deleteIndex]?.shortName}" from the website? This action cannot be undone.`}
            confirmText="Delete"
            type="destructive"
          />
        )}
      </div>
    </DashboardLayout>
  )
}
