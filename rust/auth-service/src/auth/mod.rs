use crate::store::{SessionStore, PasskeyStore};

#[derive(Clone)]
pub struct AppState {
    pub session_store: SessionStore,
    pub passkey_store: PasskeyStore,
    pub jwt_secret: String,
    pub rp_id: String,
    pub rp_origin: String,
}

#[derive(Debug, thiserror::Error)]
pub enum AuthError {
    #[error("Invalid credentials")]
    InvalidCredentials,
    #[error("Session expired")]
    SessionExpired,
    #[error("Session not found")]
    SessionNotFound,
    #[error("Passkey not found")]
    PasskeyNotFound,
    #[error("Invalid passkey response")]
    InvalidPasskeyResponse,
    #[error("JWT error: {0}")]
    Jwt(#[from] jsonwebtoken::errors::Error),
    #[error("Redis error: {0}")]
    Redis(#[from] redis::RedisError),
    #[error("Internal error: {0}")]
    Internal(String),
    #[error("Anyhow error: {0}")]
    Anyhow(#[from] anyhow::Error),
}

impl axum::response::IntoResponse for AuthError {
    fn into_response(self) -> axum::response::Response {
        let (status, message) = match &self {
            AuthError::InvalidCredentials => (axum::http::StatusCode::UNAUTHORIZED, self.to_string()),
            AuthError::SessionExpired => (axum::http::StatusCode::UNAUTHORIZED, self.to_string()),
            AuthError::SessionNotFound => (axum::http::StatusCode::UNAUTHORIZED, self.to_string()),
            AuthError::PasskeyNotFound => (axum::http::StatusCode::NOT_FOUND, self.to_string()),
            AuthError::InvalidPasskeyResponse => (axum::http::StatusCode::BAD_REQUEST, self.to_string()),
            AuthError::Jwt(_) => (axum::http::StatusCode::UNAUTHORIZED, "Invalid token".to_string()),
            AuthError::Redis(_) => (axum::http::StatusCode::INTERNAL_SERVER_ERROR, "Internal error".to_string()),
            AuthError::Internal(_) => (axum::http::StatusCode::INTERNAL_SERVER_ERROR, self.to_string()),
            AuthError::Anyhow(e) => (axum::http::StatusCode::INTERNAL_SERVER_ERROR, format!("Internal error: {}", e)),
        };

        (status, axum::Json(serde_json::json!({ "error": message }))).into_response()
    }
}
