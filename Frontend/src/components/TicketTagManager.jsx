import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import TagChip from "./TagChip";

export default function TicketTagManager({ ticketId, ticketTitle, ticketBody, category, companyId, readOnly = false }) {
  const [suggestedTags, setSuggestedTags] = useState([]);
  const [acceptedTags, setAcceptedTags] = useState([]);
  const [dismissedTags, setDismissedTags] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [popularTags, setPopularTags] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

  async function getToken() {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token || "";
  }

  useEffect(() => {
    async function loadExistingTags() {
      if (!ticketId || readOnly) return;
      const token = await getToken();
      try {
        const res = await fetch(`${BACKEND_URL}/api/tags/${ticketId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) setAcceptedTags(data.tags || []);
      } catch (e) {
        console.error("Failed to load tags:", e);
      }
    }
    loadExistingTags();
  }, [ticketId, readOnly]);

  useEffect(() => {
    async function fetchPopularTags() {
      if (!companyId) return;
      try {
        const token = await getToken();
        const res = await fetch(`${BACKEND_URL}/api/tags/popular/${companyId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) setPopularTags(data.popular_tags || []);
      } catch (e) {
        console.error("Failed to fetch popular tags:", e);
      }
    }

    fetchPopularTags();
  }, [companyId]);

  async function fetchSuggestions() {
    if (!ticketTitle && !ticketBody) return;
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/tags/suggest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ticket_title: ticketTitle,
          ticket_body: ticketBody,
          category: category || "",
        }),
      });
      const data = await res.json();
      if (data.success) {
        const filtered = (data.suggested_tags || []).filter(
          (tag) => !acceptedTags.includes(tag) && !dismissedTags.includes(tag)
        );
        setSuggestedTags(filtered);
      }
    } catch (e) {
      console.error("Failed to fetch suggestions:", e);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (ticketTitle || ticketBody) {
      fetchSuggestions();
    }
  }, []);

  function acceptTag(tag) {
    if (!acceptedTags.includes(tag)) {
      setAcceptedTags((prev) => [...prev, tag]);
    }
    setSuggestedTags((prev) => prev.filter((currentTag) => currentTag !== tag));
  }

  function dismissTag(tag) {
    setDismissedTags((prev) => [...prev, tag]);
    setSuggestedTags((prev) => prev.filter((currentTag) => currentTag !== tag));
  }

  function removeAcceptedTag(tag) {
    setAcceptedTags((prev) => prev.filter((currentTag) => currentTag !== tag));
  }

  function handleInputKeyDown(e) {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      const newTag = inputValue.trim().toLowerCase().replace(/\s+/g, "-");
      if (!acceptedTags.includes(newTag)) {
        setAcceptedTags((prev) => [...prev, newTag]);
      }
      setInputValue("");
      setShowSuggestions(false);
    }
  }

  const filteredPopular = popularTags
    .map((item) => item.tag)
    .filter(
      (tag) =>
        tag.includes(inputValue.toLowerCase()) &&
        !acceptedTags.includes(tag) &&
        inputValue.length > 0
    )
    .slice(0, 5);

  async function saveTags() {
    if (!ticketId) return;
    setSaving(true);
    setSaved(false);
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/tags/${ticketId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tags: acceptedTags }),
      });
      const data = await res.json();
      if (data.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (e) {
      console.error("Failed to save tags:", e);
    }
    setSaving(false);
  }

  if (readOnly) {
    return (
      <div className="flex flex-wrap gap-2">
        {acceptedTags.length > 0
          ? acceptedTags.map((tag) => <TagChip key={tag} tag={tag} />)
          : <span className="text-xs text-gray-400">No tags</span>
        }
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {(loading || suggestedTags.length > 0) && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
            🤖 AI Suggested Tags
            {loading && (
              <span className="ml-1 inline-block w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestedTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border bg-amber-50 text-amber-700 border-amber-200"
              >
                #{tag}
                <button
                  onClick={() => acceptTag(tag)}
                  className="ml-1 text-green-600 hover:text-green-800 font-bold"
                  title="Accept"
                >
                  ✓
                </button>
                <button
                  onClick={() => dismissTag(tag)}
                  className="text-red-400 hover:text-red-600"
                  title="Dismiss"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-xs font-medium text-gray-500 mb-2">✅ Applied Tags</p>
        <div className="flex flex-wrap gap-2 min-h-[28px]">
          {acceptedTags.length > 0
            ? acceptedTags.map((tag) => (
                <TagChip key={tag} tag={tag} onRemove={removeAcceptedTag} variant="success" />
              ))
            : <span className="text-xs text-gray-400 italic">No tags yet — accept suggestions or type below</span>
          }
        </div>
      </div>

      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowSuggestions(true);
          }}
          onKeyDown={handleInputKeyDown}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder="Type a custom tag and press Enter..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        {showSuggestions && filteredPopular.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
            {filteredPopular.map((tag) => (
              <button
                key={tag}
                onMouseDown={() => {
                  if (!acceptedTags.includes(tag)) {
                    setAcceptedTags((prev) => [...prev, tag]);
                  }
                  setInputValue("");
                  setShowSuggestions(false);
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 text-gray-700"
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
        <p className="text-xs text-gray-400 mt-1">Press Enter to add. Spaces become hyphens automatically.</p>
      </div>

      <button
        onClick={saveTags}
        disabled={saving}
        className="w-full bg-indigo-600 text-white text-sm font-medium py-2 px-4 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
      >
        {saving ? "Saving..." : saved ? "✅ Tags Saved!" : "Save Tags"}
      </button>
    </div>
  );
}
