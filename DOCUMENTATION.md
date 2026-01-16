# CapCloud System Documentation

## Overview

CapCloud is a distributed cloud storage and media processing platform, reminiscent of services like Pomf but with modern architecture and "Enterprise" features like transcoding, distributed storage, and user management.

The system is composed of three distinct microservices/components:
1. **Coordinator (`cap-cloud`)**: The central API, database, and logic core.
2. **Storage Node (`cap-cloud-serve`)**: The entity responsible for storing and serving physical files.
3. **Transcoder (`cap-cloud-transcode`)**: A worker service that processes media files (thumbnails, video resizing).

## 1. System Architecture

The system follows a hub-and-spoke model where the **Coordinator** is the central authority. Storage Nodes and Transcoders interact with the Coordinator to synchronize state, while Transcoders interact directly with Storage Nodes to fetch/patch media.

### High-Level Flow

1. **Upload**: User requests an upload target from Coordinator -> Coordinator provides a Storage Node URL -> User uploads bytes to Storage Node -> Storage Node notifies Coordinator of new file.
2. **Processing**: Transcoder polls Coordinator for work -> Coordinator assigns file -> Transcoder downloads from Storage Node -> Transcoder generates assets (thumbs/previews) -> Transcoder uploads assets to Storage Node -> Transcoder acknowledges completion to Coordinator.
3. **Delivery**: User requests file -> Coordinator/Storage Node serves the file (direct or presigned).

---

## 2. Components Detail

### A. Coordinator (`cap-cloud`)

**Location**: `/home/captainhandsome/personal/cap-cloud`
**Stack**: AdonisJS, MySQL (via Lucid), Redis (likely for queues/caching).
**Responsibility**: Source of Truth (Database), Authentication, Orchestration.

#### Key Models
*   **`FileItem`**: Represents a file. Contains metadata (size, mime, processing status), owner, and which `ServerShard` it lives on.
*   **`ServerShard`**: Represents a Storage Node. Tracks disk usage, domain, and availability.
*   **`User`**: Registered users who own files.

#### Key APIs
*   **Auth**: `/auth/login`, `/auth/register`
*   **Upload Coordination**: `/upload/available-servers` (Balances uploads across healthy shards).
*   **Server Communication (`/coordinator/v1/`)**:
    *   `find-file-work`: Polled by transcoders to find pending files.
    *   `upload-ack`: Called by Storage Nodes when a file is successfully received.
    *   `ack-preview` / `ack-meta`: Called by Transcoders when artifacts are created.

### B. Storage Node (`cap-cloud-serve`)

**Location**: `/home/captainhandsome/personal/cap-cloud-serve`
**Stack**: AdonisJS, SQLite (local metadata), Disk Storage.
**Responsibility**: Dumb storage, File Serving, Ingest.

#### Key Responsibilities
1.  **Ingestion**:
    *   `/upload` (User-bound) and `/anon-upload` (Anonymous).
    *   Validates upload tokens (via S2S auth or user token).
    *   Stores file to disk.
2.  **Serving**:
    *   Serves raw files via hotlinking or presigned URLs.
3.  **Internal API (S2S)**:
    *   `/s2s/metadata-patch`: Accepts thumbnails from Transcoder.
    *   `/s2s/preview-create`: Accepts encoded video/previews from Transcoder.

### C. Transcoder (`cap-cloud-transcode`)

**Location**: `/home/captainhandsome/personal/cap-cloud-transcode`
**Stack**: AdonisJS, `ffmpeg` (fluent-ffmpeg), `sharp`, `axios`.
**Responsibility**: CPU-intensive tasks, worker loop.

#### Workflow
The Transcoder runs a continuous loop (`TranscodeService`):
1.  **Poll**: Calls `GET /coordinator/v1/find-file-work` to get a batch of pending files.
2.  **Lock**: Marks file as `pending` so other workers don't touch it.
3.  **Process**:
    *   Downloads file from the specific Storage Node.
    *   Generates BlurHash and Thumbnail (using `sharp`).
    *   Uploads these back to the Storage Node via `/s2s/metadata-patch`.
    *   If video: Generates 480p, 720p, 1080p versions (based on source resolution).
    *   Uploads these back via `/s2s/preview-create`.
