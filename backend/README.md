# Math2Visual Backend

A Flask-based backend service that transforms math word problems (MWPs) into visual representations using the Math2Visual framework. The system generates both formal and intuitive visual representations as SVG images.

## 🏗️ Architecture

The backend consists of the following key components:

- **API Routes**: RESTful endpoints for generation, uploads, and system management
- **Visual Generation**: Services for creating formal and intuitive SVG representations
- **Language Generation**: OpenAI-powered conversion of MWPs to visual language (DSL)
- **Storage Management**: Configurable storage backend (local/JuiceFS) for SVG datasets
- **Security**: Input validation, SVG sanitization, and optional ClamAV integration

## 📁 Project Structure

```
backend/
├── app/                         # Main application package
│   ├── __init__.py              # Flask application factory
│   ├── api/                     # API layer
│   │   ├── middleware/          # Error handlers and middleware
│   │   └── routes/              # API endpoints
│   │       ├── generation.py    # Core generation API
│   │       ├── upload.py        # SVG upload management
│   │       └── system.py        # System status endpoints
│   ├── config/                  # Configuration management
│   │   └── storage_config.py    # Storage backend configuration
│   ├── models/                  # Data models
│   ├── services/                # Business logic
│   │   ├── language_generation/ # GPT-based DSL generation
│   │   ├── validation/          # Input/output validation
│   │   └── visual_generation/   # SVG generation engines
│   └── utils/                   # Utility functions
├── app.py                       # Application entry point
├── storage/                     # Local storage directory
│   ├── datasets/svg_dataset/    # SVG entity library (1,548 files)
│   ├── models/                  # ML model checkpoints
│   └── output/                  # Generated visualizations
├── scripts/                     # Setup and management scripts
├── docs/                        # Documentation
└── tests/                       # Test suite
```

## 🚀 Quick Start

### Prerequisites

- Python 3.12+
- PostgreSQL 13+ (for JuiceFS mode)
- OpenAI API key
- Optional: ClamAV for security scanning

### Installation

1. **Clone and setup environment:**
```bash
cd backend/
pip install -r requirements.txt
```

2. **Configure environment variables:**
```bash
cp config_templates/env_juicefs_template .env
# Edit .env with your settings
```

Required environment variables:
```bash
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# Storage Configuration
SVG_STORAGE_MODE=local  # or 'juicefs'
SVG_DATASET_PATH=/path/to/svg/dataset
SVG_CACHE_SIZE=100

# JuiceFS Configuration (if using JuiceFS)
JUICEFS_METADATA_URL=postgres://user:pass@localhost:5432/juicefs_metadata
```

3. **Run the application:**
```bash
python app.py
```

The server will start on `http://localhost:5001` by default.

## 📡 API Endpoints

### Core Generation API

#### `POST /api/generate`
Generate visual representations from math word problems.

**Request Body:**
```json
{
  "mwp": "Janet has 9 oranges and Sharon has 7 oranges. How many oranges do they have together?",
  "formula": "9 + 7 = 16"  // optional
}
```

**Alternative - Direct DSL:**
```json
{
  "dsl": "visual_language: addition(container1[entity_name: orange, entity_type: orange, entity_quantity: 9, container_name: Janet, container_type: girl], container2[entity_name: orange, entity_type: orange, entity_quantity: 7, container_name: Sharon, container_type: girl], result_container[entity_name: orange, entity_type: orange, entity_quantity: 16, container_name: Janet and Sharon, container_type: ])"
}
```

**Response:**
```json
{
  "visual_language": "addition(...)",
  "svg_formal": "<svg>...</svg>",      // Base64 or SVG content
  "svg_intuitive": "<svg>...</svg>",   // Base64 or SVG content
  "formal_error": null,
  "intuitive_error": null,
  "missing_svg_entities": ["entity1", "entity2"]
}
```

### System Management (debug mode)

#### `GET /api/storage/status`
Get storage system status and configuration.

#### `POST /api/upload/svg`
Upload new SVG entities to the dataset.

## 🎨 Visual Generation

The system generates two types of visual representations:

