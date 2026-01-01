use axum::{
    extract::{Multipart, Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tokio::fs;
use uuid::Uuid;

/// 文件服务配置
#[derive(Clone)]
pub struct FileServiceConfig {
    pub upload_dir: PathBuf,
    pub max_file_size: usize,
    pub allowed_extensions: Vec<String>,
}

impl Default for FileServiceConfig {
    fn default() -> Self {
        Self {
            upload_dir: PathBuf::from("./uploads"),
            max_file_size: 10 * 1024 * 1024, // 10MB
            allowed_extensions: vec![
                "txt".to_string(),
                "json".to_string(),
                "md".to_string(),
                "csv".to_string(),
                "pdf".to_string(),
                "png".to_string(),
                "jpg".to_string(),
                "jpeg".to_string(),
            ],
        }
    }
}

/// 文件信息
#[derive(Debug, Serialize, Deserialize)]
pub struct FileInfo {
    pub id: String,
    pub name: String,
    pub path: String,
    pub size: u64,
    pub mime_type: String,
    pub created_at: String,
}

/// 文件列表响应
#[derive(Debug, Serialize)]
pub struct FileListResponse {
    pub files: Vec<FileInfo>,
    pub total: usize,
}

/// 文件上传响应
#[derive(Debug, Serialize)]
pub struct FileUploadResponse {
    pub success: bool,
    pub file: Option<FileInfo>,
    pub error: Option<String>,
}

/// 文件读取请求
#[derive(Debug, Deserialize)]
pub struct ReadFileRequest {
    pub path: String,
}

/// 文件读取响应
#[derive(Debug, Serialize)]
pub struct ReadFileResponse {
    pub success: bool,
    pub content: Option<String>,
    pub file: Option<FileInfo>,
    pub error: Option<String>,
}

/// 文件写入请求
#[derive(Debug, Deserialize)]
pub struct WriteFileRequest {
    pub path: String,
    pub content: String,
}

/// 文件写入响应
#[derive(Debug, Serialize)]
pub struct WriteFileResponse {
    pub success: bool,
    pub file: Option<FileInfo>,
    pub error: Option<String>,
}

/// 文件删除响应
#[derive(Debug, Serialize)]
pub struct DeleteFileResponse {
    pub success: bool,
    pub error: Option<String>,
}

/// 初始化文件服务（创建上传目录）
pub async fn init_file_service(config: &FileServiceConfig) -> Result<(), std::io::Error> {
    fs::create_dir_all(&config.upload_dir).await?;
    Ok(())
}

/// 列出所有文件
pub async fn list_files(
    State(config): State<FileServiceConfig>,
) -> impl IntoResponse {
    match fs::read_dir(&config.upload_dir).await {
        Ok(mut entries) => {
            let mut files = Vec::new();
            
            while let Ok(Some(entry)) = entries.next_entry().await {
                if let Ok(metadata) = entry.metadata().await {
                    if metadata.is_file() {
                        let name = entry.file_name().to_string_lossy().to_string();
                        let path = entry.path();
                        
                        files.push(FileInfo {
                            id: Uuid::new_v4().to_string(),
                            name: name.clone(),
                            path: format!("/api/v1/files/{}", name),
                            size: metadata.len(),
                            mime_type: mime_guess::from_path(&path)
                                .first_or_octet_stream()
                                .to_string(),
                            created_at: metadata
                                .created()
                                .ok()
                                .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                                .map(|d| chrono::DateTime::from_timestamp(d.as_secs() as i64, 0)
                                    .map(|dt| dt.to_rfc3339())
                                    .unwrap_or_default())
                                .unwrap_or_default(),
                        });
                    }
                }
            }
            
            let total = files.len();
            Json(FileListResponse { files, total })
        }
        Err(_) => {
            Json(FileListResponse {
                files: vec![],
                total: 0,
            })
        }
    }
}

/// 上传文件
pub async fn upload_file(
    State(config): State<FileServiceConfig>,
    mut multipart: Multipart,
) -> impl IntoResponse {
    while let Ok(Some(field)) = multipart.next_field().await {
        let _name = field.name().unwrap_or("file").to_string();
        let file_name = field.file_name().unwrap_or("unknown").to_string();
        
        // 检查文件扩展名
        let extension = std::path::Path::new(&file_name)
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("")
            .to_lowercase();
        
        if !config.allowed_extensions.contains(&extension) {
            return (
                StatusCode::BAD_REQUEST,
                Json(FileUploadResponse {
                    success: false,
                    file: None,
                    error: Some(format!("不支持的文件类型: {}", extension)),
                }),
            );
        }
        
        // 读取文件内容
        let data = match field.bytes().await {
            Ok(bytes) => bytes,
            Err(e) => {
                return (
                    StatusCode::BAD_REQUEST,
                    Json(FileUploadResponse {
                        success: false,
                        file: None,
                        error: Some(format!("读取文件失败: {}", e)),
                    }),
                );
            }
        };
        
        // 检查文件大小
        if data.len() > config.max_file_size {
            return (
                StatusCode::BAD_REQUEST,
                Json(FileUploadResponse {
                    success: false,
                    file: None,
                    error: Some(format!(
                        "文件太大，最大允许 {} MB",
                        config.max_file_size / 1024 / 1024
                    )),
                }),
            );
        }
        
        // 生成唯一文件名
        let unique_name = format!("{}_{}", Uuid::new_v4(), file_name);
        let file_path = config.upload_dir.join(&unique_name);
        
        // 写入文件
        match fs::write(&file_path, &data).await {
            Ok(_) => {
                let file_info = FileInfo {
                    id: Uuid::new_v4().to_string(),
                    name: file_name,
                    path: format!("/api/v1/files/{}", unique_name),
                    size: data.len() as u64,
                    mime_type: mime_guess::from_path(&file_path)
                        .first_or_octet_stream()
                        .to_string(),
                    created_at: chrono::Utc::now().to_rfc3339(),
                };
                
                return (
                    StatusCode::OK,
                    Json(FileUploadResponse {
                        success: true,
                        file: Some(file_info),
                        error: None,
                    }),
                );
            }
            Err(e) => {
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(FileUploadResponse {
                        success: false,
                        file: None,
                        error: Some(format!("保存文件失败: {}", e)),
                    }),
                );
            }
        }
    }
    
    (
        StatusCode::BAD_REQUEST,
        Json(FileUploadResponse {
            success: false,
            file: None,
            error: Some("没有找到上传的文件".to_string()),
        }),
    )
}

/// 读取文件内容
pub async fn read_file(
    State(config): State<FileServiceConfig>,
    Path(filename): Path<String>,
) -> impl IntoResponse {
    let file_path = config.upload_dir.join(&filename);
    
    // 安全检查：确保路径在上传目录内
    if !file_path.starts_with(&config.upload_dir) {
        return (
            StatusCode::FORBIDDEN,
            Json(ReadFileResponse {
                success: false,
                content: None,
                file: None,
                error: Some("访问被拒绝".to_string()),
            }),
        );
    }
    
    match fs::read_to_string(&file_path).await {
        Ok(content) => {
            let metadata = fs::metadata(&file_path).await.ok();
            
            let file_info = FileInfo {
                id: Uuid::new_v4().to_string(),
                name: filename.clone(),
                path: format!("/api/v1/files/{}", filename),
                size: metadata.as_ref().map(|m| m.len()).unwrap_or(0),
                mime_type: mime_guess::from_path(&file_path)
                    .first_or_octet_stream()
                    .to_string(),
                created_at: metadata
                    .and_then(|m| m.created().ok())
                    .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                    .map(|d| chrono::DateTime::from_timestamp(d.as_secs() as i64, 0)
                        .map(|dt| dt.to_rfc3339())
                        .unwrap_or_default())
                    .unwrap_or_default(),
            };
            
            (
                StatusCode::OK,
                Json(ReadFileResponse {
                    success: true,
                    content: Some(content),
                    file: Some(file_info),
                    error: None,
                }),
            )
        }
        Err(e) => (
            StatusCode::NOT_FOUND,
            Json(ReadFileResponse {
                success: false,
                content: None,
                file: None,
                error: Some(format!("读取文件失败: {}", e)),
            }),
        ),
    }
}

/// 写入文件
pub async fn write_file(
    State(config): State<FileServiceConfig>,
    Json(req): Json<WriteFileRequest>,
) -> impl IntoResponse {
    // 清理文件名
    let safe_name = req.path
        .replace("..", "")
        .replace("/", "_")
        .replace("\\", "_");
    
    let file_path = config.upload_dir.join(&safe_name);
    
    match fs::write(&file_path, &req.content).await {
        Ok(_) => {
            let file_info = FileInfo {
                id: Uuid::new_v4().to_string(),
                name: safe_name.clone(),
                path: format!("/api/v1/files/{}", safe_name),
                size: req.content.len() as u64,
                mime_type: mime_guess::from_path(&file_path)
                    .first_or_octet_stream()
                    .to_string(),
                created_at: chrono::Utc::now().to_rfc3339(),
            };
            
            (
                StatusCode::OK,
                Json(WriteFileResponse {
                    success: true,
                    file: Some(file_info),
                    error: None,
                }),
            )
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(WriteFileResponse {
                success: false,
                file: None,
                error: Some(format!("写入文件失败: {}", e)),
            }),
        ),
    }
}

/// 删除文件
pub async fn delete_file(
    State(config): State<FileServiceConfig>,
    Path(filename): Path<String>,
) -> impl IntoResponse {
    let file_path = config.upload_dir.join(&filename);
    
    // 安全检查
    if !file_path.starts_with(&config.upload_dir) {
        return (
            StatusCode::FORBIDDEN,
            Json(DeleteFileResponse {
                success: false,
                error: Some("访问被拒绝".to_string()),
            }),
        );
    }
    
    match fs::remove_file(&file_path).await {
        Ok(_) => (
            StatusCode::OK,
            Json(DeleteFileResponse {
                success: true,
                error: None,
            }),
        ),
        Err(e) => (
            StatusCode::NOT_FOUND,
            Json(DeleteFileResponse {
                success: false,
                error: Some(format!("删除文件失败: {}", e)),
            }),
        ),
    }
}
