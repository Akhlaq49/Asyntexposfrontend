import { describe, it, expect } from 'vitest';
import { mediaUrl } from '../../services/api';

describe('api utilities', () => {
  describe('mediaUrl', () => {
    it('should return default image for null/undefined', () => {
      expect(mediaUrl(null)).toContain('stock-img-01.png');
      expect(mediaUrl(undefined)).toContain('stock-img-01.png');
      expect(mediaUrl('')).toContain('stock-img-01.png');
    });

    it('should return absolute URLs unchanged', () => {
      expect(mediaUrl('https://example.com/image.jpg')).toBe('https://example.com/image.jpg');
      expect(mediaUrl('http://example.com/image.jpg')).toBe('http://example.com/image.jpg');
    });

    it('should return data URLs unchanged', () => {
      expect(mediaUrl('data:image/png;base64,abc')).toBe('data:image/png;base64,abc');
    });

    it('should prefix relative paths with base URL', () => {
      const result = mediaUrl('/uploads/products/test.jpg');
      expect(result).toContain('/uploads/products/test.jpg');
    });
  });
});
