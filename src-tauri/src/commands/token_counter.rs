use serde::{Deserialize, Serialize};

/// Token count result with safety margins
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TokenCount {
    pub count: usize,
    pub max_allowed: usize,
    pub remaining: usize,
    pub is_safe: bool,
    pub warning: Option<String>,
}

/// Message for conversation tracking
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Message {
    pub role: String,
    pub content: String,
}

/// Default max tokens (Qwen 2.5 Coder has ~32K context)
const DEFAULT_MAX_TOKENS: usize = 28000; // Leave 4K buffer

/// Count tokens in text using tiktoken-rs
#[tauri::command]
pub fn count_tokens(text: &str) -> Result<TokenCount, String> {
    let count = estimate_tokens_simple(text);
    let max_allowed = DEFAULT_MAX_TOKENS;
    let remaining = max_allowed.saturating_sub(count);
    let is_safe = count < max_allowed;
    
    let warning = if count >= max_allowed {
        Some(format!("Token count ({}) exceeds maximum ({})", count, max_allowed))
    } else if count >= (max_allowed * 80 / 100) {
        Some(format!("Token count ({}) is at 80% of limit ({})", count, max_allowed))
    } else {
        None
    };

    Ok(TokenCount {
        count,
        max_allowed,
        remaining,
        is_safe,
        warning,
    })
}

/// Validate prompt size before sending to AI
#[tauri::command]
pub fn validate_prompt_size(
    prompt: &str,
    system: Option<&str>,
    context: Option<&str>,
    max_tokens: Option<usize>,
) -> Result<TokenCount, String> {
    let max = max_tokens.unwrap_or(DEFAULT_MAX_TOKENS);
    
    // Count all components
    let prompt_tokens = estimate_tokens_simple(prompt);
    let system_tokens = system.map_or(0, |s| estimate_tokens_simple(s));
    let context_tokens = context.map_or(0, |c| estimate_tokens_simple(c));
    
    let total = prompt_tokens + system_tokens + context_tokens;
    let remaining = max.saturating_sub(total);
    let is_safe = total < max;
    
    let warning = if total >= max {
        Some(format!(
            "Total tokens ({}) exceeds maximum ({}). Prompt: {}, System: {}, Context: {}",
            total, max, prompt_tokens, system_tokens, context_tokens
        ))
    } else if total >= (max * 80 / 100) {
        Some(format!(
            "Total tokens ({}) is at 80% of limit ({}). Consider reducing context.",
            total, max
        ))
    } else {
        None
    };

    Ok(TokenCount {
        count: total,
        max_allowed: max,
        remaining,
        is_safe,
        warning,
    })
}

/// Estimate conversation size with message history
#[tauri::command]
pub fn estimate_conversation_size(
    messages: Vec<Message>,
    new_prompt: &str,
) -> Result<TokenCount, String> {
    let history_tokens: usize = messages
        .iter()
        .map(|m| estimate_tokens_simple(&m.content))
        .sum();
    
    let new_prompt_tokens = estimate_tokens_simple(new_prompt);
    let total = history_tokens + new_prompt_tokens;
    let max = DEFAULT_MAX_TOKENS;
    let remaining = max.saturating_sub(total);
    let is_safe = total < max;
    
    let warning = if total >= max {
        Some(format!(
            "Conversation tokens ({}) exceeds maximum ({}). History: {}, New prompt: {}",
            total, max, history_tokens, new_prompt_tokens
        ))
    } else if total >= (max * 80 / 100) {
        Some(format!(
            "Conversation tokens ({}) is at 80% of limit ({}). Consider clearing history.",
            total, max
        ))
    } else {
        None
    };

    Ok(TokenCount {
        count: total,
        max_allowed: max,
        remaining,
        is_safe,
        warning,
    })
}

/// Simple token estimation: ~4 chars per token for English code
/// This is a fast approximation without external dependencies
fn estimate_tokens_simple(text: &str) -> usize {
    if text.is_empty() {
        return 0;
    }
    
    // Count characters and estimate tokens
    // Average token is ~4 characters for English/code
    let char_count = text.chars().count();
    let estimated = char_count / 4;
    
    // Add overhead for whitespace and structure
    let whitespace_count = text.chars().filter(|c| c.is_whitespace()).count();
    let overhead = whitespace_count / 10;
    
    estimated + overhead
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_count_tokens_empty() {
        let result = count_tokens("").unwrap();
        assert_eq!(result.count, 0);
        assert!(result.is_safe);
    }

    #[test]
    fn test_count_tokens_simple() {
        let result = count_tokens("Hello, world!").unwrap();
        assert!(result.count > 0);
        assert!(result.is_safe);
    }

    #[test]
    fn test_validate_prompt_size() {
        let result = validate_prompt_size(
            "Test prompt",
            Some("You are helpful"),
            Some("Context here"),
            None,
        ).unwrap();
        assert!(result.count > 0);
        assert!(result.is_safe);
    }

    #[test]
    fn test_estimate_conversation() {
        let messages = vec![
            Message {
                role: "user".to_string(),
                content: "Hello".to_string(),
            },
            Message {
                role: "assistant".to_string(),
                content: "Hi there!".to_string(),
            },
        ];
        let result = estimate_conversation_size(messages, "New question").unwrap();
        assert!(result.count > 0);
        assert!(result.is_safe);
    }
}
