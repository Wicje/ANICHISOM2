use axum::{
    routing::{get, post},
    Router,
};
use std::net::SocketAddr;
use tower_http::cors::{Any, CorsLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod auth;
mod middleware;
mod routes;
mod store;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::try_from_default_env()
            .unwrap_or_else(|_| "anichisom_auth=debug,tower_http=debug".into()))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let redis_url = std::env::var("REDIS_URL").unwrap_or_else(|_| "redis://127.0.0.1:6379".into());
    let jwt_secret = std::env::var("JWT_SECRET").expect("JWT_SECRET env var required");
    let rp_id = std::env::var("RP_ID").unwrap_or_else(|_| "localhost".into());
    let rp_origin = std::env::var("RP_ORIGIN").unwrap_or_else(|_| "http://localhost:3000".into());

    let session_store = store::SessionStore::new(&redis_url).await?;
    let passkey_store = store::PasskeyStore::new();

    let app_state = auth::AppState {
        session_store,
        passkey_store,
        jwt_secret,
        rp_id,
        rp_origin,
    };

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/api/auth/login", post(routes::login::login))
        .route("/api/auth/logout", post(routes::logout::logout))
        .route("/api/auth/session", get(routes::session::get_session))
        .route("/api/auth/passkey/register/start", post(routes::passkey::register_start))
        .route("/api/auth/passkey/register/finish", post(routes::passkey::register_finish))
        .route("/api/auth/passkey/authenticate/start", post(routes::passkey::authenticate_start))
        .route("/api/auth/passkey/authenticate/finish", post(routes::passkey::authenticate_finish))
        .route("/health", get(health))
        .layer(cors)
        .layer(tower_http::trace::TraceLayer::new_for_http())
        .with_state(app_state);

    let addr = SocketAddr::from(([0, 0, 0, 0], 3001));
    tracing::info!("Auth service listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

async fn health() -> axum::Json<serde_json::Value> {
    axum::Json(serde_json::json!({
        "status": "ok",
        "service": "anichisom-auth",
        "version": env!("CARGO_PKG_VERSION"),
    }))
}
