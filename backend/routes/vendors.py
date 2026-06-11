from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from models import get_db
from models_accounting import VendorModel

router = APIRouter(tags=["Vendors"])


class VendorCreate(BaseModel):
    name: str
    email: str | None = None
    phone: str | None = None
    gstin: str | None = None


@router.post("/vendors")
def create_vendor(
    vendor: VendorCreate,
    db: Session = Depends(get_db)
):
    new_vendor = VendorModel(
        name=vendor.name,
        email=vendor.email,
        phone=vendor.phone,
        gstin=vendor.gstin
    )

    db.add(new_vendor)
    db.commit()
    db.refresh(new_vendor)

    return {
        "id": new_vendor.id,
        "name": new_vendor.name,
        "email": new_vendor.email,
        "phone": new_vendor.phone,
        "gstin": new_vendor.gstin
    }


@router.get("/vendors")
def get_vendors(
    db: Session = Depends(get_db)
):
    return db.query(VendorModel).all()


@router.get("/vendors/{vendor_id}")
def get_vendor(
    vendor_id: int,
    db: Session = Depends(get_db)
):
    vendor = db.query(VendorModel).filter(
        VendorModel.id == vendor_id
    ).first()

    if not vendor:
        raise HTTPException(
            status_code=404,
            detail="Vendor not found"
        )

    return vendor


@router.delete("/vendors/{vendor_id}")
def delete_vendor(
    vendor_id: int,
    db: Session = Depends(get_db)
):
    vendor = db.query(VendorModel).filter(
        VendorModel.id == vendor_id
    ).first()

    if not vendor:
        raise HTTPException(
            status_code=404,
            detail="Vendor not found"
        )

    db.delete(vendor)
    db.commit()

    return {
        "message": "Vendor deleted successfully"
    }


class VendorUpdate(BaseModel):
    name: str
    email: str | None = None
    phone: str | None = None
    gstin: str | None = None


@router.put("/vendors/{vendor_id}")
def update_vendor(
    vendor_id: int,
    payload: VendorUpdate,
    db: Session = Depends(get_db)
):
    vendor = db.query(VendorModel).filter(
        VendorModel.id == vendor_id
    ).first()

    if not vendor:
        raise HTTPException(
            status_code=404,
            detail="Vendor not found"
        )

    vendor.name = payload.name
    vendor.email = payload.email
    vendor.phone = payload.phone
    vendor.gstin = payload.gstin

    db.commit()
    db.refresh(vendor)

    return vendor