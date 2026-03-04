#!/usr/bin/env python3
"""
PurposeForge Agent Orchestrator
Dispatches specialized AI agents to implement architectural improvements
"""

import subprocess
import json
import sys
from pathlib import Path
from typing import Optional, Dict, Any
from dataclasses import dataclass
from enum import Enum

class ModelRole(Enum):
    ARCHITECT = "qwen35-35b"       # Complex reasoning, integration
    CODER = "qwen-coder-32b"        # Code generation, refactoring
    REVIEWER = "codestral-22b"      # Code review, git workflows
    SPECIALIST = "qwen35-9b"        # Focused tasks, quick responses
    EXPLAINER = "glm-4.7-flash"     # Error messages, documentation
    OPTIMIZER = "nemotron-claude"   # AST analysis, optimization

@dataclass
class AgentTask:
    id: int
    name: str
    model: ModelRole
    description: str
    prompt_template: str
    input_files: list[str]
    output_files: list[str]

class AgentOrchestrator:
    def __init__(self, ollama_host: str = "http://localhost:11434"):
        self.ollama_host = ollama_host
        self.project_root = Path(__file__).parent.parent
        self.agents_dir = self.project_root / "agents"
        self.agents_dir.mkdir(exist_ok=True)
        
    def scan_models(self) -> dict[str, list[str]]:
        """Scan available Ollama models and categorize by capability"""
        try:
            result = subprocess.run(
                ["ollama", "list", "--json"],
                capture_output=True,
                text=True,
                timeout=30
            )
            models = json.loads(result.stdout)
            
            categorized = {
                "coding": [],
                "reasoning": [],
                "fast": [],
                "embedding": []
            }
            
            for model in models:
                name = model.get("name", "").lower()
                size = model.get("size", 0)
                
                if "embed" in name:
                    categorized["embedding"].append(name)
                elif size < 2 * 1024**3:  # < 2GB
                    categorized["fast"].append(name)
                elif "coder" in name or "code" in name:
                    categorized["coding"].append(name)
                elif size > 20 * 1024**3:  # > 20GB
                    categorized["reasoning"].append(name)
                else:
                    categorized["coding"].append(name)
            
            return categorized
        except Exception as e:
            print(f"Error scanning models: {e}")
            return {"coding": [], "reasoning": [], "fast": [], "embedding": []}
    
    def generate_with_model(self, model: str, prompt: str, system: str = "") -> str:
        """Generate response using specified Ollama model"""
        try:
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
                timeout=600  # 10 minute timeout
            )
            return result.stdout.strip()
        except subprocess.TimeoutExpired:
            return "ERROR: Generation timed out"
        except Exception as e:
            return f"ERROR: {str(e)}"
    
    def dispatch_agent(self, task: AgentTask, context: Dict[str, Any] = None) -> bool:
        """Dispatch an agent to complete a task"""
        print(f"\n{'='*60}")
        print(f"🤖 Dispatching Agent: {task.name}")
        print(f"   Model: {task.model.value}")
        print(f"   Task: {task.description}")
        print(f"{'='*60}\n")
        
        # Load input files
        input_content = {}
        for file_path in task.input_files:
            full_path = self.project_root / file_path
            if full_path.exists():
                input_content[file_path] = full_path.read_text()
            else:
                print(f"⚠️  Warning: Input file not found: {file_path}")
        
        # Build prompt
        prompt = task.prompt_template.format(
            context=json.dumps(context, indent=2) if context else "",
            input_files=json.dumps(input_content, indent=2)
        )
        
        # Generate response
        print("⏳ Generating...")
        response = self.generate_with_model(
            model=task.model.value,
            prompt=prompt,
            system="You are an expert software engineer. Write production-ready code with proper error handling, type safety, and documentation."
        )
        
        if response.startswith("ERROR:"):
            print(f"❌ Agent failed: {response}")
            return False
        
        # Write output files (agent should return JSON with file contents)
        try:
            # Parse the response as JSON containing file outputs
            output_data = json.loads(response)
            if isinstance(output_data, dict) and "files" in output_data:
                for file_path, content in output_data["files"].items():
                    output_path = self.project_root / file_path
                    output_path.parent.mkdir(parents=True, exist_ok=True)
                    output_path.write_text(content)
                    print(f"✅ Wrote: {file_path}")
            else:
                # If not JSON, write as single file
                output_path = self.project_root / task.output_files[0]
                output_path.parent.mkdir(parents=True, exist_ok=True)
                output_path.write_text(response)
                print(f"✅ Wrote: {task.output_files[0]}")
            
            print(f"✨ Agent completed successfully!")
            return True
        except json.JSONDecodeError:
            print("⚠️  Response wasn't valid JSON, saving as raw output")
            output_path = self.project_root / f"{task.name.replace(' ', '_').lower()}_output.txt"
            output_path.write_text(response)
            return True
        except Exception as e:
            print(f"❌ Error writing output: {e}")
            return False
    
    def create_all_agents(self) -> list[AgentTask]:
        """Create all agent tasks for architectural improvements"""
        return [
            AgentTask(
                id=1,
                name="Token Counter & Validator",
                model=ModelRole.CODER,
                description="Implement token counting for AI prompts to prevent context overflow",
                prompt_template="""Create a Rust module for token counting with these requirements:

1. Add tiktoken-rs dependency to Cargo.toml
2. Create src/commands/token_counter.rs with:
   - count_tokens(text: &str) -> usize
   - validate_prompt_size(prompt: &str, max_tokens: usize) -> Result<(), String>
   - estimate_conversation_size(messages: &[Message]) -> usize
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
                ]
            ),
            
            AgentTask(
                id=2,
                name="Code Validation System",
                model=ModelRole.CODER,
                description="Add pre-commit validation (tsc, cargo check, etc.)",
                prompt_template="""Create a code validation system that runs before git commit:

1. Create src/commands/validator.rs with:
   - validate_typescript(project_path: &str) -> Result<(), String>
   - validate_rust(project_path: &str) -> Result<(), String>
   - validate_python(project_path: &str) -> Result<(), String>
   - run_validation(project_path: &str, lang: &str) -> ValidationResult
2. Add to builder.rs: run validation before git commit
3. Add validation result UI in BuilderPanel.tsx

Context:
{context}

Return JSON with complete file contents.""",
                input_files=[
                    "src-tauri/src/commands/builder.rs",
                    "src/components/builder/BuilderPanel.tsx"
                ],
                output_files=[
                    "src-tauri/src/commands/validator.rs",
                    "src-tauri/src/commands/builder.rs",
                    "src/components/builder/BuilderPanel.tsx"
                ]
            ),
            
            AgentTask(
                id=3,
                name="Git Branch & PR Workflow",
                model=ModelRole.REVIEWER,
                description="Add branch creation and PR workflow support",
                prompt_template="""Implement Git branch and PR workflow:

1. Extend src/commands/github.rs with:
   - create_branch(repo_path: &str, branch_name: &str, base: &str) -> Result<(), String>
   - create_pull_request(repo: &str, title: &str, body: &str, head: &str, base: &str) -> Result<PR, String>
   - list_branches(repo: &str) -> Result<Vec<Branch>, String>
2. Add branch selector UI in BuilderPanel
3. Add PR creation form in RepoPanel

Context:
{context}

Return JSON with complete file contents.""",
                input_files=[
                    "src-tauri/src/commands/github.rs",
                    "src/components/builder/BuilderPanel.tsx",
                    "src/components/repo/RepoPanel.tsx"
                ],
                output_files=[
                    "src-tauri/src/commands/github.rs",
                    "src/components/builder/BuilderPanel.tsx",
                    "src/components/repo/RepoPanel.tsx"
                ]
            ),
            
            AgentTask(
                id=4,
                name="Cloud Sync via GitHub Gist",
                model=ModelRole.SPECIALIST,
                description="Sync projects_db.json to GitHub Gist for cloud backup",
                prompt_template="""Implement cloud sync using GitHub Gists:

1. Create src/commands/sync.rs with:
   - sync_to_gist(token: &str, data: &ProjectDatabase) -> Result<String, String>
   - sync_from_gist(token: &str, gist_id: &str) -> Result<ProjectDatabase, String>
   - auto_sync_on_change(data: &ProjectDatabase) -> Result<(), String>
2. Add sync settings UI (gist ID, token input)
3. Add auto-sync toggle
4. Add manual sync button with status indicator

Context:
{context}

Return JSON with complete file contents.""",
                input_files=[
                    "src-tauri/src/commands/tracker.rs",
                    "src/types/index.ts"
                ],
                output_files=[
                    "src-tauri/src/commands/sync.rs",
                    "src/components/settings/SyncSettings.tsx"
                ]
            ),
            
            AgentTask(
                id=5,
                name="Dynamic Template System",
                model=ModelRole.CODER,
                description="Allow runtime template loading from files/URLs",
                prompt_template="""Create a dynamic template loading system:

1. Create src/commands/templates.rs with:
   - load_template_from_file(path: &str) -> Result<ProjectTemplate, String>
   - load_template_from_url(url: &str) -> Result<ProjectTemplate, String>
   - save_template(template: &ProjectTemplate, path: &str) -> Result<(), String>
   - list_user_templates() -> Result<Vec<ProjectTemplate>, String>
2. Add template manager UI (import/export/create)
3. Support template inheritance/composition
4. Add template marketplace (load from GitHub)

Context:
{context}

Return JSON with complete file contents.""",
                input_files=[
                    "src-tauri/src/commands/builder.rs",
                    "src/types/index.ts"
                ],
                output_files=[
                    "src-tauri/src/commands/templates.rs",
                    "src/components/templates/TemplateManager.tsx"
                ]
            ),
            
            AgentTask(
                id=6,
                name="AST-Based File Modification",
                model=ModelRole.OPTIMIZER,
                description="Use tree-sitter for safe code modifications",
                prompt_template="""Implement AST-based file modification using tree-sitter:

1. Add tree-sitter dependencies to Cargo.toml:
   - tree-sitter
   - tree-sitter-typescript
   - tree-sitter-rust
   - tree-sitter-python
2. Create src/commands/ast_modifier.rs with:
   - parse_file(path: &str) -> Result<Tree, String>
   - find_nodes(tree: &Tree, query: &str) -> Vec<Node>
   - replace_node(tree: &mut Tree, node: &Node, new_content: &str) -> Result<(), String>
   - safe_modify_file(path: &str, modifications: &[Modification]) -> Result<(), String>
3. Add diff preview UI showing AST changes

Context:
{context}

Return JSON with complete file contents.""",
                input_files=[
                    "src-tauri/src/commands/modifier.rs",
                    "src-tauri/Cargo.toml"
                ],
                output_files=[
                    "src-tauri/src/commands/ast_modifier.rs",
                    "src-tauri/Cargo.toml"
                ]
            ),
            
            AgentTask(
                id=7,
                name="Error Handling & Retry Logic",
                model=ModelRole.EXPLAINER,
                description="Add structured errors, retries, and recovery",
                prompt_template="""Implement comprehensive error handling:

1. Create src/error.rs with custom error types:
   - GitError (with retry logic)
   - GitHubApiError (with rate limit handling)
   - AIError (with fallback models)
   - FileSystemError (with rollback)
2. Add retry wrapper:
   - retry_with_backoff(fn, max_attempts, base_delay)
3. Create recovery system:
   - save_checkpoint(state)
   - restore_checkpoint()
   - rollback_failed_operation()
4. Add error UI with retry buttons

Context:
{context}

Return JSON with complete file contents.""",
                input_files=[
                    "src-tauri/src/commands/builder.rs",
                    "src-tauri/src/commands/github.rs"
                ],
                output_files=[
                    "src-tauri/src/error.rs",
                    "src-tauri/src/commands/builder.rs",
                    "src/components/ui/ErrorRecovery.tsx"
                ]
            ),
            
            AgentTask(
                id=8,
                name="Integration & Testing",
                model=ModelRole.ARCHITECT,
                description="Integrate all improvements and add tests",
                prompt_template="""Create integration tests and wire everything together:

1. Create src-tauri/tests/integration.rs with:
   - test_token_counting()
   - test_code_validation()
   - test_branch_creation()
   - test_template_loading()
   - test_ast_modification()
   - test_error_recovery()
2. Update main.rs to wire all new commands
3. Create test fixtures and mock data
4. Add CI workflow .github/workflows/test.yml

Context:
{context}
All previous improvements: {input_files}

Return JSON with complete file contents.""",
                input_files=[
                    "src-tauri/src/main.rs",
                    "src-tauri/Cargo.toml"
                ],
                output_files=[
                    "src-tauri/tests/integration.rs",
                    "src-tauri/src/main.rs",
                    ".github/workflows/test.yml"
                ]
            )
        ]
    
    def run_all_agents(self, auto_approve: bool = False):
        """Execute all agents in sequence"""
        print("\n🚀 PurposeForge Agent Orchestration System")
        print("=" * 60)
        
        # Scan available models
        print("\n📊 Scanning available models...")
        models = self.scan_models()
        print(f"   Coding models: {len(models['coding'])}")
        print(f"   Reasoning models: {len(models['reasoning'])}")
        print(f"   Fast models: {len(models['fast'])}")
        
        # Create agent tasks
        tasks = self.create_all_agents()
        print(f"\n📋 Prepared {len(tasks)} agent tasks")
        
        if not auto_approve:
            response = input("\nStart all agents? (y/n): ")
            if response.lower() != 'y':
                print("Aborted")
                return
        
        # Execute agents
        results = []
        for task in tasks:
            success = self.dispatch_agent(task)
            results.append((task, success))
            
            if not success:
                print(f"\n⚠️  Agent {task.name} failed. Continue? (y/n)")
                response = input()
                if response.lower() != 'y':
                    break
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 Agent Execution Summary")
        print("=" * 60)
        for task, success in results:
            status = "✅" if success else "❌"
            print(f"{status} {task.name}: {'Success' if success else 'Failed'}")
        
        successful = sum(1 for _, s in results if s)
        print(f"\nTotal: {successful}/{len(results)} agents completed")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="PurposeForge Agent Orchestrator")
    parser.add_argument("--auto-approve", action="store_true", help="Run all agents without confirmation")
    args = parser.parse_args()
    
    orchestrator = AgentOrchestrator()
    orchestrator.run_all_agents(auto_approve=args.auto_approve)
