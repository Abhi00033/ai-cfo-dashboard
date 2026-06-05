# AI CFO Backend

AI-powered finance management backend built with FastAPI for the AI CFO Platform.

Created by **Smart Solutions Team**

---

## Features

### Financial Dashboard

- Revenue Tracking
- Cash Flow Monitoring
- Expense Analysis
- Profit Margin Calculation

### Transaction Management

- Create Transactions
- View Transactions
- Delete Transactions
- SQLite Database Storage

### AI Financial Assistant

- Powered by Groq LLM
- Model: `llama-3.3-70b-versatile`
- Context-aware financial insights
- Uses live dashboard and transaction data
- Smart fallback responses if LLM is unavailable

### Compliance Monitoring

- GST Filing Status
- Compliance Risk Score
- Compliance Alerts

### Fraud Detection

- Fraud Risk Assessment
- Flagged Transaction Monitoring
- Risk Recommendations

### Analytics

- Revenue Trends
- Expense Trends
- Financial Reporting APIs

---

## Technology Stack

### Backend

- FastAPI
- Uvicorn
- SQLAlchemy
- SQLite
- Pydantic

### Data & Analytics

- Pandas
- NumPy
- Scikit-Learn
- Joblib

### AI & LLM

- Groq API
- Llama 3.3 70B Versatile

### Utilities

- Python Dotenv
- HTTPX

---

## Installation

### Clone Repository

```bash
git clone <repository-url>
cd ai-cfo-platform/backend
```

### Install Dependencies

```bash
pip install -r requirements.txt
```

### Create .env File

```env
GROQ_API_KEY=your_groq_api_key_here
```

Get your API Key from:

https://console.groq.com/keys

---

## Run Backend

```bash
python app.py
```

Server runs at:

```text
http://localhost:8000
```

Swagger Documentation:

```text
http://localhost:8000/docs
```

---

## Database

Database: SQLite

```text
ai_cfo.db
```

Managed using SQLAlchemy ORM.

---

## API Endpoints

### Health Check

```http
GET /
```

---

### Dashboard

```http
GET /dashboard
```

Returns:

- Revenue
- Cash Flow
- Expenses
- Profit Margin

---

### Transactions

```http
GET /transactions
POST /transactions
DELETE /transactions/{id}
```

---

### Analytics

```http
GET /analytics
```

Returns chart-ready revenue and expense data.

---

### Statistics

```http
GET /stats
```

Returns:

- Total Transactions
- Total Income
- Total Expenses

---

### Categories

```http
GET /categories
```

Returns available transaction categories.

---

### Compliance

```http
GET /compliance/check
```

Returns:

- Compliance Status
- GST Filing Status
- Risk Score
- Alerts

---

### Fraud Detection

```http
GET /fraud/detect
```

Returns:

- Fraud Score
- Risk Status
- Recommendations

---

### AI Assistant

```http
POST /ai/assistant
```

Request:

```json
{
  "query": "How is my cash flow performing?"
}
```

Response:

```json
{
  "response": "Your cash flow is healthy...",
  "timestamp": "2026-06-05T10:30:00",
  "model": "llama-3.3-70b-versatile"
}
```

---

### Sample Data

```http
GET /seed
```

Inserts demo transactions.

---

### Reset Database

```http
GET /reset
```

Clears all transactions.

---

## AI Assistant Workflow

1. Reads current dashboard metrics
2. Reads transaction history
3. Builds financial context
4. Sends context to Groq LLM
5. Generates CFO-style financial recommendations
6. Returns concise business insights

If the LLM is unavailable:

- Fallback financial responses are returned
- Application continues functioning normally

---

## Future Improvements

- User Authentication
- Multi-User Accounts
- PostgreSQL Support
- Financial Forecasting
- PDF Report Generation
- Real-Time Notifications
- Advanced Fraud Detection Models

---

## Project

AI CFO Platform

Built for financial analytics, compliance monitoring, and AI-powered business insights.

Created by **Smart Solutions Team**
