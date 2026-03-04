#!/usr/bin/env python3
"""
PurposeForge Agent Orchestrator v2
With automatic rollback, testing, and team alignment
"""

import subprocess
import json
import sys
import shutil
from pathlib import Path
from typing import Optional, Dict, Any, List, Tuple
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime
import hashlib
import os

class ModelRole(Enum):
    ARCHITECT = "qwen35-35b"       # Complex reasoning, integration
    CODER = "qwen-coder-32b"        # Code generation, refactoring
    REVIEWER = "codestral-22b"      # Code review, git workflows
    SPECIALIST = "qwen35-9b"        # Focused tasks, quick responses
    EXPLAINER = "glm-4.7-flash"     # Error messages, documentation
    OPTIMIZER = "nemotron-claude"   # AST analysis, optimization

@dataclass
class FileCheckpoint:
    """Represents a backed-up file before modification"""
    path: str
    content: Optional[str]  # None if file didn't exist
    hash: str
    timestamp: float

@dataclass
class AgentTask:
    id: int
    name: str
    model: ModelRole
    description: str
    prompt_template: str
    input_files: List[str]
    output_files: List[str]
    test_commands: List[str] = field(default_factory=list)
    rollback_on_failure: bool = True

@dataclass
class AgentResult:
    success: bool
    files_modified: List[str]
    test_output: str
    error_message: Optional[str]
    rolled_back: bool

