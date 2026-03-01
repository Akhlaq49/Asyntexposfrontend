import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface MenuItem {
  id: string
  title: string
  icon: string
  path?: string
  children?: MenuItem[]
  visible: boolean
  order: number
}

interface MenuState {
  items: MenuItem[]
  collapsed: boolean
  mobileOpen: boolean
}

const initialMenuItems: MenuItem[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    icon: 'layout-dashboard',
    path: '/dashboard',
    visible: true,
    order: 1
  },
  {
    id: 'inventory',
    title: 'Inventory',
    icon: 'package',
    visible: true,
    order: 2,
    children: [
      { id: 'products', title: 'Products', icon: 'box', path: '/inventory/products', visible: true, order: 1 },
      { id: 'add-product', title: 'Add Product', icon: 'plus', path: '/inventory/add-product', visible: true, order: 2 },
      { id: 'categories', title: 'Categories', icon: 'category', path: '/inventory/categories', visible: true, order: 3 }
    ]
  },
  {
    id: 'sales',
    title: 'Sales',
    icon: 'shopping-cart',
    visible: true,
    order: 3,
    children: [
      { id: 'pos', title: 'POS', icon: 'device-laptop', path: '/sales/pos', visible: true, order: 1 }
    ]
  },
  {
    id: 'people',
    title: 'People',
    icon: 'users',
    visible: true,
    order: 4,
    children: [
      { id: 'customers', title: 'Customers', icon: 'user-group', path: '/people/customers', visible: true, order: 1 },
      { id: 'suppliers', title: 'Suppliers', icon: 'truck', path: '/people/suppliers', visible: true, order: 2 }
    ]
  },
  {
    id: 'hrm',
    title: 'HRM',
    icon: 'user-cog',
    visible: true,
    order: 5,
    children: [
      { id: 'employees', title: 'Employees', icon: 'users', path: '/hrm/employees', visible: true, order: 1 }
    ]
  },
  {
    id: 'reports',
    title: 'Reports',
    icon: 'chart-bar',
    visible: true,
    order: 6,
    children: [
      { id: 'sales-report', title: 'Sales Report', icon: 'report', path: '/reports/sales', visible: true, order: 1 }
    ]
  },
  {
    id: 'settings',
    title: 'Settings',
    icon: 'settings',
    path: '/settings',
    visible: true,
    order: 7
  }
]

const initialState: MenuState = {
  items: initialMenuItems,
  collapsed: false,
  mobileOpen: false
}

const menuSlice = createSlice({
  name: 'menu',
  initialState,
  reducers: {
    toggleCollapse: (state) => {
      state.collapsed = !state.collapsed
    },
    setCollapse: (state, action: PayloadAction<boolean>) => {
      state.collapsed = action.payload
    },
    toggleMobile: (state) => {
      state.mobileOpen = !state.mobileOpen
    },
    setMobileOpen: (state, action: PayloadAction<boolean>) => {
      state.mobileOpen = action.payload
    },
    updateMenuVisibility: (state, action: PayloadAction<{ id: string; visible: boolean }>) => {
      const { id, visible } = action.payload
      const updateMenuItem = (items: MenuItem[]): MenuItem[] => {
        return items.map(item => {
          if (item.id === id) {
            return { ...item, visible }
          }
          if (item.children) {
            return { ...item, children: updateMenuItem(item.children) }
          }
          return item
        })
      }
      state.items = updateMenuItem(state.items)
    },
    reorderMenuItems: (state, action: PayloadAction<MenuItem[]>) => {
      state.items = action.payload
    }
  }
})

export const { 
  toggleCollapse, 
  setCollapse, 
  toggleMobile, 
  setMobileOpen, 
  updateMenuVisibility, 
  reorderMenuItems 
} = menuSlice.actions

export default menuSlice.reducer