// Git commands
use crate::commands::settings::get_settings;
use git2::{Repository, StatusOptions, Signature};
use serde::{Deserialize, Serialize};
use tauri::Emitter;

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

#[derive(Debug, Serialize, Clone)]
struct CommitProgress {
    step: u32,
    total: u32,
    message: String,
}

#[tauri::command]
pub fn git_commit(app: tauri::AppHandle, request: CommitRequest) -> Result<String, String> {
    let repo = open_repo()?;
    let settings = get_settings()?;
    let repo_path = &settings.repository_path;

    let emit_progress = |step: u32, message: &str| {
        let _ = app.emit("commit-progress", CommitProgress {
            step,
            total: 3,
            message: message.to_string(),
        });
    };

    // ── Step 1: src/assets/images/ に画像があればR2にアップロード ──
    let images_dir = std::path::Path::new(repo_path).join("src/assets/images");
    if images_dir.exists() {
        emit_progress(1, "画像をR2にアップロード中...");
        let upload_output = std::process::Command::new("/usr/local/bin/npm")
            .current_dir(repo_path)
            .env("PATH", "/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin")
            .args(["run", "wp:upload-images"])
            .output()
            .map_err(|e| format!("Failed to run wp:upload-images: {}", e))?;

        if !upload_output.status.success() {
            let stderr = String::from_utf8_lossy(&upload_output.stderr);
            let stdout = String::from_utf8_lossy(&upload_output.stdout);
            // R2環境変数が未設定の場合はスキップ（エラーにしない）
            if !stderr.contains("Missing R2 environment variables") 
                && !stdout.contains("Missing R2 environment variables") {
                return Err(format!("Image upload failed: {}\n{}", stdout, stderr));
            }
            emit_progress(1, "R2未設定のためスキップ");
        } else {
            emit_progress(1, "画像アップロード完了");

            // ── Step 2: MDX内のローカルパスをR2 URLに変換 ──
            emit_progress(2, "画像パスを変換中...");
            let convert_output = std::process::Command::new("/usr/local/bin/npm")
                .current_dir(repo_path)
                .env("PATH", "/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin")
                .args(["run", "wp:convert-image-paths"])
                .output()
                .map_err(|e| format!("Failed to run wp:convert-image-paths: {}", e))?;

            if !convert_output.status.success() {
                let stderr = String::from_utf8_lossy(&convert_output.stderr);
                return Err(format!("Image path conversion failed: {}", stderr));
            }
            emit_progress(2, "画像パス変換完了");
        }
    } else {
        emit_progress(1, "画像処理不要 - スキップ");
        emit_progress(2, "画像パス変換不要 - スキップ");
    }

    // ── Step 3: git add & commit ──
    emit_progress(3, "コミット中...");

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

    emit_progress(3, "コミット完了");
    
    Ok(commit_id.to_string())
}


#[tauri::command]
pub fn git_push(app: tauri::AppHandle) -> Result<(), String> {
    let repo = open_repo()?;
    
    let remote = repo.find_remote("origin")
        .map_err(|e| format!("Failed to find remote: {}", e))?;
    
    // Get current branch
    let head = repo.head()
        .map_err(|e| format!("Failed to get HEAD: {}", e))?;
    let branch_name = head.shorthand().unwrap_or("main").to_string();
    
    let settings = get_settings()?;

    let emit_progress = |step: u32, message: &str| {
        let _ = app.emit("push-progress", CommitProgress {
            step,
            total: 3,
            message: message.to_string(),
        });
    };

    // Step 1: プッシュ前にリモートの変更を取り込む
    emit_progress(1, "リモート変更を取り込み中...");
    let pull_output = std::process::Command::new("git")
        .current_dir(&settings.repository_path)
        .args(["pull", "--rebase", "origin", &branch_name])
        .output()
        .map_err(|e| format!("Failed to run git pull: {}", e))?;
    
    if !pull_output.status.success() {
        let stderr = String::from_utf8_lossy(&pull_output.stderr);
        return Err(format!("Pull before push failed: {}\nPlease resolve conflicts manually.", stderr));
    }
    emit_progress(1, "リモート変更取り込み完了");

    // Step 2: Push
    emit_progress(2, "プッシュ中...");
    let push_output = std::process::Command::new("git")
        .current_dir(&settings.repository_path)
        .args(["push", "origin", &branch_name])
        .output()
        .map_err(|e| format!("Failed to run git push: {}", e))?;
    
    if !push_output.status.success() {
        let stderr = String::from_utf8_lossy(&push_output.stderr);
        return Err(format!("Push failed: {}", stderr));
    }
    emit_progress(2, "プッシュ完了");
    
    // Step 3: プッシュ成功後、ローカルのMDXパスも変換（ベストエフォート）
    emit_progress(3, "画像パスを変換中...");
    let _ = std::process::Command::new("/usr/local/bin/npm")
        .current_dir(&settings.repository_path)
        .env("PATH", "/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin")
        .args(["run", "wp:convert-image-paths"])
        .output();
    emit_progress(3, "完了");

    // We need to use the remote variable or Rust will warn about unused
    drop(remote);
    
    Ok(())
}
