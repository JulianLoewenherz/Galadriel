use std::fs;
use std::path::PathBuf;

/// Read a raw data file from data/raw/<date>/<toolkit>.json.
/// The base path is relative to the project root (two levels up from src-tauri/).
#[tauri::command]
fn read_data_file(date: String, toolkit: String) -> Result<String, String> {
    let mut path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    path.pop(); // up from src-tauri/ to ui/
    path.pop(); // up from ui/ to project root
    path.push("data");
    path.push("raw");
    path.push(&date);
    path.push(format!("{}.json", toolkit));

    fs::read_to_string(&path).map_err(|_| format!("no data for {}/{}", date, toolkit))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![read_data_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
