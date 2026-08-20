'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Icon } from '@/app/components/ui/icons';

export type TourStep = {
  title: string;
  content: string;
  icon?: string;
  /** CSS selector for the element to highlight + scroll to */
  targetSelector?: string;
  /** Where to place the modal on screen */
  modalPosition?: 'center' | 'top-left' | 'top' | 'bottom';
};

interface AppTourProps {
  steps: TourStep[];
  /** Persist tour completion state in localStorage under this key */
  storageKey?: string;
  /** Called every time the active step changes (before highlight is applied) */
  onStepChange?: (stepIndex: number) => void;
  /** Called when the tour is dismissed/finished (skip, close, finish) */
  onClose?: () => void;
  /** Additional class for the trigger button */
  btnClassName?: string;
}

const POSITION_CLASSES: Record<string, string> = {
  center: 'items-center justify-center',
  'top-left': 'items-start justify-start pt-16 sm:pt-20 pl-3 sm:pl-6',
  top: 'items-start justify-start pt-2 sm:pt-4 pl-3 sm:pl-6',
  bottom: 'items-end justify-center pb-4 sm:pb-8',
};

export default function AppTour({ steps, storageKey, onStepChange, onClose, btnClassName = '' }: AppTourProps) {
  const t = useTranslations('Tour');
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [box, setBox] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const highlightRef = useRef<HTMLElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const modalContainerRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (isOpen) {
      modalContainerRef.current?.focus();
    } else {
      triggerRef.current?.focus();
    }
  }, [isOpen]);

  /* ---- Persist dismissal in localStorage ---- */
  const persistDismiss = useCallback(() => {
    if (storageKey) {
      localStorage.setItem(storageKey, '1');
    }
  }, [storageKey]);

  /* ---- Clean highlight helper ---- */
  const removeHighlight = useCallback(() => {
    highlightRef.current = null;
    setBox(null);
  }, []);

  const updateBox = useCallback(() => {
    const target = highlightRef.current;
    if (!target) return;
    const r = target.getBoundingClientRect();
    setBox({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, []);

  /* ---- Apply highlight to current target ---- */
  const applyHighlight = useCallback(
    (selector: string) => {
      removeHighlight();

      const target = document.querySelector(selector) as HTMLElement | null;
      if (!target) return;

      highlightRef.current = target;
      updateBox();
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(updateBox, 450);
    },
    [removeHighlight, updateBox]
  );

  /* ---- Track the target while it moves (scroll/resize) ---- */
  useEffect(() => {
    window.addEventListener('scroll', updateBox, true);
    window.addEventListener('resize', updateBox);
    return () => {
      window.removeEventListener('scroll', updateBox, true);
      window.removeEventListener('resize', updateBox);
    };
  }, [updateBox]);

  /* ---- React to step changes ---- */
  useEffect(() => {
    if (!isOpen) {
      removeHighlight();
      return;
    }

    const step = steps[currentStep];
    onStepChange?.(currentStep);

    if (step.targetSelector) {
      const id = setTimeout(() => applyHighlight(step.targetSelector!), 300);
      return () => clearTimeout(id);
    } else {
      removeHighlight();
    }
  }, [currentStep, isOpen, steps, applyHighlight, removeHighlight, onStepChange]);

  /* ---- Navigation ---- */
  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      persistDismiss();
      onClose?.();
      setIsOpen(false);
      setCurrentStep(0);
    }
  }, [currentStep, steps.length, persistDismiss, onClose]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const handleSkip = useCallback(() => {
    persistDismiss();
    onClose?.();
    setIsOpen(false);
    setCurrentStep(0);
  }, [persistDismiss, onClose]);

  const dragStartRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const offsetRef = useRef({ x: 0, y: 0 });

  const handleOpen = useCallback(() => {
    offsetRef.current = { x: 0, y: 0 };
    setOffset({ x: 0, y: 0 });
    setCurrentStep(0);
    setIsOpen(true);
  }, []);

  const startDrag = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const handle = e.currentTarget as HTMLElement;
    handle.setPointerCapture(e.pointerId);
    dragStartRef.current = { x: e.clientX, y: e.clientY, ox: offsetRef.current.x, oy: offsetRef.current.y };
  }, []);

  const moveDrag = useCallback((e: React.PointerEvent) => {
    const ds = dragStartRef.current;
    if (!ds) return;
    const next = { x: ds.ox + (e.clientX - ds.x), y: ds.oy + (e.clientY - ds.y) };
    offsetRef.current = next;
    setOffset(next);
  }, []);

  const endDrag = useCallback((e: React.PointerEvent) => {
    const handle = e.currentTarget as HTMLElement;
    if (handle.hasPointerCapture(e.pointerId)) handle.releasePointerCapture(e.pointerId);
    dragStartRef.current = null;
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleSkip();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleSkip]);

  const step = steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;

  /* ---- Dynamic positioning ---- */
  const pos = step?.modalPosition || 'center';
  const overlayAlign = POSITION_CLASSES[pos] || POSITION_CLASSES.center;
  const isCompact = pos === 'top-left' || pos === 'top' || pos === 'bottom';
  const modalWidth = isCompact ? 'max-w-md w-full' : 'max-w-lg w-full';

  return (
    <>
      {/* Help Button — dibuat mencolok dengan warna warning + animasi */}
      <button
        ref={triggerRef}
        className={`btn btn-warning btn-sm gap-1.5 shadow-sm hover:shadow-md transition-all duration-200 ${btnClassName}`}
        onClick={handleOpen}
        title={t('helpHint')}
        aria-label={t('help')}
        aria-expanded={isOpen}
        aria-controls="tour-modal-container"
      >
        <Icon name="help" className="h-4 w-4" />
        <span className="hidden sm:inline">{t('help')}</span>
      </button>

      {/* Tour Overlay — no backdrop dimming so highlighted elements stay fully visible */}
      {isOpen && (
        <div className={`fixed inset-0 z-[999999] flex ${overlayAlign}`} role="dialog" aria-modal="true" aria-label={step.title}>
          {/* Invisible click-catcher for skip-on-click-outside */}
          <div className="absolute inset-0" onClick={handleSkip} />

          {/* Modal Card */}
          <div
            id="tour-modal-container"
            ref={modalContainerRef}
            tabIndex={-1}
            className={`relative bg-base-100 rounded-2xl shadow-2xl ${modalWidth} mx-3 sm:mx-4 focus:outline-none`}
            style={{
              animation: 'tourFadeIn 0.2s ease-out',
              transform: `translate(${offset.x}px, ${offset.y}px)`,
            }}
          >
            {/* Drag handle */}
            <div
              className="cursor-move select-none touch-none pt-3 pb-1 flex justify-center"
title={t('dragHint')}
              onPointerDown={startDrag}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
            >
              <span className="h-1 w-12 rounded-full bg-base-300" />
            </div>

            {/* Progress bar */}
            <div className="flex gap-1 px-6 pt-5 pb-3">
              {steps.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                    idx === currentStep
                      ? 'bg-primary'
                      : idx < currentStep
                        ? 'bg-primary/30'
                        : 'bg-base-300'
                  }`}
                />
              ))}
            </div>

            {/* Step counter */}
            <div className="px-6">
              <span className="text-xs font-medium text-base-content/40">
                {t('step')} {currentStep + 1} {t('of')} {steps.length}
              </span>
            </div>

            {/* Body */}
            <div className="px-6 py-4">
              <div className="flex items-start gap-4">
                <span className="text-3xl shrink-0 mt-0.5" aria-hidden={!step.icon}>{step.icon || '💡'}</span>
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-base-content">{step.title}</h3>
                  <p className="text-sm text-base-content/70 mt-1.5 leading-relaxed">
                    {step.content}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 pb-5 pt-3 border-t border-base-200">
              <button
                className="btn btn-ghost btn-xs text-base-content/50 hover:text-base-content/80"
                onClick={handleSkip}
                aria-label={t('close')}
              >
                {t('close')}
              </button>

              <div className="flex gap-2">
                {!isFirst && (
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={handlePrev}
                    aria-label={t('back')}
                  >
                    &larr; {t('back')}
                  </button>
                )}

                <button
                  className={`btn btn-sm ${isLast ? 'btn-success' : 'btn-primary'}`}
                  onClick={handleNext}
                  aria-label={isLast ? t('finish') : t('next')}
                >
                  {isLast ? t('finish') : t('next')}
                  {!isLast && <span className="ml-1">&rarr;</span>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Highlight box — fixed overlay, never clipped by scroll containers */}
      {box && (
        <div
          className="tour-highlight-box"
          style={{ top: box.top, left: box.left, width: box.width, height: box.height }}
        />
      )}

      {/* Global styles for highlight + animation */}
      <style jsx global>{`
        @keyframes tourFadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .tour-highlight-box {
          position: fixed;
          z-index: 1000000;
          pointer-events: none;
          border-radius: 6px;
          outline: 3px solid var(--color-primary, #3b82f6);
          outline-offset: 2px;
          animation: tourPulse 1.5s ease-in-out infinite;
        }

        @keyframes tourPulse {
          0%,
          100% {
            box-shadow:
              0 0 0 0 rgba(59, 130, 246, 0.6),
              0 0 0 0 rgba(59, 130, 246, 0.15);
          }
          50% {
            box-shadow:
              0 0 0 8px rgba(59, 130, 246, 0.35),
              0 0 0 18px rgba(59, 130, 246, 0.08);
          }
        }
      `}</style>
    </>
  );
}

