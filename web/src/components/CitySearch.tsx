"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Fuse from "fuse.js";
import { CityData } from "@/types";

interface CitySearchProps {
  cities: CityData[];
}

export default function CitySearch({ cities }: CitySearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CityData[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Initialize Fuse instance with cities data
  const fuse = new Fuse(cities, {
    keys: ["name", "state", "state_code", "display_name", "zip_codes"],
    threshold: 0.3,
    includeScore: true,
  });

  // Handle search input changes
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    if (value.length > 1) {
      const searchResults = fuse.search(value).map((result) => result.item);
      setResults(searchResults.slice(0, 5)); // Limit to top 5 results
      setIsOpen(true);
    } else {
      setResults([]);
      setIsOpen(false);
    }
  };

  // Close search results when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
    } else if (e.key === "Enter" && results.length > 0) {
      // Navigate to first result
      router.push(`/city/${results[0].slug}`);
      setIsOpen(false);
      setQuery("");
    }
  };

  return (
    <div ref={searchRef} className="relative w-full max-w-md">
      <div className="relative">
        <input
          type="text"
          placeholder="Search for a city..."
          value={query}
          onChange={handleSearch}
          onKeyDown={handleKeyDown}
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          aria-label="Search for a city"
        />
        {query.length > 0 && (
          <button
            onClick={() => {
              setQuery("");
              setResults([]);
              setIsOpen(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none"
            aria-label="Clear search"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5 text-gray-500 dark:text-gray-400"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border rounded-lg shadow-lg dark:border-gray-700 max-h-60 overflow-auto">
          <ul className="py-1">
            {results.map((city) => (
              <li key={city.id}>
                <Link
                  href={`/city/${city.slug}`}
                  className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
                  onClick={() => {
                    setIsOpen(false);
                    setQuery("");
                  }}
                >
                  {city.display_name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {isOpen && query.length > 1 && results.length === 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border rounded-lg shadow-lg dark:border-gray-700">
          <div className="px-4 py-3 text-gray-700 dark:text-gray-300">
            No cities found matching &quot;{query}&quot;
          </div>
        </div>
      )}
    </div>
  );
}
