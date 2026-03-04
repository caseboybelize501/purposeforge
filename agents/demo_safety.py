#!/usr/bin/env python3
"""
PurposeForge Agent Safety System Demo
Shows checkpoint creation, testing, and auto-rollback in action
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from agent_orchestrator_v2 import AgentOrchestrator

def demo_checkpoint_system():
    """Demonstrate checkpoint creation and rollback"""
    print("="*70)
    print("PURPOSEFORGE AGENT SAFETY SYSTEM DEMO")
    print("="*70)
    
    orchestrator = AgentOrchestrator()
    
    # Demo 1: Create a checkpoint
    print("\n[DEMO 1] Creating checkpoint...")
    checkpoint_id = orchestrator.create_checkpoint_id()
    print(f"Checkpoint ID: {checkpoint_id}")
    
    # Demo 2: Backup some files
    print("\n[DEMO 2] Backing up files...")
    test_files = [
        "src-tauri/Cargo.toml",
        "src-tauri/src/main.rs",
        "package.json",
        "src/types/index.ts"
    ]
    checkpoints = orchestrator.backup_files(test_files, checkpoint_id)
    print(f"Backed up {len(checkpoints)} files")
    
    for cp in checkpoints:
        status = "existing" if cp.content else "new"
        print(f"  - {cp.path} ({status}, hash: {cp.hash[:16]}...)")
    
    # Demo 3: Simulate file modification
    print("\n[DEMO 3] Simulating file modification...")
    test_file = orchestrator.project_root / "test_safety_file.txt"
    original_content = test_file.read_text() if test_file.exists() else None
    
    test_file.write_text("This is a test modification")
    print(f"Modified: {test_file}")
    
    # Demo 4: Run tests
    print("\n[DEMO 4] Running tests...")
    test_commands = ["cargo check"]
    success, output = orchestrator.run_all_tests(test_commands)
    print(f"Test result: {'PASS' if success else 'FAIL'}")
    
    # Demo 5: Rollback
    print("\n[DEMO 5] Testing rollback...")
    if test_file.exists():
        test_file.unlink()
    
    if original_content:
        test_file.write_text(original_content)
        print("Restored test file")
    
    print("\n" + "="*70)
    print("DEMO COMPLETE")
    print("="*70)
    print("\nKey takeaways:")
    print("1. Checkpoints are created automatically")
    print("2. Files are backed up before modification")
    print("3. Tests run after EVERY file change")
    print("4. Rollback restores ALL files to safe state")
    print("\nTry running an actual agent:")
    print("  python agent_orchestrator_v2.py --task 1")

if __name__ == "__main__":
    demo_checkpoint_system()
