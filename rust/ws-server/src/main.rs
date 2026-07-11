use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        Query, State,
    },
    response::IntoResponse,
    routing::get,
    Router,
};
use dashmap::DashMap;
use futures_util::{SinkExt, StreamExt};
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::sync::broadcast;
use tower_http::cors::{Any, CorsLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use uuid::Uuid;

mod presence;
mod yjs;

#[derive(Clone)]
struct AppState {
    rooms: Arc<DashMap<String, broadcast::Sender<String>>>,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::try_from_default_env()
            .unwrap_or_else(|_| "anichisom_ws=debug".into()))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let state = AppState {
        rooms: Arc::new(DashMap::new()),
    };

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/ws", get(ws_handler))
        .route("/health", get(health))
        .layer(cors)
        .layer(tower_http::trace::TraceLayer::new_for_http())
        .with_state(state);

    let addr = SocketAddr::from(([0, 0, 0, 0], 3002));
    tracing::info!("WebSocket server listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

async fn health() -> axum::Json<serde_json::Value> {
    axum::Json(serde_json::json!({
        "status": "ok",
        "service": "anichisom-ws",
        "version": env!("CARGO_PKG_VERSION"),
    }))
}

#[derive(serde::Deserialize)]
struct WsQuery {
    room: Option<String>,
}

async fn ws_handler(
    ws: WebSocketUpgrade,
    Query(query): Query<WsQuery>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    let room_id = query.room.unwrap_or_else(|| "default".to_string());
    ws.on_upgrade(move |socket| handle_socket(socket, room_id, state))
}

async fn handle_socket(socket: WebSocket, room_id: String, state: AppState) {
    let user_id = Uuid::new_v4().to_string();
    tracing::info!(user_id = %user_id, room = %room_id, "WebSocket connected");

    let (mut sender, mut receiver) = socket.split();

    // Get or create room channel
    let tx = state.rooms.entry(room_id.clone())
        .or_insert_with(|| {
            let (tx, _) = broadcast::channel(256);
            tx
        })
        .clone();

    let mut rx = tx.subscribe();

    // Spawn task to forward broadcast messages to this client
    let mut send_user_id = user_id.clone();
    let send_task = tokio::spawn(async move {
        while let Ok(msg) = rx.recv().await {
            if sender.send(Message::Text(msg.into())).await.is_err() {
                break;
            }
        }
    });

    // Handle incoming messages
    let tx_clone = tx.clone();
    let recv_user_id = user_id.clone();
    let recv_task = tokio::spawn(async move {
        while let Some(Ok(msg)) = receiver.next().await {
            match msg {
                Message::Text(text) => {
                    // Broadcast to room
                    let _ = tx_clone.send(text.to_string());
                }
                Message::Close(_) => break,
                _ => {}
            }
        }
    });

    // Wait for either task to complete
    tokio::select! {
        _ = send_task => {},
        _ = recv_task => {},
    }

    tracing::info!(user_id = %recv_user_id, room = %room_id, "WebSocket disconnected");
}
