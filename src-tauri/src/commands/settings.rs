// Settings commands
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppSettings {
    pub repository_path: String,
    pub articles_path: String,
    pub is_configured: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            repository_path: String::new(),
            articles_path: String::from("src/data/blog"),
            is_configured: false,
        }
    }
}

fn get_settings_path() -> PathBuf {
    let config_dir = dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("com.shek.fokus-editor");
    
    fs::create_dir_all(&config_dir).ok();
    config_dir.join("settings.json")
}

#[tauri::command]
pub fn get_settings() -> Result<AppSettings, String> {
    let path = get_settings_path();
    
    if path.exists() {
        let content = fs::read_to_string(&path)
            .map_err(|e| format!("Failed to read settings: {}", e))?;
        let settings: AppSettings = serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse settings: {}", e))?;
        Ok(settings)
    } else {
        Ok(AppSettings::default())
    }
}

#[derive(Debug, Deserialize)]
pub struct SaveRepositoryRequest {
    pub repository_path: String,
    pub articles_path: String,
}

#[tauri::command]
pub fn save_repository_settings(request: SaveRepositoryRequest) -> Result<AppSettings, String> {
    let path = get_settings_path();
    
    // Validate paths
    let repo_path = PathBuf::from(&request.repository_path);
    if !repo_path.exists() {
        return Err(format!("Repository path does not exist: {}", request.repository_path));
    }
    
    let full_articles_path = repo_path.join(&request.articles_path);
    if !full_articles_path.exists() {
        return Err(format!("Articles path does not exist: {}", full_articles_path.display()));
    }
    
    let settings = AppSettings {
        repository_path: request.repository_path,
        articles_path: request.articles_path,
        is_configured: true,
    };
    
    let content = serde_json::to_string_pretty(&settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;
    
    fs::write(&path, content)
        .map_err(|e| format!("Failed to save settings: {}", e))?;
    
    Ok(settings)
}
