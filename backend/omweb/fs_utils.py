from pathlib import Path
from typing import List, Dict, Any, Union

def safe_resolve_path(base_root: Union[str, Path], subpath: str = "") -> Path:
    """Safely resolve path within base_root to prevent path traversal vulnerabilities."""
    root = Path(base_root).resolve()
    target = (root / subpath).resolve()
    if not target.is_relative_to(root):
        raise PermissionError(f"Access denied: Path traversal detected outside {root}")
    return target

def list_directory_tree(target_dir: Path, base_root: Path = None) -> List[Dict[str, Any]]:
    """List directory contents recursively or as flat nodes with metadata."""
    if base_root is None:
        base_root = target_dir
    base_root = base_root.resolve()
    target_dir = target_dir.resolve()
    
    entries = []
    if not target_dir.exists() or not target_dir.is_dir():
        return entries

    for item in sorted(target_dir.iterdir(), key=lambda p: (not p.is_dir(), p.name.lower())):
        # Skip hidden files and trash directories
        if item.name.startswith(".") or item.name == "__pycache__":
            continue
            
        rel_path = str(item.relative_to(base_root)).replace("\\", "/")
        is_dir = item.is_dir()
        
        entry = {
            "name": item.name,
            "path": rel_path,
            "is_dir": is_dir,
            "size": item.stat().st_size if not is_dir else 0,
        }
        
        if is_dir:
            entry["children"] = list_directory_tree(item, base_root=base_root)
            
        entries.append(entry)
        
    return entries

# Backward compatibility alias
list_files = list_directory_tree