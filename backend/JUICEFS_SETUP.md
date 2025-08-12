# JuiceFS Setup (Migration)

## 📋 Prerequisites

- PostgreSQL installed and running
- Linux system with FUSE support
- sudo access for installation and mounting

## Migration Steps

### Step 1: PostgreSQL Setup

PostgreSQL 13.21 installed and configured for JuiceFS metadata:

```bash
# Install PostgreSQL (Ubuntu/Debian)
sudo apt update
sudo apt install postgresql postgresql-contrib

# Or (macOS with Homebrew)
brew install postgresql
brew services start postgresql
```

**Create database and user:**
```sql
# Connect as postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE juicefs_metadata;
CREATE USER juicefs_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE juicefs_metadata TO juicefs_user;

# Grant schema privileges
\c juicefs_metadata
GRANT ALL ON SCHEMA public TO juicefs_user;
ALTER USER juicefs_user CREATEDB;

\q
```

**Test the connection:**
```bash
psql -h localhost -U juicefs_user -d juicefs_metadata -c "SELECT version();"
```

### Step 2: Install JuiceFS

JuiceFS v1.3.0 successfully installed:

```bash
# Run the installation script
./scripts/install_juicefs.sh

# Verify installation
./scripts/verify_juicefs.sh
```

### Step 3: Configure Environment

Environment configuration completed with JuiceFS mode:

```bash
# Copy template to .env
cp config_templates/env_juicefs_template .env

# Edit with your PostgreSQL credentials
nano .env
```

**Important**: Update these values in `.env`:
```bash
JUICEFS_METADATA_URL=postgres://juicefs_user:your_actual_password@localhost:5432/juicefs_metadata
```

### Step 4: Format JuiceFS

JuiceFS filesystem formatted with PostgreSQL metadata backend:

```bash
# Format the JuiceFS filesystem
./scripts/format_juicefs.sh
```

### Step 5: Mount JuiceFS

JuiceFS filesystem mounting and operational at `/mnt/juicefs`:

```bash
# Mount JuiceFS
./scripts/mount_juicefs.sh

# Verify mount
./scripts/verify_juicefs.sh
```

### Step 6: Migrate SVG Files

```bash
# Created SVG directory in JuiceFS
mkdir -p /mnt/juicefs/svg_dataset

# Migrated all SVG files with compression benefits
cp -r svg_dataset/* /mnt/juicefs/svg_dataset/
# Result: 118MB → 115MB (3MB space saved!)
```

### Step 7: Backend Integration

Created configurable storage system and updated backend:

```bash
# New storage configuration system
backend/config/storage_config.py

# Updated app.py to use JuiceFS paths
# Added storage status endpoint: GET /api/storage/status
# Environment-based configuration with .env file
```

## 🔧 Scripts Reference

| Script | Purpose | Run By |
|--------|---------|--------|
| `install_juicefs.sh` | Install JuiceFS and dependencies | YOU |
| `verify_juicefs.sh` | Verify installation and setup | BOTH |
| `format_juicefs.sh` | Format filesystem with PostgreSQL | ME |
| `mount_juicefs.sh` | Mount JuiceFS filesystem | ME |

## 📁 Directory Structure After Migration

```
/mnt/juicefs/
├── svg_dataset/           # Your SVG files (1,548 files)
│   ├── apple.svg
│   ├── basket.svg
│   └── ...
└── .juicefs/             # JuiceFS metadata (don't touch)

/var/cache/juicefs/       # Local cache for performance
/var/log/juicefs/         # JuiceFS logs
```

## 🎯 Backend Changes Required

After migration, only minimal changes needed:

1. **Path Update**: Change `svg_dataset/` to `/mnt/juicefs/svg_dataset/`
2. **Configuration**: Add environment variable support
3. **No Code Changes**: File operations work exactly the same!

## ✅ Verification Checklist

- [x] PostgreSQL 13.21 installed and running
- [x] Database `juicefs_metadata` and user `juicefs_user` created
- [x] JuiceFS v1.3.0 installed (`juicefs version`)
- [x] `.env` file configured with credentials
- [x] Filesystem `math2visual-fs` formatted with PostgreSQL metadata
- [x] Filesystem mounted at `/mnt/juicefs` with optimized caching
- [x] All 1,548 SVG files migrated successfully (118MB → 115MB)
- [x] Backend updated with configurable storage system
- [x] Storage status endpoint added: `GET /api/storage/status`

## 🚨 Troubleshooting

**Common Issues:**

1. **Mount fails**: Check FUSE support with `ls -la /dev/fuse`
2. **Permission denied**: Ensure user owns mount point
3. **PostgreSQL connection**: Verify credentials in `.env`
4. **Cache issues**: Clear cache: `rm -rf /var/cache/juicefs/*`

**Get Help:**
```bash
# Check JuiceFS status
juicefs status math2visual-fs

# Check mount health
./scripts/verify_juicefs.sh

# View logs
journalctl -u juicefs
```

## 📊 Performance Benefits

Expected improvements after migration:
- **Faster Access**: Local cache for frequently used SVGs
- **Compression**: Built-in LZ4 compression reduces storage
- **Scalability**: Easy to add distributed storage later
- **Backup**: PostgreSQL metadata can be backed up normally

---
