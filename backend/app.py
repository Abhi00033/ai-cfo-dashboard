from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from apscheduler.schedulers.background import BackgroundScheduler
import uvicorn
from pydantic import BaseModel
from typing import Optional
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



from models import (
    TransactionModel,
    RegulatoryNewsModel,
    get_db
)

from services.news_service import (
    fetch_regulatory_news
)
from routes.customers import router as customer_router
from routes.transactions import router as transaction_router
from routes.vendors import router as vendor_router
from routes.invoices import router as invoice_router
from routes.bills import router as bills_router
from models_accounting import (
    CustomerModel,
    VendorModel,
    InvoiceModel,
    BillModel
)

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

app.include_router(customer_router)
app.include_router(transaction_router)
app.include_router(vendor_router)
app.include_router(invoice_router)
app.include_router(bills_router)


# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models

class DashboardData(BaseModel):
    total_revenue: float
    cash_flow: float
    expenses: float
    profit_margin: float

class AIQuery(BaseModel):
    query: str


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


@app.get("/gst/summary")
async def gst_summary(
    db: Session = Depends(get_db)
):

    invoices = db.query(
        InvoiceModel
    ).all()

    bills = db.query(
        BillModel
    ).all()

    gst_collected = sum(
        invoice.gst_amount or 0
        for invoice in invoices
    )

    gst_input = sum(
        bill.gst_amount or 0
        for bill in bills
    )

    gst_payable = (
        gst_collected -
        gst_input
    )

    return {

        "gst_collected":
            round(gst_collected, 2),

        "gst_input":
            round(gst_input, 2),

        "gst_payable":
            round(gst_payable, 2),

        "invoice_count":
            len(invoices),

        "bill_count":
            len(bills),

        "status":
            "Payable"
            if gst_payable > 0
            else "Refund"
            if gst_payable < 0
            else "Balanced",

        "audit_readiness":
            "Ready"
            if len(invoices) > 0 and len(bills) > 0
            else "Pending",

        "compliance_score":
            100
            - (20 if len(invoices) == 0 else 0)
            - (20 if len(bills) == 0 else 0)
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


@app.get("/compliance/check")
async def check_compliance(
    db: Session = Depends(get_db)
):

    invoices = db.query(
        InvoiceModel
    ).all()

    bills = db.query(
        BillModel
    ).all()

    fraud = await detect_fraud(db)

    alerts = []

    score = 100

    invoice_count = len(invoices)

    bill_count = len(bills)

    if invoice_count == 0:

        score -= 20

        alerts.append(
            "No invoices available"
        )

    if bill_count == 0:

        score -= 20

        alerts.append(
            "No vendor bills available"
        )

    if fraud["flagged_transactions"] > 0:

        score -= 20

        alerts.append(
            f"{fraud['flagged_transactions']} suspicious transaction(s) detected"
        )

    gst_status = (
        "Ready"
        if invoice_count > 0 and bill_count > 0
        else "Pending"
    )

    status = (
        "Compliant"
        if score >= 80
        else "Review Required"
    )

    return {

        "status":
            status,

        "gst_filing":
            gst_status,

        "risk_score":
            max(
                0,
                100 - score
            ),

        "alerts":
            alerts,

        "compliance_score":
            score,

        "invoice_count":
            invoice_count,

        "bill_count":
            bill_count
    }

@app.post("/ai/assistant")
async def ai_assistant( query: AIQuery,db: Session = Depends(get_db)):

    """
    Real LLM-powered AI CFO Assistant
    """
    try:
        # Get current financial context

        dashboard = await get_dashboard(db)
        transactions = db.query(
            TransactionModel
        ).all()

        transactions = [
            {
                "id": t.id,
                "amount": t.amount,
                "category": t.category,
                "description": t.description,
                "type": t.type
            }
            for t in transactions
        ]

        fraud = await detect_fraud(db)
        compliance = await check_compliance(db)

        customers = db.query(
            CustomerModel
        ).all()

        vendors = db.query(
            VendorModel
        ).all()

        invoices = db.query(
            InvoiceModel
        ).all()

        bills = db.query(
            BillModel
        ).all()

        gst = await gst_summary(db)

        latest_news = (
            db.query(
                RegulatoryNewsModel
            )
            .order_by(
                RegulatoryNewsModel.created_at.desc()
            )
            .limit(5)
            .all()
        )

        news_context = "\n".join([
            f"- {n.category}: {n.title}"
            for n in latest_news
        ])

        customer_data = [
            {
                "id": c.id,
                "name": c.name,
                "email": c.email,
                "gstin": c.gstin
            }
            for c in customers
        ]

        vendor_data = [
            {
                "id": v.id,
                "name": v.name,
                "email": v.email,
                "gstin": v.gstin
            }
            for v in vendors
        ]

        invoice_data = [
            {
                "invoice_number": i.invoice_number,
                "customer_id": i.customer_id,
                "total_amount": i.total_amount,
                "gst_amount": i.gst_amount,
                "status": i.status
            }
            for i in invoices
        ]

        bill_data = [
            {
                "bill_number": b.bill_number,
                "vendor_id": b.vendor_id,
                "total_amount": b.total_amount,
                "gst_amount": b.gst_amount,
                "status": b.status
            }
            for b in bills
        ]

        context = f"""
        You are AI CFO, a professional Chief Financial Officer assistant.

        BUSINESS OVERVIEW

        Revenue: ₹{dashboard['total_revenue']/10000000:.2f} Cr
        Cash Flow: ₹{dashboard['cash_flow']/10000000:.2f} Cr
        Expenses: ₹{dashboard['expenses']/10000000:.2f} Cr
        Profit Margin: {dashboard['profit_margin']}%

        FRAUD ANALYSIS

        Fraud Status: {fraud['status']}
        Flagged Transactions: {fraud['flagged_transactions']}
        Fraud Score: {fraud['fraud_score']}%

        COMPLIANCE ANALYSIS

        Compliance Status: {compliance['status']}
        GST Filing: {compliance['gst_filing']}
        Risk Score: {compliance['risk_score']}
        Compliance Score: {compliance['compliance_score']}%

        CUSTOMERS

        Total Customers: {len(customers)}

        Recent Customers:
        {str(customer_data[:10])}

        VENDORS

        Total Vendors: {len(vendors)}

        Recent Vendors:
        {str(vendor_data[:10])}

        INVOICES

        Total Invoices: {len(invoices)}

        Recent Invoices:
        {str(invoice_data[:15])}

        BILLS

        Total Bills: {len(bills)}

        Recent Bills:
        {str(bill_data[:15])}

        GST SUMMARY

        Output GST: ₹{gst['gst_collected']:,.2f}
        Input GST: ₹{gst['gst_input']:,.2f}
        GST Payable: ₹{gst['gst_payable']:,.2f}
        GST Status: {gst['status']}

        LATEST REGULATORY NEWS

        {news_context}

        TRANSACTIONS

        Total Transactions: {len(transactions)}

        Recent Transactions:
        {str(transactions[:15])}

        IMPORTANT BUSINESS RULES

        - Customers generate revenue through invoices and income transactions.
        - Vendors generate expenses through bills and expense transactions.
        - GST Output comes from invoices.
        - GST Input Tax Credit comes from bills.
        - GST Payable = Output GST - Input GST.
        - Revenue and Expenses come from transactions.
        - Fraud analysis is based on transaction patterns.
        - Compliance is based on invoices, bills and fraud analysis.

        ANSWERING RULES

        - Always answer using the provided business data.
        - Never invent numbers.
        - If information is unavailable, clearly say so.
        - Use professional CFO language.
        - Use headings and bullet points.
        - Use Indian currency format.
        - Give practical recommendations.
        - Be concise but informative.

        QUESTION TYPES

        Revenue Analysis
        Expense Analysis
        Cash Flow Analysis
        Profitability Analysis
        Fraud Risk Assessment
        Compliance Review
        GST Review
        Customer Analysis
        Vendor Analysis
        Invoice Analysis
        Bill Analysis
        Transaction Analysis
        Business Health Review
        Business Summary

        Always act like an experienced CFO.
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


@app.get("/analytics/insights")
async def analytics_insights(
    db: Session = Depends(get_db)
):

    customer_count = db.query(
        CustomerModel
    ).count()

    vendor_count = db.query(
        VendorModel
    ).count()

    invoice_count = db.query(
        InvoiceModel
    ).count()

    bill_count = db.query(
        BillModel
    ).count()

    gst = await gst_summary(db)

    fraud = await detect_fraud(db)

    return {
        "customer_count": customer_count,
        "vendor_count": vendor_count,
        "invoice_count": invoice_count,
        "bill_count": bill_count,
        "gst_payable": gst["gst_payable"],
        "fraud_count": fraud["flagged_transactions"]
    }

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


@app.get("/reports/summary")
async def reports_summary(
    db: Session = Depends(get_db)
):
    dashboard = await get_dashboard(db)

    fraud = await detect_fraud(db)

    compliance = await check_compliance(db)

    invoices = db.query(
        InvoiceModel
    ).all()

    bills = db.query(
        BillModel
    ).all()

    gst_collected = sum(
        i.gst_amount or 0
        for i in invoices
    )

    gst_input = sum(
        b.gst_amount or 0
        for b in bills
    )

    gst_payable = (
        gst_collected -
        gst_input
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
            "Payable"
            if gst_payable > 0
            else "Refund"
            if gst_payable < 0
            else "Balanced",

        "health_score":
            95,

        "gst_collected":
            round(gst_collected, 2),

        "gst_input":
            round(gst_input, 2),

        "gst_payable":
            round(gst_payable, 2)
    }

def refresh_news_job():

    db = next(get_db())

    try:

        data = fetch_regulatory_news()

        if data.get("status") != "ok":
            print("News API Error")
            return

        db.query(
            RegulatoryNewsModel
        ).delete()

        for article in data.get(
            "articles",
            []
        ):

            title = article.get(
                "title",
                ""
            )

            lower_title = title.lower()

            if "gst" in lower_title:
                category = "GST"

            elif "tax" in lower_title:
                category = "Tax"

            elif "rbi" in lower_title:
                category = "RBI"

            elif "sebi" in lower_title:
                category = "SEBI"

            elif "compliance" in lower_title:
                category = "Compliance"

            else:
                category = "Finance"

            db.add(
                RegulatoryNewsModel(
                    title=title,
                    category=category,
                    source=article.get(
                        "source",
                        {}
                    ).get(
                        "name",
                        "Unknown"
                    ),
                    summary=article.get(
                        "description"
                    ),
                    impact="Medium",
                    published_date=article.get(
                        "publishedAt"
                    ),
                    url=article.get(
                        "url"
                    )
                )
            )

        db.commit()

        print(
            "✅ Regulatory news refreshed"
        )

    except Exception as e:

        print(
            f"News refresh failed: {e}"
        )

    finally:

        db.close()


@app.post("/regulatory-news/refresh")
async def refresh_regulatory_news():

    refresh_news_job()

    return {
        "message":
        "Regulatory news updated successfully"
    }

@app.get("/regulatory-news")
async def get_regulatory_news(
    db: Session = Depends(get_db)
):

    news = db.query(
        RegulatoryNewsModel
    ).order_by(
        RegulatoryNewsModel.created_at.desc()
    ).limit(10).all()

    return [
        {
            "title": item.title,
            "category": item.category,
            "source": item.source,
            "summary": item.summary,
            "impact": item.impact,
            "url": item.url,
            "published_date":
                item.published_date
        }
        for item in news
    ]


scheduler = BackgroundScheduler()

@app.on_event("startup")
async def startup_event():

    if not scheduler.running:

        refresh_news_job()

        scheduler.add_job(
            refresh_news_job,
            "interval",
            hours=12,
            id="regulatory_news_refresh",
            replace_existing=True
        )

        scheduler.start()

        print("✅ News scheduler started")

# Run the app
if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
