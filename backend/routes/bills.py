from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime

from models import get_db
from models_accounting import (
    BillModel,
    VendorModel
)

router = APIRouter(tags=["Bills"])


class BillCreate(BaseModel):

    bill_number: str

    vendor_id: int

    bill_date: datetime

    due_date: datetime

    subtotal: float

    gst_rate: float

    status: str = "Pending"


class BillUpdate(BaseModel):

    bill_number: str

    vendor_id: int

    bill_date: datetime

    due_date: datetime

    subtotal: float

    gst_rate: float

    status: str = "Pending"


@router.post("/bills")
def create_bill(
    bill: BillCreate,
    db: Session = Depends(get_db)
):

    vendor = db.query(
        VendorModel
    ).filter(
        VendorModel.id == bill.vendor_id
    ).first()

    if not vendor:

        raise HTTPException(
            status_code=404,
            detail="Vendor not found"
        )

    gst_amount = (
        bill.subtotal *
        bill.gst_rate
    ) / 100

    total_amount = (
        bill.subtotal +
        gst_amount
    )

    new_bill = BillModel(

        bill_number=
        bill.bill_number,

        vendor_id=
        bill.vendor_id,

        bill_date=
        bill.bill_date,

        due_date=
        bill.due_date,

        subtotal=
        bill.subtotal,

        gst_rate=
        bill.gst_rate,

        gst_amount=
        gst_amount,

        total_amount=
        total_amount,

        status=
        bill.status
    )

    db.add(new_bill)

    db.commit()

    db.refresh(new_bill)

    return new_bill


@router.get("/bills")
def get_bills(
    db: Session = Depends(get_db)
):

    return db.query(
        BillModel
    ).all()


@router.get("/bills/{bill_id}")
def get_bill(
    bill_id: int,
    db: Session = Depends(get_db)
):

    bill = db.query(
        BillModel
    ).filter(
        BillModel.id == bill_id
    ).first()

    if not bill:

        raise HTTPException(
            status_code=404,
            detail="Bill not found"
        )

    return bill


@router.put("/bills/{bill_id}")
def update_bill(
    bill_id: int,
    payload: BillUpdate,
    db: Session = Depends(get_db)
):

    bill = db.query(
        BillModel
    ).filter(
        BillModel.id == bill_id
    ).first()

    if not bill:

        raise HTTPException(
            status_code=404,
            detail="Bill not found"
        )

    vendor = db.query(
        VendorModel
    ).filter(
        VendorModel.id ==
        payload.vendor_id
    ).first()

    if not vendor:

        raise HTTPException(
            status_code=404,
            detail="Vendor not found"
        )

    gst_amount = (
        payload.subtotal *
        payload.gst_rate
    ) / 100

    total_amount = (
        payload.subtotal +
        gst_amount
    )

    bill.bill_number = (
        payload.bill_number
    )

    bill.vendor_id = (
        payload.vendor_id
    )

    bill.bill_date = (
        payload.bill_date
    )

    bill.due_date = (
        payload.due_date
    )

    bill.subtotal = (
        payload.subtotal
    )

    bill.gst_rate = (
        payload.gst_rate
    )

    bill.gst_amount = (
        gst_amount
    )

    bill.total_amount = (
        total_amount
    )

    bill.status = (
        payload.status
    )

    db.commit()

    db.refresh(bill)

    return bill


@router.delete("/bills/{bill_id}")
def delete_bill(
    bill_id: int,
    db: Session = Depends(get_db)
):

    bill = db.query(
        BillModel
    ).filter(
        BillModel.id == bill_id
    ).first()

    if not bill:

        raise HTTPException(
            status_code=404,
            detail="Bill not found"
        )

    db.delete(bill)

    db.commit()

    return {
        "message":
        "Bill deleted successfully"
    }