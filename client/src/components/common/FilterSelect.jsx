import { ChevronDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const FilterSelect = ({
  label,
  value,
  options,
  onChange,
  className = "",
}) => (
  <div className={`relative w-full ${className}`}>
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="!h-12 !w-full rounded-lg border border-gray-200 bg-white px-4 pr-10 pt-4 text-left text-base font-bold text-gray-900 shadow-none outline-none focus:border-[#34ad54] focus:ring-0 focus-visible:ring-0 [&>svg]:hidden">
        <SelectValue />
      </SelectTrigger>
      <SelectContent
        position="popper"
        sideOffset={3}
        className="min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-2xl border border-gray-100 bg-white p-0 text-[#101b3d] shadow-lg [&_[data-radix-select-viewport]]:p-0"
      >
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            className="min-h-9 cursor-pointer rounded-none px-5 py-2 text-base font-semibold text-[#101b3d] focus:bg-[#eef0f5] focus:text-[#101b3d] data-[state=checked]:bg-[#eef0f5] data-[state=checked]:text-[#1b2a6b] [&>span:first-child]:hidden"
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    <div className="pointer-events-none absolute left-4 top-1 text-xs font-medium text-gray-500">
      {label}
    </div>
    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-900" />
  </div>
);

export default FilterSelect;
