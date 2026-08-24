// Git commands
use crate::commands::settings::get_settings;
use git2::{Repository, Signature, StatusOptions};
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::process::{Command, Output};
use tauri::Emitter;

const COMMAND_PATH: &str = "/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin";

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
    let head = repo
        .head()
        .map_err(|e| format!("Failed to get HEAD: {}", e))?;
    let branch = head.shorthand().unwrap_or("unknown").to_string();

    // Get status
    let mut opts = StatusOptions::new();
    opts.include_untracked(true);
    opts.recurse_untracked_dirs(true); // ディレクトリの中身を展開してファイル単位で取得

    let statuses = repo
        .statuses(Some(&mut opts))
        .map_err(|e| format!("Failed to get status: {}", e))?;

    let mut modified = Vec::new();
    let mut added = Vec::new();
    let mut deleted = Vec::new();

    for entry in statuses.iter() {
        let status = entry.status();
        let path = entry.path().unwrap_or("").to_string();

        // mdx, md, および画像ファイルのみを対象とする
        if is_target_path(&path) {
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
    let local_oid = head
        .target()
        .ok_or_else(|| git2::Error::from_str("No local target"))?;

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
    #[serde(default)]
    pub files: Option<Vec<String>>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct GitProgress {
    step: u32,
    total: u32,
    message: String,
    level: ProgressLevel,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "lowercase")]
enum ProgressLevel {
    Info,
    Success,
    Warning,
    Error,
}

fn emit_progress(
    app: &tauri::AppHandle,
    event: &str,
    step: u32,
    total: u32,
    message: impl Into<String>,
    level: ProgressLevel,
) {
    if let Err(error) = app.emit(
        event,
        GitProgress {
            step,
            total,
            message: message.into(),
            level,
        },
    ) {
        eprintln!("Failed to emit {event}: {error}");
    }
}

fn run_npm_script(repository_path: &str, script: &str) -> Result<Output, String> {
    Command::new("/usr/bin/env")
        .current_dir(repository_path)
        .env("PATH", COMMAND_PATH)
        .args(["npm", "run", script])
        .output()
        .map_err(|error| format!("Failed to run {script}: {error}"))
}

fn command_error(output: &Output) -> String {
    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();

    match (stdout.is_empty(), stderr.is_empty()) {
        (false, false) => format!("{stdout}\n{stderr}"),
        (false, true) => stdout,
        (true, false) => stderr,
        (true, true) => format!("process exited with {}", output.status),
    }
}

fn is_target_path(path: &str) -> bool {
    let path = path.to_lowercase();
    [".mdx", ".md", ".png", ".jpg", ".jpeg", ".gif", ".webp"]
        .iter()
        .any(|extension| path.ends_with(extension))
}

fn stage_path(index: &mut git2::Index, file: &str) -> Result<(), String> {
    index
        .add_all([file].iter(), git2::IndexAddOption::DEFAULT, None)
        .map_err(|error| format!("Failed to add file {file}: {error}"))
}

fn stage_target_changes(repo: &Repository, index: &mut git2::Index) -> Result<(), String> {
    let mut options = StatusOptions::new();
    options.include_untracked(true).recurse_untracked_dirs(true);

    let statuses = repo
        .statuses(Some(&mut options))
        .map_err(|error| format!("Failed to get converted file status: {error}"))?;

    for entry in statuses.iter() {
        if let Some(path) = entry.path().filter(|path| is_target_path(path)) {
            stage_path(index, path)?;
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn git_commit(app: tauri::AppHandle, request: CommitRequest) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || git_commit_blocking(&app, request))
        .await
        .map_err(|error| format!("Commit task failed: {error}"))?
}

fn git_commit_blocking(app: &tauri::AppHandle, request: CommitRequest) -> Result<String, String> {
    let repo = open_repo()?;
    let settings = get_settings()?;
    let repository_path = settings.repository_path;

    let images_dir = Path::new(&repository_path).join("src/assets/images");
    if images_dir.exists() {
        emit_progress(
            app,
            "commit-progress",
            1,
            3,
            "画像をR2にアップロード中...",
            ProgressLevel::Info,
        );

        let upload_output = match run_npm_script(&repository_path, "wp:upload-images") {
            Ok(output) => output,
            Err(error) => {
                emit_progress(
                    app,
                    "commit-progress",
                    1,
                    3,
                    "画像アップロードを実行できませんでした",
                    ProgressLevel::Error,
                );
                return Err(error);
            }
        };
        if !upload_output.status.success() {
            let details = command_error(&upload_output);
            if details.contains("Missing R2 environment variables") {
                emit_progress(
                    app,
                    "commit-progress",
                    1,
                    3,
                    "R2未設定のため画像アップロードをスキップ",
                    ProgressLevel::Warning,
                );
                emit_progress(
                    app,
                    "commit-progress",
                    2,
                    3,
                    "画像パス変換をスキップ",
                    ProgressLevel::Warning,
                );
            } else {
                emit_progress(
                    app,
                    "commit-progress",
                    1,
                    3,
                    "画像アップロードに失敗しました",
                    ProgressLevel::Error,
                );
                return Err(format!("Image upload failed: {details}"));
            }
        } else {
            emit_progress(
                app,
                "commit-progress",
                1,
                3,
                "画像アップロード完了",
                ProgressLevel::Success,
            );
            emit_progress(
                app,
                "commit-progress",
                2,
                3,
                "画像パスを変換中...",
                ProgressLevel::Info,
            );

            let convert_output = match run_npm_script(&repository_path, "wp:convert-image-paths") {
                Ok(output) => output,
                Err(error) => {
                    emit_progress(
                        app,
                        "commit-progress",
                        2,
                        3,
                        "画像パス変換を実行できませんでした",
                        ProgressLevel::Error,
                    );
                    return Err(error);
                }
            };
            if !convert_output.status.success() {
                emit_progress(
                    app,
                    "commit-progress",
                    2,
                    3,
                    "画像パス変換に失敗しました",
                    ProgressLevel::Error,
                );
                return Err(format!(
                    "Image path conversion failed: {}",
                    command_error(&convert_output)
                ));
            }

            emit_progress(
                app,
                "commit-progress",
                2,
                3,
                "画像パス変換完了",
                ProgressLevel::Success,
            );
        }
    } else {
        emit_progress(
            app,
            "commit-progress",
            1,
            3,
            "画像処理不要 - スキップ",
            ProgressLevel::Info,
        );
        emit_progress(
            app,
            "commit-progress",
            2,
            3,
            "画像パス変換不要 - スキップ",
            ProgressLevel::Info,
        );
    }

    emit_progress(
        app,
        "commit-progress",
        3,
        3,
        "コミット中...",
        ProgressLevel::Info,
    );

    // Get index and add changes
    let mut index = repo
        .index()
        .map_err(|e| format!("Failed to get index: {}", e))?;

    if let Some(files) = request.files {
        for file in files {
            stage_path(&mut index, &file)?;
        }
    } else {
        index
            .add_all(["*"].iter(), git2::IndexAddOption::DEFAULT, None)
            .map_err(|e| format!("Failed to add files: {}", e))?;
    }

    // パス変換によって新たに変更されたMDXも同じコミットへ含める。
    stage_target_changes(&repo, &mut index)?;

    index
        .write()
        .map_err(|e| format!("Failed to write index: {}", e))?;

    let tree_id = index
        .write_tree()
        .map_err(|e| format!("Failed to write tree: {}", e))?;

    let tree = repo
        .find_tree(tree_id)
        .map_err(|e| format!("Failed to find tree: {}", e))?;

    // Get signature from git config
    let sig = repo
        .signature()
        .or_else(|_| {
            // Fallback: try to get from git config manually
            if let Ok(config) = repo.config() {
                let name = config
                    .get_string("user.name")
                    .unwrap_or_else(|_| "Unknown".to_string());
                let email = config
                    .get_string("user.email")
                    .unwrap_or_else(|_| "unknown@example.com".to_string());
                Signature::now(&name, &email)
            } else {
                Signature::now("Unknown", "unknown@example.com")
            }
        })
        .map_err(|e| format!("Failed to create signature: {}", e))?;

    // Get parent commit
    let head = repo
        .head()
        .map_err(|e| format!("Failed to get HEAD: {}", e))?;
    let parent_commit = head
        .peel_to_commit()
        .map_err(|e| format!("Failed to get parent commit: {}", e))?;

    // Create commit
    let commit_id = repo
        .commit(
            Some("HEAD"),
            &sig,
            &sig,
            &request.message,
            &tree,
            &[&parent_commit],
        )
        .map_err(|e| format!("Failed to commit: {}", e))?;

    emit_progress(
        app,
        "commit-progress",
        3,
        3,
        "コミット完了",
        ProgressLevel::Success,
    );

    Ok(commit_id.to_string())
}


#[tauri::command]
pub async fn git_push(app: tauri::AppHandle) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || git_push_blocking(&app))
        .await
        .map_err(|error| format!("Push task failed: {error}"))?
}

