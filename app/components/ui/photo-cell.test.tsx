import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { PhotoCell } from './photo-cell';

// Mock getProxiedImageUrl and PLACEHOLDER_IMAGE
vi.mock('@/utils/helpers/imageHelper', () => ({
  getProxiedImageUrl: (url: string) => `proxied-${url}`,
  PLACEHOLDER_IMAGE: '/placeholder.png',
}));

// Mock isSafeHref
vi.mock('@/lib/utils/inputSanitizer', () => ({
  isSafeHref: (href: string) => !href.startsWith('javascript:'),
}));

describe('PhotoCell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders standard placeholder image when no imageUrl is provided', () => {
    render(<PhotoCell />);
    const img = screen.getByRole('img');
    expect(img).toBeDefined();
    expect(img.getAttribute('src')).toContain('/placeholder.png');
    expect(img.getAttribute('alt')).toBe('foto');
  });

  it('renders proxied image URL when imageUrl is provided', () => {
    render(<PhotoCell imageUrl="test.png" alt="Custom Alt" />);
    const img = screen.getByRole('img');
    expect(img.getAttribute('src')).toContain('proxied-test.png');
    expect(img.getAttribute('alt')).toBe('Custom Alt');
  });

  it('updates image source when imageUrl prop changes dynamically (React 19 State Derivation)', () => {
    const { rerender } = render(<PhotoCell imageUrl="initial.png" />);
    const img = screen.getByRole('img');
    expect(img.getAttribute('src')).toContain('proxied-initial.png');

    // Rerender with a new imageUrl
    rerender(<PhotoCell imageUrl="updated.png" />);
    expect(img.getAttribute('src')).toContain('proxied-updated.png');
  });

  it('renders an anchor wrapper with accessibility focus styles when safe href is provided', () => {
    render(<PhotoCell imageUrl="test.png" href="https://example.com/full-image.jpg" />);
    const link = screen.getByRole('link');
    expect(link).toBeDefined();
    expect(link.getAttribute('href')).toBe('https://example.com/full-image.jpg');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.className).toContain('focus-visible:ring-2');
    expect(link.className).toContain('focus-visible:ring-primary');
  });

  it('reverts to placeholder image when image rendering fails (onError)', () => {
    render(<PhotoCell imageUrl="error.png" />);
    const img = screen.getByRole('img');
    expect(img.getAttribute('src')).toContain('proxied-error.png');

    // Trigger error event
    fireEvent.error(img);
    expect(img.getAttribute('src')).toContain('/placeholder.png');
  });
});
