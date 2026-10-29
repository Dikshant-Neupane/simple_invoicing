from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from src.db.session import get_db
from src.models.user import User, UserRole
from src.schemas.user import UserCreate, UserOut
from src.core.security import get_password_hash
from src.api.deps import require_roles

router = APIRouter()


@router.post("", response_model=UserOut, include_in_schema=False)
@router.post("/", response_model=UserOut)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.admin)),
):
    user = User(
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=get_password_hash(payload.password),
        role=payload.role,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409, detail="User with this email already exists."
        )
    db.refresh(user)
    return user


@router.get("", response_model=list[UserOut], include_in_schema=False)
@router.get("/", response_model=list[UserOut])
def list_users(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.admin, UserRole.manager)),
):
    return db.query(User).all()
