# 🤖 Isidoro Configuration

Configuration files and memory database for Isidoro - ZeroClaw's AI assistant integration with Agrolink.

## 📁 Structure

```
Isidoro-Configuration/
├── AGENTS.md              # Agent system configuration
├── IDENTITY.md            # Isidoro identity and persona
├── MEMORY.md              # Memory management system
├── SOUL.md                # Core values and principles
├── TOOLS.md               # Available tools and integrations
├── USER.md                # User context and preferences
├── codigo_conduta.md      # Code of conduct
├── memory/                # Persistent memory storage
│   ├── brain.db           # SQLite database (main memory)
│   ├── archive/           # Archived memories
│   └── obras/             # Reference materials
├── state/                 # Runtime state files
│   ├── memory_hygiene_state.json
│   └── models_cache.json
└── cron/                  # Scheduled jobs
    └── jobs.db            # Job scheduler database
```

## 🔧 Configuration Files

- **AGENTS.md**: Agent system instructions and workflows
- **IDENTITY.md**: Isidoro's identity parameters
- **SOUL.md**: Core values and operating principles
- **MEMORY.md**: Memory system architecture
- **TOOLS.md**: Integrated tools and their configuration
- **USER.md**: User context and preferences
- **codigo_conduta.md**: Code of conduct / ethical guidelines

## 💾 Databases

- **memory/brain.db**: Primary memory storage (SQLite)
- **memory/archive/**: Archived conversation history
- **memory/obras/**: Reference library (books, philosophical texts)
- **state/**: Current runtime state snapshots
- **cron/jobs.db**: Scheduled task database

## 🚀 Usage

This configuration is used by:
- [Integracao-zeroclaw-agro-link](https://github.com/agrolink-isidoro/Integracao-zeroclaw-agro-link)
- [project-agro](https://github.com/agrolink-isidoro/project-agro) (Agrolink system)

## 📝 Notes

- Database files (*.db) contain persistent memory
- WAL files (*.db-wal) are excluded from git for performance
- State files are kept for debugging and state recovery
- Memory includes references from philosophical works

---

**Last Updated:** 2 de março de 2026
