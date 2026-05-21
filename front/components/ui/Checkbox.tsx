// UI Checkbox component

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Checkbox = ({ label, error, className, ...props }: CheckboxProps) => {
  return (
    <div className="flex items-center gap-2">
      <input
        type="checkbox"
        {...props}
        className={`
          w-4 h-4 border border-gray-300 rounded
          focus:outline-none focus:border-blue-500
          cursor-pointer
          ${className || ''}
        `}
      />
      {label && (
        <label className="text-sm text-gray-700 cursor-pointer">
          {label}
        </label>
      )}
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
};