4.  **Finish**: Marks file as `finished` in Coordinator.

---

## 3. Communication Protocols

### Coordinator <-> Storage/Transcoder
*   Protected by `x-server-id` and `x-api-key` headers.
*   Coordinator holds the "List of Servers" (Shards).

### Transcoder <-> Storage
*   Transcoder talks directly to the Storage Node (using the domain from `FileItem`).
*   Uses S2S Authentication to push processed artifacts back to storage.

---

## 4. Deployment & Configuration

All services use dotenv. Below are critical environment variables.

### Common
*   `APP_KEY`: AdonisJS secret.
*   `NODE_ENV`: `production` or `development`.
*   `PORT`: HTTP port.

### Coordinator Specifics
*   `DB_HOST`, `DB_USER`, `DB_PASSWORD`: MySQL Connection.

### Transcoder Specifics
*   `COORDINATOR_URL`: URL of the Coordinator API.
*   `COORDINATOR_API_KEY`: Key for S2S auth.
*   `COORDINATOR_SERVER_ID`: Identity of this worker.

### Storage Node Specifics
*   Needs to be registered in Coordinator's database table `server_shards`.
*   `COORDINATOR_UI`: For generating links.

## 5. Development Workflow

1.  **Start Coordinator**: `yarn dev` in `cap-cloud`. Ensure MySQL is running.
2.  **Start Storage**: `yarn dev` in `cap-cloud-serve`.
3.  **Start Transcoder**: `yarn dev` in `cap-cloud-transcode`.
4.  **Simulate**:
    *   Upload a file to Storage Node.
    *   Watch Coordinator logs for "ACK".
    *   Watch Transcoder logs picking up the job.
    *   Watch artifacts appearing in Storage Node.

## 6. Upload Flows & File Ownership

### Upload Endpoints Overview

The Storage Node (`cap-cloud-serve`) exposes two distinct upload endpoints:

| Endpoint | Authentication | Sets Owner | Use Case |
|----------|---------------|------------|----------|
| `/anon-upload` | None required | No (`ownerId = null`) | Anonymous/public uploads |
| `/upload` | `Authorization` + `X-User-Id` headers | Yes (`ownerId = userId`) | User-owned uploads |

### 6.1 Anonymous Upload Flow

```
Frontend                    Storage Node                  Coordinator
   |                             |                             |
   |-- POST /anon-upload ------->|                             |
   |   (multipart/form-data)     |                             |
   |                             |-- POST /coordinator/v1/ack ->|
   |                             |   (file metadata)            |
   |                             |<-- 200 OK (FileItem) --------|
   |<-- 200 OK (FileItem[]) -----|                             |
```

**Characteristics:**
- No authentication required
- File is stored in the `public` bucket
- `ownerId` is `null` - file belongs to no one
- File will NOT appear in any user's "My Files"
- Anyone with the link can access the file

### 6.2 Authenticated Upload Flow

```
Frontend                    Storage Node                  Coordinator
   |                             |                             |
   |-- POST /upload ------------>|                             |
   |   Headers:                  |                             |
   |   - Authorization: Bearer   |                             |
   |   - X-User-Id: <userId>     |                             |
   |   (multipart/form-data)     |                             |
   |                             |-- Validate token via ------->|
   |                             |   /auth/verify-user-token    |
   |                             |<-- Token valid --------------|
   |                             |                             |
   |                             |-- POST /coordinator/v1/ack ->|
   |                             |   (file + ownerId)           |
   |                             |<-- 200 OK (FileItem) --------|
   |<-- 200 OK (FileItem[]) -----|                             |
```

