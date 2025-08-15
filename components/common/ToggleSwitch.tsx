
import React from 'react';

interface ToggleSwitchProps {
  id: string;
  label: string;
  isChecked: boolean;
  onChange: (isChecked: boolean) => void;
  disabled?: boolean;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ id, label, isChecked, onChange, disabled = false }) => {
  const handleToggle = () => {
    if (!disabled) {
      onChange(!isChecked);
    }
  };

  return (
    <div className={`flex items-center justify-between ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`} onClick={handleToggle}>
      <label htmlFor={id} className={`text-sm font-medium ${disabled ? 'text-slate-500' : 'text-slate-200'}`}>
        {label}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={isChecked}
        onClick={handleToggle}
        disabled={disabled}
        className={`${isChecked ? 'bg-teal-500' : 'bg-slate-600'}
          relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent 
          transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2
          focus:ring-offset-slate-800 disabled:cursor-not-allowed`}
      >
        <span className="sr-only">Use setting</span>
        <span
          aria-hidden="true"
          className={`${isChecked ? 'translate-x-5' : 'translate-x-0'}
            pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 
            transition duration-200 ease-in-out`}
        />
      </button>
    </div>
  );
};

export default ToggleSwitch;
