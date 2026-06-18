
export default function Button({
  children,
  variant = 'primary',
  className = '',
  onClick,
  type = 'button',
  disabled = false,
  ...props
}) {
   const baseStyle =
    'h-10 px-ds-lg rounded-xl font-label-md transition-all active:scale-[0.98] duration-150 flex items-center justify-center gap-ds-xs cursor-pointer select-none';

  const variants = {
    primary: 'bg-[#D4AF37] hover:brightness-105 active:brightness-95 text-black font-semibold',
    secondary: 'border border-[#E5E5E5] bg-white hover:bg-surface-container-low active:bg-surface-container text-primary',
    danger: 'bg-error text-white hover:bg-error/90 active:bg-error/80 font-semibold',
  };

  const disabledStyle = 'opacity-50 cursor-not-allowed active:scale-100';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyle} ${variants[variant]} ${disabled ? disabledStyle : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
