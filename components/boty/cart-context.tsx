"use client"

import { createContext, useContext, useRef, useState, type ReactNode } from "react"
import { trackCartEvent } from "@/lib/analytics"

export interface CartItem {
  id: string
  name: string
  description: string
  price: number
  quantity: number
  image: string
}

interface CartContextType {
  items: CartItem[]
  addItem: (item: Omit<CartItem, "quantity">) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  itemCount: number
  subtotal: number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const itemsRef = useRef<CartItem[]>([])
  const [isOpen, setIsOpen] = useState(false)

  const addItem = (newItem: Omit<CartItem, "quantity">) => {
    const currentItems = itemsRef.current
    const existingItem = currentItems.find(item => item.id === newItem.id)
    const nextItems = existingItem
      ? currentItems.map(item =>
          item.id === newItem.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      : [...currentItems, { ...newItem, quantity: 1 }]
    const newSubtotal = nextItems.reduce((sum, item) => sum + item.price * item.quantity, 0)

    itemsRef.current = nextItems
    setItems(nextItems)
    trackCartEvent("add", { id: newItem.id, name: newItem.name, price: newItem.price }, 1, newSubtotal)
    setIsOpen(true)
  }

  const removeItem = (id: string) => {
    const currentItems = itemsRef.current
    const itemToRemove = currentItems.find(item => item.id === id)
    const nextItems = currentItems.filter(item => item.id !== id)
    itemsRef.current = nextItems
    setItems(nextItems)

    if (itemToRemove) {
      const newSubtotal = nextItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
      trackCartEvent("remove", { id: itemToRemove.id, name: itemToRemove.name, price: itemToRemove.price }, itemToRemove.quantity, newSubtotal)
    }
  }

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity < 1) {
      removeItem(id)
      return
    }
    const currentItems = itemsRef.current
    const existingItem = currentItems.find(item => item.id === id)
    const nextItems = currentItems.map(item =>
      item.id === id ? { ...item, quantity } : item
    )
    itemsRef.current = nextItems
    setItems(nextItems)

    if (existingItem && existingItem.quantity !== quantity) {
      const newSubtotal = nextItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
      trackCartEvent(
        "update_quantity",
        { id: existingItem.id, name: existingItem.name, price: existingItem.price },
        quantity,
        newSubtotal,
      )
    }
  }

  const clearCart = () => {
    itemsRef.current = []
    setItems([])
  }

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        isOpen,
        setIsOpen,
        itemCount,
        subtotal
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}
