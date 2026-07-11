use axum::{extract::State, Json};
use serde::Serialize;

use crate::auth::{AppState, AuthError};

#[derive(Serialize)]
pub struct SessionResponse {
    pub authenticated: bool,
    pub user_id: Option<String>,
}

pub async fn get_session(
    State(state): State<AppState>,
    axum::http::request::Parts { headers, .. }: axum::http::request::Parts,
) -> Result<Json<SessionResponse>, AuthError> {
    let token = headers
        .get("Authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "));

    let user_id = match token {
        Some(t) => state.session_store.get_user_id(t).await?,
        None => None,
    };

    Ok(Json(SessionResponse {
        authenticated: user_id.is_some(),
        user_id,
    }))
}
