use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectorConfig {
    pub id: String,
    pub name: String,
    pub provider: String,
    pub access_token: Option<String>,
    pub refresh_token: Option<String>,
    pub expires_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileMetadata {
    pub id: String,
    pub name: String,
    pub path: String,
    pub mime_type: String,
    pub size: i64,
    pub modified_at: String,
    pub sync_status: String,
    pub connector_id: String,
}

pub struct OneDriveConnector {
    config: ConnectorConfig,
    client: reqwest::Client,
}

impl OneDriveConnector {
    pub fn new(config: ConnectorConfig) -> Self {
        Self {
            config,
            client: reqwest::Client::new(),
        }
    }

    pub async fn list_files(&self, path: &str) -> anyhow::Result<Vec<FileMetadata>> {
        let token = self.config.access_token.as_ref()
            .ok_or_else(|| anyhow::anyhow!("No access token"))?;

        let url = format!(
            "https://graph.microsoft.com/v1.0/me/drive/root:{}:/children",
            path
        );

        let resp = self.client
            .get(&url)
            .bearer_auth(token)
            .send()
            .await?
            .json::<serde_json::Value>()
            .await?;

        let files = resp["value"]
            .as_array()
            .map(|arr| {
                arr.iter()
                    .map(|item| FileMetadata {
                        id: item["id"].as_str().unwrap_or("").to_string(),
                        name: item["name"].as_str().unwrap_or("").to_string(),
                        path: format!("{}/{}", path, item["name"].as_str().unwrap_or("")),
                        mime_type: item["file"]["mimeType"].as_str().unwrap_or("application/octet-stream").to_string(),
                        size: item["size"].as_i64().unwrap_or(0),
                        modified_at: item["lastModifiedDateTime"].as_str().unwrap_or("").to_string(),
                        sync_status: "synced".to_string(),
                        connector_id: self.config.id.clone(),
                    })
                    .collect()
            })
            .unwrap_or_default();

        Ok(files)
    }
}

pub struct GoogleDriveConnector {
    config: ConnectorConfig,
    client: reqwest::Client,
}

impl GoogleDriveConnector {
    pub fn new(config: ConnectorConfig) -> Self {
        Self {
            config,
            client: reqwest::Client::new(),
        }
    }

    pub async fn list_files(&self, folder_id: &str) -> anyhow::Result<Vec<FileMetadata>> {
        let token = self.config.access_token.as_ref()
            .ok_or_else(|| anyhow::anyhow!("No access token"))?;

        let url = format!(
            "https://www.googleapis.com/drive/v3/files?q='{}' in parents&fields=files(id,name,mimeType,size,modifiedTime)",
            folder_id
        );

        let resp = self.client
            .get(&url)
            .bearer_auth(token)
            .send()
            .await?
            .json::<serde_json::Value>()
            .await?;

        let files = resp["files"]
            .as_array()
            .map(|arr| {
                arr.iter()
                    .map(|item| FileMetadata {
                        id: item["id"].as_str().unwrap_or("").to_string(),
                        name: item["name"].as_str().unwrap_or("").to_string(),
                        path: item["name"].as_str().unwrap_or("").to_string(),
                        mime_type: item["mimeType"].as_str().unwrap_or("application/octet-stream").to_string(),
                        size: item["size"].as_str().and_then(|s| s.parse().ok()).unwrap_or(0),
                        modified_at: item["modifiedTime"].as_str().unwrap_or("").to_string(),
                        sync_status: "synced".to_string(),
                        connector_id: self.config.id.clone(),
                    })
                    .collect()
            })
            .unwrap_or_default();

        Ok(files)
    }
}
