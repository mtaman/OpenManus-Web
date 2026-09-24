"""
SSE Event formatting and streaming generator for real-time agent output.
Compliant with AG-UI-inspired event protocol.
"""

import asyncio
import json
import logging
from typing import AsyncGenerator
from sse_starlette.sse import ServerSentEvent

import omweb.job_manager as jm_module
from omweb.models import JobEvent, JobStatus

logger = logging.getLogger("omweb.sse")

# Ping keep-alive interval in seconds
PING_INTERVAL_SECONDS = 15


async def job_event_generator(job_id: str) -> AsyncGenerator[ServerSentEvent, None]:
    """
    Subscribes to JobManager queue for a job and yields SSE formatted events.
    Sends existing historical snapshot on connect, then streams real-time updates.
    Yields a 'done' event when job reaches a terminal state.
    """
    manager = jm_module.job_manager
    job = manager.get_job(job_id)
    if not job:
        yield ServerSentEvent(
            event="error",
            data=json.dumps({"detail": f"Job {job_id} not found"}),
        )
        return

    # Register active listener queue first to prevent missing events
    queue: asyncio.Queue = manager.register_queue(job_id)

    try:
        # Yield initial snapshot event
        yield ServerSentEvent(
            event="snapshot",
            data=json.dumps({
                "job_id": job.id,
                "status": job.status.value,
                "prompt": job.prompt,
                "steps": [s.model_dump(mode="json") for s in job.steps]
            })
        )

        # If already terminal prior to connection, complete immediately
        if job.status in (JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CANCELLED):
            yield ServerSentEvent(
                event="done",
                data=json.dumps({"job_id": job_id, "status": job.status.value})
            )
            return

        while True:
            try:
                # Wait for next event from job manager or emit keep-alive ping
                event: JobEvent = await asyncio.wait_for(queue.get(), timeout=PING_INTERVAL_SECONDS)
                
                payload_json = json.dumps(event.payload, default=str)
                yield ServerSentEvent(
                    event=event.event_type,
                    data=payload_json
                )

                # Check if terminal status was broadcast
                if event.event_type == "status_change":
                    current_status = event.payload.get("status")
                    if current_status in (JobStatus.COMPLETED.value, JobStatus.FAILED.value, JobStatus.CANCELLED.value):
                        yield ServerSentEvent(
                            event="done",
                            data=json.dumps({"job_id": job_id, "status": current_status})
                        )
                        break

            except asyncio.TimeoutError:
                yield ServerSentEvent(event="ping", data="{}")

    except asyncio.CancelledError:
        logger.info(f"SSE client disconnected for job {job_id}")
    finally:
        manager.unregister_queue(job_id, queue)