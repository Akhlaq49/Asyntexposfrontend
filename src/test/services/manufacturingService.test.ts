import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '../../services/api';
import {
  getBoms, getBomById, createBom, updateBom, deleteBom,
  getManufacturingOrders, createManufacturingOrder, completeManufacturingOrder,
  getSupplierLedger, getSupplierPayments, createSupplierPayment, deleteSupplierPayment,
  getSupplierBalances,
  type CreateBomPayload,
  type Bom,
  type ManufacturingOrder,
  type SupplierBalance,
} from '../../services/manufacturingService';

// Mock the api module
vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockedApi = vi.mocked(api);

describe('manufacturingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── BOM ────────────────────────────────────────────

  describe('getBoms', () => {
    it('should return list of BOMs on success', async () => {
      const mockBoms: Bom[] = [
        {
          id: 1, name: 'Laptop Assembly', finishedProductId: 1, finishedProductName: 'Laptop',
          salePrice: 500, outputQuantity: 1, laborCost: 50, overheadCost: 20, totalMaterialCost: 300,
          totalCost: 370, status: 'active', items: [], createdAt: '2026-01-01', updatedAt: '2026-01-01'
        }
      ];
      mockedApi.get.mockResolvedValueOnce({ data: mockBoms });

      const result = await getBoms();

      expect(mockedApi.get).toHaveBeenCalledWith('/manufacturing/bom');
      expect(result).toEqual(mockBoms);
      expect(result).toHaveLength(1);
    });

    it('should return empty array on error', async () => {
      mockedApi.get.mockRejectedValueOnce(new Error('Network error'));

      const result = await getBoms();

      expect(result).toEqual([]);
    });
  });

  describe('getBomById', () => {
    it('should return a single BOM', async () => {
      const mockBom: Bom = {
        id: 1, name: 'Test BOM', finishedProductId: 1, finishedProductName: 'Laptop',
        salePrice: 500, outputQuantity: 1, laborCost: 0, overheadCost: 0, totalMaterialCost: 100,
        totalCost: 100, status: 'active', items: [
          { rawMaterialId: 2, rawMaterialName: 'RAM', quantity: 2, unitCost: 45, totalCost: 90 }
        ], createdAt: '2026-01-01', updatedAt: '2026-01-01'
      };
      mockedApi.get.mockResolvedValueOnce({ data: mockBom });

      const result = await getBomById(1);

      expect(mockedApi.get).toHaveBeenCalledWith('/manufacturing/bom/1');
      expect(result).toEqual(mockBom);
      expect(result?.items).toHaveLength(1);
    });

    it('should return null on error', async () => {
      mockedApi.get.mockRejectedValueOnce(new Error('Not found'));

      const result = await getBomById(999);

      expect(result).toBeNull();
    });
  });

  describe('createBom', () => {
    it('should create a BOM and return data', async () => {
      const payload: CreateBomPayload = {
        name: 'New BOM', finishedProductName: 'Laptop', finishedProductCategory: 'Electronics', finishedProductSubCategory: 'Laptops', salePrice: 500, outputQuantity: 1,
        laborCost: 50, overheadCost: 20, status: 'active',
        items: [{ rawMaterialId: 2, quantity: 2, unitCost: 45 }]
      };
      mockedApi.post.mockResolvedValueOnce({ data: { id: 1, ...payload } });

      const result = await createBom(payload);

      expect(mockedApi.post).toHaveBeenCalledWith('/manufacturing/bom', payload);
      expect(result).toBeTruthy();
      expect(result.name).toBe('New BOM');
    });

    it('should return null on error', async () => {
      mockedApi.post.mockRejectedValueOnce(new Error('Validation error'));

      const result = await createBom({} as CreateBomPayload);

      expect(result).toBeNull();
    });
  });

  describe('updateBom', () => {
    it('should update a BOM', async () => {
      const payload: CreateBomPayload = {
        name: 'Updated BOM', finishedProductName: 'Laptop Pro', finishedProductCategory: 'Electronics', finishedProductSubCategory: 'Laptops', salePrice: 600, outputQuantity: 2,
        laborCost: 100, overheadCost: 40, status: 'active',
        items: [{ rawMaterialId: 2, quantity: 4, unitCost: 45 }]
      };
      mockedApi.put.mockResolvedValueOnce({ data: { id: 1, ...payload } });

      const result = await updateBom(1, payload);

      expect(mockedApi.put).toHaveBeenCalledWith('/manufacturing/bom/1', payload);
      expect(result).toBeTruthy();
    });
  });

  describe('deleteBom', () => {
    it('should delete a BOM', async () => {
      mockedApi.delete.mockResolvedValueOnce({ data: {} });

      const result = await deleteBom(1);

      expect(mockedApi.delete).toHaveBeenCalledWith('/manufacturing/bom/1');
      expect(result).toBeTruthy();
    });

    it('should throw on error with backend message', async () => {
      mockedApi.delete.mockRejectedValueOnce({ response: { data: { error: 'Cannot delete this BOM because it is referenced by active manufacturing orders.' } } });

      await expect(deleteBom(1)).rejects.toThrow('Cannot delete this BOM because it is referenced by active manufacturing orders.');
    });
  });

  // ─── Manufacturing Orders ──────────────────────────

  describe('getManufacturingOrders', () => {
    it('should return orders on success', async () => {
      const mockOrders: ManufacturingOrder[] = [{
        id: 1, reference: 'MO-001', bomId: 1, bomName: 'Laptop Assembly',
        finishedProductId: 1, finishedProductName: 'Laptop', quantity: 5,
        targetStoreId: 1, targetStoreName: 'Main Store',
        status: 'Draft', laborCost: 0, overheadCost: 0, totalMaterialCost: 500,
        totalCost: 500, items: [], createdAt: '2026-01-01', updatedAt: '2026-01-01'
      }];
      mockedApi.get.mockResolvedValueOnce({ data: mockOrders });

      const result = await getManufacturingOrders();

      expect(result).toEqual(mockOrders);
    });

    it('should return empty array on error', async () => {
      mockedApi.get.mockRejectedValueOnce(new Error('Error'));

      const result = await getManufacturingOrders();

      expect(result).toEqual([]);
    });
  });

  describe('completeManufacturingOrder', () => {
    it('should complete an order', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: { id: 1, status: 'Completed' } });

      const result = await completeManufacturingOrder(1);

      expect(mockedApi.post).toHaveBeenCalledWith('/manufacturing/orders/1/complete');
      expect(result).toBeTruthy();
    });

    it('should throw on error with backend message', async () => {
      mockedApi.post.mockRejectedValueOnce({ response: { data: { error: 'Insufficient stock for RAM: available 0, required 20.' } } });

      await expect(completeManufacturingOrder(1)).rejects.toThrow('Insufficient stock for RAM: available 0, required 20.');
    });
  });

  // ─── Supplier Ledger ──────────────────────────────

  describe('getSupplierLedger', () => {
    it('should return ledger entries', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: [{ id: 1, supplierId: 10, amount: 500 }] });

      const result = await getSupplierLedger();

      expect(mockedApi.get).toHaveBeenCalledWith('/manufacturing/supplier-ledger');
      expect(result).toHaveLength(1);
    });

    it('should pass supplierId parameter', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: [] });

      await getSupplierLedger(10);

      expect(mockedApi.get).toHaveBeenCalledWith('/manufacturing/supplier-ledger?supplierId=10');
    });
  });

  describe('getSupplierPayments', () => {
    it('should return payments', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: [{ id: 1, amount: 1000, paymentMethod: 'Cash' }] });

      const result = await getSupplierPayments();

      expect(result).toHaveLength(1);
    });
  });

  describe('createSupplierPayment', () => {
    it('should create a payment', async () => {
      const payload = { supplierId: 10, reference: 'PAY-001', amount: 500, paymentMethod: 'Cash' };
      mockedApi.post.mockResolvedValueOnce({ data: { id: 1, ...payload } });

      const result = await createSupplierPayment(payload);

      expect(mockedApi.post).toHaveBeenCalledWith('/manufacturing/supplier-payments', payload);
      expect(result).toBeTruthy();
    });
  });

  describe('getSupplierBalances', () => {
    it('should return supplier balances', async () => {
      const mockBalances: SupplierBalance[] = [{
        supplierId: 10, supplierName: 'ABC Electronics',
        totalPurchases: 5000, totalPayments: 3000, balance: 2000
      }];
      mockedApi.get.mockResolvedValueOnce({ data: mockBalances });

      const result = await getSupplierBalances();

      expect(mockedApi.get).toHaveBeenCalledWith('/manufacturing/supplier-balances');
      expect(result).toEqual(mockBalances);
      expect(result[0].balance).toBe(2000);
    });
  });

  describe('deleteSupplierPayment', () => {
    it('should delete a payment and return true', async () => {
      mockedApi.delete.mockResolvedValueOnce({ data: { message: 'Payment deleted and ledger reversed successfully' } });

      const result = await deleteSupplierPayment(1);

      expect(mockedApi.delete).toHaveBeenCalledWith('/manufacturing/supplier-payments/1');
      expect(result).toBe(true);
    });

    it('should throw on error with backend message', async () => {
      mockedApi.delete.mockRejectedValueOnce({ response: { data: { error: 'Payment not found' } } });

      await expect(deleteSupplierPayment(999)).rejects.toThrow('Payment not found');
    });
  });
});
