use axum::{extract::State, Json};
use serde::Serialize;

use crate::connector::FileMetadata;
use crate::sync::SyncEngine;

#[derive(Serialize)]
pub struct ListResponse {
    pub files: Vec<FileMetadata>,
    pub total: usize,
}

pub async fn list_files(
    State(engine): State<SyncEngine>,
) -> Result<Json<ListResponse>, axum::http::StatusCode> {
    engine
        .list_files()
        .map(|files| {
            let total = files.len();
            Json(ListResponse { files, total })
        })
        .map_err(|_| axum::http::StatusCode::INTERNAL_SERVER_ERROR)
}

pub async fn get_file(
    State(engine): State<SyncEngine>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Result<Json<FileMetadata>, axum::http::StatusCode> {
    // In production, fetch from DB by ID
    Err(axum::http::StatusCode::NOT_FOUND)
}

pub async fn update_file(
    State(engine): State<SyncEngine>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(file): Json<FileMetadata>,
) -> Result<Json<FileMetadata>, axum::http::StatusCode> {
    engine
        .upsert_file(&file)
        .map(|_| Json(file))
        .map_err(|_| axum::http::StatusCode::INTERNAL_SERVER_ERROR)
}

pub async fn delete_file(
    State(engine): State<SyncEngine>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Result<Json<serde_json::Value>, axum::http::StatusCode> {
    engine
        .delete_file(&id)
        .map(|_| Json(serde_json::json!({ "deleted": true })))
        .map_err(|_| axum::http::StatusCode::INTERNAL_SERVER_ERROR)
}

pub async fn sync_status(
    State(engine): State<SyncEngine>,
) -> Result<Json<serde_json::Value>, axum::http::StatusCode> {
    engine
        .get_sync_status()
        .map(Json)
        .map_err(|_| axum::http::StatusCode::INTERNAL_SERVER_ERROR)
}

pub async fn trigger_sync(
    State(engine): State<SyncEngine>,
) -> Result<Json<serde_json::Value>, axum::http::StatusCode> {
    // In production, trigger background sync for all connectors
    Ok(Json(serde_json::json!({ "status": "sync_started" })))
}

pub async fn list_connectors(
) -> Result<Json<serde_json::Value>, axum::http::StatusCode> {
    Ok(Json(serde_json::json!({
        "connectors": [
            { "id": "onedrive", "name": "OneDrive", "status": "available" },
            { "id": "googledrive", "name": "Google Drive", "status": "available" },
            { "id": "local", "name": "Local Folder", "status": "available" },
        ]
    })))
}

pub async fn connect_source(
    Json(config): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, axum::http::StatusCode> {
    let id = uuid::Uuid::new_v4().to_string();
    Ok(Json(serde_json::json!({
        "id": id,
        "status": "connected",
        "provider": config["provider"],
    })))
}

pub async fn disconnect_source(
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Result<Json<serde_json::Value>, axum::http::StatusCode> {
    Ok(Json(serde_json::json!({
        "id": id,
        "status": "disconnected",
    })))
}
