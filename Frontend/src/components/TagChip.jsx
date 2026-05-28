export default function TagChip({ tag, onRemove, variant = "default" }) {
  const colors = {
    default: "bg-indigo-50 text-indigo-700 border-indigo-200",
    suggested: "bg-amber-50 text-amber-700 border-amber-200",
    success: "bg-green-50 text-green-700 border-green-200",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors[variant]}`}
    >
      #{tag}
      {onRemove && (
        <button
          onClick={() => onRemove(tag)}
          className="ml-1 hover:opacity-70 transition-opacity text-xs leading-none"
        >
          ✕
        </button>
      )}
    </span>
  );
}
