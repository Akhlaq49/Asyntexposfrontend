# ReactPOS - Point of Sale Management System

A modern, React-based Point of Sale (POS) system with configurable menus, comprehensive inventory management, and real-time sales tracking.

## 🚀 Features

### Core Functionality
- **Dashboard** - Comprehensive analytics and sales overview
- **Inventory Management** - Products, categories, stock management, and alerts
- **Point of Sale** - Modern POS interface with cart management
- **Sales Management** - Orders, invoices, returns, and quotations
- **People Management** - Customers, suppliers, and employee management
- **Financial Tracking** - Reports, analytics, and business insights
- **Configurable Menus** - Show/hide menu items via settings

### Technical Features
- **Responsive Design** - Works on desktop, tablet, and mobile devices
- **Real-time Updates** - Live inventory and sales data
- **State Management** - Redux Toolkit for predictable state management
- **Theme Support** - Light/dark mode functionality
- **API Integration** - Fake endpoints for demonstration with real API structure
- **TypeScript** - Full type safety and better development experience

## 🛠 Technology Stack

- **Frontend**: React 18 with TypeScript
- **State Management**: Redux Toolkit
- **UI Framework**: Material-UI (MUI)  
- **Routing**: React Router v6
- **Build Tool**: Vite
- **Styling**: Emotion (Built into MUI)
- **Icons**: Tabler Icons
- **Charts**: Recharts
- **Forms**: React Hook Form
- **Date Handling**: Day.js

## 📦 Installation

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Setup Steps

1. **Clone or download the project**
   ```bash
   # The project is already set up in this workspace
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Build for production**
   ```bash
   npm run build
   ```

5. **Preview production build**
   ```bash
   npm run preview
   ```

## 🎯 Quick Start

### Running the Application

1. **Development Mode**
   ```bash
   npm run dev
   ```
   - Opens at `http://localhost:3000`
   - Hot reload enabled for development

2. **Production Build**
   ```bash
   npm run build
   npm run preview
   ```

### Default Credentials
- **User**: Admin (Auto-logged in for demo)
- **Role**: System Administrator

## 🏗 Project Structure

```
src/
├── components/          # Reusable UI components
│   └── layout/         # Layout components (Sidebar, Header)
├── pages/              # Page components
│   ├── inventory/      # Inventory management pages
│   ├── sales/          # Sales and POS pages
│   ├── people/         # Customer/supplier management
│   ├── hrm/           # Human resource management
│   └── reports/        # Reporting and analytics
├── store/              # Redux store and slices
│   └── slices/        # Feature-specific state slices
├── services/          # API service layer (placeholder)
├── hooks/             # Custom React hooks (placeholder)
├── types/             # TypeScript type definitions (placeholder)
├── utils/             # Utility functions (placeholder)
└── assets/            # Static assets (placeholder)
```

## 🎨 Menu Configuration

The application features a **configurable menu system**:

1. **Access Settings**: Navigate to Settings page via sidebar
2. **Menu Configuration Section**: Toggle menu items on/off
3. **Hierarchical Control**: Parent and child menu items can be configured independently
4. **Real-time Updates**: Changes apply immediately without page reload

### Available Menu Sections
- Dashboard & Analytics
- Inventory Management (Products, Categories, Stock)
- Sales (POS, Orders, Returns)
- People (Customers, Suppliers)
- Human Resources (Employees, Payroll)
- Reports & Analytics
- System Settings

## 📊 Key Components

### Dashboard
- Real-time sales metrics
- Interactive charts and graphs  
- Recent orders and alerts
- Quick action buttons

### POS System
- Product search and selection
- Shopping cart management
- Multiple payment methods
- Receipt generation

### Inventory Management
- Product catalog with images
- Category management
- Stock level monitoring
- Low stock alerts
- Barcode support

### Sales Management  
- Order processing
- Invoice generation
- Sales reporting
- Return management

## 🔌 API Integration

The application is structured for easy API integration:

### Mock Data Structure
Currently uses static data in Redux slices that mirrors expected API responses:

```typescript
// Example API endpoints structure
/api/products          # GET, POST, PUT, DELETE
/api/categories        # GET, POST, PUT, DELETE  
/api/sales            # GET, POST
/api/customers        # GET, POST, PUT, DELETE
/api/dashboard/stats  # GET
```

### Adding Real APIs
1. Create service functions in `src/services/`
2. Replace mock data in Redux slices with API calls
3. Add error handling and loading states
4. Update components to handle async operations

## 🎛 Configuration Options

### Environment Variables
Create a `.env` file in the root directory:

```env
VITE_API_URL=https://your-api-endpoint.com
VITE_APP_NAME=ReactPOS
VITE_VERSION=1.0.0
```

### Theme Customization
Modify the theme in `src/main.tsx`:

```typescript
const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    secondary: { main: '#dc004e' },
  },
  // Add custom theme options
})
```

## 🧪 Testing

```bash
# Run tests
npm run test

# Run tests with coverage
npm run test:coverage
```

## 🚀 Deployment

### Build Optimization
The production build is optimized for:
- Code splitting
- Tree shaking
- Asset compression
- Source maps for debugging

### Deployment Options
- **Vercel**: `npm run build` and deploy `/dist` folder
- **Netlify**: Connect repository and set build command to `npm run build`
- **Static Hosting**: Upload `/dist` folder contents after build

## 📝 Development Guidelines

### Code Standards
- Use TypeScript for all components
- Follow React best practices
- Implement proper error boundaries
- Add PropTypes or TypeScript interfaces
- Write unit tests for critical components

### State Management
- Use Redux Toolkit for complex state
- Local component state for UI-only data
- Async operations handled in Redux with proper loading/error states

### Component Structure
```typescript
import React from 'react'
import { useSelector, useDispatch } from 'react-redux'
import type { RootState } from '@store/index'

interface ComponentProps {
  // Define prop types
}

const Component: React.FC<ComponentProps> = ({ props }) => {
  // Component logic
  return (
    // JSX
  )
}

export default Component
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)  
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆥 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review existing issues and discussions

## 🔄 Version History

- **v1.0.0** - Initial release with core POS functionality
- **v0.9.0** - Beta release with inventory management
- **v0.8.0** - Alpha release with dashboard and basic navigation

---

**Built with ❤️ using React, TypeScript, and Material-UI**