// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands {
    pub mod builder;
    pub mod executor;
    pub mod github;
    pub mod injector;
    pub mod modifier;
    pub mod model;
    pub mod tracker;
    pub mod token_counter;
    pub mod validator;
}

use commands::{builder::*, executor::*, github::*, injector::*, modifier::*, model::*, tracker::*, token_counter::*, validator::*};

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            // Model / AI
            locate_model,
            model_generate,
            model_generate_phased,
            // Token Counter
            count_tokens,
            validate_prompt_size,
            estimate_conversation_size,
            // Validator
            validate_typescript,
            validate_rust,
            validate_python,
            run_validation,
            // GitHub
            gh_auth_status,
            gh_auth_login,
            gh_list_repos,
            gh_create_repo,
            gh_clone_repo,
            gh_browse_repo,
            git_commit_and_push,
            gh_list_prs,
            gh_create_pr,
            gh_list_issues,
            gh_create_issue,
            // Branch Operations
            create_branch,
            list_branches,
            checkout_branch,
            push_branch,
            // Builder
            get_templates,
            get_skills,
            build_and_push_project,
            template_to_files,
            // Tracker
            track_project,
            list_tracked_projects,
            update_project_status,
            // Modifier
            modify_file,
            apply_diff,
            read_file_content,
            // Injector
            list_available_modules,
            inject_module,
            // Executor
            execute_task,
            stream_task,
            open_project_folder,
            open_in_vscode,
            open_in_cursor,
            open_in_terminal,
            run_antigravity,
            copy_to_clipboard,
            get_environment_info,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
