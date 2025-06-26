"""
Authentication router: handles JWT signup/login, password hashing, and user management.
"""

from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from api.services import auth as auth_service
from api.db import get_db

router = APIRouter()


class SignupRequest(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=32)
    password: str = Field(..., min_length=6)


class SignupResponse(BaseModel):
    id: int
    email: EmailStr
    username: str


class Token(BaseModel):
    access_token: str
    token_type: str


# PUBLIC_INTERFACE
@router.post("/signup", summary="Sign up new user", response_model=SignupResponse)
async def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    """
    Register a new user. Returns user data excluding password.

    Email must be unique.
    """
    user = await auth_service.create_user(db, payload)
    return SignupResponse(id=user.id, email=user.email, username=user.username)


# PUBLIC_INTERFACE
@router.post("/login", summary="User login, get JWT token", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """
    User login with email/username and password.

    Returns JWT token on success.
    """
    token = await auth_service.authenticate_and_generate_token(db, form_data)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    return Token(access_token=token, token_type="bearer")
