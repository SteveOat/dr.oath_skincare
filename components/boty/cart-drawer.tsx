"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Minus, Plus, Trash2, ShoppingBag, Check } from "lucide-react"
import Image from "next/image"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { useCart } from "./cart-context"
import { trackPurchase, trackClick } from "@/lib/analytics"

export function CartDrawer() {
  const router = useRouter()
  const { items, removeItem, updateQuantity, isOpen, setIsOpen, itemCount, subtotal, clearCart } = useCart()
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)
  const [isPurchaseLoading, setIsPurchaseLoading] = useState(false)
  const [purchaseError, setPurchaseError] = useState<string | null>(null)

  const shipping = 0
  const total = subtotal + shipping

  const handleCheckout = async () => {
    if (isPurchaseLoading || items.length === 0) return

    trackClick("cta", "Checkout", "cart-checkout")
    setShowPurchaseModal(true)
    setIsPurchaseLoading(true)
    setPurchaseError(null)
    
    const result = await trackPurchase(total, items.map(item => ({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity
    })))

    if (!result.ok) {
      setIsPurchaseLoading(false)
      setPurchaseError(result.error || "Could not complete checkout")
      return
    }
    
    setTimeout(() => {
      setIsPurchaseLoading(false)
    }, 1500)
    
    setTimeout(() => {
      setShowPurchaseModal(false)
      setIsOpen(false)
      clearCart()
      router.push("/shop")
    }, 3500)
  }

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen} direction="right">
      <DrawerContent className="h-full w-full sm:max-w-[440px]">
        <DrawerHeader className="border-b border-border/50 p-6 py-2.5">
          <DrawerTitle className="font-serif text-2xl">Cart</DrawerTitle>
          <DrawerDescription>{itemCount} {itemCount === 1 ? 'item' : 'items'}</DrawerDescription>
        </DrawerHeader>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-6">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <ShoppingBag className="w-12 h-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">Your cart is empty</p>
              <DrawerClose asChild>
                <button
                  type="button"
                  className="mt-4 text-primary hover:underline text-sm"
                >
                  Continue Shopping
                </button>
              </DrawerClose>
            </div>
          ) : (
            <div className="space-y-6">
              {items.map((item) => (
                <div key={item.id} className="flex gap-4">
                  {/* Product Image */}
                  <div className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                    <Image
                      src={item.image || "/placeholder.svg"}
                      alt={item.name}
                      fill
                      className="object-cover"
                    />
                  </div>

                  {/* Product Details */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-serif text-base text-foreground mb-1 font-semibold">{item.name}</h3>
                    <p className="text-muted-foreground mb-3 text-sm">{item.description}</p>
                    
                    {/* Quantity Controls */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center border border-border rounded-full">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="p-1.5 hover:bg-muted boty-transition rounded-l-full"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-3 text-sm font-medium">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="p-1.5 hover:bg-muted boty-transition rounded-r-full"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="p-1.5 text-muted-foreground hover:text-destructive boty-transition"
                        aria-label="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="text-right">
                    <p className="font-medium text-foreground">${item.price * item.quantity}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <DrawerFooter className="border-t border-border/50 p-6 gap-4">
            {/* Summary */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>${subtotal}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Shipping</span>
                <span>{shipping === 0 ? 'Free' : `$${shipping}`}</span>
              </div>
              <div className="flex justify-between text-base font-medium text-foreground pt-2 border-t border-border/50">
                <span>Total</span>
                <span>${total}</span>
              </div>
            </div>

            {/* Checkout Button */}
            <button
              type="button"
              onClick={handleCheckout}
              disabled={isPurchaseLoading}
              className="w-full bg-primary text-primary-foreground py-4 rounded-full font-medium hover:bg-primary/90 boty-transition disabled:opacity-60"
            >
              Checkout
            </button>

            <DrawerClose asChild>
              <button
                type="button"
                className="w-full border border-border text-foreground py-4 rounded-full font-medium hover:bg-muted boty-transition"
              >
                Continue Shopping
              </button>
            </DrawerClose>
          </DrawerFooter>
        )}
      </DrawerContent>

      {/* Purchase Success Modal */}
      {showPurchaseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-background rounded-3xl p-8 max-w-md w-full mx-4 boty-shadow animate-in fade-in zoom-in-95 duration-300">
            {isPurchaseLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6 animate-pulse">
                  <div className="w-12 h-12 rounded-full border-3 border-primary border-t-transparent animate-spin" />
                </div>
                <h3 className="text-xl font-serif text-foreground mb-2">Processing Order</h3>
                <p className="text-sm text-muted-foreground text-center">
                  Thank you for your purchase!
                </p>
              </div>
            ) : purchaseError ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
                  <Trash2 className="w-8 h-8 text-destructive" />
                </div>
                <h3 className="text-2xl font-serif text-foreground mb-2 text-center">
                  Checkout failed
                </h3>
                <p className="text-sm text-muted-foreground text-center mb-6">
                  {purchaseError}
                </p>
                <button
                  type="button"
                  onClick={() => setShowPurchaseModal(false)}
                  className="w-full bg-primary text-primary-foreground py-3 rounded-full font-medium hover:bg-primary/90 boty-transition"
                >
                  Back to cart
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 animate-in fade-in duration-500">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-6 animate-bounce">
                  <Check className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-2xl font-serif text-foreground mb-2 text-center">
                  Order Confirmed!
                </h3>
                <p className="text-sm text-muted-foreground text-center mb-6">
                  Your purchase has been completed successfully. You&apos;re all set!
                </p>
                <div className="w-full bg-primary/10 rounded-xl p-4 mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Items</span>
                    <span className="text-sm font-medium text-foreground">{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total</span>
                    <span className="text-lg font-medium text-foreground">${total}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  You will be redirected to the shop shortly...
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </Drawer>
  )
}
