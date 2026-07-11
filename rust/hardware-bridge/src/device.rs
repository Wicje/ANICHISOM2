use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceInfo {
    pub id: String,
    pub name: String,
    pub port: String,
    pub baud_rate: u32,
    pub connected: bool,
    pub last_data: Option<String>,
    pub device_type: String,
}

#[derive(Clone)]
pub struct DeviceManager {
    devices: Arc<Mutex<HashMap<String, DeviceInfo>>>,
}

impl DeviceManager {
    pub fn new() -> Self {
        Self {
            devices: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn list_devices(&self) -> Vec<DeviceInfo> {
        let devices = self.devices.lock().unwrap();
        devices.values().cloned().collect()
    }

    pub fn get_device(&self, id: &str) -> Option<DeviceInfo> {
        let devices = self.devices.lock().unwrap();
        devices.get(id).cloned()
    }

    pub fn add_device(&self, device: DeviceInfo) {
        let mut devices = self.devices.lock().unwrap();
        devices.insert(device.id.clone(), device);
    }

    pub fn remove_device(&self, id: &str) {
        let mut devices = self.devices.lock().unwrap();
        devices.remove(id);
    }

    pub fn update_device(&self, id: &str, updater: impl FnOnce(&mut DeviceInfo)) {
        let mut devices = self.devices.lock().unwrap();
        if let Some(device) = devices.get_mut(id) {
            updater(device);
        }
    }
}

pub fn list_serial_ports() -> Vec<serde_json::Value> {
    serialport::available_ports()
                .map(|ports| {
            ports
                .iter()
                .map(|p| {
                    serde_json::json!({
                        "port": p.port_name,
                        "type": format!("{:?}", p.port_type),
                    })
                })
                .collect()
        })
        .unwrap_or_default()
}
