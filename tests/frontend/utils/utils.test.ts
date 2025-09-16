import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('Utils - cn function', () => {
  it('should merge single class name', () => {
    const result = cn('text-red-500');
    expect(result).toBe('text-red-500');
  });

  it('should merge multiple class names', () => {
    const result = cn('text-red-500', 'bg-blue-200', 'p-4');
    expect(result).toBe('text-red-500 bg-blue-200 p-4');
  });

  it('should handle conditional classes', () => {
    const result = cn('base-class', true && 'conditional-class', false && 'hidden-class');
    expect(result).toBe('base-class conditional-class');
  });

  it('should merge conflicting Tailwind classes correctly', () => {
    // tailwind-merge should keep the last conflicting class
    const result = cn('text-red-500', 'text-blue-500');
    expect(result).toBe('text-blue-500');
  });

  it('should handle arrays of classes', () => {
    const result = cn(['text-red-500', 'bg-blue-200'], 'p-4');
    expect(result).toBe('text-red-500 bg-blue-200 p-4');
  });

  it('should handle objects with class conditions', () => {
    const result = cn({
      'text-red-500': true,
      'bg-blue-200': false,
      'p-4': true
    });
    expect(result).toBe('text-red-500 p-4');
  });

  it('should handle mixed input types', () => {
    const result = cn(
      'base-class',
      ['array-class-1', 'array-class-2'],
      {
        'object-class-1': true,
        'object-class-2': false
      },
      true && 'conditional-class',
      null,
      undefined,
      'final-class'
    );
    expect(result).toBe('base-class array-class-1 array-class-2 object-class-1 conditional-class final-class');
  });

  it('should handle empty inputs', () => {
    const result = cn();
    expect(result).toBe('');
  });

  it('should handle null and undefined values', () => {
    const result = cn('valid-class', null, undefined, 'another-class');
    expect(result).toBe('valid-class another-class');
  });

  it('should handle empty strings', () => {
    const result = cn('', 'valid-class', '');
    expect(result).toBe('valid-class');
  });

  it('should merge Tailwind spacing classes correctly', () => {
    // Should keep the last spacing value
    const result = cn('p-2', 'p-4', 'p-6');
    expect(result).toBe('p-6');
  });

  it('should merge different Tailwind property classes', () => {
    // Should merge different properties but override same properties
    const result = cn('p-2', 'm-4', 'p-6');
    expect(result).toBe('m-4 p-6');
  });

  it('should handle responsive classes', () => {
    const result = cn('text-sm', 'md:text-lg', 'lg:text-xl');
    expect(result).toBe('text-sm md:text-lg lg:text-xl');
  });

  it('should handle pseudo-class variants', () => {
    const result = cn('bg-blue-500', 'hover:bg-blue-600', 'focus:bg-blue-700');
    expect(result).toBe('bg-blue-500 hover:bg-blue-600 focus:bg-blue-700');
  });

  it('should merge conflicting responsive classes correctly', () => {
    const result = cn('md:text-sm', 'md:text-lg');
    expect(result).toBe('md:text-lg');
  });

  it('should handle dark mode classes', () => {
    const result = cn('text-black', 'dark:text-white');
    expect(result).toBe('text-black dark:text-white');
  });

  it('should handle arbitrary values in Tailwind classes', () => {
    const result = cn('text-[14px]', 'bg-[#ff0000]');
    expect(result).toBe('text-[14px] bg-[#ff0000]');
  });

  it('should handle negative values', () => {
    const result = cn('mt-4', '-mt-2');
    expect(result).toBe('-mt-2');
  });

  it('should handle important modifier', () => {
    const result = cn('!text-red-500', 'text-blue-500');
    expect(result).toBe('!text-red-500 text-blue-500');
  });

  it('should merge complex class combinations', () => {
    const isActive = true;
    const isDisabled = false;
    const size = 'large';

    const result = cn(
      'base-button',
      'px-4 py-2',
      'rounded-md',
      'transition-colors',
      {
        'bg-blue-500 text-white': isActive,
        'bg-gray-300 text-gray-500': isDisabled,
        'text-lg px-6 py-3': size === 'large',
        'text-sm px-2 py-1': size === 'small'
      },
      isActive && 'hover:bg-blue-600',
      !isDisabled && 'cursor-pointer'
    );

    expect(result).toContain('base-button');
    expect(result).toContain('bg-blue-500');
    expect(result).toContain('text-white');
    expect(result).toContain('px-6'); // Should override px-4
    expect(result).toContain('py-3'); // Should override py-2
    expect(result).toContain('hover:bg-blue-600');
    expect(result).toContain('cursor-pointer');
    expect(result).not.toContain('bg-gray-300');
    expect(result).not.toContain('px-4'); // Should be overridden
  });

  it('should handle component prop class merging pattern', () => {
    const baseClasses = 'flex items-center justify-center';
    const variantClasses = 'bg-primary text-primary-foreground';
    const userClasses = 'bg-secondary text-secondary-foreground'; // User override

    const result = cn(baseClasses, variantClasses, userClasses);

    expect(result).toContain('flex');
    expect(result).toContain('items-center');
    expect(result).toContain('justify-center');
    expect(result).toContain('bg-secondary'); // User override should win
    expect(result).toContain('text-secondary-foreground'); // User override should win
    expect(result).not.toContain('bg-primary'); // Should be overridden
    expect(result).not.toContain('text-primary-foreground'); // Should be overridden
  });

  it('should work with real component class scenarios', () => {
    // Button component example
    const buttonClasses = cn(
      'inline-flex items-center justify-center rounded-md text-sm font-medium',
      'ring-offset-background transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      'disabled:pointer-events-none disabled:opacity-50',
      'bg-primary text-primary-foreground hover:bg-primary/90', // variant
      'h-10 px-4 py-2', // size
      'custom-button-class' // user provided
    );

    expect(buttonClasses).toContain('inline-flex');
    expect(buttonClasses).toContain('bg-primary');
    expect(buttonClasses).toContain('custom-button-class');
  });
});