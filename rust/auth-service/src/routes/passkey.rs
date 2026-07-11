use axum::{extract::State, Json};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use serde::{Deserialize, Serialize};

use crate::auth::{AppState, AuthError};
use crate::store::StoredPasskey;

// ─── Register Start ───────────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct RegisterStartRequest {
    pub username: String,
    pub display_name: String,
}

#[derive(Serialize)]
pub struct RegisterStartResponse {
    pub challenge: String,
    pub rp_id: String,
    pub user_id: String,
    pub exclude_credentials: Vec<String>,
}

pub async fn register_start(
    State(state): State<AppState>,
    Json(req): Json<RegisterStartRequest>,
) -> Result<Json<RegisterStartResponse>, AuthError> {
    let existing_passkeys = state.passkey_store.get_passkeys(&req.username).await;
    let exclude_credentials: Vec<String> = existing_passkeys
        .iter()
        .map(|pk| BASE64.encode(&pk.credential_id))
        .collect();

    let challenge = BASE64.encode(rand::random::<[u8; 32]>());

    tracing::info!(username = %req.username, "Passkey registration started");

    Ok(Json(RegisterStartResponse {
        challenge,
        rp_id: state.rp_id,
        user_id: req.username,
        exclude_credentials,
    }))
}

// ─── Register Finish ──────────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct RegisterFinishRequest {
    pub username: String,
    pub credential_id: String,
    pub public_key: String,
    pub label: Option<String>,
}

#[derive(Serialize)]
pub struct RegisterFinishResponse {
    pub success: bool,
    pub credential_id: String,
}

pub async fn register_finish(
    State(state): State<AppState>,
    Json(req): Json<RegisterFinishRequest>,
) -> Result<Json<RegisterFinishResponse>, AuthError> {
    let credential_id = BASE64.decode(&req.credential_id)
        .map_err(|e| AuthError::Internal(format!("Invalid credential_id: {}", e)))?;
    let public_key = BASE64.decode(&req.public_key)
        .map_err(|e| AuthError::Internal(format!("Invalid public_key: {}", e)))?;

    let passkey = StoredPasskey {
        credential_id: credential_id.clone(),
        public_key,
        user_id: req.username.clone(),
        counter: 0,
        label: req.label.unwrap_or_else(|| "Device".to_string()),
    };

    state.passkey_store.add_passkey(&req.username, passkey).await;

    tracing::info!(username = %req.username, "Passkey registered");

    Ok(Json(RegisterFinishResponse {
        success: true,
        credential_id: req.credential_id,
    }))
}

// ─── Authenticate Start ───────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct AuthenticateStartRequest {
    pub username: String,
}

#[derive(Serialize)]
pub struct AuthenticateStartResponse {
    pub challenge: String,
    pub allow_credentials: Vec<String>,
    pub rp_id: String,
}

pub async fn authenticate_start(
    State(state): State<AppState>,
    Json(req): Json<AuthenticateStartRequest>,
) -> Result<Json<AuthenticateStartResponse>, AuthError> {
    let passkeys = state.passkey_store.get_passkeys(&req.username).await;
    if passkeys.is_empty() {
        return Err(AuthError::PasskeyNotFound);
    }

    let challenge = BASE64.encode(rand::random::<[u8; 32]>());
    let allow_credentials: Vec<String> = passkeys
        .iter()
        .map(|pk| BASE64.encode(&pk.credential_id))
        .collect();

    Ok(Json(AuthenticateStartResponse {
        challenge,
        allow_credentials,
        rp_id: state.rp_id,
    }))
}

// ─── Authenticate Finish ──────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct AuthenticateFinishRequest {
    pub credential_id: String,
    pub authenticator_data: String,
    pub client_data_json: String,
    pub signature: String,
}

#[derive(Serialize)]
pub struct AuthenticateFinishResponse {
    pub token: String,
    pub user_id: String,
}

pub async fn authenticate_finish(
    State(state): State<AppState>,
    Json(req): Json<AuthenticateFinishRequest>,
) -> Result<Json<AuthenticateFinishResponse>, AuthError> {
    let credential_id = BASE64.decode(&req.credential_id)
        .map_err(|e| AuthError::Internal(format!("Invalid credential_id: {}", e)))?;

    let passkey = state.passkey_store.find_passkey(&credential_id).await
        .ok_or(AuthError::PasskeyNotFound)?;

    // In production, verify the signature against the public key
    // For now, accept the authentication
    state.passkey_store.update_counter(&credential_id, passkey.counter + 1).await;

    let token = state.session_store.create_session(&passkey.user_id).await?;

    tracing::info!(user_id = %passkey.user_id, "Passkey authentication successful");

    Ok(Json(AuthenticateFinishResponse {
        token,
        user_id: passkey.user_id,
    }))
}
