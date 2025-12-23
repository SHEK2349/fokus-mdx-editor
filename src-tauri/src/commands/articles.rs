// Articles commands
use crate::commands::settings::get_settings;
use chrono::{DateTime, Utc};
use gray_matter::Matter;
use gray_matter::engine::YAML;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use walkdir::WalkDir;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ArticleFrontmatter {
    pub title: String,
    pub pub_datetime: DateTime<Utc>,
    #[serde(default)]
    pub description: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub mod_datetime: Option<DateTime<Utc>>,
    #[serde(default)]
    pub featured: bool,
    #[serde(default = "default_true")]
    pub draft: bool,
    #[serde(default = "default_author")]
    pub author: String,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub dek: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub og_image: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub canonical_url: Option<String>,
    #[serde(default)]
    pub hide_edit_post: bool,
    #[serde(default = "default_timezone")]
    pub timezone: String,
}

fn default_true() -> bool { true }
fn default_author() -> String { "SHEK".to_string() }
fn default_timezone() -> String { "Asia/Tokyo".to_string() }

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Article {
    pub slug: String,
    pub frontmatter: ArticleFrontmatter,
    pub content: String,
    pub filepath: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ArticleListItem {
    pub slug: String,
    pub title: String,
    pub pub_datetime: DateTime<Utc>,
    pub draft: bool,
    pub featured: bool,
    pub tags: Vec<String>,
}

fn get_articles_dir() -> Result<PathBuf, String> {
    let settings = get_settings()?;
    if !settings.is_configured {
        return Err("Repository not configured".to_string());
    }
    Ok(PathBuf::from(&settings.repository_path).join(&settings.articles_path))
}

fn parse_frontmatter(content: &str) -> Result<(ArticleFrontmatter, String), String> {
    let matter = Matter::<YAML>::new();
    let result = matter.parse(content);
    
    let frontmatter: ArticleFrontmatter = result.data
        .ok_or("No frontmatter found")?
        .deserialize()
        .map_err(|e| format!("Failed to parse frontmatter: {}", e))?;
    
    Ok((frontmatter, result.content))
}

fn serialize_frontmatter(frontmatter: &ArticleFrontmatter, content: &str) -> String {
    let yaml = serde_yaml::to_string(frontmatter).unwrap_or_default();
    format!("---\n{}---\n\n{}", yaml, content)
}

#[tauri::command]
pub fn list_articles() -> Result<Vec<ArticleListItem>, String> {
    let articles_dir = get_articles_dir()?;
    
    if !articles_dir.exists() {
        return Ok(vec![]);
    }
    
    let mut articles = Vec::new();
    
    for entry in WalkDir::new(&articles_dir).max_depth(1) {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        
        if path.extension().map_or(false, |ext| ext == "mdx") {
            let slug = path.file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("")
                .to_string();
            
            let content = fs::read_to_string(path)
                .map_err(|e| format!("Failed to read {}: {}", path.display(), e))?;
            
            if let Ok((fm, _)) = parse_frontmatter(&content) {
                articles.push(ArticleListItem {
                    slug,
                    title: fm.title,
                    pub_datetime: fm.pub_datetime,
                    draft: fm.draft,
                    featured: fm.featured,
                    tags: fm.tags,
                });
            }
        }
    }
    
    // Sort by pub_datetime descending
    articles.sort_by(|a, b| b.pub_datetime.cmp(&a.pub_datetime));
    
    Ok(articles)
}

#[tauri::command]
pub fn get_article(slug: String) -> Result<Article, String> {
    let articles_dir = get_articles_dir()?;
    let filepath = articles_dir.join(format!("{}.mdx", slug));
    
    if !filepath.exists() {
        return Err(format!("Article '{}' not found", slug));
    }
    
    let file_content = fs::read_to_string(&filepath)
        .map_err(|e| format!("Failed to read article: {}", e))?;
    
    let (frontmatter, content) = parse_frontmatter(&file_content)?;
    
    Ok(Article {
        slug,
        frontmatter,
        content,
        filepath: filepath.to_string_lossy().to_string(),
    })
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateArticleRequest {
    pub slug: String,
    pub frontmatter: ArticleFrontmatter,
    pub content: String,
}

#[tauri::command]
pub fn create_article(request: CreateArticleRequest) -> Result<Article, String> {
    let articles_dir = get_articles_dir()?;
    let filepath = articles_dir.join(format!("{}.mdx", request.slug));
    
    if filepath.exists() {
        return Err(format!("Article '{}' already exists", request.slug));
    }
    
    let file_content = serialize_frontmatter(&request.frontmatter, &request.content);
    
    fs::write(&filepath, &file_content)
        .map_err(|e| format!("Failed to create article: {}", e))?;
    
    Ok(Article {
        slug: request.slug,
        frontmatter: request.frontmatter,
        content: request.content,
        filepath: filepath.to_string_lossy().to_string(),
    })
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateArticleRequest {
    pub slug: Option<String>,  // New slug for rename
    pub frontmatter: ArticleFrontmatter,
    pub content: String,
}

#[tauri::command]
pub fn update_article(slug: String, request: UpdateArticleRequest) -> Result<Article, String> {
    let articles_dir = get_articles_dir()?;
    let filepath = articles_dir.join(format!("{}.mdx", slug));
    
    if !filepath.exists() {
        return Err(format!("Article '{}' not found", slug));
    }
    
    // Handle rename if new slug is provided
    let new_slug = request.slug.clone().unwrap_or(slug.clone());
    let new_filepath = if new_slug != slug {
        let new_path = articles_dir.join(format!("{}.mdx", new_slug));
        if new_path.exists() {
            return Err(format!("Article '{}' already exists", new_slug));
        }
        fs::rename(&filepath, &new_path)
            .map_err(|e| format!("Failed to rename article: {}", e))?;
        new_path
    } else {
        filepath
    };
    
    let file_content = serialize_frontmatter(&request.frontmatter, &request.content);
    
    fs::write(&new_filepath, &file_content)
        .map_err(|e| format!("Failed to update article: {}", e))?;
    
    Ok(Article {
        slug: new_slug,
        frontmatter: request.frontmatter,
        content: request.content,
        filepath: new_filepath.to_string_lossy().to_string(),
    })
}

#[tauri::command]
pub fn delete_article(slug: String) -> Result<(), String> {
    let articles_dir = get_articles_dir()?;
    let filepath = articles_dir.join(format!("{}.mdx", slug));
    
    if !filepath.exists() {
        return Err(format!("Article '{}' not found", slug));
    }
    
    fs::remove_file(&filepath)
        .map_err(|e| format!("Failed to delete article: {}", e))?;
    
    Ok(())
}
