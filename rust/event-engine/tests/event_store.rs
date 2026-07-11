use anichisom_events::event_store::{AppendEventRequest, EventStore};

#[test]
fn test_event_store_new() {
    let store = EventStore::new(":memory:");
    assert!(store.is_ok());
}

#[test]
fn test_append_and_get_events() {
    let store = EventStore::new(":memory:").unwrap();

    let req = AppendEventRequest {
        aggregate_id: "agg-1".to_string(),
        event_type: "test.event".to_string(),
        payload: serde_json::json!({ "key": "value" }),
        metadata: None,
    };

    let event = store.append(req).unwrap();
    assert_eq!(event.aggregate_id, "agg-1");
    assert_eq!(event.event_type, "test.event");
    assert_eq!(event.sequence, 1);

    let events = store.get_events("agg-1").unwrap();
    assert_eq!(events.len(), 1);
    assert_eq!(events[0].sequence, 1);
}

#[test]
fn test_event_sequence_increments() {
    let store = EventStore::new(":memory:").unwrap();

    store.append(AppendEventRequest {
        aggregate_id: "agg-1".to_string(),
        event_type: "event.a".to_string(),
        payload: serde_json::json!({}),
        metadata: None,
    }).unwrap();

    let second = store.append(AppendEventRequest {
        aggregate_id: "agg-1".to_string(),
        event_type: "event.b".to_string(),
        payload: serde_json::json!({}),
        metadata: None,
    }).unwrap();

    assert_eq!(second.sequence, 2);

    let events = store.get_events("agg-1").unwrap();
    assert_eq!(events.len(), 2);
    assert_eq!(events[0].event_type, "event.a");
    assert_eq!(events[1].event_type, "event.b");
}

#[test]
fn test_list_events_pagination() {
    let store = EventStore::new(":memory:").unwrap();

    for i in 0..5 {
        store.append(AppendEventRequest {
            aggregate_id: format!("agg-{}", i),
            event_type: "created".to_string(),
            payload: serde_json::json!({ "i": i }),
            metadata: None,
        }).unwrap();
    }

    let all = store.list_events(0, 10).unwrap();
    assert_eq!(all.len(), 5);

    let page = store.list_events(0, 2).unwrap();
    assert_eq!(page.len(), 2);

    let offset = store.list_events(3, 10).unwrap();
    assert_eq!(offset.len(), 2);
}

#[test]
fn test_different_aggregates() {
    let store = EventStore::new(":memory:").unwrap();

    store.append(AppendEventRequest {
        aggregate_id: "user-1".to_string(),
        event_type: "user.registered".to_string(),
        payload: serde_json::json!({ "name": "Alice" }),
        metadata: None,
    }).unwrap();

    store.append(AppendEventRequest {
        aggregate_id: "workspace-1".to_string(),
        event_type: "workspace.created".to_string(),
        payload: serde_json::json!({ "title": "My Workspace" }),
        metadata: None,
    }).unwrap();

    let user_events = store.get_events("user-1").unwrap();
    assert_eq!(user_events.len(), 1);
    assert_eq!(user_events[0].event_type, "user.registered");

    let ws_events = store.get_events("workspace-1").unwrap();
    assert_eq!(ws_events.len(), 1);
    assert_eq!(ws_events[0].event_type, "workspace.created");
}

#[test]
fn test_empty_aggregate() {
    let store = EventStore::new(":memory:").unwrap();
    let events = store.get_events("nonexistent").unwrap();
    assert!(events.is_empty());
}

#[test]
fn test_projection() {
    let store = EventStore::new(":memory:").unwrap();

    store.append(AppendEventRequest {
        aggregate_id: "ws-1".to_string(),
        event_type: "workspace.created".to_string(),
        payload: serde_json::json!({ "title": "Test Workspace" }),
        metadata: None,
    }).unwrap();

    let projection = store.get_projection("workspace").unwrap();
    assert!(projection.is_object());
}
