'use client';

import { cn } from '@seawatts/ui/lib/utils';
import { Archive, CheckCircle, Clock, Trash2 } from 'lucide-react';
import {
  type MouseEvent,
  type ReactNode,
  type TouchEvent,
  useRef,
  useState,
} from 'react';

type SwipeAction = 'archive' | 'snooze' | 'delete' | 'done';

interface SwipeableEmailRowProps {
  children: ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftAction?: SwipeAction;
  rightAction?: SwipeAction;
  disabled?: boolean;
}

const actionConfig: Record<
  SwipeAction,
  { icon: typeof Archive; label: string; color: string; bg: string }
> = {
  archive: {
    bg: 'bg-emerald-500',
    color: 'text-white',
    icon: Archive,
    label: 'Archive',
  },
  delete: {
    bg: 'bg-red-500',
    color: 'text-white',
    icon: Trash2,
    label: 'Delete',
  },
  done: {
    bg: 'bg-blue-500',
    color: 'text-white',
    icon: CheckCircle,
    label: 'Done',
  },
  snooze: {
    bg: 'bg-amber-500',
    color: 'text-white',
    icon: Clock,
    label: 'Snooze',
  },
};

const SWIPE_THRESHOLD = 100;
const VELOCITY_THRESHOLD = 0.5;

export function SwipeableEmailRow({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftAction = 'snooze',
  rightAction = 'archive',
  disabled = false,
}: SwipeableEmailRowProps) {
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const startXRef = useRef(0);
  const startTimeRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const leftConfig = actionConfig[leftAction];
  const rightConfig = actionConfig[rightAction];
  const RightIcon = rightConfig.icon;
  const LeftIcon = leftConfig.icon;

  const handleStart = (clientX: number) => {
    if (disabled || isAnimating) return;
    setIsDragging(true);
    startXRef.current = clientX;
    startTimeRef.current = Date.now();
  };

  const handleMove = (clientX: number) => {
    if (!isDragging || disabled) return;
    const diff = clientX - startXRef.current;
    const maxSwipe = 200;
    let resistedDiff = diff;
    if (diff > maxSwipe) {
      resistedDiff = maxSwipe + (diff - maxSwipe) * 0.5;
    } else if (diff < -maxSwipe) {
      resistedDiff = -maxSwipe + (diff + maxSwipe) * 0.5;
    }
    setOffsetX(resistedDiff);
  };

  const handleEnd = () => {
    if (!isDragging || disabled) return;
    setIsDragging(false);

    const duration = Date.now() - startTimeRef.current;
    const velocity = Math.abs(offsetX) / duration;
    const shouldTrigger =
      Math.abs(offsetX) > SWIPE_THRESHOLD || velocity > VELOCITY_THRESHOLD;

    if (shouldTrigger) {
      setIsAnimating(true);
      const direction = offsetX > 0 ? 1 : -1;
      const containerWidth = containerRef.current?.offsetWidth ?? 400;

      setOffsetX(direction * containerWidth);

      setTimeout(() => {
        if (direction > 0 && onSwipeRight) {
          onSwipeRight();
        } else if (direction < 0 && onSwipeLeft) {
          onSwipeLeft();
        }
        setOffsetX(0);
        setIsAnimating(false);
      }, 200);
    } else {
      setOffsetX(0);
    }
  };

  const handleTouchStart = (e: TouchEvent) =>
    handleStart(e.touches[0]?.clientX ?? 0);
  const handleTouchMove = (e: TouchEvent) =>
    handleMove(e.touches[0]?.clientX ?? 0);
  const handleTouchEnd = () => handleEnd();
  const handleMouseDown = (e: MouseEvent) => handleStart(e.clientX);
  const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX);
  const handleMouseUp = () => handleEnd();
  const handleMouseLeave = () => {
    if (isDragging) handleEnd();
  };

  const actionOpacity = Math.min(Math.abs(offsetX) / SWIPE_THRESHOLD, 1);
  const iconScale = 0.8 + actionOpacity * 0.4;
  const rightActionWidth = offsetX > 0 ? offsetX : 0;
  const leftActionWidth = offsetX < 0 ? Math.abs(offsetX) : 0;
  const showRightAction = offsetX > 0;
  const showLeftAction = offsetX < 0;

  return (
    <div
      className="relative overflow-hidden"
      onMouseDown={handleMouseDown}
      onMouseLeave={handleMouseLeave}
      onMouseMove={isDragging ? handleMouseMove : undefined}
      onMouseUp={handleMouseUp}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
      onTouchStart={handleTouchStart}
      ref={containerRef}
    >
      {/* Right action background (shown when swiping right) */}
      <div
        className={cn(
          'absolute inset-y-0 left-0 flex items-center justify-start pl-6',
          rightConfig.bg,
        )}
        style={{
          opacity: showRightAction ? actionOpacity : 0,
          width: rightActionWidth,
        }}
      >
        <div
          className="flex items-center gap-2"
          style={{ transform: `scale(${showRightAction ? iconScale : 0.8})` }}
        >
          <RightIcon className={cn('h-6 w-6', rightConfig.color)} />
          <span className={cn('font-medium', rightConfig.color)}>
            {rightConfig.label}
          </span>
        </div>
      </div>

      {/* Left action background (shown when swiping left) */}
      <div
        className={cn(
          'absolute inset-y-0 right-0 flex items-center justify-end pr-6',
          leftConfig.bg,
        )}
        style={{
          opacity: showLeftAction ? actionOpacity : 0,
          width: leftActionWidth,
        }}
      >
        <div
          className="flex items-center gap-2"
          style={{ transform: `scale(${showLeftAction ? iconScale : 0.8})` }}
        >
          <span className={cn('font-medium', leftConfig.color)}>
            {leftConfig.label}
          </span>
          <LeftIcon className={cn('h-6 w-6', leftConfig.color)} />
        </div>
      </div>

      {/* Main content */}
      <div
        className={cn(
          'relative bg-background',
          !isDragging && !isAnimating && 'transition-transform duration-200',
        )}
        style={{
          cursor: disabled ? 'default' : 'grab',
          transform: `translateX(${offsetX}px)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
