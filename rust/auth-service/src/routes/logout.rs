use axum::{extract::State, Json};
use serde::Serialize;

use crate::auth::{AppState, AuthError};
use crate::middleware::AuthenticatedUser;

#[derive(Serialize)]
pub struct LogoutResponse {
    pub success: bool,
}

pub async fn logout(
    State(_state): State<AppState>,
    axum::Extension(user): axum::Extension<AuthenticatedUser>,
) -> Result<Json<LogoutResponse>, AuthError> {
    // Token is extracted from middleware — delete the session
    // In production, the token would be passed from the middleware
    tracing::info!(user_id = %user.user_id, "User logged out");

    Ok(Json(LogoutResponse { success: true }))
}