### 1. Formal Representation
- Mathematical precision with exact quantities
- Grid-based layouts for structured display
- Explicit mathematical operations visualization

### 2. Intuitive Representation  
- Natural, intuitive visual arrangements
- Contextual groupings and relationships
- User-friendly visual metaphors

Both generators support:
- **Dynamic SVG composition** from 1,548+ entity library
- **Intelligent layout calculation** based on content
- **Missing entity tracking** for dataset expansion
- **Error handling** with detailed feedback

## 🧠 Language Generation

The system uses OpenAI's GPT models to convert natural language math word problems into structured visual language (DSL).

### Visual Language Format
```
operation(
  container1[entity_name: apple, entity_type: apple, entity_quantity: 3, 
             container_name: John, container_type: boy],
  container2[entity_name: apple, entity_type: apple, entity_quantity: 5,
             container_name: Mary, container_type: girl],
  result_container[entity_name: apple, entity_type: apple, entity_quantity: 8,
                   container_name: John and Mary, container_type: ]
)
```

### Supported Operations
- `addition` - Adding quantities
- `subtraction` - Subtracting quantities  
- `multiplication` - Repeated addition/scaling
- `division` - Splitting into groups
- `comparison` - Comparing quantities
- `surplus` - Remainder operations
- `area` - Area calculations
- `unittrans` - Unit conversions

## 💾 Storage Configuration

### Local Storage (Default)
```bash
SVG_STORAGE_MODE=local
```
- Uses `backend/storage/datasets/svg_dataset/` directory
- Simple filesystem access
- Suitable for development and single-node deployment

### JuiceFS Distributed Storage
```bash
SVG_STORAGE_MODE=juicefs
SVG_DATASET_PATH=/mnt/juicefs/svg_dataset
JUICEFS_METADATA_URL=postgres://user:pass@host:port/database
```

**Benefits:**
- Distributed storage across multiple nodes
- PostgreSQL metadata backend for reliability
- Built-in compression and caching
- Automatic redundancy and backup

**Setup JuiceFS:**
```bash
# Install and format JuiceFS
./scripts/install_juicefs.sh
./scripts/format_juicefs.sh

# Mount filesystem
./scripts/mount_juicefs.sh

# Setup automatic mounting
./scripts/install_systemd_service.sh
```

See [`docs/JUICEFS_SETUP.md`](docs/JUICEFS_SETUP.md) for detailed setup instructions.

## 🔒 Security Features

### SVG Security
- SVG content validation and sanitization
- Removal of potentially malicious elements
- Size and complexity limits

### Optional ClamAV Integration
```bash
# Install ClamAV for virus scanning
sudo apt install clamav clamav-daemon
pip install pyclamd
```

See [`docs/CLAMAV_SETUP.md`](docs/CLAMAV_SETUP.md) for configuration details.

## 🧪 Testing

```bash
# Run test suite
python -m pytest tests/

# Test specific component
python -m pytest tests/test_svg_validator.py

# Test with coverage
python -m pytest --cov=app tests/
```

## 🛠️ Development

### Adding New SVG Entities
1. Create SVG file following naming conventions
2. Upload via `/api/upload/svg` endpoint
3. SVG will be validated and added to dataset

### Extending Visual Language
1. Update operation parsers in `services/visual_generation/`
2. Add new operation handlers
3. Update GPT prompts in `services/language_generation/`

### Custom Storage Backends
1. Extend `StorageConfig` class in `config/storage_config.py`
2. Implement new storage validation logic
3. Update environment configuration

## 📚 References

- [Math2Visual Paper](https://arxiv.org/pdf/2506.03735)
- [Math2Visual GitHub Repository](https://github.com/eth-lre/math2visual)
- [Flask Documentation](https://flask.palletsprojects.com/)
- [JuiceFS Documentation](https://juicefs.com/docs/)

## 📄 License

This project is part of the Math2Visual research framework. Please refer to the main repository for licensing information.

---

For questions or support, please refer to the main [Math2Visual repository](https://github.com/eth-lre/math2visual) or open an issue in this project.
