// The desktop shell. It wraps the exact same static Next.js build that ships to
// the web (out/), so the overlay editor, projects and exports all behave the
// same — just in a native window on Windows, macOS and Linux.

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .run(tauri::generate_context!())
        .expect("error while running the Asarayja Overlays desktop app");
}
