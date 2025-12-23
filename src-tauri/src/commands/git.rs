// Git commands
use crate::commands::settings::get_settings;
use git2::{Repository, StatusOptions, Signature};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GitStatus {
    pub branch: String,
    pub is_clean: bool,
    pub modified: Vec<String>,
    pub added: Vec<String>,
    pub deleted: Vec<String>,
    pub ahead: i32,
}

fn open_repo() -> Result<Repository, String> {
    let settings = get_settings()?;
    if !settings.is_configured {
        return Err("Repository not configured".to_string());
    }
    
    Repository::open(&settings.repository_path)
        .map_err(|e| format!("Failed to open repository: {}", e))
}

#[tauri::command]
pub fn get_git_status() -> Result<GitStatus, String> {
    let repo = open_repo()?;
    
    // Get current branch
    let head = repo.head().map_err(|e| format!("Failed to get HEAD: {}", e))?;
    let branch = head.shorthand().unwrap_or("unknown").to_string();
    
    // Get status
    let mut opts = StatusOptions::new();
    opts.include_untracked(true);
    
    let statuses = repo.statuses(Some(&mut opts))
        .map_err(|e| format!("Failed to get status: {}", e))?;
    
    let mut modified = Vec::new();
    let mut added = Vec::new();
    let mut deleted = Vec::new();
    
    for entry in statuses.iter() {
        let status = entry.status();
        let path = entry.path().unwrap_or("").to_string();
        
        if status.is_wt_modified() || status.is_index_modified() {
            modified.push(path.clone());
        }
        if status.is_wt_new() || status.is_index_new() {
            added.push(path.clone());
        }
        if status.is_wt_deleted() || status.is_index_deleted() {
            deleted.push(path.clone());
        }
    }
    
    let is_clean = modified.is_empty() && added.is_empty() && deleted.is_empty();
    
    // Get ahead count
    let ahead = get_ahead_count(&repo).unwrap_or(0);
    
    Ok(GitStatus {
        branch,
        is_clean,
        modified,
        added,
        deleted,
        ahead,
    })
}

fn get_ahead_count(repo: &Repository) -> Result<i32, git2::Error> {
    let head = repo.head()?;
    let local_oid = head.target().ok_or_else(|| git2::Error::from_str("No local target"))?;
    
    let branch_name = head.shorthand().unwrap_or("main");
    let upstream_ref = format!("refs/remotes/origin/{}", branch_name);
    
    if let Ok(upstream) = repo.find_reference(&upstream_ref) {
        if let Some(upstream_oid) = upstream.target() {
            let (ahead, _behind) = repo.graph_ahead_behind(local_oid, upstream_oid)?;
            return Ok(ahead as i32);
        }
    }
    
    Ok(0)
}

#[derive(Debug, Deserialize)]
pub struct CommitRequest {
    pub message: String,
}

#[tauri::command]
pub fn git_commit(request: CommitRequest) -> Result<String, String> {
    let repo = open_repo()?;
    
    // Get index and add all changes
    let mut index = repo.index()
        .map_err(|e| format!("Failed to get index: {}", e))?;
    
    index.add_all(["*"].iter(), git2::IndexAddOption::DEFAULT, None)
        .map_err(|e| format!("Failed to add files: {}", e))?;
    
    index.write()
        .map_err(|e| format!("Failed to write index: {}", e))?;
    
    let tree_id = index.write_tree()
        .map_err(|e| format!("Failed to write tree: {}", e))?;
    
    let tree = repo.find_tree(tree_id)
        .map_err(|e| format!("Failed to find tree: {}", e))?;
    
    // Get signature from git config
    let sig = repo.signature()
        .or_else(|_| {
            // Fallback: try to get from git config manually
            if let Ok(config) = repo.config() {
                let name = config.get_string("user.name").unwrap_or_else(|_| "Unknown".to_string());
                let email = config.get_string("user.email").unwrap_or_else(|_| "unknown@example.com".to_string());
                Signature::now(&name, &email)
            } else {
                Signature::now("Unknown", "unknown@example.com")
            }
        })
        .map_err(|e| format!("Failed to create signature: {}", e))?;
    
    // Get parent commit
    let head = repo.head()
        .map_err(|e| format!("Failed to get HEAD: {}", e))?;
    let parent_commit = head.peel_to_commit()
        .map_err(|e| format!("Failed to get parent commit: {}", e))?;
    
    // Create commit
    let commit_id = repo.commit(
        Some("HEAD"),
        &sig,
        &sig,
        &request.message,
        &tree,
        &[&parent_commit],
    ).map_err(|e| format!("Failed to commit: {}", e))?;
    
    Ok(commit_id.to_string())
}

#[tauri::command]
pub fn git_push() -> Result<(), String> {
    let repo = open_repo()?;
    
    let remote = repo.find_remote("origin")
        .map_err(|e| format!("Failed to find remote: {}", e))?;
    
    // Get current branch
    let head = repo.head()
        .map_err(|e| format!("Failed to get HEAD: {}", e))?;
    let branch_name = head.shorthand().unwrap_or("main");
    
    // Push using git command (git2 push requires complex auth setup)
    let settings = get_settings()?;
    let output = std::process::Command::new("git")
        .current_dir(&settings.repository_path)
        .args(["push", "origin", branch_name])
        .output()
        .map_err(|e| format!("Failed to run git push: {}", e))?;
    
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Push failed: {}", stderr));
    }
    
    // We need to use the remote variable or Rust will warn about unused
    drop(remote);
    
    Ok(())
}
