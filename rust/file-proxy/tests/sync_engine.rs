use anichisom_file_proxy::connector::FileMetadata;
use anichisom_file_proxy::sync::SyncEngine;

fn make_file(id: &str, name: &str) -> FileMetadata {
    FileMetadata {
        id: id.to_string(),
        name: name.to_string(),
        path: format!("/{}", name),
        mime_type: "text/plain".to_string(),
        size: 1024,
        modified_at: "2025-01-01T00:00:00Z".to_string(),
        sync_status: "synced".to_string(),
        connector_id: "test-connector".to_string(),
    }
}

#[test]
fn test_sync_engine_new() {
    let engine = SyncEngine::new(":memory:");
    assert!(engine.is_ok());
}

#[test]
fn test_upsert_and_list() {
    let engine = SyncEngine::new(":memory:").unwrap();

    engine.upsert_file(&make_file("1", "file1.txt")).unwrap();
    engine.upsert_file(&make_file("2", "file2.txt")).unwrap();

    let files = engine.list_files().unwrap();
    assert_eq!(files.len(), 2);
}

#[test]
fn test_upsert_updates_existing() {
    let engine = SyncEngine::new(":memory:").unwrap();

    engine.upsert_file(&make_file("1", "old.txt")).unwrap();
    engine.upsert_file(&make_file("1", "new.txt")).unwrap();

    let files = engine.list_files().unwrap();
    assert_eq!(files.len(), 1);
    assert_eq!(files[0].name, "new.txt");
}

#[test]
fn test_delete_file() {
    let engine = SyncEngine::new(":memory:").unwrap();

    engine.upsert_file(&make_file("1", "file.txt")).unwrap();
    assert_eq!(engine.list_files().unwrap().len(), 1);

    engine.delete_file("1").unwrap();
    assert_eq!(engine.list_files().unwrap().len(), 0);
}

#[test]
fn test_delete_nonexistent() {
    let engine = SyncEngine::new(":memory:").unwrap();
    // Should not error on delete of nonexistent file
    engine.delete_file("nonexistent").unwrap();
}

#[test]
fn test_sync_status() {
    let engine = SyncEngine::new(":memory:").unwrap();

    engine.upsert_file(&make_file("1", "a.txt")).unwrap();
    engine.upsert_file(&make_file("2", "b.txt")).unwrap();

    let status = engine.get_sync_status().unwrap();
    assert_eq!(status["total"], 2);
    assert_eq!(status["synced"], 2);
    assert_eq!(status["pending"], 0);
}
