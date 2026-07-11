use axum::{extract::{Path, State}, Json};
use crate::device::{list_serial_ports, DeviceInfo, DeviceManager};

pub async fn list_devices(
    State(manager): State<DeviceManager>,
) -> Result<Json<Vec<DeviceInfo>>, axum::http::StatusCode> {
    Ok(Json(manager.list_devices()))
}

pub async fn get_device(
    State(manager): State<DeviceManager>,
    Path(id): Path<String>,
) -> Result<Json<DeviceInfo>, axum::http::StatusCode> {
    manager
        .get_device(&id)
        .map(Json)
        .ok_or(axum::http::StatusCode::NOT_FOUND)
}

pub async fn list_ports(
) -> Result<Json<Vec<serde_json::Value>>, axum::http::StatusCode> {
    Ok(Json(list_serial_ports()))
}

pub async fn connect_device(
    State(manager): State<DeviceManager>,
    Path(id): Path<String>,
) -> Result<Json<DeviceInfo>, axum::http::StatusCode> {
    let device = DeviceInfo {
        id: id.clone(),
        name: format!("Device {}", id),
        port: "/dev/ttyUSB0".to_string(),
        baud_rate: 9600,
        connected: true,
        last_data: None,
        device_type: "serial".to_string(),
    };

    manager.add_device(device.clone());
    Ok(Json(device))
}

pub async fn disconnect_device(
    State(manager): State<DeviceManager>,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, axum::http::StatusCode> {
    manager.update_device(&id, |d| d.connected = false);
    Ok(Json(serde_json::json!({ "id": id, "connected": false })))
}

pub async fn read_device(
    State(_manager): State<DeviceManager>,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, axum::http::StatusCode> {
    Ok(Json(serde_json::json!({
        "id": id,
        "data": "No data available",
        "timestamp": chrono::Utc::now().to_rfc3339(),
    })))
}

pub async fn write_device(
    State(_manager): State<DeviceManager>,
    Path(id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, axum::http::StatusCode> {
    Ok(Json(serde_json::json!({
        "id": id,
        "bytes_written": payload["data"].as_str().map(|s| s.len()).unwrap_or(0),
        "timestamp": chrono::Utc::now().to_rfc3339(),
    })))
}
