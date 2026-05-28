import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import TagChip from "./TagChip";

export default function TagFilter({ companyId, onFilterChange }) {
  const [popularTags, setPopularTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

  useEffect(() => {
    async function fetchPopularTags() {
      if (!companyId) return;
      try {
        const { data } = await supabase.auth.getSession();
        const token = data?.session?.access_token || "";
        const res = await fetch(`${BACKEND_URL}/api/tags/popular/${companyId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await res.json();
        if (result.success) setPopularTags(result.popular_tags || []);
      } catch (e) {
        console.error("Failed to fetch popular tags:", e);
      }
    }
    fetchPopularTags();
  }, [companyId]);

  function toggleTag(tag) {
    const updated = selectedTags.includes(tag)
      ? selectedTags.filter((currentTag) => currentTag !== tag)
      : [...selectedTags, tag];
    setSelectedTags(updated);
    onFilterChange(updated);
  }

  function clearAll() {
    setSelectedTags([]);
    onFilterChange([]);
  }

  if (popularTags.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-gray-700">🏷️ Filter by Tag</p>
        {selectedTags.length > 0 && (
          <button onClick={clearAll} className="text-xs text-indigo-500 hover:underline">
            Clear all
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {popularTags.map(({ tag, count }) => (
          <button
            key={tag}
            onClick={() => toggleTag(tag)}
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors ${
              selectedTags.includes(tag)
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-gray-50 text-gray-600 border-gray-200 hover:border-indigo-300"
            }`}
          >
            #{tag}
            <span className="opacity-60">({count})</span>
          </button>
        ))}
      </div>
    </div>
  );
}
