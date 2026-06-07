from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
import uvicorn
from pydantic import BaseModel
from typing import List, Optional
import pandas as pd
from datetime import datetime
from fastapi import UploadFile, File
import io
import json
import os
# from openai import OpenAI
from groq import Groq
from dotenv import load_dotenv
from fastapi import UploadFile, File, HTTPException, Depends
from models import TransactionModel, get_db
from sqlalchemy.orm import Session




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

    df = pd.DataFrame(data)
    total_revenue = df[df['type'] == 'income']['amount'].sum()
    total_expenses = abs(df[df['type'] == 'expense']['amount'].sum())
    cash_flow = total_revenue - total_expenses
    profit_margin = (cash_flow / total_revenue * 100) if total_revenue > 0 else 0

    return {
        "total_revenue": round(total_revenue, 2),
        "cash_flow": round(cash_flow, 2),
        "expenses": round(total_expenses, 2),
        "profit_margin": round(profit_margin, 2)
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
        
        context = f"""
        You are an expert AI CFO Assistant for a growing Indian company.
        Current Financial Snapshot:
        - Total Revenue: ₹{dashboard['total_revenue']/10000000:.2f} Cr
        - Cash Flow: ₹{dashboard['cash_flow']/10000000:.2f} Cr
        - Expenses: ₹{dashboard['expenses']/10000000:.2f} Cr
        - Profit Margin: {dashboard['profit_margin']}%
        
        Recent Transactions: {str(transactions)[:500]}...
        
        Provide concise, professional, actionable financial advice in Indian Rupees.
        Be helpful, data-driven, and proactive about risks and opportunities.
        """
        
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",  # Cost-effective & fast. Change to gpt-4o for best quality
            messages=[
                {"role": "system", "content": context},
                {"role": "user", "content": query.query}
            ],
            temperature=0.7,
            max_tokens=300
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

    return {"message": "Database cleared"}


@app.get("/fraud/detect")
async def detect_fraud():
    # Mock ML Fraud Detection
    return {
        "fraud_score": 0.08,
        "status": "Low Risk",
        "flagged_transactions": 2,
        "recommendation": "Review transactions from vendor XYZ"
    }

# Run the app
if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
