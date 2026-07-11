use anichisom_hw_bridge::device::{DeviceManager, DeviceInfo};

fn make_device(id: &str) -> DeviceInfo {
    DeviceInfo {
        id: id.to_string(),
        name: format!("Device {}", id),
        port: "/dev/ttyUSB0".to_string(),
        baud_rate: 9600,
        connected: false,
        last_data: None,
        device_type: "serial".to_string(),
    }
}

#[test]
fn test_device_manager_new() {
    let manager = DeviceManager::new();
    assert!(manager.list_devices().is_empty());
}

#[test]
fn test_add_and_get() {
    let manager = DeviceManager::new();
    manager.add_device(make_device("dev-1"));

    let device = manager.get_device("dev-1");
    assert!(device.is_some());
    assert_eq!(device.unwrap().name, "Device dev-1");
}

#[test]
fn test_list_devices() {
    let manager = DeviceManager::new();
    manager.add_device(make_device("a"));
    manager.add_device(make_device("b"));

    let devices = manager.list_devices();
    assert_eq!(devices.len(), 2);
}

#[test]
fn test_update_device() {
    let manager = DeviceManager::new();
    manager.add_device(make_device("dev-1"));

    manager.update_device("dev-1", |d| d.connected = true);

    let device = manager.get_device("dev-1").unwrap();
    assert!(device.connected);
}

#[test]
fn test_remove_device() {
    let manager = DeviceManager::new();
    manager.add_device(make_device("dev-1"));
    assert!(manager.get_device("dev-1").is_some());

    manager.remove_device("dev-1");
    assert!(manager.get_device("dev-1").is_none());
}

#[test]
fn test_get_nonexistent() {
    let manager = DeviceManager::new();
    assert!(manager.get_device("nope").is_none());
}
