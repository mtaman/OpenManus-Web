"""
P6 Verification Script.
Tests SSE generator lifecycle: snapshot -> step -> status_change -> done.
"""

import asyncio
import sys
from pathlib import Path

import omweb.job_manager
from omweb.job_manager import JobManager
from omweb.models import JobStatus, StepType
from omweb.sse_events import job_event_generator


async def main():
    p = Path("test_sse_verify.json")
    jm = JobManager(storage_path=p)
    omweb.job_manager.job_manager = jm

    job = await jm.create_job("Verification Task")
    gen = job_event_generator(job.id)

    # 1. Verify initial snapshot
    snap = await asyncio.wait_for(gen.__anext__(), timeout=5.0)
    assert snap.event == "snapshot", f"Expected snapshot, got {snap.event}"

    async def get_next_data():
        while True:
            evt = await asyncio.wait_for(gen.__anext__(), timeout=5.0)
            if evt.event != "ping":
                return evt

    # 2. Add step and verify streaming step event
    await jm.add_step(job.id, StepType.THOUGHT, "Testing live step streaming")
    step_evt = await get_next_data()
    assert step_evt.event == "step", f"Expected step, got {step_evt.event}"

    # 3. Complete job and verify status_change + done events
    await jm.update_status(job.id, JobStatus.COMPLETED)
    status_evt = await get_next_data()
    assert status_evt.event == "status_change", f"Expected status_change, got {status_evt.event}"

    done_evt = await get_next_data()
    assert done_evt.event == "done", f"Expected done, got {done_evt.event}"

    await gen.aclose()
    p.unlink(missing_ok=True)
    Path("test_sse_verify.json.bak").unlink(missing_ok=True)
    print("SSE Generator protocol test PASSED successfully.")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as e:
        print(f"VERIFICATION FAILED: {type(e).__name__}: {e}")
        sys.exit(1)