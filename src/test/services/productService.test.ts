import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '../../services/api';

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

// Dynamically import services after mock is in place
const { getProducts, getProductById, getStores } = await import('../../services/productService');

describe('productService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getProducts', () => {
    it('should fetch all products', async () => {
      const mockResponse = [
        { id: 1, productName: 'Laptop', sku: 'LAP-001', price: 999.99 },
      ];
      mockedApi.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await getProducts();

      expect(mockedApi.get).toHaveBeenCalledWith('/products');
      expect(result).toBeTruthy();
    });
  });

  describe('getProductById', () => {
    it('should fetch a single product', async () => {
      const mockProduct = { id: 1, productName: 'Laptop', sku: 'LAP-001' };
      mockedApi.get.mockResolvedValueOnce({ data: mockProduct });

      const result = await getProductById('1');

      expect(mockedApi.get).toHaveBeenCalledWith('/products/1');
      expect(result).toBeTruthy();
    });

    it('should throw on error', async () => {
      mockedApi.get.mockRejectedValueOnce(new Error('Not found'));

      await expect(getProductById('999')).rejects.toThrow('Not found');
    });
  });

  describe('getStores', () => {
    it('should fetch stores from parties endpoint', async () => {
      const mockParties = [
        { id: 1, fullName: 'Main Store' },
        { id: 2, fullName: 'Branch 1' },
      ];
      mockedApi.get.mockResolvedValueOnce({ data: mockParties });

      const result = await getStores();

      expect(mockedApi.get).toHaveBeenCalledWith('/parties?role=Store');
      expect(result).toEqual([
        { value: 'Main Store', label: 'Main Store' },
        { value: 'Branch 1', label: 'Branch 1' },
      ]);
    });
  });
});
