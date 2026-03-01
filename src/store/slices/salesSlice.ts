import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { Product } from './inventorySlice'

export interface CartItem {
  product: Product
  quantity: number
  discount?: number
}

export interface Sale {
  id: string
  items: CartItem[]
  subtotal: number
  tax: number
  discount: number
  total: number
  paymentMethod: 'cash' | 'card' | 'digital'
  customerId?: string
  customerName?: string
  date: string
  status: 'completed' | 'pending' | 'refunded'
}

interface SalesState {
  cart: CartItem[]
  sales: Sale[]
  currentSale: Sale | null
  loading: boolean
  error: string | null
}

const initialState: SalesState = {
  cart: [],
  sales: [
    {
      id: '#78901',
      items: [
        {
          product: {
            id: '1',
            name: 'Wireless Headphones',
            sku: 'WH001',
            category: 'Electronics',
            price: 99.99,
            cost: 60.00,
            stock: 50,
            minStock: 10,
            description: 'Premium wireless headphones',
            status: 'active'
          },
          quantity: 1
        }
      ],
      subtotal: 99.99,
      tax: 9.99,
      discount: 0,
      total: 109.98,
      paymentMethod: 'card',
      customerName: 'James Kirwin',
      date: '2026-02-22T10:30:00.000Z',
      status: 'completed'
    }
  ],
  currentSale: null,
  loading: false,
  error: null
}

const salesSlice = createSlice({
  name: 'sales',
  initialState,
  reducers: {
    addToCart: (state, action: PayloadAction<{ product: Product; quantity: number }>) => {
      const { product, quantity } = action.payload
      const existingItem = state.cart.find(item => item.product.id === product.id)
      
      if (existingItem) {
        existingItem.quantity += quantity
      } else {
        state.cart.push({ product, quantity })
      }
    },
    removeFromCart: (state, action: PayloadAction<string>) => {
      state.cart = state.cart.filter(item => item.product.id !== action.payload)
    },
    updateCartQuantity: (state, action: PayloadAction<{ productId: string; quantity: number }>) => {
      const item = state.cart.find(item => item.product.id === action.payload.productId)
      if (item) {
        item.quantity = action.payload.quantity
      }
    },
    clearCart: (state) => {
      state.cart = []
    },
    completeSale: (state, action: PayloadAction<Sale>) => {
      state.sales.unshift(action.payload)
      state.cart = []
      state.currentSale = action.payload
    },
    setSales: (state, action: PayloadAction<Sale[]>) => {
      state.sales = action.payload
    },
    setCurrentSale: (state, action: PayloadAction<Sale | null>) => {
      state.currentSale = action.payload
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
    }
  }
})

export const {
  addToCart,
  removeFromCart,
  updateCartQuantity,
  clearCart,
  completeSale,
  setSales,
  setCurrentSale,
  setLoading,
  setError
} = salesSlice.actions

export default salesSlice.reducer