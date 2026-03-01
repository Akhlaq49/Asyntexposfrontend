import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface DashboardStats {
  totalSales: number
  totalOrders: number
  totalCustomers: number
  totalProducts: number
  dailySales: { date: string; amount: number }[]
  topProducts: { id: string; name: string; sales: number }[]
  recentOrders: { id: string; customer: string; amount: number; status: string; date: string }[]
}

interface DashboardState {
  stats: DashboardStats
  loading: boolean
  error: string | null
}

const initialState: DashboardState = {
  stats: {
    totalSales: 125430.50,
    totalOrders: 1250,
    totalCustomers: 890,
    totalProducts: 245,
    dailySales: [
      { date: '2026-02-15', amount: 5430 },
      { date: '2026-02-16', amount: 6200 },
      { date: '2026-02-17', amount: 4800 },
      { date: '2026-02-18', amount: 7300 },
      { date: '2026-02-19', amount: 6900 },
      { date: '2026-02-20', amount: 8100 },
      { date: '2026-02-21', amount: 9200 }
    ],
    topProducts: [
      { id: '1', name: 'Wireless Headphones', sales: 125 },
      { id: '2', name: 'Smart Watch', sales: 89 },
      { id: '3', name: 'Laptop Stand', sales: 67 }
    ],
    recentOrders: [
      { id: '#78901', customer: 'James Kirwin', amount: 125.50, status: 'Completed', date: '2026-02-22 10:30' },
      { id: '#78902', customer: 'Sarah Connor', amount: 89.99, status: 'Processing', date: '2026-02-22 09:15' },
      { id: '#78903', customer: 'Mike Johnson', amount: 199.00, status: 'Shipped', date: '2026-02-21 16:45' }
    ]
  },
  loading: false,
  error: null
}

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    setStats: (state, action: PayloadAction<DashboardStats>) => {
      state.stats = action.payload
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
    }
  }
})

export const { setStats, setLoading, setError } = dashboardSlice.actions
export default dashboardSlice.reducer