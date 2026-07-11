use anichisom_auth::store::{PasskeyStore, SessionStore, StoredPasskey};

#[tokio::test]
async fn test_passkey_store_add_and_get() {
    let store = PasskeyStore::new();
    let passkey = StoredPasskey {
        credential_id: vec![1, 2, 3, 4],
        public_key: vec![5, 6, 7, 8],
        user_id: "alice".to_string(),
        counter: 0,
        label: "YubiKey".to_string(),
    };

    store.add_passkey("alice", passkey.clone()).await;
    let passkeys = store.get_passkeys("alice").await;

    assert_eq!(passkeys.len(), 1);
    assert_eq!(passkeys[0].credential_id, vec![1, 2, 3, 4]);
    assert_eq!(passkeys[0].label, "YubiKey");
}

#[tokio::test]
async fn test_passkey_store_find() {
    let store = PasskeyStore::new();
    store.add_passkey("alice", StoredPasskey {
        credential_id: vec![10, 20],
        public_key: vec![30],
        user_id: "alice".to_string(),
        counter: 0,
        label: "Device 1".to_string(),
    }).await;

    let found = store.find_passkey(&[10, 20]).await;
    assert!(found.is_some());
    assert_eq!(found.unwrap().user_id, "alice");

    let not_found = store.find_passkey(&[99]).await;
    assert!(not_found.is_none());
}

#[tokio::test]
async fn test_passkey_store_update_counter() {
    let store = PasskeyStore::new();
    store.add_passkey("alice", StoredPasskey {
        credential_id: vec![1, 2],
        public_key: vec![3],
        user_id: "alice".to_string(),
        counter: 0,
        label: "Key".to_string(),
    }).await;

    store.update_counter(&[1, 2], 5).await;
    let pk = store.find_passkey(&[1, 2]).await.unwrap();
    assert_eq!(pk.counter, 5);
}

#[tokio::test]
async fn test_passkey_store_multiple_users() {
    let store = PasskeyStore::new();
    store.add_passkey("alice", StoredPasskey {
        credential_id: vec![1],
        public_key: vec![],
        user_id: "alice".to_string(),
        counter: 0,
        label: "A".to_string(),
    }).await;
    store.add_passkey("bob", StoredPasskey {
        credential_id: vec![2],
        public_key: vec![],
        user_id: "bob".to_string(),
        counter: 0,
        label: "B".to_string(),
    }).await;

    assert_eq!(store.get_passkeys("alice").await.len(), 1);
    assert_eq!(store.get_passkeys("bob").await.len(), 1);
    assert_eq!(store.get_passkeys("eve").await.len(), 0);
}

#[tokio::test]
async fn test_passkey_store_empty_user() {
    let store = PasskeyStore::new();
    let passkeys = store.get_passkeys("nonexistent").await;
    assert!(passkeys.is_empty());
}
