/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCascadingPicker } from './useCascadingPicker';
import { useQuery } from '@tanstack/react-query';

// Mock react-query
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
}));

// Mock the API service functions so they don't get called or fail
vi.mock('@/utils/services/masterDataService', () => ({
  fetchSections: vi.fn(),
  fetchGangs: vi.fn(),
}));

vi.mock('@/utils/services/businessUnitService', () => ({
  fetchBusinessUnits: vi.fn(),
}));

describe('useCascadingPicker', () => {
  let mockBusinessUnits: any[] | undefined = undefined;
  let mockSections: any[] | undefined = undefined;
  let mockGangs: any[] | undefined = undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    mockBusinessUnits = undefined;
    mockSections = undefined;
    mockGangs = undefined;

    // Dynamically resolve mock returns based on the queryKey
    vi.mocked(useQuery).mockImplementation((options: any) => {
      const queryKey = options.queryKey;
      if (queryKey[0] === 'business-units') {
        return { data: mockBusinessUnits, isLoading: false } as any;
      }
      if (queryKey[0] === 'sections') {
        return { data: mockSections, isLoading: false } as any;
      }
      if (queryKey[0] === 'gangs') {
        return { data: mockGangs, isLoading: false } as any;
      }
      return { data: undefined, isLoading: false } as any;
    });
  });

  it('should return empty options when all queries return undefined', () => {
    const { result } = renderHook(() => useCascadingPicker());

    expect(result.current.fcbaOptions).toEqual([]);
    expect(result.current.sectionOptions).toEqual([]);
    expect(result.current.gangOptions).toEqual([]);
    expect(result.current.kemandoranOptions).toEqual([]);
  });

  it('should correctly filter, deduplicate and format fcbaOptions', () => {
    mockBusinessUnits = [
      { fccode: 'EST1', fcba: 'BU1' },
      { fccode: 'EST2', fcba: 'BU1' }, // duplicate fcba
      { fccode: 'EST3', fcba: 'BU2' },
      { fccode: 'BU3' }, // fallback to fccode
      { fccode: '', fcba: '' }, // empty, should be filtered
    ];

    const { result } = renderHook(() => useCascadingPicker());

    expect(result.current.fcbaOptions).toEqual([
      { value: 'BU1', label: 'BU1' },
      { value: 'BU2', label: 'BU2' },
      { value: 'BU3', label: 'BU3' },
    ]);
  });

  it('should format section options correctly', () => {
    mockSections = [
      { fccode: 'SEC1', fcname: 'Section One' },
      { fccode: 'SEC2', fcname: 'SEC2' }, // fcname is same as fccode
      { fccode: 'SEC3', fcname: '' }, // empty name
    ];

    const { result } = renderHook(() => useCascadingPicker('BU1'));

    expect(result.current.sectionOptions).toEqual([
      { value: 'SEC1', label: 'SEC1 - Section One' },
      { value: 'SEC2', label: 'SEC2' },
      { value: 'SEC3', label: 'SEC3' },
    ]);
  });

  it('should format gang options correctly', () => {
    mockGangs = [
      { fccode: 'G1', fcname: 'Gang 1' },
      { fccode: 'G2', fcname: 'G2' },
    ];

    const { result } = renderHook(() => useCascadingPicker('BU1', 'SEC1'));

    expect(result.current.gangOptions).toEqual([
      { value: 'G1', label: 'G1 - Gang 1' },
      { value: 'G2', label: 'G2' },
    ]);
  });

  it('should filter, deduplicate, and format kemandoranOptions starting with MD', () => {
    mockGangs = [
      { fccode: 'G1', kemandoran: 'MD_MEMBER1' },
      { fccode: 'G2', kemandoran: 'MD_MEMBER1' }, // duplicate
      { fccode: 'G3', kemandoran: 'MDP_MEMBER' }, // starts with MD
      { fccode: 'G4', kemandoran: 'OTHER_MEMBER' }, // does not start with MD
    ];

    const { result } = renderHook(() => useCascadingPicker('BU1', 'SEC1'));

    expect(result.current.kemandoranOptions).toEqual([
      { value: 'MD_MEMBER1', label: 'MD_MEMBER1' },
      { value: 'MDP_MEMBER', label: 'MDP_MEMBER' },
    ]);
  });
});
