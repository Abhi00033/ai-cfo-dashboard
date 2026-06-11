from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime

from models import get_db
from models_accounting import (
    InvoiceModel,
    CustomerModel
)

router = APIRouter(tags=["Invoices"])


class InvoiceCreate(BaseModel):

    invoice_number: str

    customer_id: int

    invoice_date: datetime

    due_date: datetime

    subtotal: float

    gst_rate: float

    status: str = "Draft"


@router.post("/invoices")
def create_invoice(
    invoice: InvoiceCreate,
    db: Session = Depends(get_db)
):

    customer = db.query(
        CustomerModel
    ).filter(
        CustomerModel.id == invoice.customer_id
    ).first()

    if not customer:

        raise HTTPException(
            status_code=404,
            detail="Customer not found"
        )

    gst_amount = (
        invoice.subtotal *
        invoice.gst_rate
    ) / 100

    total_amount = (
        invoice.subtotal +
        gst_amount
    )

    new_invoice = InvoiceModel(

        invoice_number=
        invoice.invoice_number,

        customer_id=
        invoice.customer_id,

        invoice_date=
        invoice.invoice_date,

        due_date=
        invoice.due_date,

        subtotal=
        invoice.subtotal,

        gst_rate=
        invoice.gst_rate,

        gst_amount=
        gst_amount,

        total_amount=
        total_amount,

        status=
        invoice.status
    )

    db.add(new_invoice)

    db.commit()

    db.refresh(new_invoice)

    return new_invoice


@router.get("/invoices")
def get_invoices(
    db: Session = Depends(get_db)
):

    return db.query(
        InvoiceModel
    ).all()


@router.get("/invoices/{invoice_id}")
def get_invoice(
    invoice_id: int,
    db: Session = Depends(get_db)
):

    invoice = db.query(
        InvoiceModel
    ).filter(
        InvoiceModel.id == invoice_id
    ).first()

    if not invoice:

        raise HTTPException(
            status_code=404,
            detail="Invoice not found"
        )

    return invoice


@router.put("/invoices/{invoice_id}")
def update_invoice(
    invoice_id: int,
    payload: InvoiceCreate,
    db: Session = Depends(get_db)
):

    invoice = db.query(
        InvoiceModel
    ).filter(
        InvoiceModel.id == invoice_id
    ).first()

    if not invoice:

        raise HTTPException(
            status_code=404,
            detail="Invoice not found"
        )

    customer = db.query(
        CustomerModel
    ).filter(
        CustomerModel.id == payload.customer_id
    ).first()

    if not customer:

        raise HTTPException(
            status_code=404,
            detail="Customer not found"
        )

    gst_amount = (
        payload.subtotal *
        payload.gst_rate
    ) / 100

    total_amount = (
        payload.subtotal +
        gst_amount
    )

    invoice.invoice_number = (
        payload.invoice_number
    )

    invoice.customer_id = (
        payload.customer_id
    )

    invoice.invoice_date = (
        payload.invoice_date
    )

    invoice.due_date = (
        payload.due_date
    )

    invoice.subtotal = (
        payload.subtotal
    )

    invoice.gst_rate = (
        payload.gst_rate
    )

    invoice.gst_amount = (
        gst_amount
    )

    invoice.total_amount = (
        total_amount
    )

    invoice.status = (
        payload.status
    )

    db.commit()

    db.refresh(invoice)

    return invoice


@router.delete("/invoices/{invoice_id}")
def delete_invoice(
    invoice_id: int,
    db: Session = Depends(get_db)
):

    invoice = db.query(
        InvoiceModel
    ).filter(
        InvoiceModel.id == invoice_id
    ).first()

    if not invoice:

        raise HTTPException(
            status_code=404,
            detail="Invoice not found"
        )

    db.delete(invoice)

    db.commit()

    return {
        "message":
        "Invoice deleted successfully"
    }