class AgentOrchestrator:
    def __init__(self, ollama_host: str = "http://localhost:11434"):
        self.ollama_host = ollama_host
        self.project_root = Path(__file__).parent.parent
        self.agents_dir = self.project_root / "agents"
        self.checkpoint_dir = self.agents_dir / "checkpoints"
        self.checkpoint_dir.mkdir(exist_ok=True)
        
        # Build commands for different project types
        self.test_commands = {
            "rust": ["cargo", "check"],
            "typescript": ["npm", "run", "build"],
            "python": ["python", "-m", "py_compile", "main.py"],
        }

    def create_checkpoint_id(self) -> str:
        """Create unique checkpoint ID"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        return f"checkpoint_{timestamp}"

    def backup_files(self, file_paths: List[str], checkpoint_id: str) -> List[FileCheckpoint]:
        """Backup files before modification"""
        checkpoints = []
        checkpoint_path = self.checkpoint_dir / checkpoint_id
        checkpoint_path.mkdir(exist_ok=True)
        
        for file_path in file_paths:
            full_path = self.project_root / file_path
            checkpoint = FileCheckpoint(
                path=file_path,
                content=None,
                hash="",
                timestamp=datetime.now().timestamp()
            )
            
            if full_path.exists():
                content = full_path.read_text(encoding='utf-8')
                checkpoint.content = content
                checkpoint.hash = hashlib.sha256(content.encode()).hexdigest()
                
                # Save backup
                backup_file = checkpoint_path / f"{file_path.replace('/', '_').replace('\\', '_')}.bak"
                backup_file.write_text(content, encoding='utf-8')
            else:
                # Mark as new file
                backup_file = checkpoint_path / f"{file_path.replace('/', '_').replace('\\', '_')}.new"
                backup_file.touch()
            
            checkpoints.append(checkpoint)
            print(f"  [BACKUP] {file_path} {'(existing)' if checkpoint.content else '(new file)'}")
        
        return checkpoints

    def restore_checkpoint(self, checkpoints: List[FileCheckpoint], checkpoint_id: str) -> bool:
        """Restore files from checkpoint"""
        print(f"\n[ROLLBACK] Restoring checkpoint {checkpoint_id}...")
        
        checkpoint_path = self.checkpoint_dir / checkpoint_id
        if not checkpoint_path.exists():
            print(f"[ERROR] Checkpoint {checkpoint_id} not found!")
            return False
        
        for checkpoint in checkpoints:
            full_path = self.project_root / checkpoint.path
            
            if checkpoint.content is None:
                # File didn't exist before - delete it
                if full_path.exists():
                    full_path.unlink()
                    print(f"  [ROLLBACK] Deleted {checkpoint.path} (was new file)")
            else:
                # Restore original content
                full_path.parent.mkdir(parents=True, exist_ok=True)
                full_path.write_text(checkpoint.content, encoding='utf-8')
                print(f"  [ROLLBACK] Restored {checkpoint.path}")
        
        return True

    def run_test(self, command: List[str], timeout: int = 120) -> Tuple[bool, str]:
        """Run a test command and return success + output"""
        try:
            result = subprocess.run(
                command,
                capture_output=True,
                text=True,
                timeout=timeout,
                cwd=self.project_root
            )
            
            output = result.stdout + result.stderr
            success = result.returncode == 0
            
            return success, output
        except subprocess.TimeoutExpired:
            return False, f"Test timed out after {timeout}s"
        except Exception as e:
            return False, f"Test failed: {str(e)}"

    def run_all_tests(self, test_commands: List[str]) -> Tuple[bool, str]:
        """Run all test commands sequentially"""
        print("\n[RUNNING TESTS]")
        
        all_output = []
        for cmd in test_commands:
            print(f"  [TEST] {cmd}")
            
            # Parse command
            if cmd == "cargo check":
                success, output = self.run_test(["cargo", "check"])
            elif cmd == "npm run build":
                success, output = self.run_test(["npm", "run", "build"])
            elif cmd == "tsc --noEmit":
                success, output = self.run_test(["npx", "tsc", "--noEmit"])
            else:
                # Custom command
                parts = cmd.split()
                success, output = self.run_test(parts)
            
            all_output.append(f"=== {cmd} ===\n{output}")
            
            if not success:
                print(f"  [FAIL] {cmd}")
                return False, "\n".join(all_output)
            
            print(f"  [PASS] {cmd}")
        
        return True, "\n".join(all_output)

    def generate_with_model(self, model: str, prompt: str, system: str = "", timeout: int = 600) -> str:
        """Generate response using Ollama"""
        try:
            print(f"  [GENERATING] Using model: {model}")
            
            cmd = [
                "ollama", "run", model,
                "--system", system,
                "--noformat",
                prompt
            ]
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=timeout,
                cwd=self.project_root
            )
            
            return result.stdout.strip()
        except subprocess.TimeoutExpired:
            return "ERROR: Generation timed out"
        except Exception as e:
            return f"ERROR: {str(e)}"

    def parse_files_from_response(self, response: str) -> Dict[str, str]:
        """Parse JSON response to extract files"""
        try:
            # Find JSON in output
            json_start = response.find("{")
            json_end = response.rfind("}") + 1
            
            if json_start >= 0 and json_end > json_start:
                json_str = response[json_start:json_end]
                data = json.loads(json_str)
                
                if isinstance(data, dict) and "files" in data:
                    return data["files"]
        except Exception as e:
            print(f"  [WARN] JSON parse error: {e}")
        
        return {}

    def write_files_safely(self, files: Dict[str, str], checkpoint_id: str) -> List[str]:
        """Write files with backup tracking"""
        written_files = []
        checkpoint_path = self.checkpoint_dir / checkpoint_id
        
        for file_path, content in files.items():
            full_path = self.project_root / file_path
            
            # Backup if exists
            if full_path.exists():
                backup_file = checkpoint_path / f"{file_path.replace('/', '_').replace('\\', '_')}.bak"
                backup_file.write_text(full_path.read_text(encoding='utf-8'), encoding='utf-8')
            else:
                # Mark as new
                backup_file = checkpoint_path / f"{file_path.replace('/', '_').replace('\\', '_')}.new"
                backup_file.touch()
            
            # Write file
            full_path.parent.mkdir(parents=True, exist_ok=True)
            full_path.write_text(content, encoding='utf-8')
            written_files.append(file_path)
            print(f"  [WRITE] {file_path}")
        
        return written_files

    def dispatch_agent(self, task: AgentTask, context: Dict[str, Any] = None) -> AgentResult:
        """Dispatch agent with automatic rollback on failure"""
        print(f"\n{'='*70}")
        print(f"[AGENT {task.id}] {task.name}")
        print(f"  Model: {task.model.value}")
        print(f"  Task: {task.description}")
        print(f"{'='*70}")
        
        # Step 1: Create checkpoint
        checkpoint_id = self.create_checkpoint_id()
        print(f"\n[CHECKPOINT] Creating {checkpoint_id}...")
        checkpoints = self.backup_files(task.output_files, checkpoint_id)
        
        # Step 2: Load input files
        input_content = {}
        for file_path in task.input_files:
            full_path = self.project_root / file_path
            if full_path.exists():
                input_content[file_path] = full_path.read_text(encoding='utf-8')
            else:
                print(f"  [WARN] Input file not found: {file_path}")
        
        # Step 3: Generate response
        prompt = task.prompt_template.format(
            context=json.dumps(context, indent=2) if context else "",
            input_files=json.dumps(input_content, indent=2)
        )
        
        system_prompt = """You are an expert software engineer. Write production-ready code with proper error handling, type safety, and documentation. 