**Characteristics:**
- Requires `Authorization: Bearer <token>` header
- Requires `X-User-Id: <userId>` header
- Storage Node validates token with Coordinator before accepting
- `ownerId` is set to the authenticated user
- File appears in the user's "My Files"

### 6.3 File Visibility Model

Files have two orthogonal properties:

| Property | Values | Effect |
|----------|--------|--------|
| `ownerId` | `null` or UUID | Determines if file appears in a user's "My Files" |
| `isPrivate` | `true` / `false` | Determines who can access the file |

**Visibility Matrix:**

| ownerId | isPrivate | Appears in "My Files" | Who Can Access |
|---------|-----------|----------------------|----------------|
| `null` | `false` | No one | Anyone with link |
| `userId` | `false` | Owner only | Anyone with link |
| `userId` | `true` | Owner only | Owner only |
| `null` | `true` | ❌ Invalid state | N/A |

### 6.4 "Save to History" Feature

The frontend's landing page offers a "Save to history" toggle for logged-in users:

- **OFF**: Uses `/anon-upload` → File is public, NOT in user's files
- **ON**: Uses `/upload` → File is public AND in user's "My Files"

This allows users to optionally keep track of their uploads without making them private.

---

## 7. Authentication & Headers

### 7.1 User Authentication (Frontend → Storage Node)

For authenticated uploads, the frontend must send:

```http
POST /upload HTTP/1.1
Host: storage-node.example.com
Authorization: Bearer <jwt_token>
X-User-Id: <user_uuid>
Content-Type: multipart/form-data
```

**⚠️ Common Gotcha:** Both headers are required! The middleware checks:
```typescript
if (!userId || !token) {
  throw new NamedError('Invalid API Key', 'server-key-not-found')
}
```

Missing the `X-User-Id` header (even with a valid token) will fail with `server-key-not-found`.

### 7.2 Server-to-Server Authentication (Storage ↔ Coordinator)

For internal communication:

```http
POST /coordinator/v1/ack HTTP/1.1
Host: coordinator.example.com
x-server-id: <server_shard_id>
x-api-key: <server_api_key>
```

### 7.3 Token Validation Flow

Storage Node validates user tokens by calling Coordinator:

```typescript
// Storage Node → Coordinator
POST /auth/verify-user-token
{
  "userId": "<uuid>",
  "token": "<jwt_token>"
}
```

---

## 8. Query Parameters for Uploads

Both `/upload` and `/anon-upload` accept query parameters:

| Parameter | Type | Description |
|-----------|------|-------------|
| `parentDirectoryId` | UUID | Target folder for the file |
| `isPrivate` | `"true"` / `"false"` | Store in private bucket, restrict access |

**Chunked Upload Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `uploadId` | string | Unique identifier for the chunked upload session |
| `chunkIndex` | number | Zero-based index of current chunk |
| `totalChunks` | number | Total number of chunks |
| `fileName` | string | Original filename |
| `fileSize` | number | Total file size in bytes |
| `mimeType` | string | MIME type of the file |
| `chunkHash` | string | SHA-256 hash of the chunk |
| `fileHash` | string | SHA-256 hash of the entire file |
| `chunkSize` | number | Size of this chunk in bytes |

---

## 9. Common Gotchas & Pitfalls

### 9.1 SQL OR Condition Pitfall

**Problem:** Careless use of `orWhere` in ORM queries can break other filters.

❌ **Wrong:**
```typescript
query.where('parent_folder', parentId)
     .where('is_private', false)
     .orWhereNull('is_private')  // This OR applies globally!
```
This generates: `WHERE parent_folder = ? AND is_private = false OR is_private IS NULL`

The `OR` breaks loose from the `AND` chain, returning all items where `is_private IS NULL` regardless of `parent_folder`.

✅ **Correct:**
```typescript
query.where('parent_folder', parentId)
     .andWhere((q) => {
       q.where('is_private', false).orWhereNull('is_private')
     })
```
This generates: `WHERE parent_folder = ? AND (is_private = false OR is_private IS NULL)`

### 9.2 Axios Error Handling

