import React, { useState, useEffect, useRef } from "react";
import { searchAddress } from "@/api/locationApi";

/**
 * Component Autocomplete cho địa chỉ với tọa độ
 * Sử dụng Nominatim OSM API
 */
const AddressAutocomplete = ({
  value,
  onChange,
  onSelectLocation,
  error,
  province,
  district,
  ward,
}) => {
  const [inputValue, setInputValue] = useState(value || "");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const wrapperRef = useRef(null);
  const debounceTimer = useRef(null);

  // Sync với prop value
  useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  // Click outside để đóng suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounce search
  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);

    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (newValue.trim().length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Debounce 500ms
    debounceTimer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await searchAddress(newValue, {
          limit: 5,
          province: province,
          district: district,
          ward: ward,
        });
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      } catch (error) {
        console.error("Error searching address:", error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 500);
  };

  // Chọn một suggestion
  const handleSelectSuggestion = (suggestion) => {
    const fullAddress = suggestion.displayName;
    setInputValue(fullAddress);
    onChange(fullAddress);
    setShowSuggestions(false);
    setSuggestions([]);
    setSelectedIndex(-1);

    // Callback với tọa độ - gọi sau khi đã update input
    if (onSelectLocation) {
      // Sử dụng setTimeout để đảm bảo state được update trước
      setTimeout(() => {
        onSelectLocation({
          address: fullAddress,
          displayName: fullAddress,
          latitude: suggestion.latitude,
          longitude: suggestion.longitude,
        });
      }, 0);
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelectSuggestion(suggestions[selectedIndex]);
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
      default:
        break;
    }
  };

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (suggestions.length > 0) setShowSuggestions(true);
        }}
        maxLength="200"
        placeholder="Nhập địa chỉ chi tiết (số nhà, tên đường...) - Tối đa 200 ký tự"
        className={`w-full border rounded-lg px-3 py-2 ${
          error ? "border-red-500" : "border-gray-300"
        } focus:outline-none focus:ring-2 focus:ring-green-500`}
      />

      {/* Loading indicator */}
      {loading && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <svg
            className="animate-spin h-5 w-5 text-gray-400"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        </div>
      )}

      {/* Error message */}
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion.placeId}
              onClick={() => handleSelectSuggestion(suggestion)}
              className={`px-4 py-3 cursor-pointer hover:bg-gray-100 ${
                index === selectedIndex ? "bg-gray-100" : ""
              } ${index !== suggestions.length - 1 ? "border-b" : ""}`}
            >
              <div className="flex items-start gap-2">
                <svg
                  className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 truncate">
                    {suggestion.displayName}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    📍 {suggestion.latitude.toFixed(6)},{" "}
                    {suggestion.longitude.toFixed(6)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No results */}
      {showSuggestions && suggestions.length === 0 && !loading && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4">
          <p className="text-sm text-gray-500 text-center">
            Không tìm thấy địa chỉ. Vui lòng thử lại.
          </p>
        </div>
      )}
    </div>
  );
};

export default AddressAutocomplete;