Output ONLY valid JSON with a 'files' object containing file paths as keys and complete file contents as values. 
Do not include any explanation outside the JSON. Format: {"files": {"path/to/file": "content", ...}}"""
        
        response = self.generate_with_model(
            model=task.model.value,
            prompt=prompt,
            system=system_prompt,
            timeout=600
        )
        
        if response.startswith("ERROR:"):
            return AgentResult(
                success=False,
                files_modified=[],
                test_output="",
                error_message=response,
                rolled_back=False
            )
        
        # Step 4: Parse and write files
        files = self.parse_files_from_response(response)
        
        if not files:
            return AgentResult(
                success=False,
                files_modified=[],
                test_output="",
                error_message="No valid files in response",
                rolled_back=False
            )
        
        print(f"\n[FILES] Writing {len(files)} files...")
        written_files = self.write_files_safely(files, checkpoint_id)
        
        # Step 5: Run tests AFTER EVERY FILE
        print(f"\n[TEST] Running validation after file writes...")
        test_commands = task.test_commands if task.test_commands else ["cargo check", "npm run build"]
        test_success, test_output = self.run_all_tests(test_commands)
        
        if not test_success:
            print(f"\n[FAIL] Tests failed after file modifications!")
            
            if task.rollback_on_failure:
                # Auto rollback
                print(f"\n[AUTO-ROLLBACK] Reverting changes...")
                self.restore_checkpoint(checkpoints, checkpoint_id)
                
                return AgentResult(
                    success=False,
                    files_modified=written_files,
                    test_output=test_output,
                    error_message="Tests failed - auto-rolled back",
                    rolled_back=True
                )
            else:
                return AgentResult(
                    success=False,
                    files_modified=written_files,
                    test_output=test_output,
                    error_message="Tests failed - manual review required",
                    rolled_back=False
                )
        
        # Step 6: Success
        print(f"\n[SUCCESS] Agent {task.id} completed successfully!")
        return AgentResult(
            success=True,
            files_modified=written_files,
            test_output=test_output,
            error_message=None,
            rolled_back=False
        )

    def create_all_agents(self) -> List[AgentTask]:
        """Create all agent tasks with test commands"""
        return [
            AgentTask(
                id=1,
                name="Token Counter & Validator",
                model=ModelRole.CODER,
                description="Implement token counting for AI prompts",
                prompt_template="""Create a Rust module for token counting with these requirements:

1. Add tiktoken-rs dependency to Cargo.toml
2. Create src-tauri/src/commands/token_counter.rs with:
   - count_tokens(text: &str) -> Result<TokenCount, String>
   - validate_prompt_size(prompt: &str, system: Option<&str>, context: Option<&str>, max_tokens: Option<usize>) -> Result<TokenCount, String>
3. Export functions in main.rs
4. Add TypeScript types and API wrapper

Context:
{context}

Existing code:
{input_files}

Return JSON with "files" containing all modified/new files with their complete content.""",
                input_files=[
                    "src-tauri/src/commands/qwen.rs",
                    "src-tauri/src/main.rs",
                    "src-tauri/Cargo.toml"
                ],
                output_files=[
                    "src-tauri/src/commands/token_counter.rs",
                    "src-tauri/src/main.rs",
                    "src-tauri/Cargo.toml"
                ],
                test_commands=["cargo check"]
            ),
            # Add more agents here...
        ]

    def run_all_agents(self, auto_approve: bool = False):
        """Execute all agents with automatic rollback"""
        print("\n" + "="*70)
        print("[PURPOSEFORGE AGENT ORCHESTRATOR v2]")
        print("With automatic rollback and testing")
        print("="*70)
        
        tasks = self.create_all_agents()
        print(f"\n[PLAN] {len(tasks)} agent tasks prepared")
        
        if not auto_approve:
            response = input("\nStart all agents? (y/n): ")
            if response.lower() != 'y':
                print("[ABORTED]")
                return
        
        results = []
        for task in tasks:
            result = self.dispatch_agent(task)
            results.append((task, result))
            
            if not result.success:
                print(f"\n[AGENT {task.id}] FAILED")
                if result.rolled_back:
                    print("  Changes have been automatically reverted")
                else:
                    print("  Manual review required - changes NOT reverted")
                
                if not auto_approve:
                    response = input("\nContinue with next agent? (y/n): ")
                    if response.lower() != 'y':
                        break
        
        # Summary
        print("\n" + "="*70)
        print("[SUMMARY]")
        print("="*70)
        for task, result in results:
            status = "[PASS]" if result.success else "[FAIL]"
            rollback = " (rolled back)" if result.rolled_back else ""
            print(f"{status} {task.name}{rollback}")
        
        successful = sum(1 for _, r in results if r.success)
        print(f"\nTotal: {successful}/{len(results)} agents completed successfully")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="PurposeForge Agent Orchestrator v2")
    parser.add_argument("--auto-approve", action="store_true", help="Run all agents without confirmation")
    parser.add_argument("--task", type=int, help="Run specific agent task by ID")
    args = parser.parse_args()
    
    orchestrator = AgentOrchestrator()
    orchestrator.run_all_agents(auto_approve=args.auto_approve)