**Problem:** Axios throws errors for non-2xx responses, and the error message is buried.

❌ **Wrong:**
```typescript
const response = await axios.post('/auth/login', data);
if (!response.data.success) {
  throw new Error(response.data.message);  // Never reached on 4xx/5xx!
}
```

✅ **Correct:**
```typescript
try {
  const response = await axios.post('/auth/login', data);
  // Handle success
} catch (error) {
  if (error.response?.data?.message) {
    throw new Error(error.response.data.message);  // Extract API error
  }
  throw error;
}
```

### 9.3 Missing X-User-Id Header

**Symptom:** Authenticated uploads fail with "Invalid API Key" or "server-key-not-found"

**Cause:** The upload request is missing the `X-User-Id` header.

**Fix:** Ensure both `Authorization` and `X-User-Id` headers are set:
```typescript
headers: {
  Authorization: `Bearer ${token}`,
  "X-User-Id": userId,  // Don't forget this!
}
```

### 9.4 Private Bucket Path Mismatch

**Problem:** Private files are stored in a different disk location than public files.

```
/storage/
├── public/           # isPrivate = false
│   └── <baseKey>/
│       └── filename.ext
└── private/          # isPrivate = true
    └── <baseKey>/
        └── filename.ext
```

**Gotcha:** If you change `isPrivate` after upload, the file doesn't move!

### 9.5 Folder Navigation Returns Wrong Items

**Symptom:** Navigating into a subfolder shows root-level items.

**Cause:** Usually the SQL query issue described in 9.1, or the folder is empty.

**Debug:** Check if items exist with the correct `parent_folder` value:
```sql
SELECT * FROM file_items WHERE parent_folder = '<folder_uuid>';
```

### 9.6 Chunked Upload Session Isolation

**Problem:** Chunk files are stored in a temporary `_chunks_` directory.

**Important:**
- Upload IDs must be alphanumeric only (validated with regex)
- Chunks are named `<index>.chunk`
- After assembly, chunks are deleted
- If assembly fails, orphan chunks may remain

### 9.7 Token vs userId Confusion

**Distinction:**
- `token`: JWT access token (opaque string)
- `userId`: UUID of the user (stored in database)

The frontend must pass **both** for authenticated uploads. They serve different purposes:
- `token`: Proves the request is from an authenticated session
- `userId`: Identifies WHO the file should belong to

---

## 10. Frontend Integration Patterns

### 10.1 Determining Upload Endpoint

```typescript
// Use authenticated endpoint only when saveToHistory is true AND user is logged in
const useAuthenticatedUpload = saveToHistory && token;
const endpoint = useAuthenticatedUpload ? "upload" : "anon-upload";
const server = `//${serverDomain}/${endpoint}`;
```

### 10.2 Upload Options Interface

```typescript
interface UploadOptions {
  chunkSize?: number;           // Bytes per chunk (default: 5MB)
  maxConcurrency?: number;      // Parallel chunk uploads (default: 16)
  useChunkedUpload?: boolean;   // Force chunked upload
  chunkThreshold?: number;      // Auto-chunk files larger than this (default: 8MB)
  folderId?: string | null;     // Target folder UUID
  isPrivate?: boolean;          // Store in private bucket
  saveToHistory?: boolean;      // Use authenticated upload (adds to user's files)
}
```

### 10.3 Recommended Chunk Sizes by File Size

| File Size | Chunk Size | Concurrency |
|-----------|------------|-------------|
| < 25 MB | 1.25 MB | 4 |
| 25-50 MB | 3 MB | 8 |
| 50-100 MB | 6 MB | 10 |
| 100-500 MB | 8 MB | 12 |
| > 500 MB | 20 MB | 16 |

---

## 11. Future Roadmap

- Deployments via `ace` command (mentioned in README)
- Preview system expansion
- Advanced Server Selection algorithms (Lat/Lon based)
- File deduplication via hash comparison
- Resumable uploads (persist chunk state)
- Quota management per user
- File expiration policies
