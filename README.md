# GasStrom - Consumption Monitor

GasStrom is a modern web application designed to help you track and analyze your household electricity and gas consumption. It provides an intuitive interface for recording meter readings, visualizing data trends, and even automating data entry using AI.

## ✨ Features

- **Dual Meter Support**: Dedicated tracking for both Electricity (kWh) and Gas (m³).
- **AI Photo Analysis**: Upload a photo of your meter, and let **Google Gemini AI** automatically extract the date and reading value for you.
- **Interactive Dashboards**: Visualize your consumption with dynamic charts (Recharts) comparing current usage against previous years.
- **History Management**: Complete log of all your readings with options to manage entries.
- **Data Privacy**: Your data interacts with a local backend or browser storage (Dexie.js), keeping it under your control.
- **Import/Export**: Easy JSON export/import functionality for backups or data migration.
- **Responsive Design**: Optimized for both desktop and mobile use.

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Modern CSS with utility classes (Tailwind-like system), Lucide Icons
- **Data Persistence**: Dexie.js (IndexedDB wrapper) & SQLite (Server-side)
- **AI Integration**: Google Generative AI SDK (Gemini)
- **Visualization**: Recharts
- **Internationalization**: i18next (English & German support)

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/yourusername/gasstrom.git
    cd gasstrom
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

### Running the Application

To start both the frontend and the backend server concurrently:

```bash
npm start
```

- The frontend will typically run on `http://localhost:5173`
- The backend server runs on the configured port (check server logs)

## 🐳 Deployment

This project uses **Docker** primarily for deployment.

### Production (via GitHub Packages)

The easiest way to deploy is using the pre-built image from GitHub Container Registry (GHCR).

1.  Use the `docker-compose.yml` file included in this repository.
2.  Deploy using a tool like **Dockge**, **Portainer**, or directly via `docker compose up -d`.
3.  The image `ghcr.io/fieze/gasstrom:latest` is automatically built and pushed when changes are made to the `release` branch.

**Note**: To trigger a new release, push your changes to the `release` branch.

## 💻 Local Development

For local development, we recommend using `npm` directly instead of Docker.

1.  Install dependencies:
    ```bash
    npm install
    ```

2.  Start the development server (frontend + backend):
    ```bash
    npm start
    ```

- The app will run on `http://localhost:5173`.
- The backend API runs on port `4735`.

## ⚙️ Configuration

### Gemini AI API Key
To use the **Photo Analyzer** feature, you need a Google Gemini API Key.
1.  Get your key from [Google AI Studio](https://aistudio.google.com/app/apikey).
2.  In the app, click the **Settings** (gear icon) in the Photo Analyzer section.
3.  Enter your API Key and save.
4.  The key is stored locally in your browser/app settings.

## 📄 License

[GNU GPLv3](LICENSE)
