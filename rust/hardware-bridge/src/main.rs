use axum::{routing::get, Router};
use std::net::SocketAddr;
use tower_http::cors::{Any, CorsLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod device;
mod routes;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::try_from_default_env()
            .unwrap_or_else(|_| "anichisom_hw_bridge=debug".into()))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let device_manager = device::DeviceManager::new();

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/api/hardware", get(routes::list_devices))
        .route("/api/hardware/ports", get(routes::list_ports))
        .route("/api/hardware/:id", get(routes::get_device))
        .route("/api/hardware/:id/connect", get(routes::connect_device))
        .route("/api/hardware/:id/disconnect", get(routes::disconnect_device))
        .route("/api/hardware/:id/read", get(routes::read_device))
        .route("/api/hardware/:id/write", get(routes::write_device))
        .route("/health", get(health))
        .layer(cors)
        .layer(tower_http::trace::TraceLayer::new_for_http())
        .with_state(device_manager);

    let addr = SocketAddr::from(([0, 0, 0, 0], 3005));
    tracing::info!("Hardware bridge listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

async fn health() -> axum::Json<serde_json::Value> {
    axum::Json(serde_json::json!({
        "status": "ok",
        "service": "anichisom-hw-bridge",
        "version": env!("CARGO_PKG_VERSION"),
    }))
}
