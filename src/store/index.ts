import { configureStore } from '@reduxjs/toolkit'
import authSlice from './slices/authSlice'
import menuSlice from './slices/menuSlice'
import inventorySlice from './slices/inventorySlice'  
import salesSlice from './slices/salesSlice'
import dashboardSlice from './slices/dashboardSlice'

export const store = configureStore({
  reducer: {
    auth: authSlice,
    menu: menuSlice,
    inventory: inventorySlice,
    sales: salesSlice,
    dashboard: dashboardSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch