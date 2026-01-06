// Image handling commands
use crate::commands::settings::get_settings;
use serde::Serialize;
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SavedImageResult {
    pub local_path: String,
    pub markdown_path: String,
}

#[tauri::command]
pub fn save_dropped_image(
    slug: String,
    file_name: String,
    file_data: Vec<u8>,
) -> Result<SavedImageResult, String> {
    let settings = get_settings()?;
    
    // 画像保存先ディレクトリ
    let images_dir = PathBuf::from(&settings.repository_path)
        .join("src/assets/images")
        .join(&slug);
    
    // ディレクトリが存在しない場合は作成
    if !images_dir.exists() {
        fs::create_dir_all(&images_dir)
            .map_err(|e| format!("Failed to create images directory: {}", e))?;
    }
    
    // ファイル名: {slug}_{original_filename}
    let sanitized_name = file_name.replace(" ", "_").replace("/", "_");
    let new_filename = format!("{}_{}", slug, sanitized_name);
    let filepath = images_dir.join(&new_filename);
    
    // ファイル書き込み
    fs::write(&filepath, &file_data)
        .map_err(|e| format!("Failed to save image: {}", e))?;
    
    // Markdown用のパス（ローカルパス形式）
    let markdown_path = format!("src/assets/images/{}/{}", slug, new_filename);
    
    Ok(SavedImageResult {
        local_path: filepath.to_string_lossy().to_string(),
        markdown_path,
    })
}
