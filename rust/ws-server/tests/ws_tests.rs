use anichisom_ws::presence::{CursorPosition, PresenceInfo, PresenceStore};
use anichisom_ws::yjs::YjsDocument;

#[tokio::test]
async fn test_presence_store_add_and_get() {
    let store = PresenceStore::new();

    store.update_presence("room-1", PresenceInfo {
        user_id: "alice".to_string(),
        name: "Alice".to_string(),
        cursor: Some(CursorPosition { x: 10.0, y: 20.0 }),
        color: "#ff0000".to_string(),
        last_seen: 1000,
    }).await;

    let presence = store.get_room_presence("room-1").await;
    assert_eq!(presence.len(), 1);
    assert_eq!(presence[0].user_id, "alice");
}

#[tokio::test]
async fn test_presence_store_remove() {
    let store = PresenceStore::new();

    store.update_presence("room-1", PresenceInfo {
        user_id: "alice".to_string(),
        name: "Alice".to_string(),
        cursor: None,
        color: "#ff0000".to_string(),
        last_seen: 1000,
    }).await;

    assert_eq!(store.get_room_presence("room-1").await.len(), 1);

    store.remove_presence("room-1", "alice").await;
    assert_eq!(store.get_room_presence("room-1").await.len(), 0);
}

#[tokio::test]
async fn test_presence_store_multiple_rooms() {
    let store = PresenceStore::new();

    store.update_presence("room-1", PresenceInfo {
        user_id: "alice".to_string(),
        name: "Alice".to_string(),
        cursor: None,
        color: "#ff0000".to_string(),
        last_seen: 1000,
    }).await;

    store.update_presence("room-2", PresenceInfo {
        user_id: "bob".to_string(),
        name: "Bob".to_string(),
        cursor: None,
        color: "#00ff00".to_string(),
        last_seen: 1000,
    }).await;

    assert_eq!(store.get_room_presence("room-1").await.len(), 1);
    assert_eq!(store.get_room_presence("room-2").await.len(), 1);
}

#[tokio::test]
async fn test_presence_store_empty_room() {
    let store = PresenceStore::new();
    assert!(store.get_room_presence("empty").await.is_empty());
}

#[test]
fn test_yjs_document_new() {
    let doc = YjsDocument::new("doc-1".to_string());
    assert!(doc.get_state().is_empty());
}

#[test]
fn test_yjs_document_apply_update() {
    let mut doc = YjsDocument::new("doc-1".to_string());
    doc.apply_update(&[1, 2, 3]);
    assert_eq!(doc.get_state(), &[1, 2, 3]);

    doc.apply_update(&[4, 5]);
    assert_eq!(doc.get_state(), &[1, 2, 3, 4, 5]);
}
