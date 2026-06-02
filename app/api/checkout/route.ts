import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

type CheckoutItem = {
  id: string
  name: string
  price: number
  quantity: number
}

type InventoryRow = {
  product_id: string
  product_name: string
  product_price: number | string
  stock_quantity: number
}

function getSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error("Supabase environment variables are missing")
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

function normalizeItems(rawItems: unknown): CheckoutItem[] {
  if (!Array.isArray(rawItems)) return []

  const byId = new Map<string, CheckoutItem>()

  for (const raw of rawItems) {
    if (!raw || typeof raw !== "object") continue

    const item = raw as Partial<CheckoutItem>
    const id = typeof item.id === "string" ? item.id.trim() : ""
    const name = typeof item.name === "string" ? item.name.trim() : id
    const price = Number(item.price)
    const quantity = Math.max(1, Math.floor(Number(item.quantity)))

    if (!id || !Number.isFinite(price) || price < 0 || !Number.isFinite(quantity)) {
      continue
    }

    const existing = byId.get(id)
    if (existing) {
      existing.quantity += quantity
    } else {
      byId.set(id, { id, name, price, quantity })
    }
  }

  return Array.from(byId.values())
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const sessionId = typeof body?.sessionId === "string" ? body.sessionId.trim() : ""
    const items = normalizeItems(body?.items)

    if (!sessionId) {
      return NextResponse.json({ error: "Missing analytics session" }, { status: 400 })
    }

    if (items.length === 0) {
      return NextResponse.json({ error: "No checkout items supplied" }, { status: 400 })
    }

    const supabase = getSupabaseAdminClient()
    const productIds = items.map((item) => item.id)

    const { data: inventoryRows, error: inventoryError } = await supabase
      .from("products_inventory")
      .select("product_id, product_name, product_price, stock_quantity")
      .in("product_id", productIds)

    if (inventoryError) throw inventoryError

    const inventoryById = new Map<string, InventoryRow>(
      ((inventoryRows || []) as InventoryRow[]).map((row) => [row.product_id, row]),
    )

    const missing = items.filter((item) => !inventoryById.has(item.id))
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Unknown product id: ${missing.map((item) => item.id).join(", ")}` },
        { status: 400 },
      )
    }

    const insufficient = items.filter((item) => {
      const row = inventoryById.get(item.id)
      return !row || row.stock_quantity < item.quantity
    })

    if (insufficient.length > 0) {
      return NextResponse.json(
        {
          error: "Insufficient stock",
          items: insufficient.map((item) => ({
            id: item.id,
            requested: item.quantity,
            available: inventoryById.get(item.id)?.stock_quantity ?? 0,
          })),
        },
        { status: 409 },
      )
    }

    const normalizedItems = items.map((item) => {
      const inventory = inventoryById.get(item.id)!
      const price = Number(inventory.product_price)
      return {
        id: item.id,
        product_id: item.id,
        name: inventory.product_name || item.name,
        price: Number.isFinite(price) ? price : item.price,
        quantity: item.quantity,
      }
    })

    const orderTotal = normalizedItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    )
    const itemCount = normalizedItems.reduce((sum, item) => sum + item.quantity, 0)

    const { data: purchase, error: purchaseError } = await supabase
      .from("analytics_purchases")
      .insert({
        session_id: sessionId,
        order_total: orderTotal,
        item_count: itemCount,
        items: normalizedItems,
      })
      .select("id")
      .single()

    if (purchaseError) throw purchaseError

    const originalStocks = new Map(
      Array.from(inventoryById.values()).map((row) => [row.product_id, row.stock_quantity]),
    )

    for (const item of normalizedItems) {
      const current = inventoryById.get(item.id)!
      const { error: updateError } = await supabase
        .from("products_inventory")
        .update({
          stock_quantity: current.stock_quantity - item.quantity,
          updated_at: new Date().toISOString(),
        })
        .eq("product_id", item.id)

      if (updateError) {
        for (const [productId, stock] of originalStocks.entries()) {
          await supabase
            .from("products_inventory")
            .update({ stock_quantity: stock, updated_at: new Date().toISOString() })
            .eq("product_id", productId)
        }
        await supabase.from("analytics_purchases").delete().eq("id", purchase.id)
        throw updateError
      }
    }

    return NextResponse.json({
      purchaseId: purchase.id,
      orderTotal,
      itemCount,
      stockUpdates: normalizedItems.map((item) => {
        const previous = originalStocks.get(item.id) || 0
        return {
          productId: item.id,
          previousStock: previous,
          nextStock: previous - item.quantity,
          quantity: item.quantity,
        }
      }),
    })
  } catch (error) {
    console.error("[checkout] failed:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Checkout failed" },
      { status: 500 },
    )
  }
}
