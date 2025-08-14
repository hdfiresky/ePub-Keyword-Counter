import React from 'react';

interface KeywordInputProps {
  keywords: string;
  onKeywordsChange: (keywords: string) => void;
}

export const KeywordInput: React.FC<KeywordInputProps> = ({ keywords, onKeywordsChange }) => {
  return (
    <div className="w-full">
      <label htmlFor="keywords" className="block text-sm font-medium text-gray-700 mb-1">
        Keywords (comma-separated)
      </label>
      <input
        type="text"
        id="keywords"
        value={keywords}
        onChange={(e) => onKeywordsChange(e.target.value)}
        placeholder="e.g. magic, wom*n"
        className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
      />
      <p className="mt-1 text-xs text-gray-500">
        <b>Search Rules:</b> All searches are prefix-based (e.g., `magic` finds `magical`). Use `*` to replace a single character (e.g., `wom*n` finds `woman` and `women`).
      </p>
    </div>
  );
};