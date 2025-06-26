"""
SQLAlchemy models for users, games, moves, used by PostgreSQL database backend.
"""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    games = relationship("Game", back_populates="player1", foreign_keys="Game.player1_id")


class Game(Base):
    __tablename__ = "games"

    id = Column(String, primary_key=True, index=True)
    player1_id = Column(Integer, ForeignKey("users.id"))
    player2_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    room_code = Column(String, unique=True, index=True)
    status = Column(String)
    turn = Column(String, nullable=True)
    winner = Column(String, nullable=True)
    grid1 = Column(Text)
    grid2 = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    player1 = relationship("User", foreign_keys=[player1_id], back_populates="games")


class GameMove(Base):
    __tablename__ = "moves"

    id = Column(Integer, primary_key=True)
    game_id = Column(String, ForeignKey("games.id"))
    player_id = Column(Integer, ForeignKey("users.id"))
    x = Column(Integer)
    y = Column(Integer)
    move_number = Column(Integer)
    result = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
