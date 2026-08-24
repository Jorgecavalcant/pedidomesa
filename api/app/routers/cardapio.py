from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import require_estabelecimento
from app.database import get_db
from app.models import CardapioItem
from app.schemas import CardapioItemCreate, CardapioItemOut, CardapioItemUpdate

router = APIRouter(prefix="/api/v1/cardapio", tags=["cardapio"])


@router.get("", response_model=list[CardapioItemOut])
def listar_cardapio(db: Session = Depends(get_db)):
    return db.scalars(select(CardapioItem).where(CardapioItem.ativo.is_(True))).all()


@router.get("/admin", response_model=list[CardapioItemOut])
def listar_cardapio_admin(
    db: Session = Depends(get_db),
    _: str = Depends(require_estabelecimento),
):
    return db.scalars(select(CardapioItem)).all()


@router.post("", response_model=CardapioItemOut, status_code=status.HTTP_201_CREATED)
def criar_item(
    data: CardapioItemCreate,
    db: Session = Depends(get_db),
    _: str = Depends(require_estabelecimento),
):
    item = CardapioItem(**data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.patch("/{item_id}", response_model=CardapioItemOut)
def atualizar_item(
    item_id: int,
    data: CardapioItemUpdate,
    db: Session = Depends(get_db),
    _: str = Depends(require_estabelecimento),
):
    item = db.get(CardapioItem, item_id)
    if not item:
        raise HTTPException(404, "item não encontrado")
    for campo, valor in data.model_dump(exclude_unset=True).items():
        setattr(item, campo, valor)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", response_model=CardapioItemOut)
def remover_item(
    item_id: int,
    db: Session = Depends(get_db),
    _: str = Depends(require_estabelecimento),
):
    item = db.get(CardapioItem, item_id)
    if not item:
        raise HTTPException(404, "item não encontrado")
    item.ativo = False  # soft-delete
    db.commit()
    db.refresh(item)
    return item
