from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional

from backend.tag_service import suggest_tags, save_tags, get_tags, get_popular_tags

router = APIRouter(prefix="/api/tags", tags=["tags"])


def require_auth(authorization: Optional[str]):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")


class SuggestTagsRequest(BaseModel):
    ticket_title: str
    ticket_body: str
    category: str = ""


class SaveTagsRequest(BaseModel):
    tags: list[str]


@router.post("/suggest")
async def suggest_tags_endpoint(
    req: SuggestTagsRequest,
    authorization: Optional[str] = Header(None)
):
    """Get AI-suggested tags for a ticket (call before saving ticket)."""
    require_auth(authorization)
    tags = suggest_tags(req.ticket_title, req.ticket_body, req.category)
    return {"success": True, "suggested_tags": tags}


@router.post("/{ticket_id}")
async def save_ticket_tags(
    ticket_id: str,
    req: SaveTagsRequest,
    authorization: Optional[str] = Header(None)
):
    """Save final accepted tags to a ticket."""
    require_auth(authorization)
    clean_tags = [tag.lower().strip().replace(" ", "-") for tag in req.tags if tag.strip()][:10]
    success = save_tags(ticket_id, clean_tags)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to save tags")
    return {"success": True, "tags": clean_tags}


@router.get("/{ticket_id}")
async def get_ticket_tags(
    ticket_id: str,
    authorization: Optional[str] = Header(None)
):
    """Get current tags for a ticket."""
    require_auth(authorization)
    tags = get_tags(ticket_id)
    return {"success": True, "tags": tags}


@router.get("/popular/{company_id}")
async def popular_tags(
    company_id: str,
    authorization: Optional[str] = Header(None)
):
    """Get top 20 most-used tags for a company (for autocomplete)."""
    require_auth(authorization)
    tags = get_popular_tags(company_id)
    return {"success": True, "popular_tags": tags}
