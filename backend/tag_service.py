import json
import os

import google.generativeai as genai
from supabase import create_client

_gemini_api_key = os.getenv("GEMINI_API_KEY")
if _gemini_api_key:
    genai.configure(api_key=_gemini_api_key)

_supabase_url = os.getenv("SUPABASE_URL")
_supabase_service_key = os.getenv("SUPABASE_SERVICE_KEY")
try:
    supabase = create_client(_supabase_url, _supabase_service_key) if _supabase_url and _supabase_service_key else None
except Exception as e:
    print(f"[tag_service] Supabase initialization failed: {e}")
    supabase = None


def suggest_tags(ticket_title: str, ticket_body: str, category: str = "") -> list[str]:
    """
    Use Gemini to suggest 2-4 operational tags for a ticket.
    Returns a list of lowercase hyphenated strings.
    Falls back to empty list on any error.
    """
    try:
        model = genai.GenerativeModel("gemini-pro")
        prompt = f"""You are an IT helpdesk assistant. Given this support ticket, suggest 2-4 short operational tags.

Rules:
- Lowercase and hyphenated only (e.g. "needs-escalation", "vpn-issue")
- Focus on operational state OR technical topic
- Return ONLY a valid JSON array of strings, nothing else
- No explanations, no markdown, no backticks

Good examples: ["needs-escalation", "vpn-issue"], ["quick-fix", "browser-issue"], ["waiting-vendor", "hardware-failure"]

Ticket Category: {category}
Ticket Title: {ticket_title}
Ticket Body: {ticket_body[:500]}

JSON array:"""

        response = model.generate_content(prompt)
        raw = response.text.strip()
        raw = raw.replace("```json", "").replace("```", "").strip()
        tags = json.loads(raw)

        if isinstance(tags, list):
            return [str(tag).lower().replace(" ", "-") for tag in tags if isinstance(tag, str)][:4]
        return []
    except Exception as e:
        print(f"[tag_service] Gemini tag suggestion failed: {e}")
        return []


def save_tags(ticket_id: str, tags: list[str]) -> bool:
    """Save tags array to Supabase tickets table."""
    if not supabase:
        print("[tag_service] Supabase client unavailable")
        return False
    try:
        supabase.table("tickets").update({"tags": tags}).eq("id", ticket_id).execute()
        return True
    except Exception as e:
        print(f"[tag_service] Failed to save tags: {e}")
        return False


def get_tags(ticket_id: str) -> list[str]:
    """Fetch tags for a specific ticket."""
    if not supabase:
        print("[tag_service] Supabase client unavailable")
        return []
    try:
        result = supabase.table("tickets").select("tags").eq("id", ticket_id).single().execute()
        return result.data.get("tags") or []
    except Exception as e:
        print(f"[tag_service] Failed to get tags: {e}")
        return []


def get_popular_tags(company_id: str, limit: int = 20) -> list[dict]:
    """
    Return top N most-used tags across a company's tickets.
    Uses Supabase's RPC function to flatten the tags array and count.
    """
    if not supabase:
        print("[tag_service] Supabase client unavailable")
        return []
    try:
        result = supabase.rpc(
            "get_popular_tags",
            {"p_company_id": company_id, "p_limit": limit},
        ).execute()
        return result.data or []
    except Exception as e:
        print(f"[tag_service] Failed to get popular tags: {e}")
        return []
