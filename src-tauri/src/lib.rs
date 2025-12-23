// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use tauri::menu::{AboutMetadataBuilder, MenuBuilder, SubmenuBuilder};

mod commands;

use commands::{
    get_settings, save_repository_settings,
    list_articles, get_article, create_article, update_article, delete_article,
    get_git_status, git_commit, git_push,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // About metadata
            let about = AboutMetadataBuilder::new()
                .name(Some("Fokus. Editor"))
                .version(Some("0.1.0"))
                .authors(Some(vec!["SHEK".to_string()]))
                .comments(Some("書くことに集中するための、ミニマルで美しいMDXエディタ"))
                .copyright(Some("© 2025 SHEK"))
                .build();

            // App submenu with About
            let app_menu = SubmenuBuilder::new(app, "Fokus. Editor")
                .about(Some(about))
                .separator()
                .services()
                .separator()
                .hide()
                .hide_others()
                .show_all()
                .separator()
                .quit()
                .build()?;

            // Edit menu
            let edit_menu = SubmenuBuilder::new(app, "Edit")
                .undo()
                .redo()
                .separator()
                .cut()
                .copy()
                .paste()
                .select_all()
                .build()?;

            // Window menu
            let window_menu = SubmenuBuilder::new(app, "Window")
                .minimize()
                .separator()
                .close_window()
                .build()?;

            // Build menu bar
            let menu = MenuBuilder::new(app)
                .item(&app_menu)
                .item(&edit_menu)
                .item(&window_menu)
                .build()?;

            app.set_menu(menu)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_settings,
            save_repository_settings,
            list_articles,
            get_article,
            create_article,
            update_article,
            delete_article,
            get_git_status,
            git_commit,
            git_push,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
