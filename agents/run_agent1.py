#!/usr/bin/env python3
"""Agent 1: Token Counter - Generate implementation using qwen-coder-32b"""

import subprocess
import json
import sys
from pathlib import Path

# System prompt
SYSTEM_PROMPT = """You are an expert Rust developer. Write production-ready code with proper error handling, type safety, and documentation. 
Output ONLY valid JSON with a 'files' object containing file paths as keys and complete file contents as values. 
Do not include any explanation outside the JSON. Format: {"files": {"path/to/file": "content", ...}}"""

# Task prompt
PROMPT = """
Create a token counter module for PurposeForge with these files: 

1) src-tauri/src/commands/token_counter.rs with:
   - TokenCount struct with count, max_allowed, remaining, is_safe fields
   - count_tokens(text: &str) -> Result<TokenCount, String> using tiktoken-rs
   - validate_prompt_size(prompt: &str, system: Option<&str>, context: Option<&str>, max_tokens: Option<usize>) -> Result<TokenCount, String>
   - Message struct for conversation tracking

2) Update src-tauri/Cargo.toml adding tiktoken-rs = "0.5" dependency

3) Update src-tauri/src/main.rs to register: count_tokens, validate_prompt_size commands

4) Create src/types/index.ts with TokenCount interface and Message type

5) Create src/lib/api.ts with countTokens() and validatePromptSize() invoke wrappers

6) Update src/components/builder/BuilderPanel.tsx to show token counter display with 80% warning and 95% error thresholds

Return JSON with complete file contents for ALL files (even unchanged ones need full content)."""

def main():
    print("[Agent 1: Token Counter]")
    print("[Model: qwen-coder-32b]")
    print("=" * 60)
    
    full_prompt = f"{SYSTEM_PROMPT}\n\n{PROMPT}"
    
    try:
        result = subprocess.run(
            ["ollama", "run", "qwen-coder-32b", full_prompt],
            capture_output=True,
            text=True,
            timeout=600,
            cwd=r"d:\Users\CASE\projects\purposeforge"
        )
        
        output = result.stdout.strip()
        
        # Save raw output
        output_dir = Path(r"d:\Users\CASE\projects\purposeforge\agents\outputs\agent_1")
        output_dir.mkdir(parents=True, exist_ok=True)
        (output_dir / "raw_output.txt").write_text(output)
        
        print("[OK] Generation complete!")
        print(f"[OK] Output saved to: {output_dir / 'raw_output.txt'}")
        
        # Try to parse JSON
        try:
            # Find JSON in output (might have markdown code blocks)
            json_start = output.find("{")
            json_end = output.rfind("}") + 1
            if json_start >= 0 and json_end > json_start:
                json_str = output[json_start:json_end]
                data = json.loads(json_str)
                
                if "files" in data:
                    print(f"[OK] Found {len(data['files'])} files")
                    
                    # Write files
                    project_root = Path(r"d:\Users\CASE\projects\purposeforge")
                    for file_path, content in data["files"].items():
                        full_path = project_root / file_path
                        full_path.parent.mkdir(parents=True, exist_ok=True)
                        full_path.write_text(content)
                        print(f"   [OK] {file_path}")
                    
                    print("\n[SUCCESS] Agent 1 completed successfully!")
                    return 0
                else:
                    print("[WARN] No 'files' key in JSON output")
            else:
                print("[WARN] No valid JSON found in output")
        except json.JSONDecodeError as e:
            print(f"[WARN] JSON parse error: {e}")
        
        print("\n[WARN] Check raw output for manual review")
        return 1
        
    except subprocess.TimeoutExpired:
        print("[ERROR] Generation timed out")
        return 1
    except Exception as e:
        print(f"[ERROR] Error: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
