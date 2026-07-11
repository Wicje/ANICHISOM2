use axum::{extract::State, Json};
use serde::{Deserialize, Serialize};

use crate::auth::{AppState, AuthError};

#[derive(Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

#[derive(Serialize)]
pub struct LoginResponse {
    pub token: String,
    pub user_id: String,
}

pub async fn login(
    State(state): State<AppState>,
    Json(req): Json<LoginRequest>,
) -> Result<Json<LoginResponse>, AuthError> {
    // In production, verify against database with argon2
    // For demo, accept any non-empty credentials
    if req.username.is_empty() || req.password.is_empty() {
        return Err(AuthError::InvalidCredentials);
    }

    let user_id = req.username.clone();
    let token = state.session_store.create_session(&user_id).await?;

    tracing::info!(user_id = %user_id, "User logged in");

    Ok(Json(LoginResponse {
        token,
        user_id,
    }))
}
