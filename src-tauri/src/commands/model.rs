use std::process::Command;
use tauri::{AppHandle, Emitter};
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ModelLocation {
    pub found: bool,
    pub method: String, // "ollama" | "lmstudio" | "binary" | "none"
    pub path: Option<String>,
    pub model: Option<String>,
}

/// Searches for AI models in all known locations across Windows/macOS/Linux
#[tauri::command]
pub async fn locate_model() -> Result<ModelLocation, String> {
    // 1. Check Ollama first (most common)
    if let Ok(output) = Command::new("ollama").args(["list"]).output() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        // Look for any coding model (qwen, deepseek, llama, etc.)
        for line in stdout.lines() {
            let lower = line.to_lowercase();
            if lower.contains("qwen") || lower.contains("code") || lower.contains("deepseek") || lower.contains("llama") {
                let model = line.split_whitespace().next().unwrap_or("qwen2.5-coder").to_string();
                return Ok(ModelLocation {
                    found: true,
                    method: "ollama".into(),
                    path: which_binary("ollama"),
                    model: Some(model),
                });
            }
        }
        // Ollama exists but no coding model — still report ollama is available
        if output.status.success() {
            return Ok(ModelLocation {
                found: false,
                method: "ollama_no_model".into(),
                path: which_binary("ollama"),
                model: None,
            });
        }
    }

    // 2. Check LM Studio local server (runs on port 1234)
    if let Ok(resp) = reqwest::get("http://localhost:1234/v1/models").await {
        if resp.status().is_success() {
            let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
            if let Some(models) = json["data"].as_array() {
                for model in models {
                    let id = model["id"].as_str().unwrap_or("").to_lowercase();
                    if id.contains("qwen") || id.contains("code") || id.contains("deepseek") || id.contains("llama") {
                        return Ok(ModelLocation {
                            found: true,
                            method: "lmstudio".into(),
                            path: Some("http://localhost:1234".into()),
                            model: Some(model["id"].as_str().unwrap_or("model").to_string()),
                        });
                    }
                }
            }
        }
    }

    // 3. Search for raw binary / .gguf in common paths
    let search_paths = get_search_paths();
    for path in &search_paths {
        let p = std::path::Path::new(path);
        if p.exists() {
            return Ok(ModelLocation {
                found: true,
                method: "binary".into(),
                path: Some(path.clone()),
                model: None,
            });
        }
    }

    Ok(ModelLocation {
        found: false,
        method: "none".into(),
        path: None,
        model: None,
    })
}

fn which_binary(name: &str) -> Option<String> {
    Command::new("where")
        .arg(name)
        .output()
        .ok()
        .and_then(|o| String::from_utf8(o.stdout).ok())
        .map(|s| s.trim().lines().next().unwrap_or("").to_string())
        .filter(|s| !s.is_empty())
        .or_else(|| {
            Command::new("which")
                .arg(name)
                .output()
                .ok()
                .and_then(|o| String::from_utf8(o.stdout).ok())
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty())
        })
}

fn get_search_paths() -> Vec<String> {
    let home = std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .unwrap_or_default();

    vec![
        // Windows common paths
        format!("{home}\\AppData\\Local\\Programs\\Ollama\\ollama.exe"),
        format!("{home}\\.ollama\\models"),
        format!("{home}\\AppData\\Roaming\\LM Studio\\models"),
        // Generic binary names
        format!("{home}\\bin\\model-coder"),
        // Linux/macOS
        format!("{home}/.local/bin/model"),
        "/usr/local/bin/model".into(),
        "/opt/model/model".into(),
    ]
}

fn get_file_tree(dir: &std::path::Path, prefix: &str, depth: u8) -> String {
    if depth == 0 { return String::new(); }
    let mut tree = String::new();
    let mut entries_vec = vec![];

    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            entries_vec.push(entry);
        }
    }

    // Sort directories first, then files
    entries_vec.sort_by_key(|a| (!a.path().is_dir(), a.file_name()));

    for entry in entries_vec {
        let name = entry.file_name().to_string_lossy().to_string();
        if name == "node_modules" || name == "target" || name == ".git" || name == "dist" || name == "build" || name == ".next" {
            continue;
        }
        if entry.path().is_dir() {
            tree.push_str(&format!("{}📁 {}/\n", prefix, name));
            tree.push_str(&get_file_tree(&entry.path(), &format!("{}  ", prefix), depth - 1));
        } else {
            tree.push_str(&format!("{}📄 {}\n", prefix, name));
        }
    }
    tree
}

