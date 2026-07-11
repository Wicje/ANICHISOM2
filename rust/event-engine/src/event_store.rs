use chrono::Utc;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Event {
    pub id: String,
    pub aggregate_id: String,
    pub event_type: String,
    pub payload: serde_json::Value,
    pub metadata: Option<serde_json::Value>,
    pub timestamp: String,
    pub sequence: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppendEventRequest {
    pub aggregate_id: String,
    pub event_type: String,
    pub payload: serde_json::Value,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Clone)]
pub struct EventStore {
    conn: Arc<Mutex<Connection>>,
}

impl EventStore {
    pub fn new(db_path: &str) -> anyhow::Result<Self> {
        let conn = Connection::open(db_path)?;

        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS events (
                id TEXT PRIMARY KEY,
                aggregate_id TEXT NOT NULL,
                event_type TEXT NOT NULL,
                payload TEXT NOT NULL,
                metadata TEXT,
                timestamp TEXT NOT NULL,
                sequence INTEGER NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_events_aggregate ON events(aggregate_id);
            CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
            CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);"
        )?;

        Ok(Self {
            conn: Arc::new(Mutex::new(conn)),
        })
    }

    pub fn append(&self, req: AppendEventRequest) -> anyhow::Result<Event> {
        let conn = self.conn.lock().unwrap();

        let sequence: i64 = conn.query_row(
            "SELECT COALESCE(MAX(sequence), 0) + 1 FROM events WHERE aggregate_id = ?1",
            params![req.aggregate_id],
            |row| row.get(0),
        )?;

        let now = Utc::now().to_rfc3339();
        let event = Event {
            id: Uuid::new_v4().to_string(),
            aggregate_id: req.aggregate_id,
            event_type: req.event_type,
            payload: req.payload,
            metadata: req.metadata,
            timestamp: now,
            sequence,
        };

        conn.execute(
            "INSERT INTO events (id, aggregate_id, event_type, payload, metadata, timestamp, sequence)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                event.id,
                event.aggregate_id,
                event.event_type,
                event.payload.to_string(),
                event.metadata.as_ref().map(|m| m.to_string()),
                event.timestamp,
                event.sequence,
            ],
        )?;

        Ok(event)
    }

    pub fn get_events(&self, aggregate_id: &str) -> anyhow::Result<Vec<Event>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, aggregate_id, event_type, payload, metadata, timestamp, sequence
             FROM events WHERE aggregate_id = ?1 ORDER BY sequence ASC"
        )?;

        let events = stmt.query_map(params![aggregate_id], |row| {
            let payload_str: String = row.get(3)?;
            let metadata_str: Option<String> = row.get(4)?;
            Ok(Event {
                id: row.get(0)?,
                aggregate_id: row.get(1)?,
                event_type: row.get(2)?,
                payload: serde_json::from_str(&payload_str).unwrap_or_default(),
                metadata: metadata_str.and_then(|s| serde_json::from_str(&s).ok()),
                timestamp: row.get(5)?,
                sequence: row.get(6)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

        Ok(events)
    }

    pub fn list_events(&self, offset: i64, limit: i64) -> anyhow::Result<Vec<Event>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, aggregate_id, event_type, payload, metadata, timestamp, sequence
             FROM events ORDER BY timestamp DESC LIMIT ?1 OFFSET ?2"
        )?;

        let events = stmt.query_map(params![limit, offset], |row| {
            let payload_str: String = row.get(3)?;
            let metadata_str: Option<String> = row.get(4)?;
            Ok(Event {
                id: row.get(0)?,
                aggregate_id: row.get(1)?,
                event_type: row.get(2)?,
                payload: serde_json::from_str(&payload_str).unwrap_or_default(),
                metadata: metadata_str.and_then(|s| serde_json::from_str(&s).ok()),
                timestamp: row.get(5)?,
                sequence: row.get(6)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

        Ok(events)
    }

    pub fn get_projection(&self, projection_name: &str) -> anyhow::Result<serde_json::Value> {
        let events = self.list_events(0, 10000)?;

        // Simple projection: apply events in order
        let mut state = serde_json::json!({});
        for event in events {
            // Apply event based on type
            if let Some(obj) = state.as_object_mut() {
                let aggregate_events = obj
                    .entry(&event.aggregate_id)
                    .or_insert_with(|| serde_json::json!({"events": [], "state": {}}));

                if let Some(agg_obj) = aggregate_events.as_object_mut() {
                    if let Some(events_arr) = agg_obj.get_mut("events").and_then(|e| e.as_array_mut()) {
                        events_arr.push(serde_json::json!({
                            "type": event.event_type,
                            "payload": event.payload,
                            "timestamp": event.timestamp,
                        }));
                    }
                }
            }
        }

        Ok(state)
    }
}
