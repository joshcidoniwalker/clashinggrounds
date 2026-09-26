from pydantic import BaseModel, ConfigDict


class RoomCategoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    slug: str
    name: str
    is_default: bool
