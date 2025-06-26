"""
Authentication-related service utilities: for JWT creation/parsing,
user management, and verification.
"""

import os
import jwt
from datetime import datetime, timedelta
from passlib.context import CryptContext
from fastapi import HTTPException, status, Depends, WebSocket
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.orm import Session

from api.models import User
from api.db import get_db

SECRET_KEY = os.environ.get("JWT_SECRET", "super-secret")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 120

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain, hashed):
    return pwd_context.verify(plain, hashed)


def get_password_hash(password):
    return pwd_context.hash(password)


# PUBLIC_INTERFACE
async def create_user(db: Session, payload):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed_pw = get_password_hash(payload.password)
    user = User(
        email=payload.email, username=payload.username, hashed_password=hashed_pw
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


# PUBLIC_INTERFACE
async def authenticate_and_generate_token(db: Session, form_data):
    user = db.query(User).filter(
        (User.email == form_data.username) | (User.username == form_data.username)
    ).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        return None
    access_token = jwt.encode(
        {
            "sub": str(user.id),
            "exp": datetime.utcnow() + timedelta(
                minutes=ACCESS_TOKEN_EXPIRE_MINUTES
            ),
        },
        SECRET_KEY,
        algorithm=ALGORITHM,
    )
    return access_token


# PUBLIC_INTERFACE
def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub"))
    except (JWTError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid JWT"
        )
    user = db.query(User).get(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found"
        )
    return user


# PUBLIC_INTERFACE
async def get_current_user_from_ws(
    websocket: WebSocket, token: str = None, db: Session = Depends(get_db)
):
    if not token:
        token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4401)
        raise HTTPException(status_code=401, detail="Token missing")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub"))
    except (JWTError, ValueError):
        await websocket.close(code=4401)
        raise HTTPException(status_code=401, detail="Invalid JWT")
    user = db.query(User).get(user_id)
    if not user:
        await websocket.close(code=4401)
        raise HTTPException(status_code=401, detail="User not found")
    return user
