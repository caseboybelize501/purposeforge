# Agent 1: Token Counter
$systemPrompt = @"
You are an expert Rust developer. Write production-ready code with proper error handling, type safety, and documentation. 
Output ONLY valid JSON with a 'files' object containing file paths as keys and complete file contents as values. 
Do not include any explanation outside the JSON.
"@

$prompt = @"
Create a token counter module for PurposeForge with these files: 
1) src-tauri/src/commands/token_counter.rs with TokenCount struct and count_tokens function using tiktoken-rs
2) Update src-tauri/Cargo.toml adding tiktoken-rs dependency
3) Update src-tauri/src/main.rs to register commands
4) Create src/types/index.ts with TokenCount interface  
5) Create src/lib/api.ts with countTokens and validatePromptSize wrappers
6) Update src/components/builder/BuilderPanel.tsx to show token counter with warnings

Return JSON with complete file contents for all files.
"@

$fullPrompt = "$systemPrompt`n`n$prompt"
$fullPrompt | ollama run qwen-coder-32b
