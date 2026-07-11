use redis::aio::ConnectionManager;
use redis::Client;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use uuid::Uuid;

const SESSION_TTL: u64 = 86400; // 24 hours

#[derive(Clone)]
pub struct SessionStore {
    conn: ConnectionManager,
}

impl SessionStore {
    pub async fn new(redis_url: &str) -> anyhow::Result<Self> {
        let client = Client::open(redis_url)?;
        let conn = ConnectionManager::new(client).await?;
        Ok(Self { conn })
    }

    pub async fn create_session(&self, user_id: &str) -> anyhow::Result<String> {
        let token = Uuid::new_v4().to_string();
        let key = format!("session:{}", token);
        redis::cmd("SETEX")
            .arg(&key)
            .arg(SESSION_TTL)
            .arg(user_id)
            .query_async::<()>(&mut self.conn.clone())
            .await?;
        Ok(token)
    }

    pub async fn get_user_id(&self, token: &str) -> anyhow::Result<Option<String>> {
        let key = format!("session:{}", token);
        let result: Option<String> = redis::cmd("GET")
            .arg(&key)
            .query_async(&mut self.conn.clone())
            .await?;
        Ok(result)
    }

    pub async fn delete_session(&self, token: &str) -> anyhow::Result<()> {
        let key = format!("session:{}", token);
        redis::cmd("DEL")
            .arg(&key)
            .query_async::<()>(&mut self.conn.clone())
            .await?;
        Ok(())
    }

    pub async fn refresh_session(&self, token: &str) -> anyhow::Result<()> {
        let key = format!("session:{}", token);
        redis::cmd("EXPIRE")
            .arg(&key)
            .arg(SESSION_TTL)
            .query_async::<()>(&mut self.conn.clone())
            .await?;
        Ok(())
    }
}

// ─── Passkey Store (in-memory for demo, use DB in production) ─────────────

#[derive(Clone, Debug)]
pub struct StoredPasskey {
    pub credential_id: Vec<u8>,
    pub public_key: Vec<u8>,
    pub user_id: String,
    pub counter: u32,
    pub label: String,
}

pub struct PasskeyStore {
    passkeys: Arc<RwLock<HashMap<String, Vec<StoredPasskey>>>>, // user_id -> passkeys
}

impl Clone for PasskeyStore {
    fn clone(&self) -> Self {
        Self {
            passkeys: Arc::clone(&self.passkeys),
        }
    }
}

impl PasskeyStore {
    pub fn new() -> Self {
        Self {
            passkeys: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub async fn add_passkey(&self, user_id: &str, passkey: StoredPasskey) {
        let mut store = self.passkeys.write().await;
        store
            .entry(user_id.to_string())
            .or_default()
            .push(passkey);
    }

    pub async fn get_passkeys(&self, user_id: &str) -> Vec<StoredPasskey> {
        let store = self.passkeys.read().await;
        store.get(user_id).cloned().unwrap_or_default()
    }

    pub async fn find_passkey(&self, credential_id: &[u8]) -> Option<StoredPasskey> {
        let store = self.passkeys.read().await;
        for passkeys in store.values() {
            for pk in passkeys {
                if pk.credential_id == credential_id {
                    return Some(pk.clone());
                }
            }
        }
        None
    }

    pub async fn update_counter(&self, credential_id: &[u8], new_counter: u32) {
        let mut store = self.passkeys.write().await;
        for passkeys in store.values_mut() {
            for pk in passkeys.iter_mut() {
                if pk.credential_id == credential_id {
                    pk.counter = new_counter;
                    return;
                }
            }
        }
    }
}
