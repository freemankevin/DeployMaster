import { useState, useMemo } from 'react';
import Checkbox from '../Checkbox';

// Filter dropdown component
interface FilterDropdownProps {
  column: string;
  options: string[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
}

const FilterDropdown = ({ column, options, selectedValues, onChange }: FilterDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    return options.filter(opt => opt.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [options, searchTerm]);

  const handleToggle = (value: string) => {
    if (value === '(Select All)') {
      if (selectedValues.length === options.length) {
        onChange([]);
      } else {
        onChange([...options]);
      }
      return;
    }

    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter(v => v !== value));
    } else {
      onChange([...selectedValues, value]);
    }
  };

  const isAllSelected = selectedValues.length === options.length && options.length > 0;
  const hasFilter = selectedValues.length > 0 && selectedValues.length < options.length;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1 transition-colors ${
          hasFilter ? 'text-blue-600' : ''
        }`}
      >
        <span className="font-bold text-gray-700">{column}</span>
        <i className={`fa-solid fa-filter w-3 h-3 ${hasFilter ? 'text-blue-600' : 'text-gray-400'}`}></i>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-[100]"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed top-auto left-auto mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-[110] py-2" style={{ marginTop: '4px' }}>
            {/* Search box */}
            <div className="px-3 pb-2 border-b border-gray-100">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Option list */}
            <div className="max-h-48 overflow-y-auto py-1">
              <label className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer">
                <Checkbox
                  checked={isAllSelected}
                  onChange={() => handleToggle('(全选)')}
                  size="sm"
                />
                <span className="text-xs text-gray-600">(Select All)</span>
              </label>
              {filteredOptions.map((option) => (
                <label
                  key={option}
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer"
                >
                  <Checkbox
                    checked={selectedValues.includes(option)}
                    onChange={() => handleToggle(option)}
                    size="sm"
                  />
                  <span className="text-xs text-gray-700">{option}</span>
                </label>
              ))}
            </div>

            {/* Bottom buttons */}
            <div className="flex items-center justify-end gap-2 px-3 pt-2 border-t border-gray-100">
              <button
                onClick={() => {
                  onChange([]);
                  setIsOpen(false);
                }}
                className="px-3 py-1 text-xs text-gray-600 hover:text-gray-800"
              >
                Reset
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default FilterDropdown;