/// Stream a prompt to AI model and emit tokens back to the frontend via Tauri events
#[tauri::command]
pub async fn model_generate(
    app: AppHandle,
    location: ModelLocation,
    prompt: String,
    system: Option<String>,
    project_path: Option<String>,
    context_files: Option<Vec<String>>,
) -> Result<String, String> {
    // 1. Load and Prune the PurposeForge Skillset
    let skillset_path = ".purposeforge/skillset.md";
    let skillset_raw = std::fs::read_to_string(skillset_path).unwrap_or_default();

    // Determine tech stack for pruning
    let is_rust = project_path.as_ref().map(|p| std::path::Path::new(p).join("Cargo.toml").exists()).unwrap_or(false);
    let is_python = project_path.as_ref().map(|p| std::path::Path::new(p).join("requirements.txt").exists()).unwrap_or(false);
    let is_ts = project_path.as_ref().map(|p| std::path::Path::new(p).join("package.json").exists()).unwrap_or(true); // Default to TS for UI

    let prunned_skillset: String = skillset_raw.lines()
        .filter(|line| {
            if line.contains("[CORE]") { return true; }
            if is_rust && line.contains("[RUST]") { return true; }
            if is_python && line.contains("[PYTHON]") { return true; }
            if is_ts && line.contains("[TS]") { return true; }
            // If no tags, keep it (headers, etc)
            !line.contains("[") || !line.contains("]")
        })
        .collect::<Vec<_>>()
        .join("\n");

    // 2. Local Project Context (Memory)
    let mut project_context = String::new();
    if let Some(path) = project_path {
        let p = std::path::Path::new(&path);
        let tree = get_file_tree(p, "", 3); // Map up to 3 levels deep
        let readme = std::fs::read_to_string(p.join("README.md")).unwrap_or_else(|_| "No README found.".to_string());

        project_context = format!(
            "\n\n### ACTIVE PROJECT CONTEXT\nPath: {}\n\n#### Directory Structure:\n{}\n\n#### README.md:\n{}",
            path, tree, readme
        );

        if let Some(files) = context_files {
            project_context.push_str("\n\n#### Provided Context Files:\n");
            for file in files {
                let file_path = p.join(file.trim());
                if let Ok(content) = std::fs::read_to_string(&file_path) {
                    project_context.push_str(&format!("--- FILE: {} ---\n{}\n\n", file, content));
                }
            }
        }
    }

    // 3. Combine prompts
    let combined_system = format!(
        "{}{}\n\nAdditional Instructions:\n{}",
        prunned_skillset,
        project_context,
        system.unwrap_or_default()
    );

    let system_arg = if combined_system.is_empty() { None } else { Some(combined_system) };

    match location.method.as_str() {
        "ollama" => {
            let model = location.model.unwrap_or("qwen2.5-coder:latest".into());
            stream_ollama(&app, &model, &prompt, system_arg.as_deref()).await
        }
        "lmstudio" => {
            stream_openai_compat(
                &app,
                "http://localhost:1234/v1/chat/completions",
                &location.model.unwrap_or("model".into()),
                &prompt,
                system_arg.as_deref(),
            ).await
        }
        _ => Err("AI model not found. Please install via Ollama: `ollama pull qwen2.5-coder`".into()),
    }
}

async fn stream_ollama(
    app: &AppHandle,
    model: &str,
    prompt: &str,
    system: Option<&str>,
) -> Result<String, String> {
    let client = reqwest::Client::new();
    let mut body = serde_json::json!({
        "model": model,
        "prompt": prompt,
        "stream": true,
        "options": {
            "num_predict": 16384,
            "temperature": 0.2
        }
    });
    if let Some(sys) = system {
        body["system"] = serde_json::Value::String(sys.to_string());
    }

    let resp = client
        .post("http://localhost:11434/api/generate")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Ollama connection failed: {e}"))?;

    let mut full_response = String::new();
    let mut stream = resp.bytes_stream();
    use futures_util::StreamExt;

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| e.to_string())?;
        let text = String::from_utf8_lossy(&chunk);
        for line in text.lines() {
            if let Ok(val) = serde_json::from_str::<serde_json::Value>(line) {
                if let Some(token) = val["response"].as_str() {
                    full_response.push_str(token);
                    let _ = app.emit("model-token", token.to_string());
                }
                if val["done"].as_bool().unwrap_or(false) {
                    let _ = app.emit("model-done", full_response.clone());
                }
            }
        }
    }
    Ok(full_response)
}

