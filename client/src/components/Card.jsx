
export default function Card({
  children,
  className = '',
  interactive = false,
  padding = true,
  onClick,
  ...props
}) {
  const baseStyle = 'bg-white rounded-xl border border-[#E5E5E5] transition-all duration-200';
  const paddingStyle = padding ? 'p-ds-md md:p-ds-lg' : ''; // md = 16px (mobile padding), lg = 24px (desktop padding)
  const hoverStyle = interactive
    ? 'hover:shadow-[0px_4px_20px_rgba(0,0,0,0.04)] cursor-pointer active:scale-[0.995]'
    : '';

  return (
    <div
      onClick={onClick}
      className={`${baseStyle} ${paddingStyle} ${hoverStyle} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
