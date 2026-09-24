"""
Files router - Manages workspace artifacts and file inspection.
"""

from fastapi import APIRouter

router = APIRouter()


@router.get("")
async def list_files():
    return {"files": []}
