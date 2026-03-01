import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface Product {
  id: string
  name: string
  sku: string
  category: string
  price: number
  cost: number
  stock: number
  minStock: number
  description: string
  image?: string
  barcode?: string
  status: 'active' | 'inactive'
}

export interface Category {
  id: string
  name: string
  description?: string
  image?: string
  productCount?: number
}

interface InventoryState {
  products: Product[]
  categories: Category[]
  loading: boolean
  error: string | null
}

const initialState: InventoryState = {
  products: [
    {
      id: '1',
      name: 'Wireless Headphones',
      sku: 'WH001',
      category: 'Electronics',
      price: 99.99,
      cost: 60.00,
      stock: 50,
      minStock: 10,
      description: 'Premium wireless headphones with noise cancellation',
      status: 'active'
    },
    {
      id: '2',
      name: 'Smart Watch',
      sku: 'SW002',
      category: 'Electronics',
      price: 299.99,
      cost: 180.00,
      stock: 25,
      minStock: 5,
      description: 'Smart watch with health monitoring features',
      status: 'active'
    }
  ],
  categories: [
    { id: '1', name: 'Electronics', description: 'Electronic devices and accessories', productCount: 15 },
    { id: '2', name: 'Clothing', description: 'Fashion and apparel items', productCount: 8 },
    { id: '3', name: 'Home & Garden', description: 'Home improvement and garden supplies', productCount: 12 }
  ],
  loading: false,
  error: null
}

const inventorySlice = createSlice({
  name: 'inventory',
  initialState,
  reducers: {
    setProducts: (state, action: PayloadAction<Product[]>) => {
      state.products = action.payload
    },
    addProduct: (state, action: PayloadAction<Product>) => {
      state.products.push(action.payload)
    },
    updateProduct: (state, action: PayloadAction<Product>) => {
      const index = state.products.findIndex(p => p.id === action.payload.id)
      if (index !== -1) {
        state.products[index] = action.payload
      }
    },
    deleteProduct: (state, action: PayloadAction<string>) => {
      state.products = state.products.filter(p => p.id !== action.payload)
    },
    updateStock: (state, action: PayloadAction<{ id: string; quantity: number }>) => {
      const product = state.products.find(p => p.id === action.payload.id)
      if (product) {
        product.stock -= action.payload.quantity
      }
    },
    setCategories: (state, action: PayloadAction<Category[]>) => {
      state.categories = action.payload
    },
    addCategory: (state, action: PayloadAction<Category>) => {
      state.categories.push(action.payload)
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
  setProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  updateStock,
  setCategories,
  addCategory,
  setLoading,
  setError
} = inventorySlice.actions

export default inventorySlice.reducer