async fn stream_openai_compat(
    app: &AppHandle,
    endpoint: &str,
    model: &str,
    prompt: &str,
    system: Option<&str>,
) -> Result<String, String> {
    let client = reqwest::Client::new();
    let mut messages = vec![];
    if let Some(sys) = system {
        messages.push(serde_json::json!({"role": "system", "content": sys}));
    }
    messages.push(serde_json::json!({"role": "user", "content": prompt}));

    let body = serde_json::json!({
        "model": model,
        "messages": messages,
        "stream": true
    });

    let resp = client
        .post(endpoint)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("LM Studio connection failed: {e}"))?;

    let mut full_response = String::new();
    let mut stream = resp.bytes_stream();
    use futures_util::StreamExt;

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| e.to_string())?;
        let text = String::from_utf8_lossy(&chunk);
        for line in text.lines() {
            let line = line.trim_start_matches("data: ");
            if line == "[DONE]" { break; }
            if let Ok(val) = serde_json::from_str::<serde_json::Value>(line) {
                if let Some(token) = val["choices"][0]["delta"]["content"].as_str() {
                    full_response.push_str(token);
                    let _ = app.emit("model-token", token.to_string());
                }
            }
        }
    }
    let _ = app.emit("model-done", full_response.clone());
    Ok(full_response)
}

/// Phased code generation - maintains context across multiple generation phases
#[tauri::command]
pub async fn model_generate_phased(
    app: AppHandle,
    location: ModelLocation,
    phase: String,
    context: Value,
    previous_results: Option<Value>,
    codegen_file: Option<Value>,
) -> Result<String, String> {
    // Build phase-specific prompt and system message
    let (prompt, system) = match phase.as_str() {
        "assessment" => build_assessment_prompt(&context)?,
        "architecture" => build_architecture_prompt(&context, &previous_results.ok_or("Missing assessment result")?)?,
        "manifest" => build_manifest_prompt(&context, &previous_results.ok_or("Missing architecture result")?)?,
        "codegen" => build_codegen_prompt(&context, &previous_results.ok_or("Missing manifest result")?, &codegen_file.ok_or("Missing file spec")?)?,
        _ => return Err("Invalid phase. Must be: assessment, architecture, manifest, or codegen".into()),
    };

    // Use the existing generation logic
    model_generate(app, location, prompt, Some(system), None, None).await
}

fn build_assessment_prompt(context: &Value) -> Result<(String, String), String> {
    let project_name = context["projectName"].as_str().unwrap_or("Unnamed Project");
    let description = context["description"].as_str().unwrap_or("");
    let requirements = context["requirements"].as_str().unwrap_or("");
    let skills = context["selectedSkills"]
        .as_array()
        .map(|arr| arr.iter().filter_map(|s| s.as_str()).collect::<Vec<_>>().join(", "))
        .unwrap_or_default();
    let available_vram = context["availableVRAM"].as_str().unwrap_or("Unknown");
    let model_name = context["modelName"].as_str().unwrap_or("Unknown");

    let prompt = format!(
        "Project: {}\nDescription: {}\nRequirements: {}\nSkills: {}\nAvailable VRAM: {}\nModel: {}",
        project_name, description, requirements, skills, available_vram, model_name
    );

    let system = r#"You are a software project feasibility assessor. Respond ONLY with valid JSON:
{
  "canProceed": boolean,
  "estimatedVRAM": "8GB" | "12GB" | "16GB" | "24GB+",
  "estimatedFileCount": number,
  "estimatedTokens": number,
  "estimatedTimeSeconds": number,
  "warnings": ["warning1", "warning2"],
  "reasoning": "detailed explanation"
}

Assess whether the project is feasible given the constraints. Be honest about limitations."#
    .to_string();

    Ok((prompt, system))
}

