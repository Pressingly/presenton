from datetime import datetime
from typing import Optional
import uuid

from sqlalchemy import JSON, Column, DateTime
from sqlmodel import Field, SQLModel

from utils.asset_directory_utils import filesystem_path_to_app_data_url
from utils.datetime_utils import get_current_utc_datetime


class ImageAsset(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True), nullable=False, default=get_current_utc_datetime
        ),
    )
    is_uploaded: bool = Field(default=False)
    path: str
    extras: Optional[dict] = Field(sa_column=Column(JSON), default=None)

    @property
    def file_url(self) -> str:
        """
        Returns a web-safe /app_data/... URL for the stored asset path.
        Converts absolute filesystem paths to the /app_data/... prefix so the
        frontend can resolve them correctly regardless of the host OS.
        """
        return filesystem_path_to_app_data_url(self.path)
