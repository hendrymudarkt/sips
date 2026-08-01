'use client';

import Image from 'next/image';
import { useState, memo } from 'react';
import { getProxiedImageUrl, PLACEHOLDER_IMAGE } from '@/utils/helpers/imageHelper';
import { isSafeHref } from '@/lib/utils/inputSanitizer';

interface PhotoCellProps {
  imageUrl?: string | null;
  alt?: string;
  href?: string;
  size?: number;
}

export const PhotoCell = memo(function PhotoCell({
  imageUrl,
  alt = 'foto',
  href,
  size = 40,
}: PhotoCellProps) {
  const [prevImageUrl, setPrevImageUrl] = useState<string | null | undefined>(imageUrl);
  const [imgSrc, setImgSrc] = useState<string>(
    imageUrl ? getProxiedImageUrl(imageUrl) : PLACEHOLDER_IMAGE
  );

  // React 19 State Derivation: Updates image state instantly when prop changes
  if (imageUrl !== prevImageUrl) {
    setPrevImageUrl(imageUrl);
    setImgSrc(imageUrl ? getProxiedImageUrl(imageUrl) : PLACEHOLDER_IMAGE);
  }

  const content = (
    <div
      className="relative rounded-lg ring-1 ring-base-300 bg-base-200 overflow-hidden"
      style={{ width: size, height: size }}
    >
      <Image
        src={imgSrc}
        alt={alt}
        fill
        className="object-cover"
        loading="lazy"
        onError={() => setImgSrc(PLACEHOLDER_IMAGE)}
        unoptimized
      />
    </div>
  );

  if (href && isSafeHref(href)) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        title={alt}
        className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-shadow duration-200 inline-block"
      >
        {content}
      </a>
    );
  }

  return content;
});

PhotoCell.displayName = 'PhotoCell';
