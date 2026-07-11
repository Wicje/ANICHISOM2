use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct YjsUpdate {
    pub document_id: String,
    pub update: Vec<u8>,
    pub user_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct YjsAwareness {
    pub document_id: String,
    pub user_id: String,
    pub state: serde_json::Value,
}

pub struct YjsDocument {
    id: String,
    state: Vec<u8>,
}

impl YjsDocument {
    pub fn new(id: String) -> Self {
        Self {
            id,
            state: Vec::new(),
        }
    }

    pub fn apply_update(&mut self, update: &[u8]) {
        self.state.extend_from_slice(update);
    }

    pub fn get_state(&self) -> &[u8] {
        &self.state
    }
}
