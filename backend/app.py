from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
import uvicorn
from pydantic import BaseModel
from typing import List, Optional
import pandas as pd
from datetime import datetime
import io
import json
import os
# from openai import OpenAI
from groq import Groq
from dotenv import load_dotenv
from fastapi import UploadFile, File, HTTPException, Depends
from models import TransactionModel, get_db
from sqlalchemy.orm import Session
from ml.fraud_detection import fraud_detector

CATEGORY_MAPPING = {
    "Revenue": 1,
    "Operations": 2,
    "Investment": 3,
    "Marketing": 4,
    "Sales": 5,
    "HR": 6,
    "Technology": 7,
    "Finance": 8
}

fraud_model_trained = False

app = FastAPI(
    title="AI CFO Platform",
    description="AI-Powered Finance, Compliance & Automation Platform",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models
class Transaction(BaseModel):
    id: Optional[int] = None
    date: str
    amount: float
    category: str
    description: str
    type: str  # income/expense

class DashboardData(BaseModel):
    total_revenue: float
    cash_flow: float
    expenses: float
    profit_margin: float

class AIQuery(BaseModel):
    query: str

class DeleteTransactionsRequest(BaseModel):
    ids: list[int]

# Load environment variables
load_dotenv()

# Groq Client

client = Groq(api_key=os.getenv("GROQ_API_KEY"))


@app.get("/")
async def root():
    return {"message": "AI CFO Backend is running! 🚀"}

@app.get("/dashboard", response_model=DashboardData)
async def get_dashboard(db: Session = Depends(get_db)):
    transactions = db.query(TransactionModel).all()

    data = [
        {
            "amount": t.amount,
            "type": t.type
        }
        for t in transactions
    ]

    if len(data) == 0:
        return {
            "total_revenue": 0,
            "cash_flow": 0,
            "expenses": 0,
            "profit_margin": 0
        }

    total_revenue = sum(
        item["amount"]
        for item in data
        if item["type"] == "income"
    )

    total_expenses = sum(
        abs(item["amount"])
        for item in data
        if item["type"] == "expense"
    )
    cash_flow = total_revenue - total_expenses
    profit_margin = (cash_flow / total_revenue * 100) if total_revenue > 0 else 0

    return {
        "total_revenue": round(total_revenue, 2),
        "cash_flow": round(cash_flow, 2),
        "expenses": round(total_expenses, 2),
        "profit_margin": round(profit_margin, 2)
    }


@app.get("/dashboard-insights")
async def dashboard_insights(
    db: Session = Depends(get_db)
):

    transactions = db.query(
        TransactionModel
    ).all()

    income = [
        t.amount
        for t in transactions
        if t.type == "income"
    ]

    expenses = [
        abs(t.amount)
        for t in transactions
        if t.type == "expense"
    ]

    total_income = sum(income)

    avg_expense = (
        round(sum(expenses) / len(expenses), 2)
        if expenses
        else 0
    )

    growth = 0

    if len(income) >= 2:

        growth = round(
            (
                (income[-1] - income[0])
                / income[0]
            ) * 100,
            2
        )

    return {
        "growth": growth,
        "avg_expense": avg_expense,

        "revenue_change": growth,

        "cashflow_change":
            round(growth * 0.8, 2),

        "expense_change":
            round(
                (
                    sum(expenses)
                    / max(total_income, 1)
                ) * 100,
                2
            ),

        "profit_change":
            round(
                growth * 0.4,
                2
            )
    }



@app.get("/expense-breakdown")
async def expense_breakdown(
    db: Session = Depends(get_db)
):

    transactions = db.query(
        TransactionModel
    ).all()

    categories = {}

    for t in transactions:

        if t.type != "expense":
            continue

        categories[t.category] = (
            categories.get(
                t.category,
                0
            )
            + abs(t.amount)
        )

    return {
        "labels":
            list(categories.keys()),
        "values":
            list(categories.values())
    }


@app.get("/transactions")
async def get_transactions(db: Session = Depends(get_db)):
    transactions = db.query(TransactionModel).all()

    return [
        {
            "id": t.id,
            "date": t.date.strftime("%Y-%m-%d"),
            "amount": t.amount,
            "category": t.category,
            "description": t.description,
            "type": t.type
        }
        for t in transactions
    ]



@app.post("/transactions/upload-csv")
async def upload_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    try:

        if not file.filename.endswith(".csv"):

            raise HTTPException(
                status_code=400,
                detail="Please upload a CSV file"
            )

        contents = await file.read()

        df = pd.read_csv(
            io.StringIO(
                contents.decode("utf-8")
            )
        )

        required_columns = [
            "amount",
            "category",
            "description",
            "type"
        ]

        missing_columns = [
            col
            for col in required_columns
            if col not in df.columns
        ]

        if missing_columns:

            raise HTTPException(
                status_code=400,
                detail=f"Missing columns: {', '.join(missing_columns)}"
            )

        valid_categories = [
            "Revenue",
            "Operations",
            "Investment",
            "Marketing",
            "Sales",
            "HR",
            "Technology",
            "Finance"
        ]

        valid_types = [
            "income",
            "expense"
        ]

        transactions_to_insert = []

        # Validate ALL rows first
        for index, row in df.iterrows():

            amount = row["amount"]
            category = str(row["category"]).strip()
            description = str(row["description"]).strip()
            tx_type = str(row["type"]).strip().lower()

            if pd.isna(amount):

                raise HTTPException(
                    status_code=400,
                    detail=f"Row {index + 2}: Amount is required"
                )

            if not description:

                raise HTTPException(
                    status_code=400,
                    detail=f"Row {index + 2}: Description is required"
                )

            if category not in valid_categories:

                raise HTTPException(
                    status_code=400,
                    detail=f"Row {index + 2}: Invalid category '{category}'"
                )

            if tx_type not in valid_types:

                raise HTTPException(
                    status_code=400,
                    detail=f"Row {index + 2}: Type must be income or expense"
                )

            transactions_to_insert.append(
                TransactionModel(
                    amount=float(amount),
                    category=category,
                    description=description,
                    type=tx_type
                )
            )

        # Insert only if ALL rows are valid
        for transaction in transactions_to_insert:

            db.add(transaction)

        db.commit()

        global fraud_model_trained
        fraud_model_trained = False

        return {
            "success": True,
            "message": f"{len(transactions_to_insert)} transactions imported successfully"
        }

    except HTTPException:
        raise

    except Exception as e:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Import failed: {str(e)}"
        )



