use serde::{Deserialize, Serialize};
use std::process::Command;
use std::path::Path;

/// Validation result for a single language
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ValidationResult {
    pub language: String,
    pub success: bool,
    pub output: String,
    pub errors: Vec<String>,
    pub duration_ms: u64,
}

/// Overall validation status for a project
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ValidationReport {
    pub project_path: String,
    pub overall_success: bool,
    pub results: Vec<ValidationResult>,
    pub total_duration_ms: u64,
}

/// Validate TypeScript project using tsc --noEmit
#[tauri::command]
pub fn validate_typescript(project_path: &str) -> Result<ValidationResult, String> {
    let start = std::time::Instant::now();
    
    // Check if package.json exists
    let package_json = Path::new(project_path).join("package.json");
    if !package_json.exists() {
        return Ok(ValidationResult {
            language: "typescript".to_string(),
            success: true,
            output: "No package.json found - skipping TypeScript validation".to_string(),
            errors: vec![],
            duration_ms: start.elapsed().as_millis() as u64,
        });
    }

    // Check if typescript is installed
    let ts_installed = Command::new("tsc")
        .arg("--version")
        .current_dir(project_path)
        .output()
        .is_ok();

    if !ts_installed {
        // Try npx tsc
        let output = Command::new("npx")
            .args(["tsc", "--noEmit"])
            .current_dir(project_path)
            .output()
            .map_err(|e| format!("Failed to run npx tsc: {}", e))?;

        let success = output.status.success();
        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        let combined = format!("{}{}", stdout, stderr);
        
        let errors = if !success {
            combined.lines().map(|s| s.to_string()).collect()
        } else {
            vec![]
        };

        return Ok(ValidationResult {
            language: "typescript".to_string(),
            success,
            output: combined,
            errors,
            duration_ms: start.elapsed().as_millis() as u64,
        });
    }

    // Run tsc --noEmit directly
    let output = Command::new("tsc")
        .arg("--noEmit")
        .current_dir(project_path)
        .output()
        .map_err(|e| format!("Failed to run tsc: {}", e))?;

    let success = output.status.success();
    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    let combined = format!("{}{}", stdout, stderr);
    
    let errors = if !success {
        combined.lines().map(|s| s.to_string()).collect()
    } else {
        vec![]
    };

    Ok(ValidationResult {
        language: "typescript".to_string(),
        success,
        output: if success { "TypeScript validation passed".to_string() } else { combined },
        errors,
        duration_ms: start.elapsed().as_millis() as u64,
    })
}

/// Validate Rust project using cargo check
#[tauri::command]
pub fn validate_rust(project_path: &str) -> Result<ValidationResult, String> {
    let start = std::time::Instant::now();
    
    // Check if Cargo.toml exists
    let cargo_toml = Path::new(project_path).join("Cargo.toml");
    if !cargo_toml.exists() {
        return Ok(ValidationResult {
            language: "rust".to_string(),
            success: true,
            output: "No Cargo.toml found - skipping Rust validation".to_string(),
            errors: vec![],
            duration_ms: start.elapsed().as_millis() as u64,
        });
    }

    // Run cargo check
    let output = Command::new("cargo")
        .args(["check", "--color", "never"])
        .current_dir(project_path)
        .output()
        .map_err(|e| format!("Failed to run cargo check: {}", e))?;

    let success = output.status.success();
    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    let combined = format!("{}{}", stdout, stderr);
    
    let errors = if !success {
        combined.lines().map(|s| s.to_string()).collect()
    } else {
        vec![]
    };

    Ok(ValidationResult {
        language: "rust".to_string(),
        success,
        output: if success { "Rust validation passed".to_string() } else { combined },
        errors,
        duration_ms: start.elapsed().as_millis() as u64,
    })
}

/// Validate Python project using py_compile and mypy if available
#[tauri::command]
pub fn validate_python(project_path: &str) -> Result<ValidationResult, String> {
    let start = std::time::Instant::now();
    
    // Check if requirements.txt or any .py files exist
    let requirements_txt = Path::new(project_path).join("requirements.txt");
    let main_py = Path::new(project_path).join("main.py");
    
    if !requirements_txt.exists() && !main_py.exists() {
        return Ok(ValidationResult {
            language: "python".to_string(),
            success: true,
            output: "No Python files found - skipping Python validation".to_string(),
            errors: vec![],
            duration_ms: start.elapsed().as_millis() as u64,
        });
    }

    // Try to find Python files and compile them
    let mut errors = vec![];
    let mut output_parts = vec![];
    let mut success = true;

    // Check for main.py
    if main_py.exists() {
        let output = Command::new("python")
            .args(["-m", "py_compile", "main.py"])
            .current_dir(project_path)
            .output();

        match output {
            Ok(out) => {
                if !out.status.success() {
                    success = false;
                    let stderr = String::from_utf8_lossy(&out.stderr).to_string();
                    errors.push(stderr.clone());
                    output_parts.push(stderr);
                } else {
                    output_parts.push("main.py: OK".to_string());
                }
            }
            Err(e) => {
                success = false;
                errors.push(format!("Failed to run python: {}", e));
            }
        }
    }

    // Try mypy if available
    let mypy_check = Command::new("mypy")
        .arg("--version")
        .output();
    
    if mypy_check.is_ok() {
        let output = Command::new("mypy")
            .arg(".")
            .current_dir(project_path)
            .output();

        match output {
            Ok(out) => {
                let stdout = String::from_utf8_lossy(&out.stdout).to_string();
                let stderr = String::from_utf8_lossy(&out.stderr).to_string();
                if !out.status.success() {
                    success = false;
                    errors.push(format!("mypy: {}{}", stdout, stderr));
                }
                output_parts.push(stdout);
            }
            Err(_) => {
                // mypy not installed, skip
            }
        }
    }

    Ok(ValidationResult {
        language: "python".to_string(),
        success,
        output: output_parts.join("\n"),
        errors,
        duration_ms: start.elapsed().as_millis() as u64,
    })
}

/// Run validation for all detected languages in a project
#[tauri::command]
pub fn run_validation(project_path: &str) -> Result<ValidationReport, String> {
    let start = std::time::Instant::now();
    let mut results = vec![];
    let mut overall_success = true;

    // Validate each language
    let ts_result = validate_typescript(project_path)?;
    if !ts_result.success {
        overall_success = false;
    }
    results.push(ts_result);

    let rust_result = validate_rust(project_path)?;
    if !rust_result.success {
        overall_success = false;
    }
    results.push(rust_result);

    let py_result = validate_python(project_path)?;
    if !py_result.success {
        overall_success = false;
    }
    results.push(py_result);

    Ok(ValidationReport {
        project_path: project_path.to_string(),
        overall_success,
        results,
        total_duration_ms: start.elapsed().as_millis() as u64,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_typescript_no_package() {
        let result = validate_typescript("/nonexistent").unwrap();
        assert!(result.success);
        assert!(result.output.contains("skipping"));
    }

    #[test]
    fn test_validate_rust_no_cargo() {
        let result = validate_rust("/nonexistent").unwrap();
        assert!(result.success);
        assert!(result.output.contains("skipping"));
    }
}
