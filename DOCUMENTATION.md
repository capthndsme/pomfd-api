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

## 6. Future Roadmap (Inferred)
*   Deployments via `ace` command (mentioned in README).
*   Preview system expansion.
*   Advanced Server Selection algorithms (Lat/Lon).