@app.post("/transactions")
async def create_transaction(
    tx: Transaction,
    db: Session = Depends(get_db)
):
    transaction = TransactionModel(
        amount=tx.amount,
        category=tx.category,
        description=tx.description,
        type=tx.type
    )

    db.add(transaction)
    db.commit()
    db.refresh(transaction)

    global fraud_model_trained
    fraud_model_trained = False

    return {
        "id": transaction.id,
        "date": transaction.date.strftime("%Y-%m-%d"),
        "amount": transaction.amount,
        "category": transaction.category,
        "description": transaction.description,
        "type": transaction.type
    }

@app.delete("/transactions/{id}")
async def delete_transaction(
    id: int,
    db: Session = Depends(get_db)
):
    tx = db.query(TransactionModel).filter(
        TransactionModel.id == id
    ).first()

    if not tx:
        raise HTTPException(404)

    db.delete(tx)
    db.commit()

    global fraud_model_trained
    fraud_model_trained = False

    return {
        "message": "Deleted"
    }

@app.post("/transactions/delete-multiple")
async def delete_multiple_transactions(
    payload: DeleteTransactionsRequest,
    db: Session = Depends(get_db)
):

    if not payload.ids:

        raise HTTPException(
            status_code=400,
            detail="No transactions selected"
        )

    deleted = db.query(
        TransactionModel
    ).filter(
        TransactionModel.id.in_(payload.ids)
    ).delete(
        synchronize_session=False
    )

    db.commit()

    global fraud_model_trained
    fraud_model_trained = False

    return {
        "message": f"{deleted} transaction(s) deleted successfully"
    }


@app.get("/compliance/check")
async def check_compliance():
    # Mock GST & Compliance Check
    return {
        "status": "Compliant",
        "gst_filing": "Due in 7 days",
        "risk_score": 12,
        "alerts": [
            "Quarterly GST return pending",
            "High expense in 'Marketing' category"
        ]
    }

