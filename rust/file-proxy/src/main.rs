use axum::{routing::{get, post}, Router};
use std::net::SocketAddr;
use tower_http::cors::{Any, CorsLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod connector;
mod routes;
mod sync;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::try_from_default_env()
            .unwrap_or_else(|_| "anichisom_file_proxy=debug".into()))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let db_path = std::env::var("FILE_DB_PATH")
        .unwrap_or_else(|_| "anichisom-files.db".into());

    let sync_engine = sync::SyncEngine::new(&db_path)?;

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/api/files", get(routes::list_files))
        .route("/api/files/sync", get(routes::sync_status).post(routes::trigger_sync))
        .route("/api/files/:id", get(routes::get_file).put(routes::update_file).delete(routes::delete_file))
        .route("/api/files/connectors", get(routes::list_connectors).post(routes::connect_source))
        .route("/api/files/connectors/:id/disconnect", post(routes::disconnect_source))
        .route("/health", get(health))
        .layer(cors)
        .layer(tower_http::trace::TraceLayer::new_for_http())
        .with_state(sync_engine);

    let addr = SocketAddr::from(([0, 0, 0, 0], 3004));
    tracing::info!("File proxy listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

async fn health() -> axum::Json<serde_json::Value> {
    axum::Json(serde_json::json!({
        "status": "ok",
        "service": "anichisom-file-proxy",
        "version": env!("CARGO_PKG_VERSION"),
    }))
}
