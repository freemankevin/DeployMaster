import { useState, useMemo } from 'react';
import { Filter } from 'lucide-react';
import Checkbox from '../Checkbox';

// Filter dropdown component - Dark Mode
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
          hasFilter ? 'text-macos-blue' : ''
        }`}
      >
        <span className="font-bold text-text-secondary">{column}</span>
        <Filter className={`w-3 h-3 ${hasFilter ? 'text-macos-blue' : 'text-text-tertiary'}`} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-[100]"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed top-auto left-auto mt-1 w-48 bg-background-secondary rounded-lg shadow-macos-dropdown border border-border-primary z-[110] py-2" style={{ marginTop: '4px' }}>
            {/* Search box */}
            <div className="px-3 pb-2 border-b border-border-secondary">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className="w-full text-xs bg-background-tertiary border border-border-primary rounded px-2 py-1 focus:outline-none focus:border-macos-blue text-white placeholder-text-tertiary"
              />
            </div>

            {/* Option list */}
            <div className="max-h-48 overflow-y-auto py-1 scrollbar-custom">
              <label className="flex items-center gap-2 px-3 py-1.5 hover:bg-background-tertiary cursor-pointer">
                <Checkbox
                  checked={isAllSelected}
                  onChange={() => handleToggle('(Select All)')}
                  size="sm"
                />
                <span className="text-xs text-text-secondary">(Select All)</span>
              </label>
              {filteredOptions.map((option) => (
                <label
                  key={option}
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-background-tertiary cursor-pointer"
                >
                  <Checkbox
                    checked={selectedValues.includes(option)}
                    onChange={() => handleToggle(option)}
                    size="sm"
                  />
                  <span className="text-xs text-white">{option}</span>
                </label>
              ))}
            </div>

            {/* Bottom buttons */}
            <div className="flex items-center justify-end gap-2 px-3 pt-2 border-t border-border-secondary">
              <button
                onClick={() => {
                  onChange([]);
                  setIsOpen(false);
                }}
                className="px-3 py-1 text-xs text-text-secondary hover:text-white"
              >
                Reset
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="px-3 py-1 text-xs bg-macos-blue text-white rounded hover:brightness-110"
              >
                OK
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default FilterDropdown;