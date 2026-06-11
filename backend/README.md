# AI CFO Backend

AI-powered finance management backend built with FastAPI for the AI CFO Platform.

Created by **Smart Solutions Team**

---

## Features

### Financial Dashboard

* Revenue Tracking
* Expense Tracking
* Cash Flow Monitoring
* Profit Margin Analysis
* Business Health Metrics

---

### Transaction Management

* Create Transactions
* View Transactions
* Delete Transactions
* Income & Expense Categorization
* Financial Data Storage

---

### Customer Management

* Create Customers
* Update Customers
* View Customers
* Delete Customers
* GSTIN Management

---

### Vendor Management

* Create Vendors
* Update Vendors
* View Vendors
* Delete Vendors
* GSTIN Management

---

### Invoice Management

* Create Invoices
* Update Invoices
* View Invoices
* Delete Invoices
* GST Calculation
* Invoice Status Tracking

---

### Bill Management

* Create Bills
* Update Bills
* View Bills
* Delete Bills
* GST Calculation
* Vendor Liability Tracking

---

### GST Center

* Output GST Calculation
* Input GST Calculation
* GST Payable Calculation
* GST Status Monitoring
* GST Compliance Readiness

#### GST Formula

```text
Output GST = Invoice GST

Input GST = Bill GST

GST Payable = Output GST - Input GST
```

---

### Compliance Monitoring

* Compliance Score
* GST Filing Readiness
* Compliance Alerts
* Risk Assessment
* Audit Readiness Checks

Compliance uses:

* Invoices
* Bills
* Fraud Detection Results

---

### Fraud Detection

* Machine Learning Based Detection
* Isolation Forest Model
* Suspicious Transaction Identification
* Fraud Risk Score
* Fraud Recommendations

---

### Analytics

* Revenue Trends
* Expense Trends
* Cash Flow Analysis
* Financial Insights
* Expense Breakdown
* Smart Business Alerts

---

### Business Reports

* Revenue Summary
* Expense Summary
* Cash Flow Summary
* Profit Margin Analysis
* GST Summary
* Fraud Status
* Compliance Status

---

### AI CFO Assistant

Powered by Groq LLM

Model:

```text
llama-3.3-70b-versatile
```

Capabilities:

* Revenue Analysis
* Expense Analysis
* Cash Flow Analysis
* Profitability Review
* Customer Analysis
* Vendor Analysis
* Invoice Analysis
* Bill Analysis
* GST Review
* Compliance Review
* Fraud Risk Assessment
* Business Health Assessment

Uses live business data from:

* Dashboard
* Transactions
* Customers
* Vendors
* Invoices
* Bills
* GST Center
* Compliance Engine
* Fraud Detection Engine

---

## Technology Stack

### Backend

* FastAPI
* Uvicorn
* SQLAlchemy
* SQLite
* Pydantic

---

### Data & Analytics

* Pandas
* NumPy
* Scikit-Learn
* Joblib

---

### AI & LLM

* Groq API
* Llama 3.3 70B Versatile

---

### Database

* SQLite
* SQLAlchemy ORM

---

## Installation

### Clone Repository

```bash
git clone <repository-url>
cd ai-cfo-platform/backend
```

### Create Virtual Environment

```bash
python -m venv venv
```

Activate Virtual Environment:

```bash
venv\Scripts\activate
```

### Install Dependencies

```bash
pip install -r requirements.txt
```

### Create .env File

```env
GROQ_API_KEY=your_groq_api_key_here
```

Get your API key from:

https://console.groq.com/keys

---

## Run Backend

```bash
uvicorn app:app --reload
```

Server:

```text
http://localhost:8000
```

Swagger Documentation:

```text
http://localhost:8000/docs
```

---

## Database

Database File:

```text
ai_cfo.db
```

Managed using SQLAlchemy ORM.

---

## API Endpoints

### Dashboard

```http
GET /dashboard
```

Returns:

* Revenue
* Expenses
* Cash Flow
* Profit Margin

---

### Transactions

```http
GET /transactions
POST /transactions
DELETE /transactions/{id}
```

---

### Customers

```http
GET /customers
POST /customers
PUT /customers/{id}
DELETE /customers/{id}
```

---

### Vendors

```http
GET /vendors
POST /vendors
PUT /vendors/{id}
DELETE /vendors/{id}
```

---

### Invoices

```http
GET /invoices
POST /invoices
PUT /invoices/{id}
DELETE /invoices/{id}
```

---

### Bills

```http
GET /bills
POST /bills
PUT /bills/{id}
DELETE /bills/{id}
```

---

### GST Center

```http
GET /gst/summary
```

Returns:

* Output GST
* Input GST
* GST Payable
* Invoice Count
* Bill Count
* Compliance Score

---

### Analytics

```http
GET /analytics
GET /analytics/insights
```

Returns:

* Revenue Trends
* Expense Trends
* Financial Insights
* Smart Alerts

---

### Reports

```http
GET /reports/summary
```

Returns:

* Revenue
* Expenses
* Cash Flow
* Profit Margin
* GST Summary
* Fraud Status
* Compliance Status

---

### Compliance

```http
GET /compliance/check
```

Returns:

* Compliance Status
* Compliance Score
* GST Readiness
* Risk Score
* Alerts

---

### Fraud Detection

```http
GET /fraud/detect
```

Returns:

* Fraud Score
* Fraud Status
* Flagged Transactions
* Recommendations

---

### AI Assistant

```http
POST /ai/assistant
```

Request:

```json
{
  "query": "Give me a complete business health review"
}
```

Response:

```json
{
  "response": "Your business shows healthy cash flow and strong profitability...",
  "timestamp": "2026-06-12T10:30:00",
  "model": "llama-3.3-70b-versatile"
}
```

---

## AI Assistant Workflow

1. Reads Dashboard Metrics
2. Reads Transactions
3. Reads Customers
4. Reads Vendors
5. Reads Invoices
6. Reads Bills
7. Reads GST Summary
8. Reads Compliance Status
9. Reads Fraud Analysis
10. Generates CFO-Level Recommendations

---

## Future Improvements

* User Authentication
* Multi-Tenant Architecture
* PostgreSQL Support
* PDF Report Generation
* Excel Export
* Financial Forecasting
* Budget Planning
* Real-Time Notifications
* Advanced AI Insights
* Predictive Cash Flow Modeling

---

## Project

**AI CFO Platform**

AI-powered financial analytics, accounting management, GST tracking, compliance monitoring, fraud detection, and intelligent business insights.

Created by **Smart Solutions Team**
