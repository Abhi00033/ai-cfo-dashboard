from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    DateTime,
    ForeignKey
)

from models import Base


class CustomerModel(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String, nullable=False)

    email = Column(String)

    phone = Column(String)

    gstin = Column(String)

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )


class VendorModel(Base):
    __tablename__ = "vendors"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String, nullable=False)

    email = Column(String)

    phone = Column(String)

    gstin = Column(String)

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )


class InvoiceModel(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True)

    invoice_number = Column(String, unique=True)

    customer_id = Column(
        Integer,
        ForeignKey("customers.id")
    )

    invoice_date = Column(DateTime)

    due_date = Column(DateTime)

    subtotal = Column(Float)

    gst_rate = Column(Float)

    gst_amount = Column(Float)

    total_amount = Column(Float)

    status = Column(
        String,
        default="Draft"
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )


class BillModel(Base):
    __tablename__ = "bills"

    id = Column(Integer, primary_key=True)

    vendor_id = Column(
        Integer,
        ForeignKey("vendors.id")
    )

    bill_number = Column(String)

    bill_date = Column(DateTime)

    due_date = Column(DateTime)

    subtotal = Column(Float)

    gst_rate = Column(Float)

    gst_amount = Column(Float)

    total_amount = Column(Float)

    status = Column(
        String,
        default="Pending"
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )