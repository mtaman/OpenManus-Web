"""
Agent Bridge Layer.
Interfaces FastAPI backend with OpenManus (D:\\AI\\OpenManus - READ ONLY).
Instruments memory message additions to capture live steps and stream to JobManager.
"""

import asyncio
import logging
import sys
from pathlib import Path
from typing import Any, Dict, Optional

from omweb.job_manager import job_manager
from omweb.models import JobStatus, StepType

logger = logging.getLogger("omweb.agent_bridge")

# Read-only path to OpenManus root
OPENMANUS_ROOT = Path(r"D:\AI\OpenManus")


def ensure_openmanus_in_syspath() -> None:
    """Safely adds OpenManus core directory to sys.path if not present."""
    openmanus_str = str(OPENMANUS_ROOT.resolve())
    if openmanus_str not in sys.path:
        sys.path.insert(0, openmanus_str)
        logger.info(f"Appended {openmanus_str} to sys.path")


class MemoryInterceptor:
    """
    Wraps OpenManus Memory.add_message to intercept agent internal steps
    and broadcast them to the active JobManager.
    """

    def __init__(self, job_id: str):
        self.job_id = job_id
        self._original_add_message = None
        self._target_memory_class = None

    def patch(self) -> None:
        """Applies monkey-patch to OpenManus Memory class."""
        ensure_openmanus_in_syspath()
        try:
            from app.schema import Memory, Message  # type: ignore

            self._target_memory_class = Memory
            self._original_add_message = Memory.add_message
            interceptor_self = self

            def intercepted_add_message(memory_instance, message: Message):
                # Execute original method
                result = interceptor_self._original_add_message(memory_instance, message)

                # Process message for step recording
                try:
                    role = getattr(message, "role", "unknown")
                    content = getattr(message, "content", "")
                    step_type = StepType.THOUGHT

                    if role == "assistant":
                        if getattr(message, "tool_calls", None):
                            step_type = StepType.TOOL_CALL
                        else:
                            step_type = StepType.THOUGHT
                    elif role == "tool":
                        step_type = StepType.OBSERVATION
                    elif role == "user":
                        step_type = StepType.STEP_START

                    # Non-blocking async dispatch of step to JobManager
                    loop = None
                    try:
                        loop = asyncio.get_running_loop()
                    except RuntimeError:
                        pass

                    if loop and loop.is_running():
                        asyncio.create_task(
                            job_manager.add_step(
                                job_id=interceptor_self.job_id,
                                step_type=step_type,
                                content=str(content),
                                data={"role": role}
                            )
                        )
                except Exception as ex:
                    logger.warning(f"Error intercepting memory step: {ex}")

                return result

            Memory.add_message = intercepted_add_message
            logger.info(f"Successfully monkey-patched Memory.add_message for job {self.job_id}")
        except Exception as e:
            logger.error(f"Failed to patch OpenManus Memory class: {e}")

    def unpatch(self) -> None:
        """Restores original Memory.add_message method."""
        if self._target_memory_class and self._original_add_message:
            self._target_memory_class.add_message = self._original_add_message
            logger.info(f"Unpatched Memory.add_message for job {self.job_id}")


async def run_agent_job(job_id: str, prompt: str, max_steps: int = 30) -> None:
    """
    Executes an OpenManus agent run lifecycle for a given job.
    Updates JobManager state from RUNNING to COMPLETED or FAILED.
    """
    ensure_openmanus_in_syspath()
    job = job_manager.get_job(job_id)
    if not job:
        logger.error(f"Job {job_id} not found, aborting agent run")
        return

    await job_manager.update_status(job_id, JobStatus.RUNNING)
    await job_manager.add_step(
        job_id=job_id,
        step_type=StepType.STEP_START,
        content=f"Task initiated with prompt: {prompt}",
        data={"max_steps": max_steps}
    )

    interceptor = MemoryInterceptor(job_id)
    interceptor.patch()

    try:
        from app.agent.manus import Manus  # type: ignore

        agent = Manus()
        # Execute agent workflow
        await agent.run(prompt)

        await job_manager.add_step(
            job_id=job_id,
            step_type=StepType.FINAL_ANSWER,
            content="Task executed to completion."
        )
        await job_manager.update_status(job_id, JobStatus.COMPLETED)
    except asyncio.CancelledError:
        logger.info(f"Job {job_id} was cancelled by user.")
        await job_manager.update_status(job_id, JobStatus.CANCELLED, error_message="Cancelled by user")
    except Exception as e:
        error_msg = f"Agent execution failed: {str(e)}"
        logger.exception(error_msg)
        await job_manager.add_step(
            job_id=job_id,
            step_type=StepType.ERROR,
            content=error_msg
        )
        await job_manager.update_status(job_id, JobStatus.FAILED, error_message=error_msg)
    finally:
        interceptor.unpatch()


def verify_bridge() -> Dict[str, Any]:
    """
    Lightweight health check for the bridge environment.
    Verifies OpenManus path resolution, sys.path integration, and importability.
    """
    ensure_openmanus_in_syspath()
    exists = OPENMANUS_ROOT.exists() and OPENMANUS_ROOT.is_dir()
    can_import_schema = False
    try:
        from app.schema import Memory  # type: ignore
        can_import_schema = True
    except Exception as e:
        logger.warning(f"Verification import failed: {e}")

    return {
        "openmanus_root": str(OPENMANUS_ROOT),
        "exists": exists,
        "sys_path_injected": str(OPENMANUS_ROOT.resolve()) in sys.path,
        "importable": can_import_schema
    }