fn git_push_blocking(app: &tauri::AppHandle) -> Result<(), String> {
    let repo = open_repo()?;

    let remote = repo
        .find_remote("origin")
        .map_err(|e| format!("Failed to find remote: {}", e))?;

    // Get current branch
    let head = repo
        .head()
        .map_err(|e| format!("Failed to get HEAD: {}", e))?;
    let branch_name = head.shorthand().unwrap_or("main").to_string();

    // Push using git command (git2 push requires complex auth setup)
    let settings = get_settings()?;
    emit_progress(
        app,
        "push-progress",
        1,
        2,
        "プッシュ中...",
        ProgressLevel::Info,
    );

    let output = Command::new("git")
        .current_dir(&settings.repository_path)
        .args(["push", "origin", &branch_name])
        .output()
        .map_err(|e| format!("Failed to run git push: {}", e))?;

    if !output.status.success() {
        emit_progress(
            app,
            "push-progress",
            1,
            2,
            "プッシュに失敗しました",
            ProgressLevel::Error,
        );
        return Err(format!("Push failed: {}", command_error(&output)));
    }

    emit_progress(
        app,
        "push-progress",
        1,
        2,
        "プッシュ完了",
        ProgressLevel::Success,
    );

    // プッシュは成功済みなので、変換失敗は警告として扱う。
    emit_progress(
        app,
        "push-progress",
        2,
        2,
        "ローカルの画像パスを変換中...",
        ProgressLevel::Info,
    );

    match run_npm_script(&settings.repository_path, "wp:convert-image-paths") {
        Ok(convert_output) if convert_output.status.success() => emit_progress(
            app,
            "push-progress",
            2,
            2,
            "画像パス変換完了",
            ProgressLevel::Success,
        ),
        Ok(convert_output) => {
            let details = command_error(&convert_output);
            eprintln!("Image path conversion after push failed: {details}");
            emit_progress(
                app,
                "push-progress",
                2,
                2,
                "画像パス変換に失敗（プッシュは完了）",
                ProgressLevel::Warning,
            );
        }
        Err(error) => {
            eprintln!("Image path conversion after push failed: {error}");
            emit_progress(
                app,
                "push-progress",
                2,
                2,
                "画像パス変換を実行できませんでした（プッシュは完了）",
                ProgressLevel::Warning,
            );
        }
    }

    // We need to use the remote variable or Rust will warn about unused
    drop(remote);

    Ok(())
}