@app.post("/ai/assistant")
async def ai_assistant( query: AIQuery,db: Session = Depends(get_db)):

    """
    Real LLM-powered AI CFO Assistant
    """
    try:
        # Get current financial context

        dashboard = await get_dashboard(db)
        transactions = await get_transactions(db)

        fraud = await detect_fraud(db)
        compliance = await check_compliance()

        context = f"""
        You are AI CFO, a professional Chief Financial Officer assistant.

        BUSINESS DATA

        Revenue: ₹{dashboard['total_revenue']/10000000:.2f} Cr
        Cash Flow: ₹{dashboard['cash_flow']/10000000:.2f} Cr
        Expenses: ₹{dashboard['expenses']/10000000:.2f} Cr
        Profit Margin: {dashboard['profit_margin']}%

        Fraud Status: {fraud['status']}
        Flagged Transactions: {fraud['flagged_transactions']}
        Fraud Score: {fraud['fraud_score']}%

        Compliance Status: {compliance['status']}
        GST Filing: {compliance['gst_filing']}
        Risk Score: {compliance['risk_score']}

        Recent Transactions:
        {str(transactions[:10])}

        Rules:

        - Always answer based on actual business data.
        - Never give generic responses.
        - Keep answers easy to read.
        - Use headings.
        - Use bullet points.
        - Use Indian currency format.
        - Give business recommendations.

        Question Categories:

        Cash Flow:
        Explain health, strengths, risks and recommendations.

        Revenue:
        Explain growth, trends and opportunities.

        Expenses:
        Explain biggest expenses and cost-saving opportunities.

        Profit:
        Explain profitability and improvement suggestions.

        Fraud:
        Explain suspicious transactions and risk level.

        Compliance:
        Explain compliance status, GST status and audit readiness.

        Analytics:
        Explain trends visible in charts and financial performance.

        Transactions:
        Explain income, expenses and transaction patterns.

        Business Health:
        Combine revenue, profit, cash flow, fraud and compliance.

        Always act like a CFO.
        """
        
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",  # Cost-effective & fast. Change to gpt-4o for best quality
            messages=[
                {
                    "role": "system",
                    "content": context
                },
                {
                    "role": "user",
                    "content": f"""
            Question: {query.query}

            Answer as a professional CFO.

            Adapt the structure based on the user's question.

            For example:
            - Fraud questions -> Fraud Risk Assessment
            - Profit questions -> Profit Improvement Opportunities
            - Cash Flow questions -> Cash Flow Analysis
            - Revenue questions -> Revenue Growth Analysis
            - Compliance questions -> Compliance Review

            Do not force the same headings for every response.
            Use only sections relevant to the question.

            Only include sections relevant to the user's question.
            """
                }
            ],
            temperature=0.7,
            max_tokens=700
        )
        
        answer = response.choices[0].message.content.strip()
        
        return {
            "response": answer,
            "timestamp": datetime.now().isoformat(),
            "model": "llama-3.3-70b-versatile"
        }
        
    except Exception as e:
        # Fallback to smart mock if API fails (e.g. no key or rate limit)
        print(f"LLM Error: {e}")
        fallback_responses = {
            "cash": "Your current cash flow is positive at ₹2.13 Cr with strong growth.",
            "fraud": "No major fraud detected. Risk score remains low.",
            "forecast": "Next month revenue is projected to grow by 18%.",
        }
        q = query.query.lower()
        answer = next((v for k, v in fallback_responses.items() if k in q), 
                     "Based on your financial data, I recommend reviewing operational expenses and accelerating collections.")
        
        return {"response": answer, "timestamp": datetime.now().isoformat(), "model": "fallback"}

@app.get("/seed")
async def seed(db: Session = Depends(get_db)):

    existing = db.query(TransactionModel).count()

    if existing > 0:
        return {
            "message": "Data already exists"
        }
    
    records = [
        TransactionModel(
            amount=82450000,
            category="Revenue",
            description="Q2 Sales",
            type="income"
        ),
        TransactionModel(
            amount=-12340000,
            category="Operations",
            description="Employee Salaries",
            type="expense"
        ),
        TransactionModel(
            amount=4500000,
            category="Investment",
            description="Return on Investments",
            type="income"
        )
    ]

    for record in records:
        db.add(record)

    db.commit()

    return {"message": "Sample data inserted"}

@app.get("/stats")
async def stats(db: Session = Depends(get_db)):

    transactions = db.query(TransactionModel).all()

    income = sum(
        t.amount
        for t in transactions
        if t.type == "income"
    )

    expense = sum(
        abs(t.amount)
        for t in transactions
        if t.type == "expense"
    )

    return {
        "transactions": len(transactions),
        "income": income,
        "expense": expense
    }

