import { describe, it, expect } from 'vitest';
import { isValidNik } from './useVehicleRentData';

describe('isValidNik', () => {
  it('accepts a structurally valid NIK', () => {
    expect(isValidNik('3171011708450001')).toBe(true);
  });
  it('accepts female day (day +40)', () => {
    expect(isValidNik('3204076508850001')).toBe(true);
  });
  it('rejects wrong length', () => {
    expect(isValidNik('31710117084500')).toBe(false);
  });
  it('rejects non-digits', () => {
    expect(isValidNik('317101170845000A')).toBe(false);
  });
  it('rejects invalid province', () => {
    expect(isValidNik('9971011708450001')).toBe(false);
  });
  it('rejects invalid date', () => {
    expect(isValidNik('3171023102850001')).toBe(false);
  });
  it('rejects serial 0000', () => {
    expect(isValidNik('3171011708450000')).toBe(false);
  });
});
