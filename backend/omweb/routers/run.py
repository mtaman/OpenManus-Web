"""
Run router - Manages task execution and agent interactions.
"""

from fastapi import APIRouter

router = APIRouter()


@router.get("/jobs")
async def list_jobs():
    return {"jobs": []}
