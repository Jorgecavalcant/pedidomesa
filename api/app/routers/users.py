from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import require_dono
from app.database import get_db
from app.models import User, UserPapel
from app.schemas import UserCreate, UserOut, UserUpdate

router = APIRouter(prefix="/api/v1/users", tags=["users"])


@router.get("", response_model=list[UserOut])
def listar(
    db: Session = Depends(get_db),
    _: object = Depends(require_dono),
) -> list[User]:
    return db.query(User).order_by(User.id).all()


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def criar(
    body: UserCreate,
    db: Session = Depends(get_db),
    _: object = Depends(require_dono),
) -> User:
    if db.query(User).filter(User.usuario == body.usuario).first():
        raise HTTPException(status_code=400, detail="Usuário já existe.")
    row = User(
        usuario=body.usuario,
        senha=body.senha,
        papel=UserPapel(body.papel),
        mesas_ids=body.mesas_ids,
        ativo=body.ativo,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.patch("/{user_id}", response_model=UserOut)
def atualizar(
    user_id: int,
    body: UserUpdate,
    db: Session = Depends(get_db),
    _: object = Depends(require_dono),
) -> User:
    row = db.get(User, user_id)
    if not row:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
    if body.senha is not None:
        row.senha = body.senha
    if body.papel is not None:
        row.papel = UserPapel(body.papel)
    if body.mesas_ids is not None:
        row.mesas_ids = body.mesas_ids
    if body.ativo is not None:
        row.ativo = body.ativo
    db.commit()
    db.refresh(row)
    return row