fn build_architecture_prompt(context: &Value, previous: &Value) -> Result<(String, String), String> {
    let project_name = context["projectName"].as_str().unwrap_or("Unnamed Project");
    let description = context["description"].as_str().unwrap_or("");
    let requirements = context["requirements"].as_str().unwrap_or("");
    let skills = context["selectedSkills"]
        .as_array()
        .map(|arr| arr.iter().filter_map(|s| s.as_str()).collect::<Vec<_>>().join(", "))
        .unwrap_or_default();

    let assessment_reasoning = previous["reasoning"].as_str().unwrap_or("");

    let prompt = format!(
        "Project: {}\nDescription: {}\nRequirements: {}\nSkills: {}\nAssessment: {}",
        project_name, description, requirements, skills, assessment_reasoning
    );

    let system = r#"You are a software architect. Design the architecture for this project.
Respond ONLY with valid JSON:
{
  "architecture": "markdown architecture description",
  "directoryStructure": "tree format",
  "techStack": [{"name": "React", "version": "18.2.0", "purpose": "UI framework", "category": "frontend"}],
  "patterns": ["Component Composition", "Custom Hooks"],
  "decisions": [{"title": "Decision", "description": "...", "rationale": "...", "alternatives": "..."}]
}

Design a scalable, maintainable architecture that meets the requirements."#
    .to_string();

    Ok((prompt, system))
}

fn build_manifest_prompt(context: &Value, previous: &Value) -> Result<(String, String), String> {
    let project_name = context["projectName"].as_str().unwrap_or("Unnamed Project");
    let skills = context["selectedSkills"]
        .as_array()
        .map(|arr| arr.iter().filter_map(|s| s.as_str()).collect::<Vec<_>>().join(", "))
        .unwrap_or_default();

    let architecture = previous["architecture"].as_str().unwrap_or("");
    let directory_structure = previous["directoryStructure"].as_str().unwrap_or("");
    let estimated_file_count = previous["estimatedFileCount"].as_u64().unwrap_or(10);

    let prompt = format!(
        "Project: {}\nSkills: {}\nArchitecture:\n{}\nDirectory Structure:\n{}\nEstimated File Count: {}",
        project_name, skills, architecture, directory_structure, estimated_file_count
    );

    let system = r#"You are a software project planner. List ALL files needed for this project.
Respond ONLY with valid JSON:
{
  "files": [
    {"path": "src/main.tsx", "description": "Entry point", "estimatedLines": 50, "category": "entry", "dependencies": [], "isCore": true}
  ],
  "totalEstimatedLines": number,
  "fileGroups": [{"name": "Configuration", "category": "config", "files": [...], "totalLines": number}]
}

Categories: entry, config, component, utility, api, model, style, test, documentation, other
Include EVERY file needed for a complete, runnable project."#
    .to_string();

    Ok((prompt, system))
}

fn build_codegen_prompt(context: &Value, previous: &Value, file_spec: &Value) -> Result<(String, String), String> {
    let project_name = context["projectName"].as_str().unwrap_or("Unnamed Project");
    let skills = context["selectedSkills"]
        .as_array()
        .map(|arr| arr.iter().filter_map(|s| s.as_str()).collect::<Vec<_>>().join(", "))
        .unwrap_or_default();

    let architecture = previous["architecture"].as_str().unwrap_or("");

    let file_path = file_spec["path"].as_str().unwrap_or("unknown");
    let file_description = file_spec["description"].as_str().unwrap_or("");
    let estimated_lines = file_spec["estimatedLines"].as_u64().unwrap_or(50);
    let file_category = file_spec["category"].as_str().unwrap_or("other");

    // Build manifest summary
    let manifest_files = previous["files"].as_array().map(|arr| {
        arr.iter()
            .filter_map(|f| {
                let path = f["path"].as_str().unwrap_or("?");
                let cat = f["category"].as_str().unwrap_or("other");
                Some(format!("  - {} ({})", path, cat))
            })
            .collect::<Vec<_>>()
            .join("\n")
    }).unwrap_or_default();

    let prompt = format!(
        "Project: {}\nSkills: {}\nFile to Generate: {}\nDescription: {}\nEstimated Lines: {}\nCategory: {}\n\nArchitecture:\n{}\n\nComplete File Manifest:\n{}",
        project_name, skills, file_path, file_description, estimated_lines, file_category, architecture, manifest_files
    );

    let system = r#"You are an expert code generator. Generate the COMPLETE content for ONE file.
Respond ONLY with valid JSON:
{"path": "src/file.ts", "content": "full file content with escaped newlines as \\n"}

CRITICAL:
- Generate complete, working code - no placeholders
- Escape all special JSON characters (newlines as \n, quotes as \", etc.)
- NO markdown code blocks
- Follow the project's architecture and patterns
- Import/reference other files correctly"#
    .to_string();

    Ok((prompt, system))
}
