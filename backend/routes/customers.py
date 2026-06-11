from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from models import get_db
from models_accounting import CustomerModel

router = APIRouter(tags=["Customers"])


class CustomerCreate(BaseModel):
    name: str
    email: str | None = None
    phone: str | None = None
    gstin: str | None = None


@router.post("/customers")
def create_customer(
    customer: CustomerCreate,
    db: Session = Depends(get_db)
):
    new_customer = CustomerModel(
        name=customer.name,
        email=customer.email,
        phone=customer.phone,
        gstin=customer.gstin
    )

    db.add(new_customer)
    db.commit()
    db.refresh(new_customer)

    return {
        "id": new_customer.id,
        "name": new_customer.name,
        "email": new_customer.email,
        "phone": new_customer.phone,
        "gstin": new_customer.gstin
    }


@router.get("/customers")
def get_customers(
    db: Session = Depends(get_db)
):
    return db.query(CustomerModel).all()

@router.get("/customers/{customer_id}")
def get_customer(
    customer_id: int,
    db: Session = Depends(get_db)
):
    customer = db.query(CustomerModel).filter(
        CustomerModel.id == customer_id
    ).first()

    if not customer:
        raise HTTPException(
            status_code=404,
            detail="Customer not found"
        )

    return customer

@router.delete("/customers/{customer_id}")
def delete_customer(
    customer_id: int,
    db: Session = Depends(get_db)
):
    customer = db.query(CustomerModel).filter(
        CustomerModel.id == customer_id
    ).first()

    if not customer:
        raise HTTPException(
            status_code=404,
            detail="Customer not found"
        )

    db.delete(customer)
    db.commit()

    return {
        "message": "Customer deleted successfully"
    }



class CustomerUpdate(BaseModel):
    name: str
    email: str | None = None
    phone: str | None = None
    gstin: str | None = None


@router.put("/customers/{customer_id}")
def update_customer(
    customer_id: int,
    payload: CustomerUpdate,
    db: Session = Depends(get_db)
):
    customer = db.query(CustomerModel).filter(
        CustomerModel.id == customer_id
    ).first()

    if not customer:
        raise HTTPException(
            status_code=404,
            detail="Customer not found"
        )

    customer.name = payload.name
    customer.email = payload.email
    customer.phone = payload.phone
    customer.gstin = payload.gstin

    db.commit()
    db.refresh(customer)

    return customer