@app.get("/categories")
async def get_categories():
    return [
        "Revenue",
        "Operations",
        "Investment",
        "Marketing",
        "Sales",
        "HR",
        "Technology",
        "Finance"
    ]

@app.get("/analytics")
async def analytics(db: Session = Depends(get_db)):

    transactions = db.query(
        TransactionModel
    ).order_by(
        TransactionModel.date
    ).all()

    grouped = {}

    for t in transactions:

        date_key = t.date.strftime("%Y-%m-%d")

        if date_key not in grouped:

            grouped[date_key] = {
                "revenue": 0,
                "expense": 0
            }

        if t.type == "income":

            grouped[date_key]["revenue"] += t.amount

        else:

            grouped[date_key]["expense"] += abs(t.amount)

    labels = []
    revenue = []
    expenses = []

    for date_key, values in grouped.items():

        labels.append(date_key)

        revenue.append(
            values["revenue"]
        )

        expenses.append(
            values["expense"]
        )

    return {
        "labels": labels,
        "revenue": revenue,
        "expenses": expenses
    }

@app.get("/reset")
async def reset(db: Session = Depends(get_db)):

    db.query(TransactionModel).delete()
    db.commit()

    global fraud_model_trained
    fraud_model_trained = False

    return {"message": "Database cleared"}


@app.get("/fraud/detect")
async def detect_fraud(
    db: Session = Depends(get_db)
):

    transactions = db.query(
        TransactionModel
    ).all()

    if len(transactions) < 5:

        return {
            "fraud_score": 0,
            "status": "Not Enough Data",
            "flagged_transactions": 0,
            "suspicious_transactions": [],
            "recommendation": "Need at least 5 transactions"
        }

    data = []

    for t in transactions:

        data.append({
            "amount": t.amount,
            "category_encoded": CATEGORY_MAPPING.get(
                t.category,
                0
            ),
            "category": t.category,
            "description": t.description
        })

    df = pd.DataFrame([
        {
            "amount": item["amount"],
            "category_encoded": item["category_encoded"]
        }
        for item in data
    ])

    global fraud_model_trained

    if not fraud_model_trained:

        fraud_detector.train(df)

        fraud_model_trained = True

    flagged = 0
    flagged_items = []

    for row in data:

        result = fraud_detector.predict({
            "amount": row["amount"],
            "category_encoded": row["category_encoded"]
        })

        if result["is_fraud"]:

            flagged += 1

            flagged_items.append({
                "amount": row["amount"],
                "category": row["category"],
                "description": row["description"]
            })

    fraud_score = round(
        (flagged / len(data)) * 100,
        2
    )

    return {
        "fraud_score": fraud_score,
        "status": (
            "High Risk"
            if fraud_score > 20
            else "Low Risk"
        ),
        "flagged_transactions": flagged,
        "suspicious_transactions": flagged_items,
        "recommendation":
            f"{flagged} unusual transaction(s) detected"
    }

@app.get("/gst/summary")
async def gst_summary(
    db: Session = Depends(get_db)
):

    transactions = db.query(
        TransactionModel
    ).all()

    revenue = sum(
        t.amount
        for t in transactions
        if t.type == "income"
    )

    gst_collected = round(
        revenue * 0.18,
        2
    )

    gst_payable = round(
        gst_collected * 0.25,
        2
    )

    return {

        "revenue": revenue,

        "gst_collected":
            gst_collected,

        "gst_payable":
            gst_payable,

        "invoice_count":
            len(transactions),

        "status":
            "Compliant",

        "audit_readiness":
            "Ready",

        "compliance_score":
            95
    }

@app.get("/reports/summary")
async def reports_summary(
    db: Session = Depends(get_db)
):
    dashboard = await get_dashboard(db)

    fraud = await detect_fraud(db)

    compliance = await check_compliance()

    gst_revenue = dashboard["total_revenue"]

    gst_collected = round(
        gst_revenue * 0.18,
        2
    )

    return {

        "revenue":
            dashboard["total_revenue"],

        "expenses":
            dashboard["expenses"],

        "profit_margin":
            dashboard["profit_margin"],

        "cash_flow":
            dashboard["cash_flow"],

        "fraud_status":
            fraud["status"],

        "compliance_status":
            compliance["status"],

        "gst_status":
            "Compliant",

        "health_score":
            95,

        "gst_collected":
            gst_collected
    }

# Run the app
if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
