use axum::{
    extract::{Path, Query, State},
    Json,
};
use serde::{Deserialize, Serialize};

use crate::event_store::{AppendEventRequest, EventStore};

#[derive(Deserialize)]
pub struct ListParams {
    pub offset: Option<i64>,
    pub limit: Option<i64>,
}

#[derive(Serialize)]
pub struct ListResponse {
    pub events: Vec<crate::event_store::Event>,
    pub total: usize,
}

pub async fn list_events(
    State(store): State<EventStore>,
    Query(params): Query<ListParams>,
) -> Result<Json<ListResponse>, axum::http::StatusCode> {
    let offset = params.offset.unwrap_or(0);
    let limit = params.limit.unwrap_or(100);

    store
        .list_events(offset, limit)
        .map(|events| {
            let total = events.len();
            Json(ListResponse { events, total })
        })
        .map_err(|_| axum::http::StatusCode::INTERNAL_SERVER_ERROR)
}

pub async fn append_event(
    State(store): State<EventStore>,
    Json(req): Json<AppendEventRequest>,
) -> Result<Json<crate::event_store::Event>, axum::http::StatusCode> {
    store
        .append(req)
        .map(Json)
        .map_err(|_| axum::http::StatusCode::INTERNAL_SERVER_ERROR)
}

pub async fn get_events(
    State(store): State<EventStore>,
    Path(aggregate_id): Path<String>,
) -> Result<Json<Vec<crate::event_store::Event>>, axum::http::StatusCode> {
    store
        .get_events(&aggregate_id)
        .map(Json)
        .map_err(|_| axum::http::StatusCode::INTERNAL_SERVER_ERROR)
}

pub async fn get_projection(
    State(store): State<EventStore>,
    Path(name): Path<String>,
) -> Result<Json<serde_json::Value>, axum::http::StatusCode> {
    store
        .get_projection(&name)
        .map(Json)
        .map_err(|_| axum::http::StatusCode::INTERNAL_SERVER_ERROR)
}
