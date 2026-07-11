use dashmap::DashMap;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PresenceInfo {
    pub user_id: String,
    pub name: String,
    pub cursor: Option<CursorPosition>,
    pub color: String,
    pub last_seen: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CursorPosition {
    pub x: f64,
    pub y: f64,
}

#[derive(Clone)]
pub struct PresenceStore {
    rooms: Arc<DashMap<String, Arc<RwLock<HashMap<String, PresenceInfo>>>>>,
}

impl PresenceStore {
    pub fn new() -> Self {
        Self {
            rooms: Arc::new(DashMap::new()),
        }
    }

    pub async fn update_presence(&self, room_id: &str, info: PresenceInfo) {
        let room = self.rooms
            .entry(room_id.to_string())
            .or_insert_with(|| Arc::new(RwLock::new(HashMap::new())))
            .clone();
        let mut users = room.write().await;
        users.insert(info.user_id.clone(), info);
    }

    pub async fn remove_presence(&self, room_id: &str, user_id: &str) {
        if let Some(room) = self.rooms.get(room_id) {
            let mut users = room.write().await;
            users.remove(user_id);
        }
    }

    pub async fn get_room_presence(&self, room_id: &str) -> Vec<PresenceInfo> {
        if let Some(room) = self.rooms.get(room_id) {
            let users = room.read().await;
            users.values().cloned().collect()
        } else {
            vec![]
        }
    }
}
