vercel_live_link = https://flexstack.vercel.app
# 💪 FlexStack — Backend API

A RESTful backend built with **Node.js**, **Express.js**, and **MongoDB** that powers a fitness platform with role-based access control, class management, community forums, payments, and trainer applications.

---

## 🚀 Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB (via MongoDB Node.js Driver)
- **Authentication:** JWT (verified via JWKS endpoint using `jose-cjs`)
- **Environment Config:** dotenv

---

## 📁 Project Structure

```
├── index.js          # Main entry point
├── .env              # Environment variables (not committed)
└── package.json
```

---

## ⚙️ Environment Variables

Create a `.env` file in the root directory with the following:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
CLIENT_URL=your_frontend_url
```

---

## 🛠️ Getting Started

### Prerequisites

- Node.js v18+
- MongoDB Atlas account (or local MongoDB)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/your-repo-name.git
cd your-repo-name

# Install dependencies
npm install

# Start the server
node index.js
```

The server will start on the port defined in your `.env` file.

---

## 🔐 Authentication & Authorization

All protected routes use JWT verification via a **JWKS endpoint** from the client. Tokens must be passed as:

```
Authorization: Bearer <token>
```

Three roles are supported:

| Role | Description |
|------|-------------|
| `admin` | Manage users, approve trainer applications |
| `trainer` | Create, update, and manage classes |
| `member` | Book classes, add favorites, apply to become a trainer |

---

## 📌 API Endpoints

### 👤 Users

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/alluser` | Public | Get all users |
| PATCH | `/api/manage-user/:id` | Admin | Update a user's data |

---

### 🏋️ Classes

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/all-class` | Public | Get all classes (supports `?search=`) |
| GET | `/api/classes-latest` | Public | Get latest 10 classes |
| GET | `/api/all-classes/:id` | Token | Get a single class by ID |
| POST | `/api/all-class` | Trainer | Create a new class |
| PATCH | `/api/all-class/:id` | Trainer | Update a class |
| DELETE | `/api/all-class/:id` | Token | Delete a class |

---

### 💬 Community Forum

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/community-forum` | Public | Get all forum posts |
| GET | `/api/community-latest` | Public | Get latest 3 posts |
| GET | `/api/community-forum/:id` | Token | Get a single post |
| POST | `/api/community-forum` | Token | Create a forum post |
| POST | `/api/community-forum/:id/comment` | Public | Add a comment to a post |
| DELETE | `/api/community-forum/:id` | Token | Delete a post |

---

### 💳 Payments / Subscriptions

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/payment` | Token | Get all payments |
| GET | `/api/payment/:id` | Token | Get a single payment |
| POST | `/api/payment` | Public | Record a new payment (upgrades user to `pro`) |

> Blocked users are prevented from making payments.

---

### ⭐ Member Favorites

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/favorite` | Public | Get favorites by `?memberId=` |
| POST | `/api/favorite` | Member | Add a class to favorites |

---

### 📋 Trainer Applications

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/apply-trainer` | Public | Get applications by `?memberId=` |
| POST | `/api/apply-trainer` | Token | Submit a trainer application |
| PATCH | `/apply-trainer/:postId` | Public | Approve or reject an application |

> Approving an application automatically updates the user's role to `trainer`.

---

## 🗄️ Database Collections

| Collection | Purpose |
|------------|---------|
| `user` | Stores all user accounts and roles |
| `allClass` | Stores fitness class listings |
| `community` | Stores community forum posts and comments |
| `applyTrainer` | Stores trainer application submissions |
| `memberFavorite` | Stores members' saved/favorite classes |
| `subscription` | Stores payment and subscription records |

---

## 📝 License

This project is open source and available under the [MIT License](LICENSE).
