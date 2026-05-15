import clsx from 'clsx';
import { forwardRef } from 'react';

const Input = forwardRef(function Input({ label, error, hint, className, ...props }, ref) {
   return (
      <div className="flex flex-col gap-1.5">
         {label && (
            <label className="text-xs font-semibold text-[--text-2] uppercase tracking-wider">
               {label}
            </label>
         )}
         <input
            ref={ref}
            className={clsx(
               'w-full h-10 px-3 rounded-[--radius]',
               'bg-[--bg-3] border text-[--text] text-sm',
               'placeholder:text-[--text-3] transition-all duration-150',
               error
                  ? 'border-[--red] focus:border-[--red] focus:ring-1 focus:ring-red-500/30'
                  : 'border-[--border] focus:border-[--accent] focus:ring-1 focus:ring-[--accent-glow]',
               'outline-none',
               className,
            )}
            style={{ fontFamily: 'var(--font-body)' }}
            {...props}
         />
         {error && <p className="text-xs text-[--red]">{error}</p>}
         {hint && !error && <p className="text-xs text-[--text-3]">{hint}</p>}
      </div>
   );
});

export default Input;
