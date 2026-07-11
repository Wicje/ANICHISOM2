use axum::{routing::get, Router};
use std::net::SocketAddr;
use tower_http::cors::{Any, CorsLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod event_store;
mod projection;
mod routes;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::try_from_default_env()
            .unwrap_or_else(|_| "anichisom_events=debug".into()))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let db_path = std::env::var("EVENT_DB_PATH")
        .unwrap_or_else(|_| "anichisom-events.db".into());

    let store = event_store::EventStore::new(&db_path)?;

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/api/events", get(routes::list_events).post(routes::append_event))
        .route("/api/events/:aggregate_id", get(routes::get_events))
        .route("/api/events/projections/:name", get(routes::get_projection))
        .route("/health", get(health))
        .layer(cors)
        .layer(tower_http::trace::TraceLayer::new_for_http())
        .with_state(store);

    let addr = SocketAddr::from(([0, 0, 0, 0], 3003));
    tracing::info!("Event engine listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

async fn health() -> axum::Json<serde_json::Value> {
    axum::Json(serde_json::json!({
        "status": "ok",
        "service": "anichisom-events",
        "version": env!("CARGO_PKG_VERSION"),
    }))
}
