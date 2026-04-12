import clsx from "clsx";
import { forwardRef } from "react";

const Select = forwardRef(function Select({ label, error, children, className, ...props }, ref) {
   return (
      <div className="flex flex-col gap-1.5">
         {label && (
            <label className="text-xs font-semibold text-[--text-2] uppercase tracking-wider">
               {label}
            </label>
         )}
         <select
            ref={ref}
            className={clsx(
               "w-full h-10 px-3 rounded-[--radius] appearance-none",
               "bg-[--bg-3] border text-[--text] text-sm cursor-pointer",
               "transition-all duration-150 outline-none",
               error
                  ? "border-[--red] focus:border-[--red]"
                  : "border-[--border] focus:border-[--accent] focus:ring-1 focus:ring-[--accent-glow]",
               className,
            )}
            style={{ fontFamily: "var(--font-body)" }}
            {...props}
         >
            {children}
         </select>
         {error && <p className="text-xs text-[--red]">{error}</p>}
      </div>
   );
});

export default Select;
