# 🌿 KrishiRakshak — Real-Time Pest & Disease Alert System for Farmers

<div align="center">

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.19-000000?style=for-the-badge&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-Auth-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![Socket.io](https://img.shields.io/badge/Socket.io-4.7-010101?style=for-the-badge&logo=socket.io&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)

**An AI-powered agricultural platform providing Indian farmers with real-time pest/disease alerts, crop disease diagnostics, weather forecasts, and multilingual chatbot assistance.**

[Live Demo](#) · [Report Bug](../../issues) · [Request Feature](../../issues)

</div>

---

## 📋 Table of Contents

- [About](#-about)
- [Features](#-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [API Reference](#-api-reference)
- [Project Structure](#-project-structure)
- [Screenshots](#-screenshots)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌾 About

**KrishiRakshak** (meaning "Crop Protector" in Hindi) is an end-to-end full-stack agricultural management platform built to help Indian farmers protect their crops. It combines AI-powered disease detection, real-time alert broadcasting, weather intelligence, and a multilingual chatbot assistant — all accessible through an intuitive web interface.

### Problem Statement

Indian farmers lose approximately **15–25% of their crop yield** annually due to pests and diseases. Most farmers lack access to timely information about disease outbreaks, weather-based risk predictions, or expert agricultural advice in their local language.

### Solution

KrishiRakshak bridges this gap by providing:
- **Instant AI diagnosis** — snap a photo of an affected crop and get disease identification with treatment advice
- **Real-time alerts** — receive push notifications about pest outbreaks in your region
- **Weather-based predictions** — proactive disease risk assessment based on local weather conditions
- **Multilingual AI assistant** — get farming advice in English, Hindi, or Punjabi

---

## ✨ Features

### 👨‍🌾 For Farmers
| Feature | Description |
|---------|-------------|
| **🔍 AI Disease Scanner** | Upload crop photos for instant disease identification using Kindwise Crop AI with confidence scores and AI-generated treatment plans |
| **🌾 Farm Management** | Add and manage multiple farm plots with crop details, soil type, area, and health tracking |
| **📢 Real-Time Alerts** | Receive instant notifications about pest outbreaks, disease warnings, and weather advisories via Socket.io |
| **🌤️ Weather Dashboard** | View current weather conditions and 5-day forecasts with disease risk assessment |
| **🤖 KrishiMitra Chatbot** | AI agricultural assistant powered by LLaMA 3.1, supporting text and image queries in 3 languages |
| **🌐 Multilingual Support** | Full interface and chatbot support in English, Hindi, and Punjabi |
| **📊 Health Tracking** | Visual crop health status with inspection history and trend monitoring |

### 🛡️ For Administrators
| Feature | Description |
|---------|-------------|
| **📊 Analytics Dashboard** | System-wide statistics, alert trends, crop distribution charts |
| **📢 Alert Management** | Create and broadcast targeted pest/disease/weather alerts to farmers |
| **👥 User Management** | View all registered farmers, promote/demote roles |
| **🦠 Disease Database** | Maintain a knowledge base of pests and diseases with symptoms, treatments, and favorable conditions |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Browser)                        │
│  HTML5 / CSS3 / Vanilla JS / Chart.js / Socket.io Client    │
└──────────────┬──────────────────────┬───────────────────────┘
               │ REST API (HTTP)      │ WebSocket (Socket.io)
               ▼                      ▼
┌─────────────────────────────────────────────────────────────┐
│                Express.js Server (port 3000)                 │
│                                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐  │
│  │   Auth   │ │  Alerts  │ │  Farms   │ │   Diseases    │  │
│  │Controller│ │Controller│ │Controller│ │  Controller   │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └───────┬───────┘  │
│       │             │            │                │          │
│  ┌────┴─────┐ ┌─────┴────┐ ┌────┴─────┐ ┌───────┴───────┐  │
│  │ Weather  │ │   Chat   │ │  Socket  │ │  Middleware   │  │
│  │Controller│ │Controller│ │ Handler  │ │ (Auth/RBAC)   │  │
│  └────┬─────┘ └────┬─────┘ └──────────┘ └───────────────┘  │
└───────┼─────────────┼───────────────────────────────────────┘
        │             │
        ▼             ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────────────────┐
│  MongoDB     │ │  Firebase    │ │    External APIs          │
│  Atlas       │ │  Auth        │ │  ├─ Kindwise Crop AI     │
│  (Mongoose)  │ │  (Admin SDK) │ │  ├─ Groq LLaMA 3.1      │
│              │ │              │ │  └─ OpenWeatherMap        │
└──────────────┘ └──────────────┘ └──────────────────────────┘
```

---

## 🛠️ Tech Stack

| Category | Technology | Purpose |
|----------|-----------|---------|
| **Runtime** | Node.js 18+ | Server runtime |
| **Framework** | Express 4.19 | REST API server |
| **Database** | MongoDB Atlas + Mongoose 8.4 | Data persistence |
| **Authentication** | Firebase Auth (Admin SDK + Web SDK) | User authentication & token verification |
| **Real-Time** | Socket.io 4.7 | Live alert notifications |
| **AI — Chat** | Groq (LLaMA 3.1 8B Instant) | Agricultural chatbot |
| **AI — Vision** | Kindwise Crop API | Crop disease identification from images |
| **Weather** | OpenWeatherMap API | Weather data & forecasts |
| **File Upload** | Multer | Image upload handling |
| **Security** | Helmet, CORS | HTTP security headers |
| **Frontend** | Vanilla JS, HTML5, CSS3 | User interface |
| **Charts** | Chart.js | Data visualization |
| **i18n** | Custom engine | English, Hindi, Punjabi translations |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18 or higher — [Download](https://nodejs.org/)
- **MongoDB Atlas** account — [Sign Up](https://www.mongodb.com/atlas)
- **Firebase** project — [Console](https://console.firebase.google.com/)
- **API Keys** for: OpenWeatherMap, Groq, Kindwise

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/<your-username>/pest_alert.git
   cd pest_alert
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and fill in your credentials (see [Environment Variables](#-environment-variables) below).

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   ```
   http://localhost:3000
   ```

> **Note:** The first user to register is automatically assigned the **admin** role.

---

## 🔐 Environment Variables

Create a `.env` file in the project root with the following variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment mode | `development` |
| `MONGODB_URI` | MongoDB Atlas connection string | `mongodb+srv://user:pass@cluster.mongodb.net/pestalert` |
| `FIREBASE_PROJECT_ID` | Firebase project ID | `my-project-id` |
| `FIREBASE_CLIENT_EMAIL` | Firebase service account email | `firebase-adminsdk-xxx@project.iam.gserviceaccount.com` |
| `FIREBASE_PRIVATE_KEY` | Firebase service account private key | `"-----BEGIN PRIVATE KEY-----\n..."` |
| `OPENWEATHER_API_KEY` | OpenWeatherMap API key | Get from [openweathermap.org](https://openweathermap.org/api) |
| `OPENAI_API_KEY` | Groq API key (OpenAI-compatible endpoint) | Get from [console.groq.com](https://console.groq.com/) |
| `PLANT_AI_API_KEY` | Kindwise Crop API key | Get from [kindwise.com](https://www.kindwise.com/) |
| `PLANT_AI_API_URL` | Kindwise API base URL | `https://crop.kindwise.com/api/v1` |

---

## 📡 API Reference

### Authentication
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/register` | — | Register new user |
| `POST` | `/api/auth/login` | — | Login user |
| `GET` | `/api/auth/me` | 🔒 | Get current profile |
| `PUT` | `/api/auth/profile` | 🔒 | Update profile |
| `GET` | `/api/auth/users` | 🔒 Admin | List all users |
| `GET` | `/api/auth/stats` | 🔒 Admin | User statistics |
| `PUT` | `/api/auth/users/:id/role` | 🔒 Admin | Change user role |

### Farms
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/farms` | 🔒 | Get my farms |
| `POST` | `/api/farms` | 🔒 | Create farm |
| `GET` | `/api/farms/:id` | 🔒 | Get farm details |
| `PUT` | `/api/farms/:id` | 🔒 | Update farm |
| `DELETE` | `/api/farms/:id` | 🔒 | Delete farm |
| `POST` | `/api/farms/:id/photo` | 🔒 | Upload farm photo |
| `GET` | `/api/farms/all` | 🔒 Admin | List all farms |
| `GET` | `/api/farms/stats/overview` | 🔒 | Farm statistics |

### Alerts
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/alerts` | 🔒 | List alerts |
| `GET` | `/api/alerts/:id` | 🔒 | Alert details |
| `POST` | `/api/alerts` | 🔒 Admin | Create alert |
| `PUT` | `/api/alerts/:id` | 🔒 Admin | Update alert |
| `DELETE` | `/api/alerts/:id` | 🔒 Admin | Delete alert |
| `GET` | `/api/alerts/stats/overview` | 🔒 | Alert statistics |

### Disease Detection
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/diseases` | 🔒 | List diseases |
| `GET` | `/api/diseases/:id` | 🔒 | Disease details |
| `POST` | `/api/diseases` | 🔒 Admin | Add disease entry |
| `PUT` | `/api/diseases/:id` | 🔒 Admin | Update disease |
| `DELETE` | `/api/diseases/:id` | 🔒 Admin | Delete disease |
| `POST` | `/api/diseases/detect` | 🔒 | AI disease scan (image upload) |
| `POST` | `/api/diseases/predict` | 🔒 | Weather-based risk prediction |

### Chat (KrishiMitra)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/chat` | 🔒 | Send text message |
| `POST` | `/api/chat/image` | 🔒 | Send image for analysis |
| `GET` | `/api/chat/history` | 🔒 | Get chat history |
| `DELETE` | `/api/chat/history` | 🔒 | Clear chat history |

### Weather
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/weather?lat=...&lon=...` | 🔒 | Current weather |
| `GET` | `/api/weather/forecast?lat=...&lon=...` | 🔒 | 5-day forecast |

### WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `join-user-room` | Client → Server | Join user-specific notification room |
| `join-role-room` | Client → Server | Join role-based room (farmer/admin) |
| `new-alert` | Server → Client | New alert broadcast |

---

## 📁 Project Structure

```
pest_alert/
├── server/
│   ├── server.js                 # Express + Socket.io entry point
│   ├── config/
│   │   ├── db.js                 # MongoDB Atlas connection
│   │   └── firebase.js           # Firebase Admin SDK initialization
│   ├── controllers/
│   │   ├── alertController.js    # Alert CRUD & statistics
│   │   ├── authController.js     # Auth sync & user management
│   │   ├── chatController.js     # KrishiMitra AI chatbot
│   │   ├── diseaseController.js  # Disease database & AI detection
│   │   ├── farmController.js     # Farm CRUD & photo uploads
│   │   └── weatherController.js  # OpenWeather API proxy
│   ├── middleware/
│   │   ├── auth.js               # Firebase token verification
│   │   └── roleCheck.js          # Role-based access control
│   ├── models/
│   │   ├── Alert.js              # Alert schema (severity, type, geo)
│   │   ├── ChatHistory.js        # Chat conversation history
│   │   ├── Disease.js            # Pest/disease knowledge base
│   │   ├── Farm.js               # Farm plot schema (health, scans)
│   │   └── User.js               # User profile schema
│   ├── routes/
│   │   ├── alerts.js             # /api/alerts routes
│   │   ├── auth.js               # /api/auth routes
│   │   ├── chat.js               # /api/chat routes
│   │   ├── diseases.js           # /api/diseases routes
│   │   ├── farms.js              # /api/farms routes
│   │   └── weather.js            # /api/weather routes
│   └── socket/
│       └── socketHandler.js      # Real-time event handling
├── public/
│   ├── index.html                # Landing page
│   ├── login.html                # Login page
│   ├── signup.html               # Registration page
│   ├── farmer-dashboard.html     # Farmer portal (SPA)
│   ├── admin-dashboard.html      # Admin portal (SPA)
│   ├── css/
│   │   └── style.css             # Complete design system
│   ├── js/
│   │   ├── app.js                # Global utilities (Toast, Modal)
│   │   ├── auth.js               # Firebase Auth client
│   │   ├── chatbot.js            # KrishiMitra chat widget
│   │   ├── farmer-dashboard.js   # Farmer dashboard logic
│   │   ├── admin-dashboard.js    # Admin dashboard logic
│   │   ├── i18n.js               # Translation engine (EN/HI/PA)
│   │   └── socket-client.js      # Socket.io client
│   └── uploads/
│       └── farms/                # Farm cover photos
├── uploads/                      # AI scan images
├── .env                          # Environment variables (not committed)
├── .env.example                  # Environment template
├── .gitignore                    # Git ignore rules
├── package.json                  # Dependencies & scripts
└── README.md                     # This file
```

---

## 📸 Screenshots

<!-- Add screenshots of your application here -->
<!-- ![Landing Page](screenshots/landing.png) -->
<!-- ![Farmer Dashboard](screenshots/farmer-dashboard.png) -->
<!-- ![AI Disease Scanner](screenshots/disease-scanner.png) -->
<!-- ![Admin Dashboard](screenshots/admin-dashboard.png) -->

*Screenshots coming soon*

---

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Vivek** — Built with ❤️ for Indian Farmers

---

<div align="center">

**🌿 KrishiRakshak — Protecting Crops, Empowering Farmers 🌾**

</div>
