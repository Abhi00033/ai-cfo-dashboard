from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    UploadFile,
    File
)

from pydantic import BaseModel
from sqlalchemy.orm import Session

from typing import Optional

import pandas as pd
import io

from models import (
    TransactionModel,
    get_db
)

router = APIRouter(
    tags=["Transactions"]
)


class Transaction(BaseModel):

    id: Optional[int] = None

    date: Optional[str] = None

    amount: float

    category: str

    description: str

    type: str

    customer_id: Optional[int] = None

    vendor_id: Optional[int] = None


class DeleteTransactionsRequest(BaseModel):

    ids: list[int]


class TransactionUpdate(BaseModel):

    amount: float

    category: str

    description: str

    type: str

    customer_id: Optional[int] = None

    vendor_id: Optional[int] = None

@router.get("/transactions")
async def get_transactions(
    db: Session = Depends(get_db)
):

    transactions = db.query(
        TransactionModel
    ).all()

    return [
        {
            "id": t.id,
            "date": t.date.strftime("%Y-%m-%d"),
            "amount": t.amount,
            "category": t.category,
            "description": t.description,
            "type": t.type,
            "customer_id": t.customer_id,
            "vendor_id": t.vendor_id
        }
        for t in transactions
    ]


@router.post("/transactions")
async def create_transaction(
    tx: Transaction,
    db: Session = Depends(get_db)
):

    if tx.type == "income" and not tx.customer_id:

        raise HTTPException(
            status_code=400,
            detail="Income transactions require customer_id"
        )

    if tx.type == "expense" and not tx.vendor_id:

        raise HTTPException(
            status_code=400,
            detail="Expense transactions require vendor_id"
        )

    if tx.type == "income" and tx.vendor_id:

        raise HTTPException(
            status_code=400,
            detail="Income transactions cannot have vendor_id"
        )

    if tx.type == "expense" and tx.customer_id:

        raise HTTPException(
            status_code=400,
            detail="Expense transactions cannot have customer_id"
        )

    transaction = TransactionModel(

        amount=tx.amount,

        category=tx.category,

        description=tx.description,

        type=tx.type,

        customer_id=tx.customer_id,

        vendor_id=tx.vendor_id
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
        "type": transaction.type,
        "customer_id": transaction.customer_id,
        "vendor_id": transaction.vendor_id
    }


@router.put("/transactions/{transaction_id}")
async def update_transaction(
    transaction_id: int,
    payload: TransactionUpdate,
    db: Session = Depends(get_db)
):

    transaction = db.query(
        TransactionModel
    ).filter(
        TransactionModel.id == transaction_id
    ).first()

    if not transaction:

        raise HTTPException(
            status_code=404,
            detail="Transaction not found"
        )

    if payload.type == "income" and not payload.customer_id:

        raise HTTPException(
            status_code=400,
            detail="Income transactions require customer_id"
        )

    if payload.type == "expense" and not payload.vendor_id:

        raise HTTPException(
            status_code=400,
            detail="Expense transactions require vendor_id"
        )

    if payload.type == "income" and payload.vendor_id:

        raise HTTPException(
            status_code=400,
            detail="Income transactions cannot have vendor_id"
        )

    if payload.type == "expense" and payload.customer_id:

        raise HTTPException(
            status_code=400,
            detail="Expense transactions cannot have customer_id"
        )

    transaction.amount = payload.amount

    transaction.category = payload.category

    transaction.description = payload.description

    transaction.type = payload.type

    transaction.customer_id = payload.customer_id

    transaction.vendor_id = payload.vendor_id

    db.commit()

    db.refresh(transaction)

    return {
        "message":
        "Transaction updated successfully"
    }


@router.delete("/transactions/{transaction_id}")
async def delete_transaction(
    transaction_id: int,
    db: Session = Depends(get_db)
):

    transaction = db.query(
        TransactionModel
    ).filter(
        TransactionModel.id == transaction_id
    ).first()

    if not transaction:

        raise HTTPException(
            status_code=404,
            detail="Transaction not found"
        )

    db.delete(transaction)

    db.commit()

    return {
        "message":
        "Transaction deleted successfully"
    }

@router.post("/transactions/delete-multiple")
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
        "message":
        f"{deleted} transaction(s) deleted successfully"
    }


@router.post("/transactions/upload-csv")
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

        # optional_columns = [
        #     "customer_id",
        #     "vendor_id"
        # ]

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

        for index, row in df.iterrows():

            amount = row["amount"]

            category = str(
                row["category"]
            ).strip()

            description = str(
                row["description"]
            ).strip()

            tx_type = str(
                row["type"]
            ).strip().lower()

            # if tx_type == "income" and not customer_id:

            #     raise HTTPException(
            #         status_code=400,
            #         detail=f"Row {index + 2}: Income transactions require customer_id"
            #     )

            # if tx_type == "expense" and not vendor_id:

            #     raise HTTPException(
            #         status_code=400,
            #         detail=f"Row {index + 2}: Expense transactions require vendor_id"
            #     )

            if pd.isna(amount):

                raise HTTPException(
                    status_code=400,
                    detail=f"Row {index + 2}: Amount is required"
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

            # customer_id = (
            #     int(row["customer_id"])
            #     if "customer_id" in df.columns
            #     and pd.notna(row["customer_id"])
            #     else None
            # )

            # vendor_id = (
            #     int(row["vendor_id"])
            #     if "vendor_id" in df.columns
            #     and pd.notna(row["vendor_id"])
            #     else None
            # )

            transactions_to_insert.append(

                TransactionModel(

                    amount=float(amount),

                    category=category,

                    description=description,

                    type=tx_type
                )
            )

        for transaction in transactions_to_insert:

            db.add(transaction)

        db.commit()

        return {

            "success": True,

            "message":
            f"{len(transactions_to_insert)} transactions imported successfully"
        }

    except HTTPException:

        raise

    except Exception as e:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Import failed: {str(e)}"
        )


@router.get("/stats")
async def stats(
    db: Session = Depends(get_db)
):

    transactions = db.query(
        TransactionModel
    ).all()

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


@router.get("/categories")
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


@router.get("/seed")
async def seed(
    db: Session = Depends(get_db)
):

    existing = db.query(
        TransactionModel
    ).count()

    if existing > 0:

        return {
            "message":
            "Data already exists"
        }

    records = [

       TransactionModel(
            amount=82450000,
            category="Revenue",
            description="Q2 Sales",
            type="income",
            customer_id=1
        ),
        TransactionModel(
            amount=-12340000,
            category="Operations",
            description="Employee Salaries",
            type="expense",
            vendor_id=1
        ),
        TransactionModel(
            amount=4500000,
            category="Investment",
            description="Return on Investments",
            type="income",
            customer_id=1
        )
    ]

    for record in records:

        db.add(record)

    db.commit()

    return {
        "message":
        "Sample data inserted"
    }


@router.get("/reset")
async def reset(
    db: Session = Depends(get_db)
):

    db.query(
        TransactionModel
    ).delete()

    db.commit()

    return {
        "message":
        "Database cleared"
    }