/**
 * @file Button.jsx
 * @description Polymorphic button primitive with variant + size system.
 *
 * @param {'primary'|'secondary'|'ghost'|'danger'} [variant='primary']
 * @param {'sm'|'md'|'lg'|'icon'}                 [size='md']
 * @param {boolean}                               [loading=false]
 * @param {boolean}                               [disabled=false]
 */

import clsx from 'clsx';

// ─── Style maps ───────────────────────────────────────────────────────────────

const VARIANT_CLASSES = {
   primary:   'bg-[--accent] hover:bg-[--accent-2] text-white shadow-[var(--shadow-accent)]',
   secondary: 'bg-[--surface-2] hover:bg-[--bg-4] text-[--text] border border-[--border-2]',
   ghost:     'bg-transparent hover:bg-[--surface] text-[--text-2] hover:text-[--text]',
   danger:    'bg-[--red-dim] hover:bg-red-500/20 text-[--red] border border-red-500/20',
};

const SIZE_CLASSES = {
   sm:   'h-8  px-3 text-xs  gap-1.5',
   md:   'h-10 px-4 text-sm  gap-2',
   lg:   'h-12 px-6 text-base gap-2',
   icon: 'h-9  w-9  text-sm',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function Button({
   variant  = 'primary',
   size     = 'md',
   loading  = false,
   disabled = false,
   className,
   children,
   ...rest
}) {
   const isDisabled = disabled || loading;

   return (
      <button
         disabled={isDisabled}
         className={clsx(
            'inline-flex items-center justify-center font-medium rounded-[--radius]',
            'transition-all duration-150 cursor-pointer select-none',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            VARIANT_CLASSES[variant],
            SIZE_CLASSES[size],
            className,
         )}
         style={{ fontFamily: 'var(--font-body)' }}
         {...rest}
      >
         {loading
            ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            : children
         }
      </button>
   );
}
